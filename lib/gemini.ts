// Gọi Gemini (Google AI Studio). Thử lần lượt các model: model mới hay báo "high demand" (503)
// hoặc không mở cho key mới (404) → chuyển sang model kế tiếp.
export const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
];

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

interface GeminiRequest {
  apiKey: string;
  parts: Part[];
  systemInstruction?: string;
  json?: boolean;
  maxOutputTokens?: number;
  timeoutMs?: number; // chờ tối đa mỗi lần gọi (mặc định 12s)
}

export async function generateGemini({ apiKey, parts, systemInstruction, json, maxOutputTokens, timeoutMs = 12_000 }: GeminiRequest): Promise<string> {
  if (!apiKey) throw new Error('Chưa có Gemini API Key — nhập trong tab Cấu hình.');

  const body = JSON.stringify({
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      ...(json ? { responseMimeType: 'application/json' } : {}),
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
    },
  });

  // Tối đa 2 vòng qua các model, mỗi lần chờ ≤timeoutMs, tổng ≤50s (tránh treo request)
  const deadline = Date.now() + 50_000;
  let lastErr = '';
  let overloaded = false;
  for (let round = 0; round < 2; round++) {
    for (const model of GEMINI_MODELS) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) break;
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body,
          signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
          if (text) return text;
          lastErr = `Gemini (${model}) không trả nội dung`;
          continue;
        }
        lastErr = `Gemini (${model}) lỗi ${res.status}: ${data.error?.message || res.statusText}`;
        if (res.status === 503 || res.status === 429) overloaded = true;
        // Key sai hẳn → không cần thử model khác (403/429/503 có thể chỉ riêng 1 model → thử tiếp)
        if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(JSON.stringify(data))) {
          throw new Error('Gemini API Key không hợp lệ — kiểm tra lại ở tab Cấu hình.');
        }
      } catch (e: any) {
        if (/không hợp lệ/.test(e.message)) throw e;
        lastErr = `Gemini (${model}): ${e.name === 'TimeoutError' ? 'quá thời gian chờ' : e.message}`;
        overloaded = true;
      }
    }
  }
  if (overloaded) {
    throw new Error('Gemini đang quá tải, thử gửi lại sau ít phút nhé.');
  }
  throw new Error(lastErr || 'Không kết nối được Gemini');
}

export function parseJsonText<T = any>(text: string): T {
  return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
}
