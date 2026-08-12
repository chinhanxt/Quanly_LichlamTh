import { NextResponse } from 'next/server';
import { getSettingsForUser, saveSettingsForUser } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';
import { SECRET_FIELDS, isSecretMasked } from '@/lib/secrets';
import { maskSecretFields } from '@/lib/secrets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const settings = await getSettingsForUser(username);
    return NextResponse.json({ success: true, data: maskSecretFields(settings) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const body = await request.json();
    const current = await getSettingsForUser(username);
    const updated = { ...body };
    for (const field of SECRET_FIELDS) {
      if (isSecretMasked(updated[field])) {
        updated[field] = current[field] || '';
      }
    }
    await saveSettingsForUser(username, updated);
    return NextResponse.json({ success: true, data: maskSecretFields(updated) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi lưu cài đặt' },
      { status: 500 }
    );
  }
}
