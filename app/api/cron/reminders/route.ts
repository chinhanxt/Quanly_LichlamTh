import { NextResponse } from 'next/server';
import { getScheduleItemsForUser, getSettingsForUser, saveSettingsForUser } from '@/lib/firebase';
import { sendTelegramMessage } from '@/lib/telegram';
import { ScheduleItem } from '@/types/schedule';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_USERNAMES = ['thanhhuong', 'chinhan'];

const DAY_MAP: Record<number, ScheduleItem['dayOfWeek']> = {
  0: 'CN',
  1: 'Thu2',
  2: 'Thu3',
  3: 'Thu4',
  4: 'Thu5',
  5: 'Thu6',
  6: 'Thu7',
};

function formatNotificationMessage(template: string, shift: ScheduleItem, overrideGhiChu?: string): string {
  const caName = shift.note || shift.subject || 'Ca làm';
  const thoiGian = `${shift.startTime} - ${shift.endTime}`;
  const diaDiem = shift.location || 'Highlands Coffee';
  const ghiChu = overrideGhiChu !== undefined ? overrideGhiChu : (shift.note || 'Không có');

  return template
    .replace(/\{Ca\}/g, caName)
    .replace(/\{ThờiGian\}/g, thoiGian)
    .replace(/\{ĐịaĐiểm\}/g, diaDiem)
    .replace(/\{GhiChú\}/g, ghiChu);
}

function pruneOldLogs(sentLog: Record<string, string>): Record<string, string> {
  const pruned: Record<string, string> = {};
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  for (const [key, timestampStr] of Object.entries(sentLog)) {
    const time = new Date(timestampStr).getTime();
    if (!isNaN(time) && time > twoDaysAgo) {
      pruned[key] = timestampStr;
    }
  }
  return pruned;
}

