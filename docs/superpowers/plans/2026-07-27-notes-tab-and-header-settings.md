# Notes Tab, Header Settings Button & Notes Reminder Upgrade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Settings to a Header gear icon, replace the 3rd bottom nav tab with a dedicated Notes Tab (`NotesTab.tsx`) supporting auto-timestamps & shift/date assignment, and upgrade Card 4 Notes Reminder to support fixed-time vs before-shift triggers with auto-aggregated notes in Telegram.

**Architecture:** Extend `NotificationSettings` with `UserNote` schema, `notesTimingMode`, and `notesFixedTime` in `types/schedule.ts` & storage layers. Build `components/NotesTab.tsx` with auto-save & target assignment. Update `components/Header.tsx` & `components/BottomNav.tsx` navigation routes. Update Card 4 in `components/NotificationsTab.tsx` and the cron reminder engine in `app/api/cron/reminders/route.ts`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, TailwindCSS, Lucide Icons, Firebase Firestore / Local JSON DB.

## Global Constraints

- Header top-right MUST contain both `🔔 Thông báo` button AND `⚙️` gear icon button.
- Bottom Navigation bar MUST have 3 tabs: `Thời khóa biểu`, `Bảng lương`, `Ghi chú`.
- Notes Tab MUST record auto-timestamps (`HH:mm - DD/MM/YYYY`) upon note creation.
- Notes Tab MUST allow assigning notes to a specific date (`YYYY-MM-DD`) or shift code (`B18`, `B16`...).
- Card 4 Notes Reminder MUST support both `Trước ca làm` and `Giờ cố định` (e.g. `08:00`).
- 100% Vietnamese UI text.

---

### Task 1: Update Data Models & Storage for `UserNote` and Notes Settings

**Files:**
- Modify: `types/schedule.ts`
- Modify: `lib/local-db.ts:60-100`
- Modify: `lib/firebase.ts:110-140`

**Interfaces:**
- Consumes: None
- Produces: `UserNote` interface and updated `NotificationSettings` fields.

- [ ] **Step 1: Write test script to verify `UserNote` persistence**

Create `scratch/test-user-notes.ts`:

```typescript
import { getLocalSettings, saveLocalSettings } from '../lib/local-db';

const initialSettings = getLocalSettings();

const updatedSettings = saveLocalSettings({
  ...initialSettings,
  notesTimingMode: 'fixed_time',
  notesFixedTime: '08:00',
  userNotes: [
    {
      id: 'note_123',
      content: 'Mang laptop & mặc đồng phục',
      createdAt: new Date().toISOString(),
      createdFormatted: '20:02 - 27/07/2026',
      targetShiftCode: 'B18',
      completed: false,
    },
  ],
});

const reloaded = getLocalSettings();

if (
  reloaded.notesTimingMode === 'fixed_time' &&
  reloaded.userNotes?.length === 1 &&
  reloaded.userNotes[0].targetShiftCode === 'B18'
) {
  console.log('SUCCESS: User notes and notes timing mode persisted correctly');
} else {
  console.error('FAIL: User notes persistence failed', reloaded);
  process.exit(1);
}

// Restore
saveLocalSettings(initialSettings);
```

- [ ] **Step 2: Run test script to verify it fails initially**

Run: `npx tsx scratch/test-user-notes.ts`  
Expected: FAIL because `userNotes` and `notesTimingMode` are not yet handled in `lib/local-db.ts`.

- [ ] **Step 3: Update `types/schedule.ts`, `lib/local-db.ts`, and `lib/firebase.ts`**

Update `types/schedule.ts`:
```typescript
export interface UserNote {
  id: string;
  content: string;
  createdAt: string;
  createdFormatted: string;
  targetDate?: string;
  targetShiftCode?: string;
  completed?: boolean;
}

export interface NotificationSettings {
  // Card 4: Nhắc Ghi chú
  enableNotesReminder?: boolean;
  notesTimingMode?: 'before_shift' | 'fixed_time';
  notesLeadMinutes?: number;
  notesFixedTime?: string;
  notesTemplate?: string;

  userNotes?: UserNote[];
}
```

Update `lib/local-db.ts` & `lib/firebase.ts` to parse, store, and return `userNotes`, `notesTimingMode`, and `notesFixedTime`.

- [ ] **Step 4: Run test script to verify it passes**

Run: `npx tsx scratch/test-user-notes.ts`  
Expected: `SUCCESS: User notes and notes timing mode persisted correctly`

- [ ] **Step 5: Clean up scratch test script & commit**

Run: `rm scratch/test-user-notes.ts`  
Run: `git add types/schedule.ts lib/local-db.ts lib/firebase.ts && git commit -m "feat(settings): add UserNote schema, notesTimingMode, and storage persistence"`

---

### Task 2: Build `NotesTab.tsx` UI & Header Navigation Integration

