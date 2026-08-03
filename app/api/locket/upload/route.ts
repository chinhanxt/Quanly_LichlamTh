import { NextResponse } from 'next/server';
import { saveLocketPhotoFirestore, getLocketBotSettingsFirestore } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sender = (formData.get('sender') as string) || 'chinhan';
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const botConfig = await getLocketBotSettingsFirestore();
    const token = botConfig.locketBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = botConfig.locketChatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json({ success: false, error: 'Telegram Bot Token / Chat ID missing. Please configure storage bot in settings.' }, { status: 500 });
    }

    // 1. Upload photo to Telegram Bot via sendPhoto multipart API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const teleFormData = new FormData();
    teleFormData.append('chat_id', chatId.split(',')[0].trim());
    teleFormData.append('photo', new Blob([buffer], { type: file.type || 'image/jpeg' }), 'locket.jpg');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: teleFormData,
    });
    const teleJson = await res.json();

    if (!teleJson.ok || !teleJson.result?.photo) {
      return NextResponse.json({ success: false, error: teleJson.description || 'Failed to send photo to Telegram' }, { status: 500 });
    }

    // Pick highest resolution photo file_id
    const photos = teleJson.result.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileId = largestPhoto.file_id;

    // 2. Save metadata record to DB
    const photoRecord = {
      id: `loc_${Date.now()}`,
      sender,
      telegram_file_id: fileId,
      caption,
      created_at: new Date().toISOString(),
    };

    await saveLocketPhotoFirestore(photoRecord);

    // 3. Send Telegram notification to partner
    const notifyText = `📸 *${sender}* vừa đăng một khoảnh khắc mới trên Locket!${caption ? `\n💬 "${caption}"` : ''}`;
    const notifyPayload = {
      chat_id: chatId,
      text: notifyText,
      parse_mode: 'Markdown',
    };
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyPayload),
    }).catch(console.error);

    return NextResponse.json({ success: true, photo: photoRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
