import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';

export async function GET(request: Request) {
  const user = getAuthSessionUser(request);
  if (user) {
    return NextResponse.json({ authenticated: true, user });
  }
  return NextResponse.json({ authenticated: false, user: null });
}
