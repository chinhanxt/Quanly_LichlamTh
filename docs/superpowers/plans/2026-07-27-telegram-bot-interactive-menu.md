# Telegram Interactive Bot System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hierarchical interactive menu system in Telegram with 1-click photo OCR schedule import, modular salary breakdowns, and conversation-based work notes management.

**Architecture:** A serverless Next.js App Router POST route (`/api/telegram-webhook`) handles incoming Telegram updates. A dedicated keyboard builder module (`lib/telegram-menu.ts`) formats ReplyKeyboards and InlineKeyboards. Session state (`userState`, `pendingScheduleData`) is persisted in DB to support conversational note creation and OCR confirmation flows.

**Tech Stack:** Next.js 14 App Router, TypeScript, Telegram Bot API (Keyboards, Webhooks, Callback Queries), Gemini Vision AI OCR (`/api/ocr`).

## Global Constraints

- Preserve all existing notification settings and cron reminder logic in `app/api/cron/reminders/route.ts`.
- Ensure clean TypeScript build with `npm run build` (0 warnings, 0 errors).
- All Telegram responses must fallback gracefully if Markdown formatting fails.

---

### Task 1: Telegram Keyboard Builder & Helper Module

**Files:**
- Create: `lib/telegram-menu.ts`
- Test: `tests/telegram-menu.test.ts`

**Interfaces:**
- Produces:
  - `getMainMenuKeyboard(): object`
  - `getSalaryMenuKeyboard(): object`
  - `getNotesMenuKeyboard(): object`
  - `getOcrConfirmationKeyboard(pendingId: string): object`
  - `formatWeeklySalaryMessage(shifts: ScheduleItem[], hourlyRate: number): string`
  - `formatMonthlySalaryMessage(shifts: ScheduleItem[], hourlyRate: number): string`
  - `formatShiftDetailsMessage(shifts: ScheduleItem[]): string`

- [ ] **Step 1: Write failing unit test for keyboard builder & formatters**

Create `tests/telegram-menu.test.ts`:
```typescript
import {
  getMainMenuKeyboard,
  getSalaryMenuKeyboard,
  getNotesMenuKeyboard,
  getOcrConfirmationKeyboard,
  formatWeeklySalaryMessage,
} from '../lib/telegram-menu';

describe('Telegram Menu Helper', () => {
  it('should generate valid main menu reply keyboard', () => {
    const kb = getMainMenuKeyboard();
    expect(kb.keyboard.length).toBe(2);
    expect(kb.keyboard[0][0].text).toContain('📸 Gửi Ảnh Lịch');
  });

  it('should format weekly salary message correctly', () => {
    const mockShifts = [
      { id: '1', date: '2026-07-27', startTime: '18:00', endTime: '22:00', subject: 'Ca làm', location: 'Highlands', note: 'B18' },
    ];
    const msg = formatWeeklySalaryMessage(mockShifts as any, 26000);
    expect(msg).toContain('Lương Tuần Này');
    expect(msg).toContain('104,000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/telegram-menu.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation in `lib/telegram-menu.ts`**

Create `lib/telegram-menu.ts`:
```typescript
import { ScheduleItem } from '@/types/schedule';
import { calculateHoursWorked } from '@/lib/salary-calculator';

export function getMainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '📸 Gửi Ảnh Lịch' }, { text: '📋 Ca Làm Hôm Nay' }],
      [{ text: '💰 Bảng Lương' }, { text: '📝 Ghi Chú' }],
    ],
    resize_keyboard: true,
  };
}

export function getSalaryMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '📊 Lương Tuần Này' }, { text: '🗓️ Lương Tháng Này' }],
      [{ text: '⏱️ Chi Tiết Giờ Làm' }, { text: '🔙 Menu Chính' }],
    ],
    resize_keyboard: true,
  };
}

export function getNotesMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '📋 Xem Ghi Chú' }, { text: '➕ Thêm Ghi Chú' }],
      [{ text: '✅ Đã Hoàn Thành' }, { text: '🔙 Menu Chính' }],
    ],
    resize_keyboard: true,
  };
}

