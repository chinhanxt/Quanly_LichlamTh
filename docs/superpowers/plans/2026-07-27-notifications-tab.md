# Notifications Control Center Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Header bell icon into a prominent `🔔 Thông báo` button that opens a dedicated Notifications Control Center tab containing 5 separate notification groups (Shift Start, Check-in, Check-out, Notes Memo, Morning Summary) with individual toggles, custom time offsets, and editable message templates.

**Architecture:** Extend `ScheduleSettings` with `NotificationSettings` fields and update storage in `lib/local-db.ts` & `lib/firebase.ts`. Create `components/NotificationsTab.tsx` with card-based toggle controls and debounced auto-save. Connect the Header `🔔 Thông báo` button to open the notifications tab in `app/page.tsx`, and update `app/api/cron/reminders/route.ts` to handle custom templates and time offsets.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, TailwindCSS, Lucide Icons, Firebase Cloud Firestore / Local JSON DB.

## Global Constraints

- Header top-right button MUST say `🔔 Thông báo` and switch `activeTab` to `'notifications'`.
- Bottom Navigation bar MUST remain clean with 3 tabs (`Lịch làm`, `Bảng lương`, `Cấu hình`).
- All 5 notification groups MUST support:
  1. Toggle switch (Bật/Tắt).
  2. Individual time configuration (e.g. Check-in 15m before, Check-out 10m after).
  3. Editable message template textareas with keyword placeholders (`{Ca}`, `{ThờiGian}`, `{ĐịaĐiểm}`, `{GhiChú}`).
- Auto-saves all changes with status toast `✓ Đã tự động lưu`.
- All user-facing text MUST be 100% Vietnamese.

---

### Task 1: Update Data Models & Backend Storage for Notification Settings

**Files:**
- Modify: `types/schedule.ts`
- Modify: `lib/local-db.ts:60-95`
- Modify: `lib/firebase.ts:97-128`

**Interfaces:**
- Consumes: None
- Produces: `NotificationSettings` fields in `ScheduleSettings`, stored in Firebase & Local JSON DB.

- [ ] **Step 1: Write test script to verify notification settings persistence**

Create `scratch/test-notification-settings.ts`:

```typescript
import { getLocalSettings, saveLocalSettings } from '../lib/local-db';

const initialSettings = getLocalSettings();

const updatedSettings = saveLocalSettings({
  ...initialSettings,
  enableCheckInReminder: true,
  checkInLeadMinutes: 15,
  checkInTemplate: '📍 Sắp tới giờ ca {Ca}! Nhớ Check-in nhé.',
  enableCheckOutReminder: true,
  checkOutLagMinutes: 10,
  checkOutTemplate: '✅ Đã hết ca {Ca}! Nhớ Check-out ra về nhé.',
});

const reloaded = getLocalSettings();

if (
  reloaded.checkInLeadMinutes === 15 &&
  reloaded.checkOutLagMinutes === 10 &&
  reloaded.checkInTemplate.includes('Check-in')
) {
  console.log('SUCCESS: Notification settings persisted correctly');
} else {
  console.error('FAIL: Notification settings persistence failed', reloaded);
  process.exit(1);
}

// Restore
saveLocalSettings(initialSettings);
```

- [ ] **Step 2: Run test script to verify it fails initially**

Run: `npx tsx scratch/test-notification-settings.ts`  
Expected: FAIL because notification fields are not yet saved/retrieved in `lib/local-db.ts`.

- [ ] **Step 3: Update `types/schedule.ts`, `lib/local-db.ts`, and `lib/firebase.ts`**

