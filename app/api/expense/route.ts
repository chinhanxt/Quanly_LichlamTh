import { NextResponse } from 'next/server';
import { getAuthSessionUser } from '@/lib/auth-session';
import { generateGemini, parseJsonText } from '@/lib/gemini';
import {
  getSettingsForUser,
  getExpenseItemsForUser,
  addExpenseItemsForUser,
  updateExpenseItemForUser,
  deleteExpenseItemForUser,
  NewExpense,
} from '@/lib/firebase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const revalidate = 0;

function resolveUsername(request: Request): string {
  return getAuthSessionUser(request)?.username || 'thanhhuong';
}

function vnToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const dedupeKey = (i: { date: string; type: string; amount: number; description: string }) =>
  `${i.date}|${i.type}|${Math.round(Number(i.amount) || 0)}|${(i.description || '').trim().toLowerCase()}`;

export async function GET(request: Request) {
  try {
    const username = resolveUsername(request);
    const items = await getExpenseItemsForUser(username);
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function parseWithAI(username: string, rawText: string, autoAddK: boolean, clientDate?: string) {
  // Tài khoản chưa có key riêng thì dùng chung Gemini key của tài khoản còn lại
  let apiKey = '';
  for (const account of [username, 'chinhan', 'thanhhuong']) {
    apiKey = (await getSettingsForUser(account)).geminiApiKey || '';
    if (apiKey) break;
  }
  apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Chưa có Gemini API Key — vào tab Cấu hình để nhập.');
  }
  const todayStr = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : vnToday();
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeek = dayNames[new Date(todayStr + 'T12:00:00').getDay()];

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

  const text = await generateGemini({ apiKey, systemInstruction: systemPrompt, parts: [{ text: rawText }], json: true });
  const parsedObj = parseJsonText(text);
  if (parsedObj.isFuture) {
    throw new Error(parsedObj.futureError || 'Không thể ghi nhận thu/chi trong tương lai!');
  }
  if (!Array.isArray(parsedObj.items) || parsedObj.items.length === 0) {
    throw new Error('AI không tìm thấy thông tin thu/chi nào trong đoạn văn trên.');
  }
  const hasDateKeyword = /hôm qua|hôm kia|ngày \d|\d{1,2}\/\d{1,2}|thứ \d/i.test(rawText);
  return parsedObj.items.map((item: any): NewExpense => {
    const date = !hasDateKeyword || !item.date || item.date > todayStr ? todayStr : item.date;
    return {
      date,
      type: item.type === 'Thu' ? 'Thu' : 'Chi',
      category: item.category || 'Khác',
      amount: Number(item.amount) || 0,
      description: item.description || rawText,
      rawText,
    };
  });
}

export async function POST(request: Request) {
  try {
    const username = resolveUsername(request);
    const body = await request.json();

    let toSave: NewExpense[];
    if (Array.isArray(body.items)) {
      toSave = body.items
        .map((i: any): NewExpense => ({
          date: /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : vnToday(),
          type: i.type === 'Thu' ? 'Thu' : 'Chi',
          category: i.category || 'Khác',
          amount: Number(i.amount) || 0,
          description: String(i.description || '').trim(),
          rawText: i.rawText || '',
        }))
        .filter((i: NewExpense) => i.amount > 0);
    } else if (typeof body.rawText === 'string' && body.rawText.trim()) {
      toSave = await parseWithAI(username, body.rawText.trim(), body.autoAddK !== false, body.clientDate);
    } else {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập nội dung thu/chi!' }, { status: 400 });
    }

    let skipped = 0;
    if (body.dedupe) {
      const existing = new Set((await getExpenseItemsForUser(username)).map(dedupeKey));
      const before = toSave.length;
      toSave = toSave.filter((i) => {
        const k = dedupeKey(i);
        if (existing.has(k)) return false;
        existing.add(k);
        return true;
      });
      skipped = before - toSave.length;
    }

    if (toSave.length === 0) {
      return NextResponse.json({ success: true, data: [], skipped, message: skipped ? `Không có giao dịch mới (bỏ qua ${skipped} dòng trùng)` : 'Không có giao dịch hợp lệ' });
    }

    const saved = await addExpenseItemsForUser(username, toSave);
    return NextResponse.json({
      success: true,
      data: saved,
      skipped,
      message: `Đã lưu ${saved.length} giao dịch${skipped ? `, bỏ qua ${skipped} dòng trùng` : ''}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi xử lý API' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const username = resolveUsername(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Thiếu id giao dịch' }, { status: 400 });
    await updateExpenseItemForUser(username, id, await request.json());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const username = resolveUsername(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Thiếu id giao dịch' }, { status: 400 });
    await deleteExpenseItemForUser(username, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
