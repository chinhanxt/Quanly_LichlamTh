import test from 'node:test';
import assert from 'node:assert/strict';
import { getSettingsForUserLocal, saveSettingsForUserLocal, getScheduleItemsForUserLocal, saveScheduleItemsForUserLocal } from '../lib/local-db';
import { saveSettingsForUser } from '../lib/firebase';
import { POST } from '../app/api/telegram-webhook/route';

test('Multi-User Database Scoping', async (t) => {
  await t.test('should isolate settings per user', async () => {
    saveSettingsForUserLocal('thanhhuong', { ...getSettingsForUserLocal('thanhhuong'), telegramChatId: '10001', allowedChatIdsStr: '10001' } as any);
    saveSettingsForUserLocal('chinhan', { ...getSettingsForUserLocal('chinhan'), telegramChatId: '20002', allowedChatIdsStr: '20002' } as any);

    const s1 = getSettingsForUserLocal('thanhhuong');
    const s2 = getSettingsForUserLocal('chinhan');

    assert.equal(s1.telegramChatId, '10001');
    assert.equal(s2.telegramChatId, '20002');
  });

  await t.test('should isolate schedule items per user', async () => {
    saveScheduleItemsForUserLocal('thanhhuong', [{ id: '1', subject: 'Thanh Hương Shift', dayOfWeek: 'Thu2', startTime: '08:00', endTime: '12:00', location: '', note: '', reminderEnabled: true }]);
    saveScheduleItemsForUserLocal('chinhan', [{ id: '2', subject: 'Chí Nhân Shift', dayOfWeek: 'Thu3', startTime: '13:00', endTime: '17:00', location: '', note: '', reminderEnabled: true }]);

    const items1 = getScheduleItemsForUserLocal('thanhhuong');
    const items2 = getScheduleItemsForUserLocal('chinhan');

    assert.equal(items1[0].subject, 'Thanh Hương Shift');
    assert.equal(items2[0].subject, 'Chí Nhân Shift');
  });

  await t.test('should route Telegram webhook to correct user based on chatId', async () => {
    const backupThanhHuong = getSettingsForUserLocal('thanhhuong');
    const backupChinHan = getSettingsForUserLocal('chinhan');

    await saveSettingsForUser('thanhhuong', { ...backupThanhHuong, telegramBotToken: 'mock-token', telegramChatId: '5842766685', allowedChatIdsStr: '5842766685, 10001', telegramSessionState: { userState: 'IDLE' }, userNotes: [] });
    await saveSettingsForUser('chinhan', { ...backupChinHan, telegramBotToken: 'mock-token', telegramChatId: '20002', allowedChatIdsStr: '20002', telegramSessionState: { userState: 'IDLE' }, userNotes: [] });

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

      // Test chinhan chatId
      const reqChinhan = new Request('http://localhost:3000/api/telegram-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { chat: { id: '20002' }, text: '➕ Thêm Ghi Chú' }
        })
      });
      const resChinhan = await POST(reqChinhan);
      const bodyChinhan = await resChinhan.json();
      assert.equal(bodyChinhan.ok, true);

      const sChinhan = getSettingsForUserLocal('chinhan');
      assert.equal(sChinhan.telegramSessionState?.userState, 'AWAITING_NOTE');

      const sThanhHuong = getSettingsForUserLocal('thanhhuong');
      assert.notEqual(sThanhHuong.telegramSessionState?.userState, 'AWAITING_NOTE');
    } finally {
      global.fetch = originalFetch;
      await saveSettingsForUser('thanhhuong', backupThanhHuong);
      await saveSettingsForUser('chinhan', backupChinHan);
    }
  });
});
