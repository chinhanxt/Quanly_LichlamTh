import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserChatIds } from '../lib/telegram';

test('Telegram Multi Chat ID Helper', async (t) => {
  await t.test('should extract unique Chat IDs from telegramChatId, allowedChatIdsStr, and allowedChatIds array', () => {
    const settings = {
      telegramChatId: '1001',
      allowedChatIdsStr: '1001, 2002, 3003',
      allowedChatIds: ['2002', '4004'],
    };

    const ids = getUserChatIds(settings);
    assert.deepEqual(ids, ['1001', '2002', '3003', '4004']);
  });

  await t.test('should handle empty or whitespace values gracefully', () => {
    const settings = {
      telegramChatId: '  1001  , ',
      allowedChatIdsStr: ' , 2002 ',
      allowedChatIds: [' ', '3003'],
    };

    const ids = getUserChatIds(settings);
    assert.deepEqual(ids, ['1001', '2002', '3003']);
  });
});
