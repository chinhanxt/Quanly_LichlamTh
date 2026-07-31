import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';
import { getSettingsForUser } from '@/lib/firebase';

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

    const userSettings = await getSettingsForUser(username);
    const appsScriptUrl = userSettings.expenseAppsScriptUrl;

    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      return NextResponse.json({ 
        success: true, 
        data: [], 
        warning: 'Chưa cài đặt Apps Script Webhook URL trong Cài Đặt!' 
      });
    }

    // Read directly from Google Sheet via Apps Script doGet
    const res = await fetch(appsScriptUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ success: true, data: [] });
    }

    const json = await res.json();
    return NextResponse.json({ success: true, data: json.items || [] });
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
    const { rawText, autoAddK = true, clientDate } = body;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập nội dung thu/chi!' }, { status: 400 });
    }

    const userSettings = await getSettingsForUser(username);
    const appsScriptUrl = userSettings.expenseAppsScriptUrl;

    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chưa dán Apps Script Webhook URL trong Cài Đặt! Vui lòng làm theo hướng dẫn 2 bước để liên kết Google Sheet làm Database.' 
      }, { status: 400 });
    }

    const groqKey = userSettings.groqApiKey || process.env.GROQ_API_KEY || '';
    const groqModel = userSettings.groqModel || 'llama-3.3-70b-versatile';

    // Calculate exact Vietnam Date (UTC+7)
    const now = new Date();
    const vnFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const vnDateParts = vnFormatter.formatToParts(now);
    const vnYear = vnDateParts.find(p => p.type === 'year')?.value;
    const vnMonth = vnDateParts.find(p => p.type === 'month')?.value;
    const vnDay = vnDateParts.find(p => p.type === 'day')?.value;
    const serverVnTodayStr = `${vnYear}-${vnMonth}-${vnDay}`;

    const todayStr = (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) ? clientDate : serverVnTodayStr;

    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayOfWeek = dayNames[now.getDay()];

    const systemPrompt = `Bạn là trợ lý tài chính cá nhân bằng tiếng Việt siêu thông minh.
Nhiệm vụ: Phân tích câu nhập liệu thu/chi chứa tiếng lóng, viết tắt, tiền tệ VNĐ thành mảng JSON chuẩn.

QUY TẮC TIỀN TỆ & TIẾNG LÓNG VN:
${autoAddK ? '- TỰ ĐỘNG THÊM "K" BẬT: Bất kỳ số nguyên nào đứng một mình KHÔNG kèm đơn vị (ví dụ người dùng gõ "45", "30", "150", "500") BẮT BUỘC mặc định quy đổi thành x 1.000 VNĐ (Ví dụ: "45" -> 45.000 VNĐ, "30" -> 30.000 VNĐ, "150" -> 150.000 VNĐ). Trừ khi người dùng đã gõ rõ từ khác như "củ", "tr", "triệu", "k", "lách".\n' : ''}- "k", "kđ", "ngàn", "cành", "lách": x 1.000 (Vd: 50k = 50000, 3 cành = 3000)
- "tr", "triệu", "củ", "khoai", "m": x 1.000.000 (Vd: 2 củ = 2000000, 1.5tr = 1500000)
- "loét", "xị", "lốp", "vé": 100.000 (Vd: 3 loét = 300000, 5 xị = 500000)
- "chục": 10 (Vd: "5 chục" = 50000; "2 chục củ" = 20000000)
- "tỷ", "tỉ": x 1.000.000.000
- Chi: "ăn", "uống", "mua", "đổ xăng", "trả", "đóng tiền", "mất", "chuyển khoản cho", "tốn", "lượn", "đi chợ"
- Thu: "được thưởng", "lương", "sếp cho", "bán được", "khách trả", "nhận", "mừng tuổi"

DANH MỤC:
- Chi: "Ăn uống", "Di chuyển", "Mua sắm", "Hóa đơn", "Giải trí", "Khác"
- Thu: "Lương/Thưởng", "Đầu tư", "Khác"

NGÀY HÔM NAY TẠI VIỆT NAM BẮT BUỘC LÀ: ${todayStr} (${dayOfWeek}).

QUY TẮC XÁC ĐỊNH NGÀY BẮT BUỘC:
- Nếu người dùng KHÔNG ghi rõ từ chỉ thời gian (như "hôm qua", "hôm kia", "ngày 25/7"), BẮT BUỘC date phải là ngày hôm nay: "${todayStr}". Tuyệt đối KHÔNG tự sáng tạo ngày khác!
- "hôm nay", "sáng nay", "bữa nay": Lấy đúng ngày ${todayStr}
- "hôm qua": Lấy ngày hôm qua (tính lùi 1 ngày từ ${todayStr})
- "hôm kia": Lấy ngày hôm kia (tính lùi 2 ngày từ ${todayStr})
- "ngày 25", "25/7", "ngày 25 tháng 7": Tự quy đổi ra dạng YYYY-MM-DD
- "thứ 2 vừa rồi", "thứ 3 tuần trước": Tự tính lùi về ngày tương ứng gần nhất

QUY TẮC TỪ CHỐI TƯƠNG LAI (BẮT BUỘC):
- Nếu người dùng nhắc tới thu/chi trong TƯƠNG LAI so với ngày hôm nay (${todayStr}) như: "ngày mai", "tối mai", "ngày kia", "tuần sau", "tháng sau", hoặc bất kỳ ngày nào lớn hơn ngày ${todayStr}:
  -> TRẢ VỀ JSON: { "isFuture": true, "futureError": "Không thể ghi nhận thu/chi trong tương lai! Vui lòng chỉ nhập thu/chi đã diễn ra." }

CẤU TRÚC JSON CHUẨN NẾU HỢP LỆ:
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

    if (parsedObj.isFuture) {
      return NextResponse.json({
        success: false,
        error: parsedObj.futureError || 'Không thể ghi nhận thu/chi trong tương lai! Vui lòng chỉ nhập thu/chi đã diễn ra.',
      }, { status: 400 });
    }

    if (!parsedObj.items || !Array.isArray(parsedObj.items) || parsedObj.items.length === 0) {
      return NextResponse.json({ success: false, error: 'AI không tìm thấy thông tin thu/chi nào trong đoạn văn trên.' }, { status: 400 });
    }

    // Check if rawText mentions explicit past date keywords
    const hasRelativeDateKeyword = /hôm qua|hôm kia|ngày \d|\d{1,2}\/\d{1,2}|thứ \d/i.test(rawText);

    // If no past date keyword was explicitly typed, force date to todayStr
    for (const item of parsedObj.items) {
      if (!hasRelativeDateKeyword) {
        item.date = todayStr;
      } else if (item.date && item.date > todayStr) {
        return NextResponse.json({
          success: false,
          error: `Không thể ghi nhận giao dịch cho ngày tương lai (${item.date})!`,
        }, { status: 400 });
      }
    }

    // Send parsed items directly to Google Sheet Web App
    const sheetRes = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'append_expenses',
        items: parsedObj.items.map((item: any) => ({
          date: item.date || todayStr,
          type: item.type === 'Thu' ? 'Thu' : 'Chi',
          category: item.category || 'Khác',
          amount: Number(item.amount) || 0,
          description: item.description || rawText,
          rawText: rawText,
        })),
      }),
    });

    if (!sheetRes.ok) {
      const errText = await sheetRes.text();
      return NextResponse.json({ success: false, error: `Google Sheet Lỗi (${sheetRes.status}): ${errText}` }, { status: 500 });
    }

    const sheetJson = await sheetRes.json();
    if (!sheetJson.success) {
      return NextResponse.json({ success: false, error: sheetJson.error || 'Lỗi lưu vào Google Sheet' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã bóc tách & lưu trực tiếp ${sheetJson.count || parsedObj.items.length} giao dịch vào Google Sheet!`,
      data: sheetJson.items || parsedObj.items,
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

    if (username !== 'chinhan') {
      return NextResponse.json({ success: false, error: 'Chỉ hỗ trợ tài khoản Chí Nhân' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id giao dịch' }, { status: 400 });
    }

    const userSettings = await getSettingsForUser(username);
    const appsScriptUrl = userSettings.expenseAppsScriptUrl;

    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Chưa cài đặt Webhook Apps Script URL' }, { status: 400 });
    }

    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_expense',
        id: id,
      }),
    });

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