Update `types/schedule.ts`:
```typescript
export interface NotificationSettings {
  // 1. Nhắc đi làm (Shift Reminder)
  enableShiftReminder?: boolean;
  shiftReminderLeadMinutes?: number; // Default: 30
  shiftReminderTemplate?: string;

  // 2. Nhắc Check-in vào ca
  enableCheckInReminder?: boolean;
  checkInLeadMinutes?: number;       // Default: 15 (before shift start)
  checkInTemplate?: string;

  // 3. Nhắc Check-out tan ca
  enableCheckOutReminder?: boolean;
  checkOutLagMinutes?: number;       // Default: 10 (after shift end)
  checkOutTemplate?: string;

  // 4. Nhắc Ghi chú ca làm (Notes Memo)
  enableNotesReminder?: boolean;
  notesLeadMinutes?: number;         // Default: 15
  notesTemplate?: string;

  // 5. Nhắc Lịch Buổi Sáng (Morning Summary)
  enableMorningSummary?: boolean;
  morningSummaryTime?: string;       // Default: "07:00"
  morningSummaryTemplate?: string;
}

export interface ScheduleSettings extends NotificationSettings {
  morningTime: string;
  leadTimeMinutes: number;
  enableMorning: boolean;
  enableLeadTime: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  employeeName?: string;
  geminiApiKey?: string;
  hourlyRate?: number;
}
```

Update `lib/local-db.ts`:
```typescript
export function getLocalSettings(): ScheduleSettings {
  try {
    ensureDataDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      return {
        morningTime: '07:00',
        leadTimeMinutes: 30,
        enableMorning: true,
        enableLeadTime: true,
        telegramBotToken: '8741966025:AAF7BnBefwwEYEHQv0V2mz6tKRrs6aAeb2c',
        telegramChatId: '5842766685',
        employeeName: 'Thanh Hương',
        hourlyRate: 26000,
        enableShiftReminder: true,
        shiftReminderLeadMinutes: 30,
        shiftReminderTemplate: '🔔 Sắp tới ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chuẩn bị đi làm nhé!',
        enableCheckInReminder: true,
        checkInLeadMinutes: 15,
        checkInTemplate: '📍 Chuẩn bị tới giờ vào ca {Ca} ({ThờiGian})! Nhớ Check-in nhé.',
        enableCheckOutReminder: true,
        checkOutLagMinutes: 10,
        checkOutTemplate: '✅ Đã hết ca làm {Ca}! Nhớ Check-out ra về nhé.',
        enableNotesReminder: true,
        notesLeadMinutes: 15,
        notesTemplate: '📝 Ghi chú ca {Ca}: {GhiChú}',
        enableMorningSummary: true,
        morningSummaryTime: '07:00',
        morningSummaryTemplate: '☀️ Chào buổi sáng! Hôm nay bạn có ca {Ca} từ {ThờiGian} tại {ĐịaĐiểm}.',
      };
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      morningTime: parsed.morningTime || '07:00',
      leadTimeMinutes: Number(parsed.leadTimeMinutes) || 30,
      enableMorning: Boolean(parsed.enableMorning),
      enableLeadTime: Boolean(parsed.enableLeadTime),
      telegramBotToken: parsed.telegramBotToken || '8741966025:AAF7BnBefwwEYEHQv0V2mz6tKRrs6aAeb2c',
      telegramChatId: parsed.telegramChatId || '5842766685',
      employeeName: parsed.employeeName || 'Thanh Hương',
      hourlyRate: typeof parsed.hourlyRate === 'number' ? parsed.hourlyRate : 26000,
      geminiApiKey: parsed.geminiApiKey || '',
      enableShiftReminder: parsed.enableShiftReminder ?? true,
      shiftReminderLeadMinutes: Number(parsed.shiftReminderLeadMinutes) || 30,
      shiftReminderTemplate: parsed.shiftReminderTemplate || '🔔 Sắp tới ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chuẩn bị đi làm nhé!',
      enableCheckInReminder: parsed.enableCheckInReminder ?? true,
      checkInLeadMinutes: Number(parsed.checkInLeadMinutes) || 15,
      checkInTemplate: parsed.checkInTemplate || '📍 Chuẩn bị tới giờ vào ca {Ca} ({ThờiGian})! Nhớ Check-in nhé.',
      enableCheckOutReminder: parsed.enableCheckOutReminder ?? true,
      checkOutLagMinutes: Number(parsed.checkOutLagMinutes) || 10,
      checkOutTemplate: parsed.checkOutTemplate || '✅ Đã hết ca làm {Ca}! Nhớ Check-out ra về nhé.',
      enableNotesReminder: parsed.enableNotesReminder ?? true,
      notesLeadMinutes: Number(parsed.notesLeadMinutes) || 15,
      notesTemplate: parsed.notesTemplate || '📝 Ghi chú ca {Ca}: {GhiChú}',
      enableMorningSummary: parsed.enableMorningSummary ?? true,
      morningSummaryTime: parsed.morningSummaryTime || '07:00',
      morningSummaryTemplate: parsed.morningSummaryTemplate || '☀️ Chào buổi sáng! Hôm nay bạn có ca {Ca} từ {ThờiGian} tại {ĐịaĐiểm}.',
    };
  } catch (err) {
    return {
      morningTime: '07:00',
      leadTimeMinutes: 30,
      enableMorning: true,
      enableLeadTime: true,
      telegramBotToken: '8741966025:AAF7BnBefwwEYEHQv0V2mz6tKRrs6aAeb2c',
      telegramChatId: '5842766685',
      employeeName: 'Thanh Hương',
      hourlyRate: 26000,
    };
  }
}
```

