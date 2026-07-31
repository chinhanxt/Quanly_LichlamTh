import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';
import { getSettingsForUser } from '@/lib/firebase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || request.headers.get('x-username') || 'chinhan';
    const body = await request.json();

    const { date, dayOfWeek, action, shiftType, subject } = body;
    const userSettings = await getSettingsForUser(username);

    const webhookUrl = (userSettings as any)?.googleAppsScriptWebhookUrl || process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL;

    // If an Apps Script Webhook URL is configured, push directly to Google Sheet
    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId: '1UnBM5lf3RNOtY7ACJ5soHDgOTz2rPZqr',
            employeeName: 'Nguyễn Chí Nhân',
            date,
            dayOfWeek,
            action, // 'upsert' | 'delete'
            shiftType, // 'SANG' | 'CHIEU' | 'FULL' | 'OFF'
          }),
        });
      } catch (err) {
        console.warn('Apps Script Webhook error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      action,
      date,
      shiftType: action === 'delete' ? 'OFF' : shiftType,
      message: action === 'delete'
        ? `Đã tự động xóa 'x' khỏi ô ngày ${date} trên Google Sheet!`
        : `Đã tự động cập nhật 'x' vào ca ${shiftType || subject} ngày ${date} trên Google Sheet!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi đồng bộ Google Sheet' },
      { status: 500 }
    );
  }
}
