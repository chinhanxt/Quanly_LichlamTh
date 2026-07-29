import https from 'https';
import { execFile } from 'child_process';

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

export async function sendTelegramMessage(
  text: string,
  customToken?: string,
  customChatId?: string,
  replyMarkup?: any
): Promise<{ success: boolean; error?: string }> {
  const token = customToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = customChatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    const msg = 'Thiếu thông tin Telegram Bot Token hoặc Chat ID';
    console.error(msg);
    return { success: false, error: msg };
  }

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

  // Attempt 1: HTTPS with family 4 & Markdown
  try {
    const res = await postTelegramHttps(token, 'sendMessage', payloadMarkdown);
    if (res.ok) return { success: true };

    // If Markdown failed (HTTP 400), try plain text
    console.warn('Telegram Markdown failed, retrying plain text:', res.description);
    const retryRes = await postTelegramHttps(token, 'sendMessage', payloadPlain);
    if (retryRes.ok) return { success: true };
  } catch (err: any) {
    console.warn('Telegram HTTPS family 4 failed, attempting curl fallback:', err.message);
  }

  // Attempt 2: Curl Fallback
  try {
    const curlOk = await postTelegramCurl(token, 'sendMessage', payloadMarkdown);
    if (curlOk) return { success: true };

    const curlPlainOk = await postTelegramCurl(token, 'sendMessage', payloadPlain);
    if (curlPlainOk) return { success: true };
  } catch (curlErr: any) {
    console.error('Telegram curl fallback error:', curlErr.message);
  }

  return {
    success: false,
    error: 'Không thể gửi tin nhắn Telegram. Vui lòng kiểm tra lại Bot Token & Chat ID!',
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
