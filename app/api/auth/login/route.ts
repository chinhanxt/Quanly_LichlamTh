import { NextResponse } from 'next/server';
import { verifyUserPasswordInFirestore, getUserFromFirestore } from '@/lib/firebase';
import { createSessionToken } from '@/lib/auth-session';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || '').trim().toLowerCase();
    const password = body.password || '';

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' },
        { status: 400 }
      );
    }

    const isValid = await verifyUserPasswordInFirestore(username, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const userProfile = await getUserFromFirestore(username);
    const displayName = userProfile?.displayName || username;

    const token = createSessionToken({ username, displayName });

    const response = NextResponse.json({
      success: true,
      user: { username, displayName },
    });

    response.cookies.set('app_session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi đăng nhập hệ thống' },
      { status: 500 }
    );
  }
}
