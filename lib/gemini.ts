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
}

export async function generateGemini({ apiKey, parts, systemInstruction, json, maxOutputTokens }: GeminiRequest): Promise<string> {
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

  let lastErr = '';
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
        if (text) return text;
        lastErr = `Gemini (${model}) không trả nội dung`;
        continue;
      }
      lastErr = `Gemini (${model}) lỗi ${res.status}: ${data.error?.message || res.statusText}`;
      // Key sai hẳn → không cần thử model khác (403/429/503 có thể chỉ riêng 1 model → thử tiếp)
      if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(JSON.stringify(data))) break;
    } catch (e: any) {
      lastErr = `Gemini (${model}): ${e.message}`;
    }
  }
  throw new Error(lastErr || 'Không kết nối được Gemini');
}

export function parseJsonText<T = any>(text: string): T {
  return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
}
