import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getLocalSettings } from '../lib/local-db';
import { ScheduleSettings } from '../types/schedule';

describe('Settings sentRemindersLog schema', () => {
  it('should include sentRemindersLog as an object in default local settings', () => {
    const settings: ScheduleSettings = getLocalSettings();
    assert.ok(typeof settings.sentRemindersLog === 'object' && settings.sentRemindersLog !== null);
  });
});
