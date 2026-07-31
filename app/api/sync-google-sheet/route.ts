import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';
import { getSettingsForUser, saveScheduleItemsForUser } from '@/lib/firebase';
import { parseGoogleSheetSchedule } from '@/lib/google-sheet-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || 'chinhan';

    const userSettings = await getSettingsForUser(username);
    const body = await request.json().catch(() => ({}));

    const sheetUrl =
      body.sheetUrl ||
      userSettings.googleSheetUrl ||
      'https://docs.google.com/spreadsheets/d/1UnBM5lf3RNOtY7ACJ5soHDgOTz2rPZqr/edit?gid=229272214#gid=229272214';

    const employeeName =
      body.employeeName ||
      userSettings.employeeName ||
      (username === 'chinhan' ? 'Nguyễn Chí Nhân' : 'Thanh Hương');

    const result = await parseGoogleSheetSchedule(sheetUrl, employeeName);

    // Save schedule items to database for this user
    await saveScheduleItemsForUser(username, result.items as any, true);

    return NextResponse.json({
      success: true,
      message: `Đồng bộ Google Sheet thành công! Đã ghi nhận ${result.totalShifts} buổi trực (${result.totalSalary.toLocaleString('vi-VN')} đ).`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Không thể đồng bộ Google Sheet' },
      { status: 500 }
    );
  }
}
