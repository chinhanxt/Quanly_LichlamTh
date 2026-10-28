import { AuthSessionUser } from '@/types/user';

import type { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'app_session';

export const ACCOUNT_USERNAMES = ['thanhhuong', 'chinhan'];

export const ACCOUNT_LABELS: Record<string, string> = {
  thanhhuong: 'Thanh Hương',
  chinhan: 'Chí Nhân',
};

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export function createSessionToken(user: AuthSessionUser): string {
  const payload = {
    username: user.username,
    displayName: user.displayName,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function parseSessionToken(token: string): AuthSessionUser | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const data = JSON.parse(raw);
    if (data && data.username && data.exp > Date.now()) {
      return {
        username: data.username,
        displayName: data.displayName || data.username,
      };
    }
  } catch {
    // invalid token
  }
  return null;
}

export function getAuthSessionUser(req?: Request): AuthSessionUser | null {
  if (req) {
    const xUser = req.headers.get('x-username');
    if (xUser) {
      return {
        username: xUser,
        displayName: xUser === 'chinhan' ? 'Chí Nhân' : 'Thanh Hương',
      };
    }
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/app_session=([^;]+)/);
    if (match && match[1]) {
      return parseSessionToken(match[1]);
    }
  }
  return null;
}
