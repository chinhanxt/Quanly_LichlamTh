import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';
import { getSettingsForUser, getExpenseItemsForUser } from '@/lib/firebase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || request.headers.get('x-username') || 'chinhan';

    if (username !== 'chinhan') {
      return NextResponse.json({ success: false, error: 'Chỉ hỗ trợ tài khoản Chí Nhân' }, { status: 403 });
    }

    const userSettings = await getSettingsForUser(username);
    const appsScriptUrl = userSettings.expenseAppsScriptUrl;

    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      return NextResponse.json({
        success: false,
        error: 'Chưa nhập Webhook Apps Script URL! Vui lòng Deploy Web App trong Google Sheet rồi dán URL vào Cài đặt.',
      }, { status: 400 });
    }

    const items = await getExpenseItemsForUser(username);
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'Chưa có giao dịch nào để đồng bộ.' }, { status: 400 });
    }

    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'append_expenses',
        items: items,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: `Apps Script Lỗi: ${errText}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã đẩy thành công ${items.length} giao dịch sang Google Sheet!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi đồng bộ Google Sheet' }, { status: 500 });
  }
}
