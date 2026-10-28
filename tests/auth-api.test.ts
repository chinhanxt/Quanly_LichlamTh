import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as loginPOST } from '../app/api/auth/login/route';
import { POST as switchPOST } from '../app/api/auth/switch/route';
import { createSessionToken, parseSessionToken } from '../lib/auth-session';

// Không ghi mật khẩu vào Firestore thật — chỉ kiểm tra các nhánh không phụ thuộc mật khẩu hiện tại
const loginReq = (body: object) =>
  new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const sessionFrom = (res: Response) => {
  const match = (res.headers.get('set-cookie') || '').match(/app_session=([^;]+)/);
  return match ? parseSessionToken(match[1]) : null;
};

test('Auth API Routes', async (t) => {
  await t.test('rejects empty password', async () => {
    const res = await loginPOST(loginReq({ password: '' }));
    assert.equal(res.status, 400);
  });

  await t.test('rejects wrong password without choosing an account', async () => {
    const res = await loginPOST(loginReq({ password: 'definitely-wrong-password' }));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).success, false);
  });

  await t.test('switch requires a valid session', async () => {
    const res = await switchPOST(new Request('http://localhost/api/auth/switch', {
      method: 'POST',
      body: JSON.stringify({ username: 'chinhan' }),
    }));
    assert.equal(res.status, 401);
  });

  await t.test('switch re-issues the session cookie for the other account', async () => {
    const token = createSessionToken({ username: 'thanhhuong', displayName: 'Thanh Hương' });
    const res = await switchPOST(new Request('http://localhost/api/auth/switch', {
      method: 'POST',
      headers: { cookie: `app_session=${token}` },
      body: JSON.stringify({ username: 'chinhan' }),
    }));
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.username, 'chinhan');
    assert.equal(sessionFrom(res)?.username, 'chinhan');
  });

  await t.test('switch rejects unknown accounts', async () => {
    const token = createSessionToken({ username: 'thanhhuong', displayName: 'Thanh Hương' });
    const res = await switchPOST(new Request('http://localhost/api/auth/switch', {
      method: 'POST',
      headers: { cookie: `app_session=${token}` },
      body: JSON.stringify({ username: 'hacker' }),
    }));
    assert.equal(res.status, 400);
  });
});
