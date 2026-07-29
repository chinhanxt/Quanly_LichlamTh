import { NextResponse } from 'next/server';
import { updateScheduleItem, deleteScheduleItem } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const body = await request.json();
    const success = await updateScheduleItem(params.id, { ...body, username });
    if (!success) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'thanhhuong';
    const success = await deleteScheduleItem(params.id);
    if (!success) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
