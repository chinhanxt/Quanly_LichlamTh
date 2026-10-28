import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyUserPasswordLocal, getSettingsForUserLocal, getUserLocal, getScheduleItemsForUserLocal, saveScheduleItemsForUserLocal } from '../lib/local-db';
import { getUserFromFirestore, verifyUserPasswordInFirestore, getSettingsForUser, getScheduleItemsForUser } from '../lib/firebase';

test('User Auth & Database Isolation', async (t) => {
  await t.test('should reject wrong local password', async () => {
    const invalid = verifyUserPasswordLocal('thanhhuong', 'wrongpass');
    assert.equal(invalid, false);
  });

  await t.test('should return scoped settings for user', async () => {
    const settings = getSettingsForUserLocal('thanhhuong');
    assert.ok(settings);
    assert.equal(settings.username, 'thanhhuong');

    const chinhanSettings = getSettingsForUserLocal('chinhan');
    assert.ok(chinhanSettings);
    assert.equal(chinhanSettings.username, 'chinhan');
    assert.equal(chinhanSettings.hourlyRate, 100000);
  });

  await t.test('should handle user schedule item isolation', async () => {
    const defaultUserItems = getScheduleItemsForUserLocal('thanhhuong');
    assert.ok(Array.isArray(defaultUserItems));

    const chinhanItems = getScheduleItemsForUserLocal('chinhan');
    assert.ok(Array.isArray(chinhanItems));
  });

  await t.test('should check Firestore helper fallbacks', async () => {
    const user = await getUserFromFirestore('thanhhuong');
    assert.ok(user);
    assert.equal(user?.username, 'thanhhuong');

    const invalidPass = await verifyUserPasswordInFirestore('thanhhuong', 'definitely-wrong-password');
    assert.equal(invalidPass, false);

    const settings = await getSettingsForUser('thanhhuong');
    assert.ok(settings);

    const items = await getScheduleItemsForUser('thanhhuong');
    assert.ok(Array.isArray(items));
  });
});
