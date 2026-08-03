import { NextResponse } from 'next/server';
import {
  getLocketPhotosFirestore,
  deleteLocketPhotoFirestore,
  getLocketPhotoByIdFirestore,
  getLocketBotSettingsFirestore,
} from '@/lib/firebase';
import { deleteTelegramMessage, sanitizeTelegramToken, getTelegramFilePath } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const botConfig = await getLocketBotSettingsFirestore();
    const token = sanitizeTelegramToken(botConfig.locketBotToken || process.env.TELEGRAM_BOT_TOKEN || '');

    const data = await getLocketPhotosFirestore(page, limit);

    // Auto-purge any photos that were manually deleted on Telegram
    if (token && data.photos.length > 0) {
      const validPhotos = [];
      for (const photo of data.photos) {
        const filePath = await getTelegramFilePath(token, photo.telegram_file_id);
        if (!filePath) {
          // Photo was deleted on Telegram! Purge from DB automatically!
          await deleteLocketPhotoFirestore(photo.id).catch(console.error);
        } else {
          validPhotos.push(photo);
        }
      }
      return NextResponse.json({ success: true, photos: validPhotos, total: validPhotos.length, hasMore: data.hasMore });
    }

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

      // 2. Delete Photo message (which includes caption) from Telegram
      if (photo.photo_message_id) {
        await deleteTelegramMessage(token, targetChatId, photo.photo_message_id).catch(console.error);
      }

      // Fallback: if there was a separate notification message ID
      if (photo.notify_message_id) {
        await deleteTelegramMessage(token, targetChatId, photo.notify_message_id).catch(console.error);
      }
    }

    // 3. Delete photo record from DB
    await deleteLocketPhotoFirestore(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
