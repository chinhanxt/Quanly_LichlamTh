import { NextResponse } from 'next/server';
import { getUserFromFirestore } from '@/lib/firebase';
import { createSessionToken, parseSessionToken, ACCOUNT_USERNAMES, setSessionCookie } from '@/lib/auth-session';

export async function POST(request: Request) {
  const match = (request.headers.get('cookie') || '').match(/app_session=([^;]+)/);
  const current = match ? parseSessionToken(match[1]) : null;
  if (!current) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const target = (body.username || '').trim().toLowerCase();
  if (!ACCOUNT_USERNAMES.includes(target)) {
    return NextResponse.json({ success: false, error: 'Tài khoản không hợp lệ' }, { status: 400 });
  }

  const profile = await getUserFromFirestore(target);
  const user = { username: target, displayName: profile?.displayName || target };
  const response = NextResponse.json({ success: true, user });
  setSessionCookie(response, createSessionToken(user));
  return response;
}
