import { NextResponse } from 'next/server';
import { DEFAULT_GROQ_MODEL } from '@/lib/expense-io';
import { getSettingsForUser } from '@/lib/firebase';
import { getAuthSessionUser } from '@/lib/auth-session';
import { isSecretMasked } from '@/lib/secrets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, model } = body;

    let keyToTest = apiKey;
    if (isSecretMasked(keyToTest)) {
      const username = getAuthSessionUser(request)?.username || 'chinhan';
      keyToTest = (await getSettingsForUser(username)).groqApiKey || process.env.GROQ_API_KEY || '';
    }
    const modelToTest = model || DEFAULT_GROQ_MODEL;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyToTest}`,
      },
      body: JSON.stringify({
        model: modelToTest,
        messages: [{ role: 'user', content: 'Trả về chuỗi "OK"' }],
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({
        success: false,
        error: `Mã lỗi HTTP ${res.status}: ${errText}`,
      }, { status: 400 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'OK';

    return NextResponse.json({
      success: true,
      message: `API Key Groq hoạt động chuẩn! Phản hồi: ${reply.trim()}`,
      model: modelToTest,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Không thể kết nối đến Groq API',
    }, { status: 500 });
  }
}
