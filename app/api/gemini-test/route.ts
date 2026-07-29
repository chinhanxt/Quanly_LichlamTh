import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { geminiApiKey } = await request.json();
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập Gemini API Key trước khi thử nghiệm' }, { status: 400 });
    }

    // Super lightweight request using Gemini 2.5 Flash
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Ping' }] }],
        generationConfig: { maxOutputTokens: 5 }
      })
    });

    // Fallback to gemini-2.0-flash if 2.5 is 404
    if (!res.ok && res.status === 404) {
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });
    }

    if (res.ok) {
      return NextResponse.json({
        success: true,
        message: '✅ Gemini API Key (Model 2.5/2.0 Flash) hợp lệ và đang hoạt động tốt!'
      });
    }

    const errorJson = await res.json().catch(() => ({}));
    const errorMessage = errorJson.error?.message || `HTTP ${res.status} ${res.statusText}`;

    return NextResponse.json({
      success: false,
      error: `Gemini API Key không hợp lệ hoặc lỗi kết nối: ${errorMessage}`
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: 'Lỗi khi kiểm tra Gemini API Key: ' + (err.message || String(err))
    }, { status: 500 });
  }
}
