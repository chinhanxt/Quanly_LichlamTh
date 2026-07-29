import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Đã đăng xuất' });
  response.cookies.set('app_session', '', {
    path: '/',
    httpOnly: true,
    maxAge: 0,
  });
  return response;
}
