import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveScheduleItemsForUser,
  updateScheduleItemForUser,
  getScheduleItemsForUser,
} from '../lib/firebase';
import { ScheduleItem } from '../types/schedule';

test('Schedule User-Scoped CRUD & Smart Import Merge', async (t) => {
  const TEST_USER = 'test_user_merge_123';

  await t.test('should correctly update shift hours for a user', async () => {
    const initialItem: ScheduleItem = {
      id: 'test_edit_1',
      dayOfWeek: 'Thu3',
      date: '2026-07-28',
      startTime: '16:00',
      endTime: '22:00',
      subject: 'Highlands Coffee (Ca B16)',
      location: 'Highlands Coffee',
      note: 'B16',
      reminderEnabled: true,
      username: TEST_USER,
    };

    await saveScheduleItemsForUser(TEST_USER, [initialItem], false);
    const updated = await updateScheduleItemForUser(TEST_USER, 'test_edit_1', {
      startTime: '11:00',
      endTime: '18:00',
    });

    assert.equal(updated, true);
    const items = await getScheduleItemsForUser(TEST_USER);
    const editedItem = items.find((i) => i.id === 'test_edit_1');
    assert.ok(editedItem);
    assert.equal(editedItem.startTime, '11:00');
    assert.equal(editedItem.endTime, '18:00');
  });

  await t.test('should merge imported schedules without deleting non-overlapping dates', async () => {
    const currentShift: ScheduleItem = {
      id: 'current_1',
      dayOfWeek: 'Thu3',
      date: '2026-07-28',
      startTime: '16:00',
      endTime: '22:00',
      subject: 'Highlands Coffee',
      location: 'Highlands Coffee',
      note: 'B16',
      reminderEnabled: true,
      username: TEST_USER,
    };

    await saveScheduleItemsForUser(TEST_USER, [currentShift], false);

    // Import schedule for a past date (2026-07-20)
    const pastShift: ScheduleItem = {
      id: 'past_1',
      dayOfWeek: 'Thu2',
      date: '2026-07-20',
      startTime: '08:00',
      endTime: '12:00',
      subject: 'Highlands Coffee',
      location: 'Highlands Coffee',
      note: 'A11',
      reminderEnabled: true,
      username: TEST_USER,
    };

    await saveScheduleItemsForUser(TEST_USER, [pastShift], true);

    const resultItems = await getScheduleItemsForUser(TEST_USER);

    // Should contain BOTH past_1 and current_1
    assert.equal(resultItems.length, 2);
    const foundCurrent = resultItems.find((i) => i.date === '2026-07-28');
    const foundPast = resultItems.find((i) => i.date === '2026-07-20');
    assert.ok(foundCurrent);
    assert.ok(foundPast);
    assert.equal(foundCurrent.startTime, '16:00');
  });
});
