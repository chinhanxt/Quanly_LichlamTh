import { NextResponse } from 'next/server';
import { getTelegramFilePath, downloadTelegramPhotoBuffer, sanitizeTelegramToken } from '@/lib/telegram';
import { getLocketBotSettingsFirestore } from '@/lib/firebase';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_DIR = path.join(os.tmpdir(), 'locket_photo_cache');
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}

export async function GET(
  request: Request,
  props: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await props.params;
    const fileId = params?.fileId;
    if (!fileId) {
      return new NextResponse('File ID Missing', { status: 400 });
    }

    // 1. Check local disk cache first (< 3ms response time)
    const cachePath = path.join(CACHE_DIR, `${fileId}.jpg`);
    if (fs.existsSync(cachePath)) {
      try {
        const cachedBuffer = fs.readFileSync(cachePath);
        return new NextResponse(new Uint8Array(cachedBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch {}
    }

    // 2. Fetch from Telegram if not in cache
    const botConfig = await getLocketBotSettingsFirestore();
    const token = sanitizeTelegramToken(botConfig.locketBotToken || process.env.TELEGRAM_BOT_TOKEN || '');

    if (!token) {
      return new NextResponse('Bot Token Missing', { status: 500 });
    }

    const filePath = await getTelegramFilePath(token, fileId);
    if (!filePath) {
      return new NextResponse('File path not found', { status: 404 });
    }

    const buffer = await downloadTelegramPhotoBuffer(token, filePath);
    if (!buffer) {
      return new NextResponse('Failed to download image', { status: 500 });
    }

    // Write to disk cache
    try {
      fs.writeFileSync(cachePath, buffer);
    } catch {}

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return new NextResponse(error?.message || 'Internal Server Error', { status: 500 });
  }
}
