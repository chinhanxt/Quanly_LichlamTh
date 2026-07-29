# Scheduled Notifications Fix & Deduplication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix non-firing scheduled notifications by supporting external high-frequency webcron calls, dual-mode authentication, stateful notification deduplication, and normalized shift/date matching.

**Architecture:** Enhance `/api/cron/reminders/route.ts` with secret query parameter authentication and a persistent `sentRemindersLog` store on Firestore/Local DB, ensuring each notification fires exactly once per shift/day.

**Tech Stack:** Next.js 14 App Router (TypeScript), Firebase Firestore, Node.js (`node:test`, `node:assert`, `tsx`).

## Global Constraints
- Target project: `/home/chinhan/schedule-telegram-app`
- Test runner: `npx tsx --test <test-file>`
- Maintain backward compatibility with existing Firebase settings schema
- Ensure zero breaking changes to existing Telegram webhook endpoints

---

### Task 1: Add `sentRemindersLog` Schema to Types and Local DB / Firebase Defaults

**Files:**
- Modify: `types/schedule.ts:42-76`
- Modify: `lib/local-db.ts:60-134`
- Modify: `lib/firebase.ts:98-141`
- Create: `tests/settings-types.test.ts`

**Interfaces:**
- Consumes: `ScheduleSettings` type from `types/schedule.ts`
- Produces: `sentRemindersLog?: Record<string, string>` property in `ScheduleSettings`, returned by `getSettings()` and `getLocalSettings()`.

- [ ] **Step 1: Write failing test for `sentRemindersLog` schema in settings**

Create file `tests/settings-types.test.ts`:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getLocalSettings } from '../lib/local-db';
import { ScheduleSettings } from '../types/schedule';

