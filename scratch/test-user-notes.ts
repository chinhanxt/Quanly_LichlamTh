import { getLocalSettings, saveLocalSettings } from '../lib/local-db';
import { UserNote } from '../types/schedule';
import assert from 'assert';

console.log('Testing user notes defaults and persistence...');

const settings = getLocalSettings();

// Check defaults
assert.strictEqual(settings.notesTimingMode, 'before_shift', 'Default notesTimingMode should be before_shift');
assert.strictEqual(settings.notesFixedTime, '08:00', 'Default notesFixedTime should be 08:00');
assert.deepStrictEqual(settings.userNotes, [], 'Default userNotes should be []');

// Check saving userNotes
const sampleNote: UserNote = {
  id: 'note_1',
  content: 'Check inventory',
  createdAt: new Date().toISOString(),
  createdFormatted: '2026-07-27 20:00',
  targetDate: '2026-07-28',
  targetShiftCode: 'Ca 1',
  completed: false,
};

const updatedSettings = saveLocalSettings({
  ...settings,
  notesTimingMode: 'fixed_time',
  notesFixedTime: '09:30',
  userNotes: [sampleNote],
});

const reloadedSettings = getLocalSettings();

assert.strictEqual(reloadedSettings.notesTimingMode, 'fixed_time');
assert.strictEqual(reloadedSettings.notesFixedTime, '09:30');
assert.strictEqual(reloadedSettings.userNotes?.length, 1);
assert.strictEqual(reloadedSettings.userNotes?.[0].id, 'note_1');

console.log('All tests passed!');
