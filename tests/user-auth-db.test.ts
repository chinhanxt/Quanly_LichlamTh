import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyUserPasswordLocal, updateUserPasswordLocal, getSettingsForUserLocal, getUserLocal, getScheduleItemsForUserLocal, saveScheduleItemsForUserLocal } from '../lib/local-db';
import { getUserFromFirestore, verifyUserPasswordInFirestore, updateUserPasswordInFirestore, getSettingsForUser, getScheduleItemsForUser } from '../lib/firebase';

test('User Auth & Database Isolation', async (t) => {
  await t.test('should verify default user password correctly', async () => {
    const valid = verifyUserPasswordLocal('thanhhuong', '1515');
    assert.equal(valid, true);

    const invalid = verifyUserPasswordLocal('thanhhuong', 'wrongpass');
    assert.equal(invalid, false);
  });

  await t.test('should allow updating user password', async () => {
    try {
      await updateUserPasswordInFirestore('thanhhuong', 'newpass123');
      assert.equal(verifyUserPasswordLocal('thanhhuong', 'newpass123'), true);
    } finally {
      await updateUserPasswordInFirestore('thanhhuong', '1515');
    }
  });

  await t.test('should return scoped settings for user', async () => {
    const settings = getSettingsForUserLocal('thanhhuong');
    assert.ok(settings);
    assert.equal(settings.employeeName, 'Thanh Hương');

    const chinhanSettings = getSettingsForUserLocal('chinhan');
    assert.ok(chinhanSettings);
    assert.equal(chinhanSettings.employeeName, 'Chí Nhân');
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

    const validPass = await verifyUserPasswordInFirestore('thanhhuong', '1515');
    assert.equal(validPass, true);

    const settings = await getSettingsForUser('thanhhuong');
    assert.ok(settings);

    const items = await getScheduleItemsForUser('thanhhuong');
    assert.ok(Array.isArray(items));
  });
});