**Files:**
- Create: `components/NotesTab.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/BottomNav.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `settings: ScheduleSettings`, `onSaveSettings: (s: ScheduleSettings) => Promise<void>`
- Produces: Header Gear icon button, 3rd Bottom Nav tab `Ghi chú`, and `NotesTab` UI.

- [ ] **Step 1: Update `components/Header.tsx`**

Add `onOpenSettings: () => void` and render `⚙️` Gear Icon button next to `🔔 Thông báo` button:
```tsx
export const Header: React.FC<{
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
}> = ({ onOpenNotifications, onOpenSettings }) => {
  return (
    <header className="flex items-center justify-between py-4 px-2 mb-2">
      <div>
        <h1 className="text-2xl font-bold text-surface-textPrimary flex items-center gap-2">
          Xin chào! 👋 <Sparkles className="w-5 h-5 text-brand-600 fill-brand-600 animate-pulse" />
        </h1>
        <p className="text-sm text-surface-textSecondary font-medium">Quản lý lịch học & lịch làm việc</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenNotifications}
          className="px-3 py-2 bg-white hover:bg-brand-50 rounded-2xl shadow-soft border border-surface-border/60 text-brand-600 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer relative"
          aria-label="Trung tâm thông báo"
        >
          <Bell className="w-4 h-4 text-brand-600" />
          <span>Thông báo</span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 bg-white hover:bg-slate-100 rounded-2xl shadow-soft border border-surface-border/60 text-slate-600 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
          title="Cấu hình hệ thống"
          aria-label="Cấu hình hệ thống"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};
```

- [ ] **Step 2: Update `components/BottomNav.tsx`**

Change Tab 3 from `Cấu hình` to `Ghi chú` (`'notes'` with `StickyNote` icon):
```tsx
interface BottomNavProps {
  activeTab: 'schedule' | 'salary' | 'notes' | 'notifications' | 'settings';
  onChangeTab: (tab: 'schedule' | 'salary' | 'notes' | 'notifications' | 'settings') => void;
}
```

- [ ] **Step 3: Create `components/NotesTab.tsx`**

Create `components/NotesTab.tsx`:
- Quick note creation form: Content textarea, Date picker (`targetDate`), and Shift code dropdown (`targetShiftCode`: `B18`, `B16`, `B`...).
- Formats creation timestamp e.g. `20:02 - 27/07/2026`.
- Auto-saves user notes list into `settings.userNotes`.
- Renders notes list with completion checkbox, target badges (`📅 27/07/2026`, `⏰ Ca B18`), edit mode, and delete button.

- [ ] **Step 4: Update `app/page.tsx`**

Update `activeTab` type to `'schedule' | 'salary' | 'notes' | 'notifications' | 'settings'`, render `NotesTab` when `activeTab === 'notes'`, and pass `onOpenSettings={() => setActiveTab('settings')}` to `<Header />`.

- [ ] **Step 5: Run `npm run build`**

Run: `npm run build`  
Expected: `✓ Compiled successfully` with 0 errors.

- [ ] **Step 6: Commit changes**

Run: `git add components/Header.tsx components/BottomNav.tsx components/NotesTab.tsx app/page.tsx && git commit -m "feat(ui): add NotesTab, update BottomNav to Ghi chu, and add Header Settings gear button"`

---

### Task 3: Update Card 4 in `NotificationsTab.tsx` and Cron Engine

**Files:**
- Modify: `components/NotificationsTab.tsx`
- Modify: `app/api/cron/reminders/route.ts`

**Interfaces:**
- Consumes: `notesTimingMode`, `notesFixedTime`, `userNotes`
- Produces: Card 4 timing mode selector and cron note aggregation for Telegram.

- [ ] **Step 1: Update Card 4 in `components/NotificationsTab.tsx`**

Add timing mode selector for Card 4 (Nhắc Ghi Chú Ca Làm):
- `[ 🟢 Trước ca làm ]` (select `notesLeadMinutes`) vs `[ ⏰ Giờ cố định hàng ngày ]` (time input `notesFixedTime` e.g. `08:00`).

- [ ] **Step 2: Update `app/api/cron/reminders/route.ts`**

In `app/api/cron/reminders/route.ts`:
- Check `settings.notesTimingMode || 'before_shift'`.
- Retrieve active `userNotes` from `settings.userNotes` matching today's date/shift.
- Format aggregated notes list into `{GhiChú}` placeholder.

- [ ] **Step 3: Run `npm run build`**

Run: `npm run build`  
Expected: `✓ Compiled successfully` with 0 errors.

- [ ] **Step 4: Commit changes**

Run: `git add components/NotificationsTab.tsx app/api/cron/reminders/route.ts && git commit -m "feat(cron): update Card 4 Notes Reminder with timing modes and dynamic userNotes aggregation"`

---

## Self-Review

1. Spec Coverage:
   - Header gear icon for Settings: Implemented in Task 2.
   - Bottom nav 3rd tab `Ghi chú`: Implemented in Task 2.
   - Auto-timestamp and date/shift assignment in `NotesTab`: Implemented in Task 2.
   - Card 4 timing mode toggle (Before shift vs Fixed time): Implemented in Task 3.
2. Placeholder Check: 0 placeholders found.
3. Type Consistency: `UserNote` interface matched across all files.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-27-notes-tab-and-header-settings.md`.

We will execute this plan task-by-task using subagents.
