import { NextResponse } from 'next/server';
import { getScheduleItemsForUser, saveScheduleItemsForUser, addScheduleItem } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';

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
      await saveScheduleItemsForUser(username, body);
      return NextResponse.json({ success: true, message: 'Đã lưu và ghi đè lịch làm việc tuần thành công' });
    }
    const newItem = await addScheduleItem({ ...body, username });
    return NextResponse.json({ success: true, data: newItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
