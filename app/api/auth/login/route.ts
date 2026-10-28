import { NextResponse } from 'next/server';
import { verifyUserPasswordInFirestore, getUserFromFirestore } from '@/lib/firebase';
import { createSessionToken, ACCOUNT_USERNAMES, setSessionCookie } from '@/lib/auth-session';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = body.password || '';
    const hint = (body.hint || '').trim().toLowerCase();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    // Không cần chọn tài khoản: thử lần lượt, ưu tiên tài khoản dùng lần trước
    const candidates = [hint, ...ACCOUNT_USERNAMES].filter(
      (u, i, arr) => ACCOUNT_USERNAMES.includes(u) && arr.indexOf(u) === i
    );
    let username = '';
    for (const candidate of candidates) {
      if (await verifyUserPasswordInFirestore(candidate, password)) {
        username = candidate;
        break;
      }
    }

    if (!username) {
      return NextResponse.json({ success: false, error: 'Mật khẩu không đúng' }, { status: 401 });
    }

    const userProfile = await getUserFromFirestore(username);
    const user = { username, displayName: userProfile?.displayName || username };
    const response = NextResponse.json({ success: true, user });
    setSessionCookie(response, createSessionToken(user));
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi đăng nhập hệ thống' },
      { status: 500 }
    );
  }
}