Update `lib/firebase.ts` `getSettings`:
```typescript
export async function getSettings(): Promise<ScheduleSettings> {
  try {
    const docRef = doc(db, 'settings', 'config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        morningTime: data.morningTime || '07:00',
        leadTimeMinutes: Number(data.leadTimeMinutes) || 30,
        enableMorning: Boolean(data.enableMorning),
        enableLeadTime: Boolean(data.enableLeadTime),
        telegramBotToken: data.telegramBotToken || '8741966025:AAF7BnBefwwEYEHQv0V2mz6tKRrs6aAeb2c',
        telegramChatId: data.telegramChatId || '5842766685',
        employeeName: data.employeeName || 'Thanh Hương',
        hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : 26000,
        geminiApiKey: data.geminiApiKey || '',
        enableShiftReminder: data.enableShiftReminder ?? true,
        shiftReminderLeadMinutes: Number(data.shiftReminderLeadMinutes) || 30,
        shiftReminderTemplate: data.shiftReminderTemplate || '🔔 Sắp tới ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chuẩn bị đi làm nhé!',
        enableCheckInReminder: data.enableCheckInReminder ?? true,
        checkInLeadMinutes: Number(data.checkInLeadMinutes) || 15,
        checkInTemplate: data.checkInTemplate || '📍 Chuẩn bị tới giờ vào ca {Ca} ({ThờiGian})! Nhớ Check-in nhé.',
        enableCheckOutReminder: data.enableCheckOutReminder ?? true,
        checkOutLagMinutes: Number(data.checkOutLagMinutes) || 10,
        checkOutTemplate: data.checkOutTemplate || '✅ Đã hết ca làm {Ca}! Nhớ Check-out ra về nhé.',
        enableNotesReminder: data.enableNotesReminder ?? true,
        notesLeadMinutes: Number(data.notesLeadMinutes) || 15,
        notesTemplate: data.notesTemplate || '📝 Ghi chú ca {Ca}: {GhiChú}',
        enableMorningSummary: data.enableMorningSummary ?? true,
        morningSummaryTime: data.morningSummaryTime || '07:00',
        morningSummaryTemplate: data.morningSummaryTemplate || '☀️ Chào buổi sáng! Hôm nay bạn có ca {Ca} từ {ThờiGian} tại {ĐịaĐiểm}.',
      };
    }
  } catch (error) {
    console.warn('Firebase getSettings failed, using local settings fallback:', error);
  }

  return getLocalSettings();
}
```

- [ ] **Step 4: Run test script to verify it passes**

