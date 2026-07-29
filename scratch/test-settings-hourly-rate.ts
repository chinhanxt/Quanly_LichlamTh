import assert from 'assert';
import { getLocalSettings, saveLocalSettings } from '../lib/local-db';

console.log('Testing hourlyRate in local-db...');

const initialSettings = getLocalSettings();
assert.strictEqual(initialSettings.hourlyRate, 26000, 'Default hourlyRate should be 26000');

const updated = saveLocalSettings({
  ...initialSettings,
  hourlyRate: 35000,
});

const reloaded = getLocalSettings();
assert.strictEqual(reloaded.hourlyRate, 35000, 'Saved hourlyRate should be 35000');

console.log('ALL TESTS PASSED!');
