import { NextResponse } from 'next/server';
import { getSettingsForUser, saveSettingsForUser } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const settings = await getSettingsForUser(username);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const body = await request.json();
    const updated = await saveSettingsForUser(username, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi lưu cài đặt' },
      { status: 500 }
    );
  }
}
