import { NextResponse } from 'next/server';
import { saveLocketPhotoFirestore, getLocketBotSettingsFirestore } from '@/lib/firebase';
import { sanitizeTelegramToken } from '@/lib/telegram';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function sendPhotoTelegramCurl(
  token: string,
  chatId: string,
  buffer: Buffer,
  captionText?: string
): Promise<{ ok: boolean; result?: any; description?: string }> {
  return new Promise((resolve) => {
    const tmpPath = path.join(os.tmpdir(), `locket_${Date.now()}.jpg`);
    try {
      fs.writeFileSync(tmpPath, buffer);
    } catch (e: any) {
      resolve({ ok: false, description: 'Lỗi ghi file tạm' });
      return;
    }

    const cleanToken = sanitizeTelegramToken(token);
    const targetChatId = chatId.split(',')[0].trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendPhoto`;
    const args = ['-s', '-X', 'POST', url, '-F', `chat_id=${targetChatId}`, '-F', `photo=@${tmpPath}`];
    if (captionText) {
      args.push('-F', `caption=${captionText}`, '-F', 'parse_mode=Markdown');
    }

    execFile('curl', args, { timeout: 15000 }, (error, stdout) => {
      try {
        fs.unlinkSync(tmpPath);
      } catch {}

      if (error) {
        resolve({ ok: false, description: error.message });
        return;
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch {
        resolve({ ok: false, description: 'Lỗi phản hồi từ Telegram' });
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sender = (formData.get('sender') as string) || 'chinhan';
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Chưa cung cấp file ảnh' }, { status: 400 });
    }

    const botConfig = await getLocketBotSettingsFirestore();
    const token = sanitizeTelegramToken(botConfig.locketBotToken || process.env.TELEGRAM_BOT_TOKEN || '');
    const chatId = (botConfig.locketChatId || process.env.TELEGRAM_CHAT_ID || '').trim();

    if (!token || !chatId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu Telegram Bot Token hoặc Chat ID. Vui lòng bấm icon Cấu hình Bot để nhập!' },
        { status: 400 }
      );
    }

    // 1. Send photo with notification caption attached directly to photo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const notifyCaption = `📸 *${sender}* vừa đăng một khoảnh khắc mới!${caption ? `\n💬 "${caption}"` : ''}`;

    const teleRes = await sendPhotoTelegramCurl(token, chatId, buffer, notifyCaption);

    if (!teleRes.ok || !teleRes.result?.photo) {
      return NextResponse.json(
        { success: false, error: teleRes.description || 'Không thể gửi ảnh tới Telegram Bot' },
        { status: 500 }
      );
    }

    // 2. Pick highest resolution photo file_id & message_id
    const photos = teleRes.result.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileId = largestPhoto.file_id;
    const photoMessageId = teleRes.result.message_id;
    const targetChatId = teleRes.result.chat?.id || chatId.split(',')[0].trim();

    // 3. Save metadata record to DB
    const photoRecord = {
      id: `loc_${Date.now()}`,
      sender,
      telegram_file_id: fileId,
      photo_message_id: photoMessageId,
      chat_id: String(targetChatId),
      caption,
      created_at: new Date().toISOString(),
    };

    await saveLocketPhotoFirestore(photoRecord);

    return NextResponse.json({ success: true, photo: photoRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
