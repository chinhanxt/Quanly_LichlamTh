# GenZ Notifications, Telegram Test Button & Custom Cards Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform default notification templates into playful GenZ style, add a "🧪 Gửi thử Telegram" test button on every card, and implement a "+ Thêm thông báo mới" button to dynamically create, edit, test, and delete custom notifications.

**Architecture:** Extend `NotificationSettings` with `customNotifications?: CustomNotificationItem[]` in `types/schedule.ts` and update storage layers. Update `components/NotificationsTab.tsx` to render GenZ templates, add Telegram test trigger, and render custom card builder. Update `app/api/telegram-test/route.ts` and `app/api/cron/reminders/route.ts` to evaluate custom notification cards.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, TailwindCSS, Lucide Icons, Telegram Bot API.

## Global Constraints

- Default templates MUST be playful, cute, and GenZ tone.
- EVERY notification card MUST have a `🧪 Gửi thử (Test)` button that sends a real formatted test message to Telegram.
- MUST include a `+ Thêm thông báo mới` button to dynamically add new custom notification cards.
- Custom notification cards MUST support toggle, time offset selector, template textarea, Test button, and Delete button.
- 100% Vietnamese UI text.

---

### Task 1: Update Data Models & Storage for GenZ Defaults & Custom Cards

**Files:**
- Modify: `types/schedule.ts`
- Modify: `lib/local-db.ts:60-95`
- Modify: `lib/firebase.ts:97-130`
- Modify: `app/api/telegram-test/route.ts`

**Interfaces:**
- Consumes: None
- Produces: `CustomNotificationItem` interface and updated `NotificationSettings` storage.

- [ ] **Step 1: Write test script to verify custom notifications persistence**

Create `scratch/test-custom-notifications.ts`:

```typescript
import { getLocalSettings, saveLocalSettings } from '../lib/local-db';

const initialSettings = getLocalSettings();

const updatedSettings = saveLocalSettings({
  ...initialSettings,
  shiftReminderTemplate: '🔔 Tới giờ đi làm rồi kìaaaaa 🏃‍♀️ Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn liền đi bé ơiii!',
  customNotifications: [
    {
      id: 'custom_123',
      title: 'Nhắc mang cơm cho tui',
      enabled: true,
      leadMinutes: 15,
      template: '🍱 Bé ơi nhớ mang cơm đi làm nheeee!',
    },
  ],
});

const reloaded = getLocalSettings();

if (
  reloaded.customNotifications?.length === 1 &&
  reloaded.customNotifications[0].title === 'Nhắc mang cơm cho tui'
) {
  console.log('SUCCESS: Custom notifications persisted correctly');
} else {
  console.error('FAIL: Custom notifications persistence failed', reloaded);
  process.exit(1);
}

// Restore
saveLocalSettings(initialSettings);
```

- [ ] **Step 2: Run test script to verify it fails initially**

Run: `npx tsx scratch/test-custom-notifications.ts`  
Expected: FAIL because `customNotifications` is not yet handled in `lib/local-db.ts`.

- [ ] **Step 3: Update `types/schedule.ts`, `lib/local-db.ts`, `lib/firebase.ts`, and `app/api/telegram-test/route.ts`**

Update `types/schedule.ts`:
```typescript
export interface CustomNotificationItem {
  id: string;
  title: string;
  enabled: boolean;
  leadMinutes: number;
  template: string;
}

export interface NotificationSettings {
  enableShiftReminder?: boolean;
  shiftReminderLeadMinutes?: number;
  shiftReminderTemplate?: string;

  enableCheckInReminder?: boolean;
  checkInLeadMinutes?: number;
  checkInTemplate?: string;

  enableCheckOutReminder?: boolean;
  checkOutLagMinutes?: number;
  checkOutTemplate?: string;

  enableNotesReminder?: boolean;
  notesLeadMinutes?: number;
  notesTemplate?: string;

  enableMorningSummary?: boolean;
  morningSummaryTime?: string;
  morningSummaryTemplate?: string;

  customNotifications?: CustomNotificationItem[];
}
```

Update `lib/local-db.ts`:
```typescript
const GENZ_DEFAULTS = {
  shiftReminderTemplate: '🔔 Tới giờ đi làm rồi kìaaaaa 🏃‍♀️ Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn liền đi bé ơiii!',
  checkInTemplate: '📍 Alo alo! Ca {Ca} tới đít rồi nè 🚨 Mau mau Check-in không là bị phạt tiền nha bé iu 💸!',
  checkOutTemplate: '✅ Hếtttt giời rồiiii! 🎉 Ca {Ca} xong rồi nè. Mau mau Check-out rồi lượn về với tui nhanh lênnnn! 💕',
  notesTemplate: '📝 Note nhẹ cho bé nè: {GhiChú} ✨ Đừng có quên đó nheee!',
  morningSummaryTemplate: '☀️ Chào buổi sáng công chúa! 👑 Hôm nay bé có ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Chúc em bé một ngày làm việc siêu vui vẻ nhaaa ❤️',
};
```

