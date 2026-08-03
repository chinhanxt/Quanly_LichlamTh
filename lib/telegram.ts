import https from 'https';
import { execFile } from 'child_process';

export function sanitizeTelegramToken(rawToken: string): string {
  if (!rawToken) return '';
  let token = rawToken.trim();
  token = token.replace(/^bot+/i, '');
  const match = token.match(/\d+:[A-Za-z0-9_-]+/);
  if (match) return match[0];
  return token;
}

function postTelegramHttps(token: string, endpoint: string, payload: any): Promise<{ ok: boolean; result?: any; description?: string }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/${endpoint}`,
        method: 'POST',
        family: 4, // Force IPv4 to eliminate Node fetch ETIMEDOUT / ENETUNREACH
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Telegram HTTPS request timeout (10s)'));
    });
    req.write(postData);
    req.end();
  });
}

function postTelegramCurl(token: string, endpoint: string, payload: any): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${token}/${endpoint}`;
    const args = ['-s', '-X', 'POST', url, '-H', 'Content-Type: application/json', '-d', JSON.stringify(payload)];

    execFile('curl', args, { timeout: 10000 }, (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }
      try {
        const json = JSON.parse(stdout);
        resolve(Boolean(json.ok));
      } catch {
        resolve(false);
      }
    });
  });
}

export function getUserChatIds(settings: any): string[] {
  const chatIds = new Set<string>();
  if (!settings) return [];

  if (settings.telegramChatId && typeof settings.telegramChatId === 'string' && settings.telegramChatId.trim()) {
    settings.telegramChatId
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .forEach((id: string) => chatIds.add(id));
  }

  if (settings.allowedChatIdsStr && typeof settings.allowedChatIdsStr === 'string' && settings.allowedChatIdsStr.trim()) {
    settings.allowedChatIdsStr
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .forEach((id: string) => chatIds.add(id));
  }

  if (Array.isArray(settings.allowedChatIds)) {
    settings.allowedChatIds
      .map((s: any) => String(s || '').trim())
      .filter(Boolean)
      .forEach((id: string) => chatIds.add(id));
  }

  return Array.from(chatIds);
}

export async function deleteTelegramMessage(
  token: string,
  chatId: string | number,
  messageId: number
): Promise<boolean> {
  const cleanToken = sanitizeTelegramToken(token);
  if (!cleanToken || !chatId || !messageId) return false;
  const targetChatId = String(chatId).split(',')[0].trim();
  const payload = { chat_id: targetChatId, message_id: messageId };

  try {
    const res = await postTelegramHttps(cleanToken, 'deleteMessage', payload);
    if (res.ok) return true;
  } catch (err: any) {
    console.warn('deleteTelegramMessage HTTPS failed:', err.message);
  }

  return postTelegramCurl(cleanToken, 'deleteMessage', payload);
}

export async function sendTelegramMessage(
  text: string,
  customToken?: string,
  customChatId?: string | string[],
  replyMarkup?: any
): Promise<{ success: boolean; message_id?: number; error?: string }> {
  const token = customToken || process.env.TELEGRAM_BOT_TOKEN;
  let rawChatId = customChatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !rawChatId) {
    const msg = 'Thiếu thông tin Telegram Bot Token hoặc Chat ID';
    console.error(msg);
    return { success: false, error: msg };
  }

  let chatIds: string[] = [];
  if (Array.isArray(rawChatId)) {
    chatIds = rawChatId.map((id) => String(id).trim()).filter(Boolean);
  } else {
    chatIds = String(rawChatId)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  chatIds = Array.from(new Set(chatIds));

  if (chatIds.length === 0) {
    return { success: false, error: 'Không có Chat ID hợp lệ' };
  }

  let overallSuccess = true;
  let lastError = '';
  let lastMessageId: number | undefined = undefined;

  for (const chatId of chatIds) {
    const payloadMarkdown = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };

    const payloadPlain = {
      chat_id: chatId,
      text: text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };

    let sent = false;

    // Attempt 1: HTTPS with family 4 & Markdown
    try {
      const res = await postTelegramHttps(token, 'sendMessage', payloadMarkdown);
      if (res.ok) {
        sent = true;
        if (res.result?.message_id) lastMessageId = res.result.message_id;
      } else {
        console.warn(`Telegram Markdown failed for chat_id ${chatId}, retrying plain text:`, res.description);
        const retryRes = await postTelegramHttps(token, 'sendMessage', payloadPlain);
        if (retryRes.ok) {
          sent = true;
          if (retryRes.result?.message_id) lastMessageId = retryRes.result.message_id;
        } else lastError = retryRes.description || res.description || 'Gửi thất bại';
      }
    } catch (err: any) {
      console.warn(`Telegram HTTPS family 4 failed for chat_id ${chatId}, attempting curl fallback:`, err.message);
      lastError = err.message;
    }

    if (!sent) {
      // Attempt 2: Curl Fallback
      try {
        const curlOk = await postTelegramCurl(token, 'sendMessage', payloadMarkdown);
        if (curlOk) {
          sent = true;
        } else {
          const curlPlainOk = await postTelegramCurl(token, 'sendMessage', payloadPlain);
          if (curlPlainOk) sent = true;
        }
      } catch (curlErr: any) {
        console.error(`Telegram curl fallback error for chat_id ${chatId}:`, curlErr.message);
      }
    }

    if (!sent) {
      overallSuccess = false;
    }
  }

  return {
    success: overallSuccess,
    ...(lastMessageId ? { message_id: lastMessageId } : {}),
    ...(overallSuccess ? {} : { error: lastError || 'Không thể gửi tin nhắn Telegram. Vui lòng kiểm tra lại Bot Token & Chat ID!' }),
  };
}

export async function getTelegramFilePath(token: string, fileId: string): Promise<string | null> {
  try {
    const res = await postTelegramHttps(token, 'getFile', { file_id: fileId });
    if (res.ok && res.result?.file_path) return res.result.file_path;
  } catch (err: any) {
    console.warn('getTelegramFilePath HTTPS failed:', err.message);
  }

  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    execFile('curl', ['-s', url], { timeout: 10000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json.result?.file_path || null);
      } catch {
        resolve(null);
      }
    });
  });
}

export async function downloadTelegramPhotoBuffer(token: string, filePath: string): Promise<Buffer | null> {
  try {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const req = https.get(
        {
          hostname: 'api.telegram.org',
          path: `/file/bot${token}/${filePath}`,
          family: 4,
          timeout: 10000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
    if (buffer && buffer.length > 0) return buffer;
  } catch (err: any) {
    console.warn('downloadTelegramPhotoBuffer HTTPS failed:', err.message);
  }

  return new Promise((resolve) => {
    const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
    execFile('curl', ['-s', url], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024, timeout: 15000 }, (err, stdout) => {
      if (err) resolve(null);
      else resolve(stdout);
    });
  });
}
