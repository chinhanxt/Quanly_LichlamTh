import { NextResponse } from 'next/server';
import { getScheduleItemsForUser, saveScheduleItemsForUser, addScheduleItemForUser } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const items = await getScheduleItemsForUser(username);
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const body = await request.json();
    if (Array.isArray(body)) {
      const merged = await saveScheduleItemsForUser(username, body);
      return NextResponse.json({ success: true, message: 'Đã lưu và cập nhật lịch làm việc thành công', data: merged });
    }
    const newItem = await addScheduleItemForUser(username, body);
    return NextResponse.json({ success: true, data: newItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
