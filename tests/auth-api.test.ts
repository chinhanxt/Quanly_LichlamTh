import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as loginPOST } from '../app/api/auth/login/route';
import { GET as meGET } from '../app/api/auth/me/route';
import { updateUserPasswordInFirestore } from '../lib/firebase';

test('Auth API Routes', async (t) => {
  await t.test('should reject invalid credentials on login', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'thanhhuong', password: 'wrongpassword' }),
    });
    const res = await loginPOST(req);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  await t.test('should accept valid credentials for thanhhuong', async () => {
    await updateUserPasswordInFirestore('thanhhuong', '1515');
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'thanhhuong', password: '1515' }),
    });
    const res = await loginPOST(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.displayName, 'Thanh Hương');
  });

  await t.test('should accept valid credentials for chinhan', async () => {
    await updateUserPasswordInFirestore('chinhan', '1515');
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'chinhan', password: '1515' }),
    });
    const res = await loginPOST(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.displayName, 'Chí Nhân');
  });
});
