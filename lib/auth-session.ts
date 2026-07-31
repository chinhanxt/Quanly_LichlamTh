import { AuthSessionUser } from '@/types/user';

const SESSION_COOKIE_NAME = 'app_session';

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