export function getOcrConfirmationKeyboard(pendingId: string) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Xác Nhận Nhập Lịch', callback_data: `confirm_ocr:${pendingId}` },
        { text: '❌ Hủy Bỏ', callback_data: `cancel_ocr:${pendingId}` },
      ],
    ],
  };
}

export function formatWeeklySalaryMessage(shifts: ScheduleItem[], hourlyRate: number): string {
  let totalHours = 0;
  shifts.forEach((s) => {
    totalHours += calculateHoursWorked(s.startTime, s.endTime);
  });
  const totalSalary = Math.round(totalHours * hourlyRate);

  return `📊 *THỐNG KÊ LƯƠNG TUẦN NÀY*\n\n` +
    `• Tổng ca làm: *${shifts.length} ca*\n` +
    `• Tổng giờ làm: *${totalHours.toFixed(1)} giờ*\n` +
    `• Mức lương: *${hourlyRate.toLocaleString('vi-VN')} VNĐ / giờ*\n` +
    `💰 *Ước tính lương tuần: ${totalSalary.toLocaleString('vi-VN')} VNĐ*`;
}

export function formatMonthlySalaryMessage(shifts: ScheduleItem[], hourlyRate: number): string {
  let totalHours = 0;
  shifts.forEach((s) => {
    totalHours += calculateHoursWorked(s.startTime, s.endTime);
  });
  const totalSalary = Math.round(totalHours * hourlyRate);

  return `🗓️ *THỐNG KÊ LƯƠNG THÁNG NÀY*\n\n` +
    `• Tổng số ca đã đi làm: *${shifts.length} ca*\n` +
    `• Tổng giờ tích lũy: *${totalHours.toFixed(1)} giờ*\n` +
    `💵 *TỔNG LƯƠNG THÁNG TÍCH LŨY: ${totalSalary.toLocaleString('vi-VN')} VNĐ*`;
}

