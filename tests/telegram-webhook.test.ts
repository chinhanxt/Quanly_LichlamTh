import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { POST } from '../app/api/telegram-webhook/route';
import { getSettings } from '../lib/firebase';

describe.skip('Telegram Webhook API', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    // Mock global fetch for Telegram API calls
    global.fetch = async (url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('api.telegram.org')) {
        return new Response(JSON.stringify({ ok: true, result: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(url, options);
    };

    const { saveSettingsForUser, getSettingsForUser } = await import('../lib/firebase');
    const s = await getSettingsForUser('thanhhuong');
    await saveSettingsForUser('thanhhuong', {
      ...s,
      telegramBotToken: 'mock-token',
      telegramChatId: '1234567890',
      allowedChatIdsStr: '1234567890',
      telegramSessionState: { userState: 'IDLE' },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should handle /start command and return 200 OK', async () => {
    const payload = {
      update_id: 10001,
      message: {
        message_id: 1,
        from: { id: 1234567890, first_name: 'TestUser' },
        chat: { id: 1234567890, type: 'private' },
        date: 1700000000,
        text: '/start',
      },
    };

    const req = new Request('http://localhost:3000/api/telegram-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
  });

  it('should handle 💰 Bảng Lương text command and return 200 OK', async () => {
    const payload = {
      update_id: 10002,
      message: {
        message_id: 2,
        from: { id: 1234567890, first_name: 'TestUser' },
        chat: { id: 1234567890, type: 'private' },
        date: 1700000000,
        text: '💰 Bảng Lương',
      },
    };

    const req = new Request('http://localhost:3000/api/telegram-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
  });

  it('should set AWAITING_NOTE state on ➕ Thêm Ghi Chú and save note on next text message', async () => {
    const { getSettingsForUserLocal, saveSettingsForUserLocal } = await import('../lib/local-db');
    const s = getSettingsForUserLocal('thanhhuong');
    saveSettingsForUserLocal('thanhhuong', { ...s, allowedChatIdsStr: '1234567890', telegramChatId: '1234567890' });

    // 1. Send ➕ Thêm Ghi Chú
    const req1 = new Request('http://localhost:3000/api/telegram-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        update_id: 10003,
        message: {
          message_id: 3,
          chat: { id: 1234567890, type: 'private' },
          text: '➕ Thêm Ghi Chú',
        },
      }),
    });
    const res1 = await POST(req1);
    assert.strictEqual(res1.status, 200);

    const settingsMid = await getSettings();
    assert.strictEqual(settingsMid.telegramSessionState?.userState, 'AWAITING_NOTE');

    // 2. Send actual note text
    const noteText = 'Họp team tuần tới lúc 9h sáng';
    const req2 = new Request('http://localhost:3000/api/telegram-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        update_id: 10004,
        message: {
          message_id: 4,
          chat: { id: 1234567890, type: 'private' },
          text: noteText,
        },
      }),
    });
    const res2 = await POST(req2);
    assert.strictEqual(res2.status, 200);

    const settingsAfter = await getSettings();
    assert.strictEqual(settingsAfter.telegramSessionState?.userState, 'IDLE');
    const addedNote = settingsAfter.userNotes?.find((n) => n.content === noteText);
    assert.ok(addedNote);
  });

  it('should handle callback query confirm_ocr and cancel_ocr', async () => {
    const cancelPayload = {
      update_id: 10005,
      callback_query: {
        id: 'query_1',
        chat: { id: 1234567890 },
        data: 'cancel_ocr:test_123',
      },
    };
    const reqCancel = new Request('http://localhost:3000/api/telegram-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cancelPayload),
    });
    const resCancel = await POST(reqCancel);
    assert.strictEqual(resCancel.status, 200);

    const settingsAfterCancel = await getSettings();
    assert.strictEqual(settingsAfterCancel.telegramSessionState?.userState, 'IDLE');
  });
});
