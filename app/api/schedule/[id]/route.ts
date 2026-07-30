import { NextResponse } from 'next/server';
import { updateScheduleItemForUser, deleteScheduleItemForUser } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const body = await request.json();
    const success = await updateScheduleItemForUser(username, id, { ...body, username });
    if (!success) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    await deleteScheduleItemForUser(username, id);
    return NextResponse.json({ success: true, message: 'Đã xóa ca làm thành công' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
