import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    let token: string | undefined;
    let customWebhookUrl: string | undefined;

    try {
      const body = await request.json();
      token = body?.telegramBotToken;
      customWebhookUrl = body?.customWebhookUrl;
    } catch {
      // Request body might be empty
    }

    if (!token || !token.trim()) {
      const settings = await getSettings();
      token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    }

    if (!token || !token.trim()) {
      return NextResponse.json(
        { success: false, error: 'Thiếu Telegram Bot Token. Vui lòng nhập Bot Token trước!' },
        { status: 400 }
      );
    }

    let webhookUrl = (customWebhookUrl || '').trim();

    if (!webhookUrl) {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      const proto = request.headers.get('x-forwarded-proto') || (isLocalhost ? 'http' : 'https');
      
      webhookUrl = `${proto}://${host}/api/telegram-webhook`;
    }

    // Telegram setWebhook requirement check: Must be HTTPS
    if (!webhookUrl.startsWith('https://')) {
      return NextResponse.json(
        {
          success: false,
          error: `Telegram bắt buộc Webhook URL phải dùng HTTPS công khai (URL hiện tại: ${webhookUrl}). Nếu chạy Localhost, vui lòng dùng ngrok (https://xxx.ngrok-free.app/api/telegram-webhook) hoặc nhập domain Vercel/Cloud công khai bên dưới!`,
          webhookUrl,
        },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.description || 'Không thể đặt Webhook với Telegram API',
          webhookUrl,
          telegramResponse: data,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      webhookUrl,
      telegramResponse: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi kết nối máy chủ' },
      { status: 500 }
    );
  }
}
