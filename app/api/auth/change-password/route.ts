import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';
import { verifyUserPasswordInFirestore, updateUserPasswordInFirestore } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const user = getAuthSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập hệ thống' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = body.currentPassword || '';
    const newPassword = body.newPassword || '';

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu mới phải có ít nhất 4 ký tự' },
        { status: 400 }
      );
    }

    const isCurrentValid = await verifyUserPasswordInFirestore(user.username, currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu hiện tại không chính xác' },
        { status: 400 }
      );
    }

    await updateUserPasswordInFirestore(user.username, newPassword);

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi cập nhật mật khẩu' },
      { status: 500 }
    );
  }
}
