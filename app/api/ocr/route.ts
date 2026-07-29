import { NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { matchEmployeeLine, parseScheduleLine } from '@/lib/ocr-parser';

export async function parseWithGemini(inputBuffer: Buffer, employeeName: string, apiKey: string) {
  const base64Data = inputBuffer.toString('base64');
  const currentYear = new Date().getFullYear();

  const prompt = `Bạn là chuyên gia phân tích ảnh lịch làm việc nhân viên (Highlands Coffee / nhà hàng / siêu thị).
Nhiệm vụ:
1. Đọc hàng tiêu đề ngày ở trên cùng các cột của bảng lịch (Ví dụ: MON 27-Jul, TUE 28-Jul, WED 29-Jul... hoặc 27/07, 28/07...). Hãy trích xuất CHÍNH XÁC ngày tháng năm (định dạng YYYY-MM-DD, ví dụ 2026-07-27, năm mặc định là ${currentYear}) tương ứng với từng cột từ Thứ 2 đến Chủ Nhật.
2. Tìm đúng dòng của nhân viên tên "${employeeName}" (hoặc tên gần đúng nhất) và trích xuất lịch làm việc 7 ngày từ Thứ 2 (Thu2) đến Chủ Nhật (CN).

Hãy trả về DUY NHẤT một chuỗi mảng JSON hợp lệ chứa 7 phần tử đại diện cho 7 ngày theo đúng định dạng sau:
[
  { "dayOfWeek": "Thu2", "date": "${currentYear}-07-27", "dayLabel": "Thu2 27/07", "shiftCode": "B18", "startTime": "18:00", "endTime": "22:00", "isOff": false, "subject": "Highlands Coffee (Ca B18)" },
  { "dayOfWeek": "Thu3", "date": "${currentYear}-07-28", "dayLabel": "Thu3 28/07", "shiftCode": "B16", "startTime": "16:00", "endTime": "22:00", "isOff": false, "subject": "Highlands Coffee (Ca B16)" },
  { "dayOfWeek": "Thu4", "date": "${currentYear}-07-29", "dayLabel": "Thu4 29/07", "shiftCode": "B18", "startTime": "18:00", "endTime": "22:00", "isOff": false, "subject": "Highlands Coffee (Ca B18)" },
  { "dayOfWeek": "Thu5", "date": "${currentYear}-07-30", "dayLabel": "Thu5 30/07", "shiftCode": "B18", "startTime": "18:00", "endTime": "22:00", "isOff": false, "subject": "Highlands Coffee (Ca B18)" },
  { "dayOfWeek": "Thu6", "date": "${currentYear}-07-31", "dayLabel": "Thu6 31/07", "shiftCode": "B18", "startTime": "18:00", "endTime": "22:00", "isOff": false, "subject": "Highlands Coffee (Ca B18)" },
  { "dayOfWeek": "Thu7", "date": "${currentYear}-08-01", "dayLabel": "Thu7 01/08", "shiftCode": "B", "startTime": "15:00", "endTime": "22:00", "isOff": false, "subject": "Highlands Coffee (Ca B)" },
  { "dayOfWeek": "CN", "date": "${currentYear}-08-02", "dayLabel": "CN 02/08", "shiftCode": "OFF", "startTime": "", "endTime": "", "isOff": true, "subject": "Highlands Coffee (Ca OFF)" }
]

Quy tắc mã ca:
- B18 / MIS / MIE / MI: startTime="18:00", endTime="22:00", isOff=false, shiftCode="B18"
- B16 / MIC / BIC: startTime="16:00", endTime="22:00", isOff=false, shiftCode="B16"
- B17: startTime="17:00", endTime="22:00", isOff=false, shiftCode="B17"
- A11: startTime="07:00", endTime="11:00", isOff=false, shiftCode="A11"
- A: startTime="07:00", endTime="15:00", isOff=false, shiftCode="A"
- B / 5: startTime="15:00", endTime="22:00", isOff=false, shiftCode="B"
- Ca giờ tùy chỉnh ví dụ 11-18H: startTime="11:00", endTime="18:00", isOff=false, shiftCode="11-18H"
- OFF / Nghỉ / TOM / SW / WAN: isOff=true, startTime="", endTime="", shiftCode="OFF"`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const cleanJsonText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJsonText);
        }
      } else {
        const errText = await res.text();
        lastErr = `Gemini API (${model}) lỗi (${res.status}): ${errText}`;
      }
    } catch (e: any) {
      lastErr = e.message;
    }
  }

  throw new Error(lastErr || 'Không thể kết nối đến AI Gemini');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeName = (formData.get('employeeName') as string) || 'Thanh Hương';
    const geminiApiKey = (formData.get('geminiApiKey') as string) || process.env.GEMINI_API_KEY;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy file ảnh' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // 1. Try Gemini Vision AI first if API Key is available
    if (geminiApiKey) {
      try {
        console.log('[AI OCR] Đang sử dụng Gemini Vision AI để đọc ảnh...');
        const geminiData = await parseWithGemini(inputBuffer, employeeName, geminiApiKey);
        if (Array.isArray(geminiData) && geminiData.length === 7) {
          console.log('[AI OCR] Gemini Vision AI đọc thành công!');
          return NextResponse.json({ success: true, data: geminiData, source: 'gemini' });
        }
      } catch (geminiErr: any) {
        console.warn('[AI OCR] Gemini Vision AI thất bại, tự động chuyển về Local Tesseract OCR:', geminiErr.message);
      }
    }

    // 2. Fallback to Local Tesseract OCR
    console.log('[LOCAL OCR] Đang sử dụng Tesseract Local OCR...');
    const worker = await createWorker('vie+eng', 1, {
      langPath: process.cwd(),
      cachePath: process.cwd(),
      gzip: true,
    });

    const ret = await worker.recognize(inputBuffer);
    await worker.terminate();

    const text = ret.data.text;
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);

    console.log('[OCR DEBUG] Target Name:', employeeName);
    console.log('[OCR DEBUG] Extracted Lines:', lines);

    const matchedLine = matchEmployeeLine(lines, employeeName);
    console.log('[OCR DEBUG] Matched Line:', matchedLine);

    if (!matchedLine) {
      return NextResponse.json({
        success: false,
        error: `Không tìm thấy hàng tên "${employeeName}" trong ảnh lịch. Vui lòng kiểm tra lại tên trong trang Cấu hình.`
      });
    }

    const results = parseScheduleLine(matchedLine, employeeName);
    return NextResponse.json({ success: true, data: results, source: 'tesseract' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Lỗi khi quét ảnh OCR: ' + err.message }, { status: 500 });
  }
}
