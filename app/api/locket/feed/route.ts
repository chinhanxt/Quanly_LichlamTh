import { NextResponse } from 'next/server';
import { getLocketPhotosFirestore, deleteLocketPhotoFirestore, getLocketPhotoByIdFirestore, getLocketBotSettingsFirestore } from '@/lib/firebase';
import { deleteTelegramMessage, sanitizeTelegramToken } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const data = await getLocketPhotosFirestore(page, limit);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Photo ID missing' }, { status: 400 });
    }

    // 1. Fetch photo record to get Telegram message IDs
    const photo = await getLocketPhotoByIdFirestore(id);
    const botConfig = await getLocketBotSettingsFirestore();
    const token = sanitizeTelegramToken(botConfig.locketBotToken || process.env.TELEGRAM_BOT_TOKEN || '');
    const chatId = (botConfig.locketChatId || process.env.TELEGRAM_CHAT_ID || '').split(',')[0].trim();

    if (photo && token && chatId) {
      const targetChatId = photo.chat_id || chatId;

      // 2. Delete Photo message from Telegram
      if (photo.photo_message_id) {
        await deleteTelegramMessage(token, targetChatId, photo.photo_message_id).catch(console.error);
      }

      // 3. Delete Notification message from Telegram
      if (photo.notify_message_id) {
        await deleteTelegramMessage(token, targetChatId, photo.notify_message_id).catch(console.error);
      }
    }

    // 4. Delete photo record from DB
    await deleteLocketPhotoFirestore(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
