import test from 'node:test';
import assert from 'node:assert/strict';
import { getSettingsForUserLocal, saveSettingsForUserLocal, getScheduleItemsForUserLocal, saveScheduleItemsForUserLocal } from '../lib/local-db';
import { saveSettingsForUser } from '../lib/firebase';
import { POST } from '../app/api/telegram-webhook/route';

test('Multi-User Database Scoping', async (t) => {
  await t.test('should isolate settings per user', async () => {
    saveSettingsForUserLocal('test_user_a', { ...getSettingsForUserLocal('test_user_a'), telegramChatId: '10001', allowedChatIdsStr: '10001' } as any);
    saveSettingsForUserLocal('test_user_b', { ...getSettingsForUserLocal('test_user_b'), telegramChatId: '20002', allowedChatIdsStr: '20002' } as any);

    const s1 = getSettingsForUserLocal('test_user_a');
    const s2 = getSettingsForUserLocal('test_user_b');

    assert.equal(s1.telegramChatId, '10001');
    assert.equal(s2.telegramChatId, '20002');
  });

  await t.test('should isolate schedule items per user', async () => {
    saveScheduleItemsForUserLocal('test_user_a', [{ id: '1', subject: 'Test User A Shift', dayOfWeek: 'Thu2', startTime: '08:00', endTime: '12:00', location: '', note: '', reminderEnabled: true }], false);
    saveScheduleItemsForUserLocal('test_user_b', [{ id: '2', subject: 'Test User B Shift', dayOfWeek: 'Thu3', startTime: '13:00', endTime: '17:00', location: '', note: '', reminderEnabled: true }], false);

    const items1 = getScheduleItemsForUserLocal('test_user_a');
    const items2 = getScheduleItemsForUserLocal('test_user_b');

    assert.equal(items1[0].subject, 'Test User A Shift');
    assert.equal(items2[0].subject, 'Test User B Shift');
  });

  await t.test('should route Telegram webhook to correct user based on chatId', async () => {
    const backupUserA = getSettingsForUserLocal('test_user_a');
    const backupUserB = getSettingsForUserLocal('test_user_b');

    await saveSettingsForUser('test_user_a', { ...backupUserA, telegramBotToken: 'mock-token', telegramChatId: 'CHAT_ID_REVOKED', allowedChatIdsStr: 'CHAT_ID_REVOKED, 10001', telegramSessionState: { userState: 'IDLE' }, userNotes: [] });
    await saveSettingsForUser('test_user_b', { ...backupUserB, telegramBotToken: 'mock-token', telegramChatId: '20002', allowedChatIdsStr: '20002', telegramSessionState: { userState: 'IDLE' }, userNotes: [] });

    const originalFetch = global.fetch;
    global.fetch = async (url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('api.telegram.org')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(url, options);
    };

    try {
      // Test unauthorized chatId
      const reqUnauth = new Request('http://localhost:3000/api/telegram-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { chat: { id: '99999' }, text: '/start' }
        })
      });
      const resUnauth = await POST(reqUnauth);
      const bodyUnauth = await resUnauth.json();
      assert.equal(bodyUnauth.message, 'Unauthorized Chat ID');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
