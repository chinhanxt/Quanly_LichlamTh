import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';
import { getSettingsForUser, getExpenseItemsForUser, addExpenseItemForUser, deleteExpenseItemForUser } from '@/lib/firebase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || request.headers.get('x-username') || 'chinhan';
    
    // Only chinhan is allowed for expense feature
    if (username !== 'chinhan') {
      return NextResponse.json({ success: true, data: [] });
    }

    const items = await getExpenseItemsForUser(username);
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || request.headers.get('x-username') || 'chinhan';

    if (username !== 'chinhan') {
      return NextResponse.json({ success: false, error: 'Chức năng chi tiêu chỉ áp dụng cho tài khoản Chí Nhân!' }, { status: 403 });
    }

    const body = await request.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập nội dung thu/chi!' }, { status: 400 });
    }

    const userSettings = await getSettingsForUser(username);
    const groqKey = userSettings.groqApiKey || process.env.GROQ_API_KEY || '';
    const groqModel = userSettings.groqModel || 'llama-3.3-70b-versatile';

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `Bạn là trợ lý tài chính cá nhân bằng tiếng Việt siêu thông minh.
Nhiệm vụ: Phân tích câu nhập liệu thu/chi chứa tiếng lóng, viết tắt, tiền tệ VNĐ thành mảng JSON chuẩn.

QUY TẮC TIỀN TỆ & TIẾNG LÓNG VN:
- "k", "kđ", "ngàn", "cành", "lách": x 1.000 (Vd: 50k = 50000, 3 cành = 3000)
- "tr", "triệu", "củ", "khoai", "m": x 1.000.000 (Vd: 2 củ = 2000000, 1.5tr = 1500000)
- "loét", "xị", "lốp", "vé": 100.000 (Vd: 3 loét = 300000, 5 xị = 500000)
- "chục": 10 (Vd: "5 chục" = 50000; "2 chục củ" = 20000000)
- "tỷ", "tỉ": x 1.000.000.000
- Chi: "ăn", "uống", "mua", "đổ xăng", "trả", "đóng tiền", "mất", "chuyển khoản cho", "tốn", "lượn"
- Thu: "được thưởng", "lương", "sếp cho", "bán được", "khách trả", "nhận", "mừng tuổi"

DANH MỤC:
- Chi: "Ăn uống", "Di chuyển", "Mua sắm", "Hóa đơn", "Giải trí", "Khác"
- Thu: "Lương/Thưởng", "Đầu tư", "Khác"

HÔM NAY LÀ: ${todayStr}. Nếu dùng "hôm qua", "hôm kia", hãy tự tính ngày YYYY-MM-DD.

CẤU TRÚC JSON TRẢ VỀ BẮT BUỘC:
{
  "items": [
    {
      "date": "YYYY-MM-DD",
      "type": "Chi" hoặc "Thu",
      "category": "Ăn uống" | "Di chuyển" | "Mua sắm" | "Hóa đơn" | "Giải trí" | "Lương/Thưởng" | "Đầu tư" | "Khác",
      "amount": 45000,
      "description": "Ăn phở sáng"
    }
  ]
}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json({ success: false, error: `Groq API Lỗi (${groqRes.status}): ${errText}` }, { status: 500 });
    }

    const groqData = await groqRes.json();
    const parsedText = groqData.choices?.[0]?.message?.content || '{}';
    const parsedObj = JSON.parse(parsedText);

    if (!parsedObj.items || !Array.isArray(parsedObj.items) || parsedObj.items.length === 0) {
      return NextResponse.json({ success: false, error: 'AI không tìm thấy thông tin thu/chi nào trong đoạn văn trên.' }, { status: 400 });
    }

    const savedItems = [];
    for (const item of parsedObj.items) {
      const saved = await addExpenseItemForUser(username, {
        date: item.date || todayStr,
        type: item.type === 'Thu' ? 'Thu' : 'Chi',
        category: item.category || 'Khác',
        amount: Number(item.amount) || 0,
        description: item.description || rawText,
        rawText: rawText,
      });
      savedItems.push(saved);
    }

    // Attempt pushing to Google Sheet via Webhook if configured
    const appsScriptUrl = userSettings.expenseAppsScriptUrl;
    if (appsScriptUrl && appsScriptUrl.startsWith('http')) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'append_expenses',
            items: savedItems,
          }),
        });
      } catch (e) {
        console.warn('Apps Script sync warn:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã phân tích và lưu thành công ${savedItems.length} giao dịch!`,
      data: savedItems,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi xử lý API' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = getAuthSessionUser(request);
    const username = sessionUser?.username || request.headers.get('x-username') || 'chinhan';
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id giao dịch' }, { status: 400 });
    }

    const deleted = await deleteExpenseItemForUser(username, id);
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