function normalizeTimeTo24H(timeStr: string): string {
  if (!timeStr) return '07:00';
  const trimmed = timeStr.trim().toUpperCase();
  if (trimmed.endsWith('AM') || trimmed.endsWith('PM')) {
    const isPM = trimmed.endsWith('PM');
    const cleanStr = trimmed.replace(/(AM|PM)/, '').trim();
    let [hStr, mStr] = cleanStr.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) h = 0;
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${(mStr || '00').padStart(2, '0')}`;
  }
  return timeStr;
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const url = new URL(request.url);
      const querySecret = url.searchParams.get('secret');

      const isHeaderValid = authHeader === `Bearer ${cronSecret}`;
      const isQueryValid = querySecret === cronSecret;

      if (!isHeaderValid && !isQueryValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();
    const ictDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const currentHour = String(ictDate.getUTCHours()).padStart(2, '0');
    const currentMin = String(ictDate.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;
    const currentDayOfWeek = DAY_MAP[ictDate.getUTCDay()];

    const year = ictDate.getUTCFullYear();
    const month = String(ictDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(ictDate.getUTCDate()).padStart(2, '0');
    const currentYYYYMMDD = `${year}-${month}-${day}`;

    const logs: string[] = [];

    for (const username of DEFAULT_USERNAMES) {
      const settings = await getSettingsForUser(username);
      if (!settings.telegramBotToken) continue;

      let sentLog = pruneOldLogs(settings.sentRemindersLog || {});
      let logUpdated = false;

      const items = await getScheduleItemsForUser(username);

      const todayItems = items.filter((item) => {
        if (item.reminderEnabled === false) return false;
        if (item.date && item.date.trim()) {
          return item.date.trim() === currentYYYYMMDD;
        }
        return item.dayOfWeek === currentDayOfWeek;
      });

      const uncompletedUserNotes = (settings.userNotes || []).filter((note) => !note.completed);

      // 1. Morning Summary Check
      const enableMorningSummary = settings.enableMorningSummary ?? settings.enableMorning ?? true;
      const morningSummaryTime = normalizeTimeTo24H(settings.morningSummaryTime || settings.morningTime || '07:00');
      const morningKey = `${currentYYYYMMDD}_morning_summary_${morningSummaryTime}`;

      if (enableMorningSummary && currentTimeStr >= morningSummaryTime && !sentLog[morningKey]) {
        const allTodayShifts = items.filter((item) => {
          if (item.date && item.date.trim()) return item.date.trim() === currentYYYYMMDD;
          return item.dayOfWeek === currentDayOfWeek;
        });

        if (allTodayShifts.length > 0) {
          const template =
            settings.morningSummaryTemplate ||
            '☀️ Chào buổi sáng! Hôm nay bạn có ca {Ca} từ {ThờiGian} tại {ĐịaĐiểm}.';
          const msg = allTodayShifts
            .map((shift) => formatNotificationMessage(template, shift))
            .join('\n\n');
          await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
          sentLog[morningKey] = new Date().toISOString();
          logUpdated = true;
          logs.push(`[${username}] Sent morning summary`);
        }
      }

      const currentTimeInMinutes = parseInt(currentHour, 10) * 60 + parseInt(currentMin, 10);

      // 2. Shift Start Reminder Check
      const enableShiftReminder = settings.enableShiftReminder ?? settings.enableLeadTime ?? true;
      const shiftLeadMins = settings.shiftReminderLeadMinutes ?? settings.leadTimeMinutes ?? 30;

      if (enableShiftReminder) {
        const template =
          settings.shiftReminderTemplate ||
          '🔔 Sắp tới ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chuẩn bị đi làm nhé!';

        for (const item of todayItems) {
          const [startH, startM] = item.startTime.split(':').map(Number);
          const startTimeInMinutes = startH * 60 + startM;
          const diffMinutes = startTimeInMinutes - currentTimeInMinutes;

          const shiftKey = `${currentYYYYMMDD}_${item.id}_shift_start`;
          if (diffMinutes >= 0 && diffMinutes <= shiftLeadMins && !sentLog[shiftKey]) {
            const msg = formatNotificationMessage(template, item);
            await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
            sentLog[shiftKey] = new Date().toISOString();
            logUpdated = true;
            logs.push(`[${username}] Sent shift reminder for ${item.subject || item.note || 'Ca làm'}`);
          }
        }
      }

      // 3. Check-In Reminder Check
      const enableCheckInReminder = settings.enableCheckInReminder ?? true;
      const checkInLeadMins = settings.checkInLeadMinutes ?? 15;

      if (enableCheckInReminder) {
        const template =
          settings.checkInTemplate ||
          '📍 Chuẩn bị tới giờ vào ca {Ca} ({ThờiGian})! Nhớ Check-in nhé.';

        for (const item of todayItems) {
          const [startH, startM] = item.startTime.split(':').map(Number);
          const startTimeInMinutes = startH * 60 + startM;
          const diffMinutes = startTimeInMinutes - currentTimeInMinutes;

          const checkInKey = `${currentYYYYMMDD}_${item.id}_check_in`;
          if (diffMinutes >= 0 && diffMinutes <= checkInLeadMins && !sentLog[checkInKey]) {
            const msg = formatNotificationMessage(template, item);
            await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
            sentLog[checkInKey] = new Date().toISOString();
            logUpdated = true;
            logs.push(`[${username}] Sent check-in reminder for ${item.subject || item.note || 'Ca làm'}`);
          }
        }
      }

      // 4. Check-Out Reminder Check
      const enableCheckOutReminder = settings.enableCheckOutReminder ?? true;
      const checkOutLagMins = settings.checkOutLagMinutes ?? 10;

      if (enableCheckOutReminder) {
        const template =
          settings.checkOutTemplate ||
          '✅ Đã hết ca làm {Ca}! Nhớ Check-out ra về nhé.';

        for (const item of todayItems) {
          const [endH, endM] = item.endTime.split(':').map(Number);
          const endTimeInMinutes = endH * 60 + endM;
          const lagMinutes = currentTimeInMinutes - endTimeInMinutes;

          const checkOutKey = `${currentYYYYMMDD}_${item.id}_check_out`;
          if (lagMinutes >= 0 && lagMinutes <= checkOutLagMins + 30 && !sentLog[checkOutKey]) {
            const msg = formatNotificationMessage(template, item);
            await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
            sentLog[checkOutKey] = new Date().toISOString();
            logUpdated = true;
            logs.push(`[${username}] Sent check-out reminder for ${item.subject || item.note || 'Ca làm'}`);
          }
        }
      }

      // 5. Notes Memo Reminder Check
      const enableNotesReminder = settings.enableNotesReminder ?? true;
      const notesTimingMode = settings.notesTimingMode || 'before_shift';

      if (enableNotesReminder) {
        const template =
          settings.notesTemplate ||
          '📝 Ca {Ca} có note quan trọng nè: {GhiChú}. Đừng có quên đó nha ⚡';

        if (notesTimingMode === 'before_shift') {
          const notesLeadMins = settings.notesLeadMinutes ?? 15;

          for (const item of todayItems) {
            const [startH, startM] = item.startTime.split(':').map(Number);
            const startTimeInMinutes = startH * 60 + startM;
            const diffMinutes = startTimeInMinutes - currentTimeInMinutes;

            const notesKey = `${currentYYYYMMDD}_${item.id}_notes`;
            if (diffMinutes >= 0 && diffMinutes <= notesLeadMins && !sentLog[notesKey]) {
              const matchingNotes = uncompletedUserNotes.filter((note) => {
                if (note.targetDate && note.targetDate === currentYYYYMMDD) return true;
                if (
                  note.targetShiftCode &&
                  ((item.note && item.note.toLowerCase().includes(note.targetShiftCode.toLowerCase())) ||
                    (item.subject && item.subject.toLowerCase().includes(note.targetShiftCode.toLowerCase())))
                ) {
                  return true;
                }
                if (!note.targetDate && !note.targetShiftCode) return true;
                return false;
              });

              const noteTexts = matchingNotes.map((n) => n.content.trim());
              if (item.note && item.note.trim() && !noteTexts.includes(item.note.trim())) {
                noteTexts.unshift(item.note.trim());
              }

              if (noteTexts.length > 0) {
                const ghiChuFormatted = noteTexts.map((n) => `• ${n}`).join('\n');
                const msg = formatNotificationMessage(template, item, ghiChuFormatted);
                await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
                sentLog[notesKey] = new Date().toISOString();
                logUpdated = true;
                logs.push(`[${username}] Sent notes reminder for ${item.subject || item.note || 'Ca làm'}`);
              }
            }
          }
        } else if (notesTimingMode === 'fixed_time') {
          const notesFixedTime = normalizeTimeTo24H(settings.notesFixedTime || '08:00');
          const fixedNotesKey = `${currentYYYYMMDD}_fixed_notes_${notesFixedTime}`;

          if (currentTimeStr >= notesFixedTime && !sentLog[fixedNotesKey]) {
            const matchingNotes = uncompletedUserNotes.filter((note) => {
              if (note.targetDate && note.targetDate === currentYYYYMMDD) return true;
              if (
                note.targetShiftCode &&
                todayItems.some(
                  (item) =>
                    (item.note && item.note.toLowerCase().includes(note.targetShiftCode!.toLowerCase())) ||
                    (item.subject && item.subject.toLowerCase().includes(note.targetShiftCode!.toLowerCase()))
                )
              ) {
                return true;
              }
              if (!note.targetDate && !note.targetShiftCode) return true;
              return false;
            });

            const noteTexts = matchingNotes.map((n) => n.content.trim());
            for (const item of todayItems) {
              if (item.note && item.note.trim() && !noteTexts.includes(item.note.trim())) {
                noteTexts.push(item.note.trim());
              }
            }

            if (noteTexts.length > 0 || todayItems.length > 0) {
              const ghiChuFormatted =
                noteTexts.length > 0 ? noteTexts.map((n) => `• ${n}`).join('\n') : 'Không có';
              const firstShift = todayItems[0] || ({
                startTime: '--:--',
                endTime: '--:--',
                subject: 'Lịch hôm nay',
                location: 'N/A',
                note: '',
              } as ScheduleItem);

              const msg = formatNotificationMessage(template, firstShift, ghiChuFormatted);
              await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
              sentLog[fixedNotesKey] = new Date().toISOString();
              logUpdated = true;
              logs.push(`[${username}] Sent fixed-time notes reminder at ${notesFixedTime}`);
            }
          }
        }
      }

      // 6. Custom Notifications Check
      if (settings.customNotifications && Array.isArray(settings.customNotifications)) {
        for (const customItem of settings.customNotifications) {
          if (!customItem.enabled || !customItem.template) continue;

          const mode = customItem.timingMode || 'before_shift';

          if (mode === 'before_shift') {
            const customLeadMins = customItem.leadMinutes ?? 30;
            for (const item of todayItems) {
              const [startH, startM] = item.startTime.split(':').map(Number);
              const startTimeInMinutes = startH * 60 + startM;
              const diffMinutes = startTimeInMinutes - currentTimeInMinutes;

              const customKey = `${currentYYYYMMDD}_${item.id}_custom_${customItem.id}`;
              if (diffMinutes >= 0 && diffMinutes <= customLeadMins && !sentLog[customKey]) {
                const msg = formatNotificationMessage(customItem.template, item);
                await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
                sentLog[customKey] = new Date().toISOString();
                logUpdated = true;
                logs.push(`[${username}] Sent custom before-shift reminder (${customItem.title}) for ${item.subject || item.note || 'Ca làm'}`);
              }
            }
          } else if (mode === 'after_shift') {
            const customLagMins = customItem.lagMinutes ?? 10;
            for (const item of todayItems) {
              const [endH, endM] = item.endTime.split(':').map(Number);
              const endTimeInMinutes = endH * 60 + endM;
              const diffMinutes = currentTimeInMinutes - endTimeInMinutes;

              const customKey = `${currentYYYYMMDD}_${item.id}_custom_${customItem.id}`;
              if (diffMinutes >= 0 && diffMinutes <= customLagMins + 30 && !sentLog[customKey]) {
                const msg = formatNotificationMessage(customItem.template, item);
                await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
                sentLog[customKey] = new Date().toISOString();
                logUpdated = true;
                logs.push(`[${username}] Sent custom after-shift reminder (${customItem.title}) for ${item.subject || item.note || 'Ca làm'}`);
              }
            }
          } else if (mode === 'fixed_time') {
            const targetTime = normalizeTimeTo24H(customItem.fixedTime || '12:00');
            const customKey = `${currentYYYYMMDD}_fixed_custom_${customItem.id}`;
            if (currentTimeStr >= targetTime && !sentLog[customKey]) {
              const firstShift = todayItems[0] || ({ startTime: '18:00', endTime: '22:00', subject: 'Highlands Coffee', location: 'Highlands Coffee', note: 'B18' } as ScheduleItem);
              const msg = formatNotificationMessage(customItem.template, firstShift);
              await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
              sentLog[customKey] = new Date().toISOString();
              logUpdated = true;
              logs.push(`[${username}] Sent custom fixed-time reminder (${customItem.title}) at ${targetTime}`);
            }
          }
        }
      }

      if (logUpdated) {
        await saveSettingsForUser(username, { ...settings, sentRemindersLog: sentLog });
      }
    }

    return NextResponse.json({ success: true, currentTime: currentTimeStr, dayOfWeek: currentDayOfWeek, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
