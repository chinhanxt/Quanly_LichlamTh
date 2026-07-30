import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    let botToken: string | undefined;
    let chatId: string | undefined;
    let customMessage: string | undefined;

    try {
      const body = await request.json();
      botToken = body.telegramBotToken;
      chatId = body.allowedChatIdsStr || body.allowedChatIds || body.telegramChatId;
      customMessage = body.message;
    } catch {
      // Body may be empty, proceed with defaults
    }

    const message = customMessage || '🧪 *TEST TELEGRAM BOT*\n\nKết nối từ ứng dụng Thời Khóa Biểu thành công! 🎉';
    const result = await sendTelegramMessage(message, botToken, chatId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Không thể gửi tin nhắn qua Telegram Bot. Vui lòng kiểm tra lại Bot Token và Chat ID.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Gửi tin nhắn thử nghiệm thành công' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