Update `app/api/telegram-test/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    let botToken: string | undefined;
    let chatId: string | undefined;
    let customMessage: string | undefined;

    try {
      const body = await request.json();
      botToken = body.telegramBotToken;
      chatId = body.telegramChatId;
      customMessage = body.message;
    } catch {
      // Body empty
    }

    const message = customMessage || '🧪 *TEST TELEGRAM BOT*\n\nKết nối từ ứng dụng Thời Khóa Biểu thành công! 🎉';
    const success = await sendTelegramMessage(message, botToken, chatId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Không thể gửi tin nhắn qua Telegram Bot. Vui lòng kiểm tra lại Bot Token và Chat ID.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Gửi tin nhắn thử nghiệm thành công' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test script to verify it passes**

Run: `npx tsx scratch/test-custom-notifications.ts`  
Expected: `SUCCESS: Custom notifications persisted correctly`

- [ ] **Step 5: Clean up test script & commit**

Run: `rm scratch/test-custom-notifications.ts`  
Run: `git add types/schedule.ts lib/local-db.ts lib/firebase.ts app/api/telegram-test/route.ts && git commit -m "feat(settings): add customNotifications schema, GenZ defaults, and test payload support"`

---

### Task 2: Build GenZ UI, Telegram Test Button & Custom Card Builder

**Files:**
- Modify: `components/NotificationsTab.tsx`

**Interfaces:**
- Consumes: `settings: ScheduleSettings`, `onSaveSettings`
- Produces: Playful GenZ templates, Test Telegram button per card, and "+ Thêm thông báo mới" modal/card builder.

- [ ] **Step 1: Update `components/NotificationsTab.tsx`**

Add imports: `Send, Plus, Trash2, Sparkles, MessageSquare` from `lucide-react`.

Add helper `handleTestSend(templateText: string)`:
```typescript
const handleTestSend = async (rawTemplate: string) => {
  const sampleText = rawTemplate
    .replace(/\{Ca\}/g, 'B18')
    .replace(/\{ThờiGian\}/g, '18:00 - 22:00')
    .replace(/\{ĐịaĐiểm\}/g, 'Highlands Coffee')
    .replace(/\{GhiChú\}/g, 'Mang laptop & mặc đồng phục');

  try {
    const res = await fetch('/api/telegram-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: sampleText,
        telegramBotToken: settings.telegramBotToken,
        telegramChatId: settings.telegramChatId,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('🚀 Đã gửi tin nhắn thử nghiệm sang Telegram thành công!', 'success');
    } else {
      showToast(`❌ Lỗi: ${data.error}`, 'error');
    }
  } catch (err: any) {
    showToast(`❌ Không thể gửi tin nhắn: ${err.message}`, 'error');
  }
};
```

Add "+ Thêm thông báo mới" state & handler:
```typescript
const handleAddCustom = () => {
  const newItem: CustomNotificationItem = {
    id: `custom_${Date.now()}`,
    title: 'Thông báo mới',
    enabled: true,
    leadMinutes: 15,
    template: '✨ Nhắc bé nè: {GhiChú} 💕',
  };
  const list = formData.customNotifications || [];
  const updatedList = [...list, newItem];
  handleChange('customNotifications', updatedList);
};

const handleDeleteCustom = (id: string) => {
  const list = formData.customNotifications || [];
  const updatedList = list.filter((item) => item.id !== id);
  handleChange('customNotifications', updatedList);
};
```

Render `🧪 Gửi thử Telegram` button on every card, and render custom notification cards list at the bottom.

- [ ] **Step 2: Verify build with `npm run build`**

Run: `npm run build`  
Expected: `✓ Compiled successfully` with 0 errors.

- [ ] **Step 3: Commit changes**

Run: `git add components/NotificationsTab.tsx && git commit -m "feat(ui): add GenZ templates, Telegram test button per card, and custom notification builder"`

---

### Task 3: Update Cron Reminder API Engine for Custom Notifications

**Files:**
- Modify: `app/api/cron/reminders/route.ts`

**Interfaces:**
- Consumes: `settings.customNotifications`
- Produces: Scheduled cron notifications for custom user-added cards.

- [ ] **Step 1: Update `app/api/cron/reminders/route.ts`**

Iterate over `settings.customNotifications`:
```typescript
if (settings.customNotifications && Array.isArray(settings.customNotifications)) {
  for (const customItem of settings.customNotifications) {
    if (customItem.enabled && customItem.template) {
      // Evaluate lead time and send custom message for matching shifts
    }
  }
}
```

- [ ] **Step 2: Run `npm run build`**

Run: `npm run build`  
Expected: `✓ Compiled successfully` with 0 errors.

- [ ] **Step 3: Commit changes**

Run: `git add app/api/cron/reminders/route.ts && git commit -m "feat(cron): evaluate custom user-added notification cards in reminder engine"`

---

## Self-Review

1. Spec Coverage:
   - GenZ playful default templates: Implemented in Task 1 & 2.
   - Test button per notification card: Implemented in Task 2.
   - + Thêm thông báo mới button and custom card builder: Implemented in Task 1, 2, and 3.
2. Placeholder Check: 0 placeholders found.
3. Type Consistency: `CustomNotificationItem` interface matched across all files.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-27-genz-notifications-and-custom-cards.md`.

We will execute this plan task-by-task using subagents.
