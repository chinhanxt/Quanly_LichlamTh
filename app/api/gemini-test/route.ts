import { NextResponse } from 'next/server';
import { getSettingsForUser } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';
import { isSecretMasked } from '@/lib/secrets';
import { generateGemini } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { geminiApiKey } = await request.json();
    let apiKey = geminiApiKey;
    if (isSecretMasked(apiKey)) {
      const username = getAuthSessionUser(request)?.username || 'thanhhuong';
      apiKey = (await getSettingsForUser(username)).geminiApiKey || process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập Gemini API Key trước khi thử nghiệm' }, { status: 400 });
    }

    await generateGemini({ apiKey, parts: [{ text: 'Trả lời đúng 1 chữ: OK' }] });
    return NextResponse.json({ success: true, message: 'Gemini API Key hợp lệ và đang hoạt động tốt!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Gemini API Key lỗi: ' + (err.message || String(err)) });
  }
}
