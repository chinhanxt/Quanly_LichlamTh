import { NextResponse } from 'next/server';
import { getLocketBotSettingsFirestore, saveLocketBotSettingsFirestore } from '@/lib/firebase';
import { sanitizeTelegramToken } from '@/lib/telegram';
import { maskSecret, isSecretMasked } from '@/lib/secrets';

export async function GET() {
  try {
    const data = await getLocketBotSettingsFirestore();
    return NextResponse.json({
      success: true,
      data: { ...data, locketBotToken: maskSecret(data.locketBotToken) },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = await getLocketBotSettingsFirestore();
    const locketBotToken = isSecretMasked(body.locketBotToken)
      ? sanitizeTelegramToken(current.locketBotToken || '')
      : sanitizeTelegramToken(body.locketBotToken || '');
    const locketChatId = (body.locketChatId || '').trim();
    await saveLocketBotSettingsFirestore({ locketBotToken, locketChatId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