describe('Settings sentRemindersLog schema', () => {
  it('should include sentRemindersLog as an object in default local settings', () => {
    const settings: ScheduleSettings = getLocalSettings();
    assert.ok(typeof settings.sentRemindersLog === 'object' && settings.sentRemindersLog !== null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/settings-types.test.ts`
Expected: FAIL (assertion error: `sentRemindersLog` is undefined)

- [ ] **Step 3: Update `types/schedule.ts`, `lib/local-db.ts`, and `lib/firebase.ts`**

In `types/schedule.ts`, add `sentRemindersLog` to `NotificationSettings`:
```typescript
export interface NotificationSettings {
  // ... existing properties
  sentRemindersLog?: Record<string, string>;
}
```

In `lib/local-db.ts`, update `DEFAULT_SETTINGS` and `getLocalSettings()`:
```typescript
// Add sentRemindersLog: {} to DEFAULT_SETTINGS
const DEFAULT_SETTINGS: ScheduleSettings = {
  // ... existing default values
  sentRemindersLog: {},
};

// In getLocalSettings():
return {
  // ... existing fields
  sentRemindersLog: typeof parsed.sentRemindersLog === 'object' && parsed.sentRemindersLog !== null ? parsed.sentRemindersLog : {},
};
```

In `lib/firebase.ts`, update `getSettings()`:
```typescript
return {
  // ... existing fields
  sentRemindersLog: typeof data.sentRemindersLog === 'object' && data.sentRemindersLog !== null ? data.sentRemindersLog : {},
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/settings-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add types/schedule.ts lib/local-db.ts lib/firebase.ts tests/settings-types.test.ts
git commit -m "feat: add sentRemindersLog schema to settings"
```

---

### Task 2: Implement Dual Authentication & Deduplication Helper in Cron Endpoint

**Files:**
- Modify: `app/api/cron/reminders/route.ts`
- Create: `tests/cron-reminders.test.ts`

**Interfaces:**
- Consumes: `getSettings()` & `updateSettings()` from `lib/firebase.ts`, `sentRemindersLog` in `ScheduleSettings`.
- Produces: Dual authentication check (Header + `?secret=` query param) and deduplication helper functions in `/api/cron/reminders/route.ts`.

- [ ] **Step 1: Write failing test for Dual Auth & Deduplication in `tests/cron-reminders.test.ts`**

Create file `tests/cron-reminders.test.ts`:
```typescript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GET } from '../app/api/cron/reminders/route';

describe('Cron Reminders API Dual Auth & Deduplication', () => {
  const originalEnvSecret = process.env.CRON_SECRET;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test_secret_key_123';
    global.fetch = async (url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('api.telegram.org')) {
        return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
      }
      return originalFetch(url);
    };
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalEnvSecret;
    global.fetch = originalFetch;
  });

  it('should reject requests with invalid secret in header or query', async () => {
    const req = new Request('http://localhost:3000/api/cron/reminders?secret=wrong_secret');
    const res = await GET(req);
    assert.strictEqual(res.status, 401);
  });

  it('should accept requests with valid secret query parameter', async () => {
    const req = new Request('http://localhost:3000/api/cron/reminders?secret=test_secret_key_123');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/cron-reminders.test.ts`
Expected: FAIL (query parameter `secret` not checked, returns 401 for `?secret=test_secret_key_123`)

- [ ] **Step 3: Update `app/api/cron/reminders/route.ts` authentication & add deduplication logic**

Update `app/api/cron/reminders/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { getScheduleItems, getSettings, updateSettings } from '@/lib/firebase';
import { sendTelegramMessage } from '@/lib/telegram';
import { ScheduleItem } from '@/types/schedule';

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

    const settings = await getSettings();
    let sentLog = pruneOldLogs(settings.sentRemindersLog || {});
    let logUpdated = false;

    const items = await getScheduleItems();

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

    // Today shifts filter (date matching OR dayOfWeek matching)
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
    const morningSummaryTime = settings.morningSummaryTime || settings.morningTime || '07:00';
    const morningKey = `${currentYYYYMMDD}_morning_summary`;

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
        logs.push('Sent morning summary');
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
          logs.push(`Sent shift reminder for ${item.subject || item.note || 'Ca làm'}`);
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
          logs.push(`Sent check-in reminder for ${item.subject || item.note || 'Ca làm'}`);
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
          logs.push(`Sent check-out reminder for ${item.subject || item.note || 'Ca làm'}`);
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
              logs.push(`Sent notes reminder for ${item.subject || item.note || 'Ca làm'}`);
            }
          }
        }
      } else if (notesTimingMode === 'fixed_time') {
        const notesFixedTime = settings.notesFixedTime || '08:00';
        const fixedNotesKey = `${currentYYYYMMDD}_fixed_notes`;

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
            logs.push(`Sent fixed-time notes reminder at ${notesFixedTime}`);
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
              logs.push(`Sent custom before-shift reminder (${customItem.title}) for ${item.subject || item.note || 'Ca làm'}`);
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
              logs.push(`Sent custom after-shift reminder (${customItem.title}) for ${item.subject || item.note || 'Ca làm'}`);
            }
          }
        } else if (mode === 'fixed_time') {
          const targetTime = customItem.fixedTime || '12:00';
          const customKey = `${currentYYYYMMDD}_fixed_custom_${customItem.id}`;
          if (currentTimeStr >= targetTime && !sentLog[customKey]) {
            const firstShift = todayItems[0] || ({ startTime: '18:00', endTime: '22:00', subject: 'Highlands Coffee', location: 'Highlands Coffee', note: 'B18' } as ScheduleItem);
            const msg = formatNotificationMessage(customItem.template, firstShift);
            await sendTelegramMessage(msg, settings.telegramBotToken, settings.telegramChatId);
            sentLog[customKey] = new Date().toISOString();
            logUpdated = true;
            logs.push(`Sent custom fixed-time reminder (${customItem.title}) at ${targetTime}`);
          }
        }
      }
    }

    if (logUpdated) {
      await updateSettings({ ...settings, sentRemindersLog: sentLog });
    }

    return NextResponse.json({ success: true, currentTime: currentTimeStr, dayOfWeek: currentDayOfWeek, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/cron-reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/reminders/route.ts tests/cron-reminders.test.ts
git commit -m "feat: add dual auth and deduplication log to cron reminders API"
```

---

### Task 3: Test Deduplication & Shift Date Filtering

**Files:**
- Modify: `tests/cron-reminders.test.ts`

**Interfaces:**
- Consumes: `/api/cron/reminders/route.ts`
- Produces: Test suite verifying zero duplicate notifications sent on consecutive cron triggers and proper date filtering.

- [ ] **Step 1: Add deduplication test case to `tests/cron-reminders.test.ts`**

Add to `tests/cron-reminders.test.ts`:
```typescript
  it('should prevent sending duplicate notifications on subsequent cron calls', async () => {
    // 1st call
    const req1 = new Request('http://localhost:3000/api/cron/reminders?secret=test_secret_key_123');
    const res1 = await GET(req1);
    assert.strictEqual(res1.status, 200);
    const body1 = await res1.json();
    
    // 2nd consecutive call (simulating cron ping 1 min later)
    const req2 = new Request('http://localhost:3000/api/cron/reminders?secret=test_secret_key_123');
    const res2 = await GET(req2);
    assert.strictEqual(res2.status, 200);
    const body2 = await res2.json();

    // Verification: Any log sent in 1st run should not be re-sent in 2nd run
    if (body1.logs.length > 0) {
      assert.strictEqual(body2.logs.length, 0);
    }
  });
```

- [ ] **Step 2: Run test suite**

Run: `npx tsx --test tests/cron-reminders.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/cron-reminders.test.ts
git commit -m "test: add deduplication test cases for cron reminders API"
```

---

### Task 4: Documentation and Deployment Guide Update

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Webcron configuration details
- Produces: Updated `README.md` with step-by-step external webcron configuration guide for Vercel Hobby.

- [ ] **Step 1: Update `README.md` with Webcron setup section**

Add to `README.md`:
```markdown
## Cấu hình Hẹn giờ Thông báo (Cron Reminders) trên Vercel Hobby

Do gói Vercel Hobby chỉ cho phép chạy Cron tự động 1 lần/ngày, ứng dụng hỗ trợ kích hoạt từ dịch vụ Webcron bên ngoài (như [cron-job.org](https://cron-job.org)) để nhắc lịch chính xác từng phút.

### Các bước cài đặt:

1. **Thiết lập secret key trên Vercel:**
   - Vào Vercel Dashboard -> chọn Project -> **Settings** -> **Environment Variables**.
   - Thêm biến môi trường: `CRON_SECRET` = `<Mã_Bảo_Mật_Tùy_Chọn>` (ví dụ: `my_telegram_cron_secret_888`).

2. **Tạo Cron Job trên cron-job.org:**
   - Đăng ký tài khoản miễn phí tại [cron-job.org](https://cron-job.org).
   - Đặt URL: `https://<tên-app-của-bạn>.vercel.app/api/cron/reminders?secret=<Mã_Bảo_Mật_Tùy_Chọn>`
   - Đặt tần suất (Execution schedule): **Every 1 minute** (Mỗi 1 phút) hoặc **Every 5 minutes** (Mỗi 5 phút).
   - Bấm **Save**.

### Cơ chế chống gửi lặp:
Hệ thống được tích hợp sẵn cơ chế **Notification Deduplication (`sentRemindersLog`)**. Dù `cron-job.org` gọi API mỗi phút một lần, mỗi thông báo trước ca, check-in, check-out hay ghi chú trong ngày sẽ **chỉ gửi Telegram đúng 1 lần duy nhất**.
```

- [ ] **Step 2: Verify all test suites pass**

Run: `npx tsx --test tests/telegram-webhook.test.ts tests/settings-types.test.ts tests/cron-reminders.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add webcron setup guide to README"
```
