import dns from 'dns';
import { NextResponse } from 'next/server';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore
}
import { createWorker } from 'tesseract.js';
import {
  getSettings,
  getSettingsForUser,
  saveSettingsForUser,
  getScheduleItemsForUser,
  saveScheduleItemsForUser,
} from '@/lib/firebase';
import { sendTelegramMessage, getTelegramFilePath, downloadTelegramPhotoBuffer, getUserChatIds } from '@/lib/telegram';
import {
  getMainMenuKeyboard,
  getSalaryMenuKeyboard,
  getNotesMenuKeyboard,
  getOcrConfirmationKeyboard,
  formatWeeklySalaryMessage,
  formatMonthlySalaryMessage,
  formatShiftDetailsMessage,
} from '@/lib/telegram-menu';
import { matchEmployeeLine, parseScheduleLine, ParsedShiftResult } from '@/lib/ocr-parser';
import { ScheduleItem, UserNote } from '@/types/schedule';

import { parseWithGemini } from '@/app/api/ocr/route';

const DEFAULT_USERNAMES = ['thanhhuong', 'chinhan'];

async function processOcrBuffer(
  inputBuffer: Buffer,
  employeeName: string,
  geminiApiKey?: string
): Promise<ParsedShiftResult[] | null> {
  if (!geminiApiKey || !geminiApiKey.trim()) {
    throw new Error('Chưa cấu hình Google Gemini API Key. Vui lòng vào tab Cấu hình trên Web để nhập Key!');
  }

  console.log('[Telegram Webhook OCR] Đang quét ảnh lịch làm bằng Gemini Vision AI...');
  const geminiData = await parseWithGemini(inputBuffer, employeeName, geminiApiKey);
  if (Array.isArray(geminiData) && geminiData.length === 7) {
    return geminiData;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    return NextResponse.json({ ok: true, disabled: true });

    const body = await request.json().catch(() => ({}));
    const message = body?.message;
    const callbackQuery = body?.callback_query;

    const chatId = message?.chat?.id
      ? String(message.chat.id)
      : callbackQuery?.message?.chat?.id
      ? String(callbackQuery.message.chat.id)
      : '';

    const senderId = message?.from?.id
      ? String(message.from.id)
      : callbackQuery?.from?.id
      ? String(callbackQuery.from.id)
      : chatId;

    // Load settings for all default users
    const userSettingsList = await Promise.all(
      DEFAULT_USERNAMES.map(async (u) => ({
        username: u,
        settings: await getSettingsForUser(u),
      }))
    );

    // Find matching user by chatId / senderId
    let matchedUser = userSettingsList.find(({ settings }) => {
      const allowedList = getUserChatIds(settings);
      return (
        (chatId && allowedList.includes(chatId)) ||
        (senderId && allowedList.includes(senderId))
      );
    });

    // Fallback: Check root settings if no user matched directly
    if (!matchedUser && chatId) {
      const rootSettings = await getSettings();
      const allowedList = getUserChatIds(rootSettings);
      if (
        (chatId && allowedList.includes(chatId)) ||
        (senderId && allowedList.includes(senderId))
      ) {
        matchedUser = { username: 'thanhhuong', settings: rootSettings };
      }
    }

    if (!matchedUser) {
      console.warn(`[Telegram Webhook] Blocked unauthorized interaction from Chat ID: ${chatId}`);
      const fallbackToken =
        userSettingsList.find((u) => u.settings.telegramBotToken)?.settings.telegramBotToken ||
        (await getSettings()).telegramBotToken;
      if (fallbackToken && chatId) {
        await sendTelegramMessage(
          `⛔ *Truy cập bị từ chối!*\n\nTài khoản Telegram của bạn không nằm trong danh sách được cấp quyền tương tác với Bot này.\n\n🆔 *Chat ID của bạn:* \`${chatId}\`\n\n💡 Vui lòng thêm Chat ID này vào mục Cấu hình Hệ thống trên Web để cấp quyền.`,
          fallbackToken,
          chatId
        );
      }
      return NextResponse.json({ ok: true, message: 'Unauthorized Chat ID' });
    }

    const { username, settings } = matchedUser;
    const token = settings.telegramBotToken;

    if (!token) {
      return NextResponse.json({ ok: true, message: 'Telegram Bot Token not configured' });
    }

    // 1. Handle Callback Query (Inline Keyboard responses)
    if (callbackQuery) {
      const callbackData = callbackQuery.data || '';
      const queryId = callbackQuery.id;

      // Answer callback query
      const messageId = callbackQuery.message?.message_id;

      try {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: queryId }),
        });
      } catch (e) {
        console.warn('Failed to answer callback query:', e);
      }

      // Immediately edit message to remove the inline buttons (anti-spam lock)
      if (messageId) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              reply_markup: { inline_keyboard: [] },
            }),
          });
        } catch {
          // ignore
        }
      }

      const session = settings.telegramSessionState;

      if (callbackData.startsWith('confirm_ocr:')) {
        const pendingId = callbackData.split(':')[1];

        // Anti-spam guard: Only process if state is AWAITING_OCR_CONFIRM and pendingId matches
        if (session?.userState === 'AWAITING_OCR_CONFIRM' && session?.pendingId === pendingId && session?.pendingScheduleData) {
          const itemsToSave = session.pendingScheduleData;

          // Clear session state FIRST to lock against concurrent duplicate calls
          settings.telegramSessionState = { userState: 'IDLE' };
          await saveSettingsForUser(username, settings);

          // Save schedule items for user
          await saveScheduleItemsForUser(username, itemsToSave);

          await sendTelegramMessage(
            '✅ *ĐÃ NHẬP LỊCH THÀNH CÔNG!* 🎉\nLịch làm việc mới đã được lưu vào hệ thống.',
            token,
            chatId,
            getMainMenuKeyboard()
          );
        }
        return NextResponse.json({ ok: true });
      }

      if (callbackData.startsWith('cancel_ocr:')) {
        if (session?.userState === 'AWAITING_OCR_CONFIRM') {
          settings.telegramSessionState = { userState: 'IDLE' };
          await saveSettingsForUser(username, settings);

          await sendTelegramMessage(
            '❌ Đã hủy bỏ quá trình nhập lịch làm việc.',
            token,
            chatId,
            getMainMenuKeyboard()
          );
        }
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Handle Photo Upload (OCR)
    if (message?.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      const photoObj = message.photo.length >= 3 ? message.photo[message.photo.length - 2] : message.photo[message.photo.length - 1];
      const fileId = photoObj.file_id;

      await sendTelegramMessage('⏳ Đang xử lý ảnh lịch làm việc, vui lòng đợi trong giây lát...', token, chatId);

      try {
        const filePath = await getTelegramFilePath(token, fileId);

        if (!filePath) {
          await sendTelegramMessage('❌ Không thể lấy thông tin ảnh từ Telegram.', token, chatId);
          return NextResponse.json({ ok: true });
        }

        const photoBuffer = await downloadTelegramPhotoBuffer(token, filePath);

        if (!photoBuffer || photoBuffer.length === 0) {
          await sendTelegramMessage('❌ Không thể tải file ảnh từ Telegram.', token, chatId);
          return NextResponse.json({ ok: true });
        }

        const employeeName = settings.employeeName || (username === 'chinhan' ? 'Chí Nhân' : 'Thanh Hương');
        const geminiApiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

        const parsedResults = await processOcrBuffer(photoBuffer, employeeName, geminiApiKey);

        if (!parsedResults || parsedResults.length === 0) {
          await sendTelegramMessage(
            `❌ Không thể đọc lịch từ ảnh cho nhân viên "${employeeName}". Vui lòng kiểm tra lại tên hoặc gửi ảnh rõ nét hơn.`,
            token,
            chatId
          );
          return NextResponse.json({ ok: true });
        }

        const scheduleItems: ScheduleItem[] = parsedResults
          .filter((r) => !r.isOff)
          .map((r, idx) => ({
            id: `ocr_${Date.now()}_${idx}`,
            dayOfWeek: r.dayOfWeek,
            date: r.date || '',
            startTime: r.startTime,
            endTime: r.endTime,
            subject: r.subject || `Highlands Coffee (Ca ${r.shiftCode})`,
            location: 'Highlands Coffee',
            note: r.shiftCode,
            reminderEnabled: true,
            username,
          }));

        const pendingId = `ocr_${Date.now()}`;
        settings.telegramSessionState = {
          userState: 'AWAITING_OCR_CONFIRM',
          pendingScheduleData: scheduleItems,
          pendingId: pendingId,
        };
        await saveSettingsForUser(username, settings);

        let previewMsg = `📸 *KẾT QUẢ QUÉT LỊCH LÀM VIỆC*\n\n`;
        parsedResults.forEach((r) => {
          const dateTag = r.date ? ` (${r.date.split('-').slice(1).reverse().join('/')})` : '';
          if (!r.isOff) {
            previewMsg += `• *${r.dayOfWeek}${dateTag}*: ${r.startTime} - ${r.endTime} (Ca ${r.shiftCode})\n`;
          } else {
            previewMsg += `• *${r.dayOfWeek}${dateTag}*: OFF (Nghỉ)\n`;
          }
        });
        previewMsg += `\nBạn có muốn lưu lịch làm việc này không?`;

        await sendTelegramMessage(previewMsg, token, chatId, getOcrConfirmationKeyboard(pendingId));
      } catch (err: any) {
        console.error('Error processing photo OCR in Telegram webhook:', err);
        await sendTelegramMessage('❌ Đã xảy ra lỗi khi quét ảnh lịch: ' + (err.message || 'Lỗi hệ thống'), token, chatId);
      }

      return NextResponse.json({ ok: true });
    }

    // 3. Handle Text Commands & Session States
    if (message?.text) {
      const text = message.text.trim();

      // Handle AWAITING_NOTE state
      if (settings.telegramSessionState?.userState === 'AWAITING_NOTE') {
        const newNote: UserNote = {
          id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          content: text,
          createdAt: new Date().toISOString(),
          createdFormatted: new Date().toLocaleString('vi-VN'),
          completed: false,
        };

        if (!settings.userNotes) settings.userNotes = [];
        settings.userNotes.push(newNote);
        settings.telegramSessionState = { userState: 'IDLE' };
        await saveSettingsForUser(username, settings);

        await sendTelegramMessage(
          `✅ *ĐÃ THÊM GHI CHÚ MỚI*\n\n📝 "${text}"`,
          token,
          chatId,
          getNotesMenuKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      // Command: /start or 🔙 Menu Chính
      if (text === '/start' || text === '🔙 Menu Chính') {
        settings.telegramSessionState = { userState: 'IDLE' };
        await saveSettingsForUser(username, settings);

        await sendTelegramMessage(
          '👋 *CHÀO MỪNG BẠN ĐẾN VỚI SCHEDULE TELEGRAM BOT!*\n\nVui lòng chọn chức năng bên dưới:',
          token,
          chatId,
          getMainMenuKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      // Command: 💰 Bảng Lương
      if (text === '💰 Bảng Lương') {
        await sendTelegramMessage(
          '💰 *MENU BẢNG LƯƠNG*\nVui lòng chọn một tùy chọn:',
          token,
          chatId,
          getSalaryMenuKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      // Command: 📝 Ghi Chú
      if (text === '📝 Ghi Chú') {
        await sendTelegramMessage(
          '📝 *MENU GHI CHÚ*\nVui lòng chọn một tùy chọn:',
          token,
          chatId,
          getNotesMenuKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      // Command: 📋 Ca Làm Hôm Nay
      if (text === '📋 Ca Làm Hôm Nay') {
        const shifts = await getScheduleItemsForUser(username);
        const dayMap: Record<number, 'Thu2' | 'Thu3' | 'Thu4' | 'Thu5' | 'Thu6' | 'Thu7' | 'CN'> = {
          1: 'Thu2',
          2: 'Thu3',
          3: 'Thu4',
          4: 'Thu5',
          5: 'Thu6',
          6: 'Thu7',
          0: 'CN',
        };
        const todayDayOfWeek = dayMap[new Date().getDay()];
        const todayShifts = shifts.filter((s) => s.dayOfWeek === todayDayOfWeek);

        let msg = `📋 *CA LÀM HÔM NAY (${todayDayOfWeek})*\n\n`;
        if (todayShifts.length === 0) {
          msg += '🎉 Hôm nay bạn KHÔNG CÓ ca làm nào! Nghỉ ngơi xả hơi thôi nha 😊';
        } else {
          todayShifts.forEach((s) => {
            msg += `• *${s.subject || 'Ca làm'}*: ${s.startTime} - ${s.endTime} (${s.note || 'Làm'})\n  📍 Địa điểm: ${s.location || 'Highlands Coffee'}\n`;
          });
        }

        await sendTelegramMessage(msg, token, chatId, getMainMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      // Command: 📊 Lương Tuần Này
      if (text === '📊 Lương Tuần Này') {
        const shifts = await getScheduleItemsForUser(username);
        const msg = formatWeeklySalaryMessage(shifts, settings.hourlyRate || 26000);
        await sendTelegramMessage(msg, token, chatId, getSalaryMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      // Command: 🗓️ Lương Tháng Này
      if (text === '🗓️ Lương Tháng Này') {
        const shifts = await getScheduleItemsForUser(username);
        const msg = formatMonthlySalaryMessage(shifts, settings.hourlyRate || 26000);
        await sendTelegramMessage(msg, token, chatId, getSalaryMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      // Command: ⏱️ Chi Tiết Giờ Làm
      if (text === '⏱️ Chi Tiết Giờ Làm') {
        const shifts = await getScheduleItemsForUser(username);
        const msg = formatShiftDetailsMessage(shifts);
        await sendTelegramMessage(msg, token, chatId, getSalaryMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      // Command: 📋 Xem Ghi Chú
      if (text === '📋 Xem Ghi Chú') {
        const notes = (settings.userNotes || []).filter((n) => !n.completed);
        let msg = `📝 *DANH SÁCH GHI CHÚ ACTIVE*\n\n`;
        if (notes.length === 0) {
          msg += 'Chưa có ghi chú nào chưa hoàn thành.';
        } else {
          notes.forEach((n, idx) => {
            msg += `${idx + 1}. ${n.content} (${n.createdFormatted || 'Vừa thêm'})\n`;
          });
        }
        await sendTelegramMessage(msg, token, chatId, getNotesMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      // Command: ✅ Đã Hoàn Thành
      if (text === '✅ Đã Hoàn Thành') {
        const completedNotes = (settings.userNotes || []).filter((n) => n.completed);
        let msg = `✅ *DANH SÁCH GHI CHÚ ĐÃ HOÀN THÀNH*\n\n`;
        if (completedNotes.length === 0) {
          msg += 'Chưa có ghi chú nào đã hoàn thành.';
        } else {
          completedNotes.forEach((n, idx) => {
            msg += `${idx + 1}. ${n.content}\n`;
          });
        }
        await sendTelegramMessage(msg, token, chatId, getNotesMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      // Command: ➕ Thêm Ghi Chú
      if (text === '➕ Thêm Ghi Chú') {
        settings.telegramSessionState = { userState: 'AWAITING_NOTE' };
        await saveSettingsForUser(username, settings);
        await sendTelegramMessage('✏️ Vui lòng nhập nội dung ghi chú bạn muốn thêm:', token, chatId);
        return NextResponse.json({ ok: true });
      }

      // Command: 📸 Gửi Ảnh Lịch
      if (text === '📸 Gửi Ảnh Lịch') {
        await sendTelegramMessage('📸 Vui lòng gửi 1 tấm ảnh chụp lịch làm việc của bạn vào đây.', token, chatId);
        return NextResponse.json({ ok: true });
      }

      // Default fallback for unrecognized commands
      await sendTelegramMessage(
        '❓ Lệnh không hợp lệ. Vui lòng chọn chức năng từ menu bên dưới:',
        token,
        chatId,
        getMainMenuKeyboard()
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error in Telegram Webhook endpoint:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