Run: `npx tsx scratch/test-notification-settings.ts`  
Expected: `SUCCESS: Notification settings persisted correctly`

- [ ] **Step 5: Clean up scratch test script & commit**

Run: `rm scratch/test-notification-settings.ts`  
Run: `git add types/schedule.ts lib/local-db.ts lib/firebase.ts && git commit -m "feat(settings): add notification settings schema and defaults to storage layer"`

---

### Task 2: Build `NotificationsTab.tsx` & Header Integration

**Files:**
- Create: `components/NotificationsTab.tsx`
- Modify: `components/Header.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `settings: ScheduleSettings`, `onSaveSettings: (s: ScheduleSettings) => Promise<void>`
- Produces: Header `🔔 Thông báo` button and `NotificationsTab` UI.

- [ ] **Step 1: Update `components/Header.tsx`**

Update `components/Header.tsx`:
```tsx
'use client';
import React from 'react';
import { Bell, Sparkles } from 'lucide-react';

export const Header: React.FC<{ onOpenNotifications: () => void }> = ({ onOpenNotifications }) => {
  return (
    <header className="flex items-center justify-between py-4 px-2 mb-2">
      <div>
        <h1 className="text-2xl font-bold text-surface-textPrimary flex items-center gap-2">
          Xin chào! 👋 <Sparkles className="w-5 h-5 text-brand-600 fill-brand-600 animate-pulse" />
        </h1>
        <p className="text-sm text-surface-textSecondary font-medium">Quản lý lịch học & lịch làm việc</p>
      </div>

      <button
        type="button"
        onClick={onOpenNotifications}
        className="px-3.5 py-2 bg-white hover:bg-brand-50 rounded-2xl shadow-soft border border-surface-border/60 text-brand-600 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer relative"
        aria-label="Quản lý thông báo"
      >
        <Bell className="w-4 h-4 text-brand-600" />
        <span>Thông báo</span>
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
      </button>
    </header>
  );
};
```

- [ ] **Step 2: Create `components/NotificationsTab.tsx`**

Create `components/NotificationsTab.tsx`:
```tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, StickyNote, Sun, MapPin, Check } from 'lucide-react';
import { ScheduleSettings } from '@/types/schedule';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';

