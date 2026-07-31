import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, model } = body;

    const keyToTest = apiKey || process.env.GROQ_API_KEY || '';
    const modelToTest = model || 'llama-3.3-70b-versatile';

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