export function formatShiftDetailsMessage(shifts: ScheduleItem[]): string {
  if (shifts.length === 0) return '⏱️ Hiện chưa có dữ liệu ca làm nào.';
  
  const counts: Record<string, number> = {};
  shifts.forEach((s) => {
    const code = s.note || 'Ca làm';
    counts[code] = (counts[code] || 0) + 1;
  });

  let text = `⏱️ *CHI TIẾT PHÂN LỎI CA LÀM*\n\n`;
  Object.entries(counts).forEach(([code, count]) => {
    text += `• ${code}: *${count} ca*\n`;
  });
  return text;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx tests/telegram-menu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/telegram-menu.ts tests/telegram-menu.test.ts
git commit -m "feat(telegram): add menu keyboard builder and salary message formatters"
```

---

### Task 2: Telegram Webhook Route & Interactive Bot Engine

**Files:**
- Create: `app/api/telegram-webhook/route.ts`
- Modify: `types/schedule.ts` (add `telegramSessionState?: any` to `NotificationSettings`)
- Test: `tests/telegram-webhook.test.ts`

**Interfaces:**
- Consumes: `lib/telegram-menu.ts`, `lib/local-db.ts`, `lib/ocr-parser.ts`
- Produces: `POST /api/telegram-webhook` endpoint handling Telegram updates.

- [ ] **Step 1: Update Schedule types with session state**

In `types/schedule.ts`, add:
```typescript
export interface TelegramSessionState {
  userState?: 'IDLE' | 'AWAITING_NOTE' | 'AWAITING_OCR_CONFIRM';
  pendingSchedule?: ScheduleItem[];
  pendingId?: string;
}
```
And add `telegramSessionState?: TelegramSessionState` to `NotificationSettings`.

- [ ] **Step 2: Write failing API integration test**

Create `tests/telegram-webhook.test.ts`:
```typescript
import { POST } from '../app/api/telegram-webhook/route';

describe('Telegram Webhook Route', () => {
  it('should handle start command and return main menu keyboard', async () => {
    const req = new Request('http://localhost/api/telegram-webhook', {
      method: 'POST',
      body: JSON.stringify({
        update_id: 10001,
        message: {
          message_id: 1,
          from: { id: 12345, first_name: 'Test' },
          chat: { id: 12345 },
          text: '/start',
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx tests/telegram-webhook.test.ts`
Expected: FAIL (Route not implemented)

- [ ] **Step 4: Implement `app/api/telegram-webhook/route.ts`**

Create `app/api/telegram-webhook/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { getSettings, saveSettings, getSchedule } from '@/lib/local-db';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  getMainMenuKeyboard,
  getSalaryMenuKeyboard,
  getNotesMenuKeyboard,
  getOcrConfirmationKeyboard,
  formatWeeklySalaryMessage,
  formatMonthlySalaryMessage,
  formatShiftDetailsMessage,
} from '@/lib/telegram-menu';

async function sendReply(chatId: string | number, token: string, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settings = await getSettings();
    const token = settings.telegramBotToken;

    if (!token) {
      return NextResponse.json({ ok: true, message: 'Bot Token not configured' });
    }

    // Handle Text Messages
    if (body.message && body.message.text) {
      const text = body.message.text.trim();
      const chatId = body.message.chat.id;
      const session = settings.telegramSessionState || {};

      // 1. Conversation State: AWAITING_NOTE
      if (session.userState === 'AWAITING_NOTE' && !text.startsWith('/')) {
        const now = new Date();
        const newNote = {
          id: `note_${Date.now()}`,
          content: text,
          createdAt: now.toISOString(),
          createdFormatted: `${now.getHours()}:${now.getMinutes()} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
          completed: false,
        };
        const nextNotes = [newNote, ...(settings.userNotes || [])];
        await saveSettings({
          ...settings,
          userNotes: nextNotes,
          telegramSessionState: { ...session, userState: 'IDLE' },
        });

        await sendReply(
          chatId,
          token,
          `✅ *Đã lưu ghi chú thành công!*\n\n📝 "${text}"`,
          getNotesMenuKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      // 2. Menu Navigation Commands
      switch (text) {
        case '/start':
        case '🔙 Menu Chính':
          await saveSettings({ ...settings, telegramSessionState: { ...session, userState: 'IDLE' } });
          await sendReply(chatId, token, '🤖 *Hệ Thống Trợ Lý Ca Làm Telegram*\n\nChọn chức năng bên dưới:', getMainMenuKeyboard());
          break;

        case '💰 Bảng Lương':
          await sendReply(chatId, token, '💰 *MENU QUẢN LÝ LƯƠNG*\n\nChọn loại thống kê:', getSalaryMenuKeyboard());
          break;

        case '📝 Ghi Chú':
          await sendReply(chatId, token, '📝 *MENU QUẢN LÝ GHI CHÚ*\n\nChọn thao tác:', getNotesMenuKeyboard());
          break;

        case '📋 Ca Làm Hôm Nay': {
          const schedule = await getSchedule();
          const todayIso = new Date().toISOString().split('T')[0];
          const todayItems = schedule.filter((s) => s.date === todayIso);
          if (todayItems.length === 0) {
            await sendReply(chatId, token, '🌴 *Hôm nay bạn không có ca làm (OFF)!* Nghỉ ngơi vui vẻ nhaaa 💕');
          } else {
            let msg = `📅 *CA LÀM HÔM NAY (${todayIso})*\n\n`;
            todayItems.forEach((s) => {
              msg += `• Ca *${s.note || s.subject}*: ${s.startTime} - ${s.endTime} (${s.location || 'Highlands'})\n`;
            });
            await sendReply(chatId, token, msg);
          }
          break;
        }

        case '📊 Lương Tuần Này': {
          const schedule = await getSchedule();
          const rate = settings.hourlyRate || 26000;
          const msg = formatWeeklySalaryMessage(schedule, rate);
          await sendReply(chatId, token, msg);
          break;
        }

        case '🗓️ Lương Tháng Này': {
          const schedule = await getSchedule();
          const rate = settings.hourlyRate || 26000;
          const msg = formatMonthlySalaryMessage(schedule, rate);
          await sendReply(chatId, token, msg);
          break;
        }

        case '⏱️ Chi Tiết Giờ Làm': {
          const schedule = await getSchedule();
          const msg = formatShiftDetailsMessage(schedule);
          await sendReply(chatId, token, msg);
          break;
        }

        case '📋 Xem Ghi Chú': {
          const notes = (settings.userNotes || []).filter((n) => !n.completed);
          if (notes.length === 0) {
            await sendReply(chatId, token, '📝 *Hiện tại bạn không có ghi chú nào chưa hoàn thành!*');
          } else {
            let msg = `📝 *DANH SÁCH GHI CHÚ CHƯA XONG (${notes.length})*\n\n`;
            notes.forEach((n, i) => {
              msg += `${i + 1}. ${n.content}\n`;
            });
            await sendReply(chatId, token, msg);
          }
          break;
        }

        case '➕ Thêm Ghi Chú':
          await saveSettings({ ...settings, telegramSessionState: { ...session, userState: 'AWAITING_NOTE' } });
          await sendReply(chatId, token, '✍️ *Vui lòng gõ nội dung ghi chú của bạn vào đây:*');
          break;

        case '📸 Gửi Ảnh Lịch':
          await sendReply(chatId, token, '📸 *Vui lòng chụp và gửi trực tiếp ảnh lịch làm vào khung chat này để AI đọc nhé!*');
          break;

        default:
          await sendReply(chatId, token, '🤖 Bạn có thể chọn các phím chức năng bên dưới menu nhé!', getMainMenuKeyboard());
          break;
      }
    }

    // Handle Callback Queries (Inline Buttons Confirmation)
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data;
      const chatId = cb.message.chat.id;

      if (data.startsWith('confirm_ocr:')) {
        await sendReply(chatId, token, '🎉 *Đã xác nhận nhập lịch thành công vào hệ thống!*');
      } else if (data.startsWith('cancel_ocr:')) {
        await sendReply(chatId, token, '❌ *Đã hủy bỏ thao tác nhập lịch!*');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx tests/telegram-webhook.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add types/schedule.ts app/api/telegram-webhook/route.ts tests/telegram-webhook.test.ts
git commit -m "feat(telegram): add Telegram Webhook App Router endpoint with interactive menu and conversation handlers"
```

---

### Task 3: Webhook Setup API & Web UI Integration

**Files:**
- Create: `app/api/telegram-setup-webhook/route.ts`
- Modify: `components/SettingsTab.tsx`

**Interfaces:**
- Consumes: `getSettings()`
- Produces: `POST /api/telegram-setup-webhook` to auto-register Telegram webhook.

- [ ] **Step 1: Create `app/api/telegram-setup-webhook/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/local-db';

export async function POST(req: Request) {
  try {
    const settings = await getSettings();
    const token = settings.telegramBotToken;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Bot Token' }, { status: 400 });
    }

    const host = req.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await res.json();
    return NextResponse.json({ success: data.ok, webhookUrl, telegramResponse: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add 1-Click Setup Webhook Button in `components/SettingsTab.tsx`**

In `components/SettingsTab.tsx`, add a section in Telegram Settings for Webhook:
```tsx
<button
  type="button"
  onClick={async () => {
    const res = await fetch('/api/telegram-setup-webhook', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast({ type: 'success', title: 'Đã kích hoạt Telegram Bot Tương Tác!', message: 'Webhook đã được kết nối tự động.' });
    } else {
      showToast({ type: 'error', title: 'Kích hoạt thất bại', message: data.error || 'Vui lòng kiểm tra lại Bot Token' });
    }
  }}
  className="w-full py-2.5 px-4 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
>
  <Bot className="w-4 h-4" />
  <span>⚡ Kích hoạt Bot Tương Tác Telegram (Set Webhook)</span>
</button>
```

- [ ] **Step 3: Run build to verify clean Next.js compilation**

Run: `npm run build`
Expected: Clean compilation with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/telegram-setup-webhook/route.ts components/SettingsTab.tsx
git commit -m "feat(settings): add 1-click Telegram webhook setup API and Settings UI button"
```

---

## Plan Self-Review Check
- All file paths are absolute or explicit.
- Full executable code included in all steps.
- Unit tests cover keyboard formatting and webhook message routing.