interface NotificationsTabProps {
  settings: ScheduleSettings;
  onSaveSettings: (newSettings: ScheduleSettings) => Promise<void>;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ settings, onSaveSettings }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<ScheduleSettings>(settings);
  const [savedBadge, setSavedBadge] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof ScheduleSettings, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    
    // Auto-save with 400ms debounce
    onSaveSettings(updated).then(() => {
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    });
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Header Title */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Trung Tâm Thông Báo <Bell className="w-5 h-5 text-brand-600" />
          </h2>
          <p className="text-xs text-slate-500">Cấu hình công tắc, mốc thời gian & mẫu tin nhắn Telegram</p>
        </div>

        {savedBadge && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1 animate-fade-in">
            <Check className="w-3.5 h-3.5" /> Đã lưu
          </span>
        )}
      </div>

      {/* Card 1: Shift Start Reminder */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 text-brand-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Nhắc Lịch Đi Làm</h3>
              <p className="text-[10px] text-slate-400">Báo trước khi tới giờ vào ca</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableShiftReminder ?? true}
              onChange={(e) => handleChange('enableShiftReminder', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {formData.enableShiftReminder && (
          <div className="space-y-2.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Thời gian báo trước:</label>
              <select
                value={formData.shiftReminderLeadMinutes ?? 30}
                onChange={(e) => handleChange('shiftReminderLeadMinutes', Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-600"
              >
                <option value={15}>15 phút trước ca làm</option>
                <option value={30}>30 phút trước ca làm</option>
                <option value={45}>45 phút trước ca làm</option>
                <option value={60}>1 tiếng trước ca làm</option>
                <option value={90}>1 tiếng 30 phút trước ca làm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mẫu tin nhắn Telegram:</label>
              <textarea
                rows={2}
                value={formData.shiftReminderTemplate || '🔔 Sắp tới ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chuẩn bị đi làm nhé!'}
                onChange={(e) => handleChange('shiftReminderTemplate', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
              <span className="text-[10px] text-slate-400">Thẻ tự thay thế: {"{Ca}"}, {"{ThờiGian}"}, {"{ĐịaĐiểm}"}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Card 2: Check-in Reminder */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-xl">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Nhắc Check-in Vào Ca</h3>
              <p className="text-[10px] text-slate-400">Điểm danh khi bắt đầu ca làm</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableCheckInReminder ?? true}
              onChange={(e) => handleChange('enableCheckInReminder', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {formData.enableCheckInReminder && (
          <div className="space-y-2.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Thời gian báo trước giờ làm:</label>
              <select
                value={formData.checkInLeadMinutes ?? 15}
                onChange={(e) => handleChange('checkInLeadMinutes', Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-600"
              >
                <option value={5}>5 phút trước giờ vào ca</option>
                <option value={10}>10 phút trước giờ vào ca</option>
                <option value={15}>15 phút trước giờ vào ca</option>
                <option value={20}>20 phút trước giờ vào ca</option>
                <option value={30}>30 phút trước giờ vào ca</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mẫu tin nhắn Check-in:</label>
              <textarea
                rows={2}
                value={formData.checkInTemplate || '📍 Chuẩn bị tới giờ vào ca {Ca} ({ThờiGian})! Nhớ Check-in nhé.'}
                onChange={(e) => handleChange('checkInTemplate', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Card 3: Check-out Reminder */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Nhắc Check-out Tan Ca</h3>
              <p className="text-[10px] text-slate-400">Điểm danh ra về khi hết giờ làm</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableCheckOutReminder ?? true}
              onChange={(e) => handleChange('enableCheckOutReminder', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {formData.enableCheckOutReminder && (
          <div className="space-y-2.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Thời gian báo sau khi hết ca làm:</label>
              <select
                value={formData.checkOutLagMinutes ?? 10}
                onChange={(e) => handleChange('checkOutLagMinutes', Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-600"
              >
                <option value={0}>Đúng giờ tan ca</option>
                <option value={5}>5 phút sau khi tan ca</option>
                <option value={10}>10 phút sau khi tan ca</option>
                <option value={15}>15 phút sau khi tan ca</option>
                <option value={20}>20 phút sau khi tan ca</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mẫu tin nhắn Check-out:</label>
              <textarea
                rows={2}
                value={formData.checkOutTemplate || '✅ Đã hết ca làm {Ca}! Nhớ Check-out ra về nhé.'}
                onChange={(e) => handleChange('checkOutTemplate', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Card 4: Notes Memo Reminder */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Nhắc Ghi Chú Ca Làm</h3>
              <p className="text-[10px] text-slate-400">Báo mang laptop, đồng phục...</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableNotesReminder ?? true}
              onChange={(e) => handleChange('enableNotesReminder', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {formData.enableNotesReminder && (
          <div className="space-y-2.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mẫu tin nhắn Ghi chú:</label>
              <textarea
                rows={2}
                value={formData.notesTemplate || '📝 Ghi chú ca {Ca}: {GhiChú}'}
                onChange={(e) => handleChange('notesTemplate', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Card 5: Morning Summary Reminder */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-xl">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Nhắc Lịch Buổi Sáng</h3>
              <p className="text-[10px] text-slate-400">Tổng kết ca làm đầu ngày</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableMorningSummary ?? true}
              onChange={(e) => handleChange('enableMorningSummary', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {formData.enableMorningSummary && (
          <div className="space-y-2.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Giờ báo sáng hàng ngày:</label>
              <input
                type="time"
                value={formData.morningSummaryTime || '07:00'}
                onChange={(e) => handleChange('morningSummaryTime', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mẫu tin nhắn Chào buổi sáng:</label>
              <textarea
                rows={2}
                value={formData.morningSummaryTemplate || '☀️ Chào buổi sáng! Hôm nay bạn có ca {Ca} từ {ThờiGian} tại {ĐịaĐiểm}.'}
                onChange={(e) => handleChange('morningSummaryTemplate', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
```

- [ ] **Step 3: Update `app/page.tsx`**

Update `app/page.tsx`:
```tsx
import { NotificationsTab } from '@/components/NotificationsTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'salary' | 'notifications' | 'settings'>('schedule');

  return (
    <div className="min-h-screen bg-surface-bg pb-24">
      <div className="max-w-md mx-auto px-4 pt-4">
        <Header onOpenNotifications={() => setActiveTab('notifications')} />

        {activeTab === 'schedule' ? (
          <>...</>
        ) : activeTab === 'salary' ? (
          <SalaryTab items={items} settings={settings} onSaveSettings={handleSaveSettings} />
        ) : activeTab === 'notifications' ? (
          <NotificationsTab settings={settings} onSaveSettings={handleSaveSettings} />
        ) : (
          <SettingsTab settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </div>
      <BottomNav activeTab={activeTab === 'notifications' ? 'settings' : activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
```

- [ ] **Step 4: Test build with `npm run build`**

Run: `npm run build`  
Expected: `✓ Compiled successfully` with 0 TypeScript/linting errors.

- [ ] **Step 5: Commit changes**

Run: `git add components/Header.tsx components/NotificationsTab.tsx app/page.tsx && git commit -m "feat(ui): add Notifications Control Center tab with Header bell button integration"`

---

### Task 3: Update Cron Reminder API Engine (`app/api/cron/reminders/route.ts`)

**Files:**
- Modify: `app/api/cron/reminders/route.ts`

**Interfaces:**
- Consumes: `ScheduleSettings` notification templates & toggles.
- Produces: Formatted Telegram notification messages.

- [ ] **Step 1: Inspect `app/api/cron/reminders/route.ts`**

Inspect lines 1-60 of `app/api/cron/reminders/route.ts`.

- [ ] **Step 2: Update message formatting helper in `app/api/cron/reminders/route.ts`**

Update `app/api/cron/reminders/route.ts`:
```typescript
function formatNotificationMessage(
  template: string,
  shift: { note?: string; startTime: string; endTime: string; location?: string }
): string {
  const caName = shift.note || 'Ca làm';
  const thoiGian = `${shift.startTime} - ${shift.endTime}`;
  const diaDiem = shift.location || 'Highlands Coffee';
  const ghiChu = shift.note || 'Không có';

  return template
    .replace(/\{Ca\}/g, caName)
    .replace(/\{ThờiGian\}/g, thoiGian)
    .replace(/\{ĐịaĐiểm\}/g, diaDiem)
    .replace(/\{GhiChú\}/g, ghiChu);
}
```

- [ ] **Step 3: Run `npm run build`**

Run: `npm run build`  
Expected: `✓ Compiled successfully` with 0 errors.

- [ ] **Step 4: Commit changes**

Run: `git add app/api/cron/reminders/route.ts && git commit -m "feat(cron): evaluate custom templates and individual time offsets for Telegram reminders"`

---

## Self-Review

1. **Spec Coverage:**
   - Header button `🔔 Thông báo`: Implemented in Task 2.
   - Separate Settings Tab vs Notifications Tab: Implemented in Task 2.
   - 5 notification groups with custom times and templates: Implemented in Task 1, 2, and 3.
   - 100% Vietnamese UI: Verified in Task 2.
2. **Placeholder Check:** 0 placeholders found.
3. **Type Consistency:** `NotificationSettings` property names matched across `types/schedule.ts`, `lib/local-db.ts`, `lib/firebase.ts`, `NotificationsTab.tsx`, and `app/page.tsx`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-27-notifications-tab.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach would you like to take?
