import { NextResponse } from 'next/server';
import { getTelegramFilePath, downloadTelegramPhotoBuffer } from '@/lib/telegram';
import { getLocketBotSettingsFirestore } from '@/lib/firebase';

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } | Promise<{ fileId: string }> }
) {
  try {
    const botConfig = await getLocketBotSettingsFirestore();
    const token = botConfig.locketBotToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return new NextResponse('Bot Token Missing', { status: 500 });
    }

    const resolvedParams = await params;
    const fileId = resolvedParams?.fileId;
    if (!fileId) {
      return new NextResponse('File ID Missing', { status: 400 });
    }

    const filePath = await getTelegramFilePath(token, fileId);
    if (!filePath) {
      return new NextResponse('File path not found', { status: 404 });
    }

    const buffer = await downloadTelegramPhotoBuffer(token, filePath);
    if (!buffer) {
      return new NextResponse('Failed to download image', { status: 500 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    return new NextResponse(error?.message || 'Internal Server Error', { status: 500 });
  }
}
