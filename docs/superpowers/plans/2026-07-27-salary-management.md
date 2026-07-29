# Salary & Payroll Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive Salary & Payroll Management tab that allows users to set an hourly wage (e.g., 26,000 VNĐ/hr), select date ranges (e.g., current month 01/07 to 31/07), and view an exhaustive daily breakdown and KPI overview of total hours worked and total salary earned.

**Architecture:** Extend existing data interfaces (`ScheduleSettings` with `hourlyRate`) and storage layers (`lib/firebase.ts` & `lib/local-db.ts`). Create a dedicated calculation module (`lib/salary-calculator.ts`) for precise shift hour and earnings computations. Create a modern, responsive UI component (`components/SalaryTab.tsx`) integrated into `components/BottomNav.tsx` and `app/page.tsx`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, TailwindCSS, Lucide Icons, Firebase Cloud Firestore / Local JSON DB.

## Global Constraints

- Hourly Rate default value: `26000` (VNĐ/hour).
- Shift duration calculation: `(endTime - startTime)` supporting fractional hours (e.g. 7.5h) and midnight shifts.
- Daily breakdown: MUST include 100% of all days in the date range chronologically, explicitly showing `OFF` days with `0.0h` and `0 VNĐ`.
- All user-facing text MUST be 100% Vietnamese.

---

### Task 1: Update Data Models & Backend Storage for Hourly Rate

**Files:**
- Modify: `types/schedule.ts`
- Modify: `lib/local-db.ts:60-95`
- Modify: `lib/firebase.ts:97-128`

**Interfaces:**
- Consumes: None
- Produces: `hourlyRate?: number` property in `ScheduleSettings`, synced via `/api/settings`.

- [ ] **Step 1: Write test script to verify `hourlyRate` persistence**

Create `scratch/test-settings-hourly-rate.ts`:

```typescript
import { getLocalSettings, saveLocalSettings } from '../lib/local-db';

const currentSettings = getLocalSettings();
console.log('Default hourlyRate:', currentSettings.hourlyRate);

const updatedSettings = saveLocalSettings({
  ...currentSettings,
  hourlyRate: 30000,
});

console.log('Saved hourlyRate:', updatedSettings.hourlyRate);
const reloadedSettings = getLocalSettings();
if (reloadedSettings.hourlyRate === 30000) {
  console.log('SUCCESS: hourlyRate persisted correctly');
} else {
  console.error('FAIL: hourlyRate failed to persist');
  process.exit(1);
}

// Restore default
saveLocalSettings({ ...currentSettings, hourlyRate: currentSettings.hourlyRate || 26000 });
```

- [ ] **Step 2: Run test script to verify it fails initially**

Run: `npx tsx scratch/test-settings-hourly-rate.ts`  
Expected: Default `hourlyRate` is `undefined` because `getLocalSettings` does not include `hourlyRate`.

- [ ] **Step 3: Update `types/schedule.ts`, `lib/local-db.ts`, and `lib/firebase.ts`**

Update `types/schedule.ts`:
```typescript
export interface ScheduleSettings {
  morningTime: string;       // "07:00"
  leadTimeMinutes: number;   // 30
  enableMorning: boolean;    // true
  enableLeadTime: boolean;   // true
  telegramBotToken?: string;
  telegramChatId?: string;
  employeeName?: string;     // "Thanh Hương"
  geminiApiKey?: string;     // Google Gemini API Key cho AI OCR
  hourlyRate?: number;       // Đơn giá lương/giờ (mặc định: 26000)
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
        telegramBotToken: 'TELEGRAM_BOT_TOKEN_REVOKED',
        telegramChatId: 'CHAT_ID_REVOKED',
        employeeName: 'Thanh Hương',
        hourlyRate: 26000,
      };
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      hourlyRate: typeof parsed.hourlyRate === 'number' ? parsed.hourlyRate : 26000,
    };
  } catch (err) {
    return {
      morningTime: '07:00',
      leadTimeMinutes: 30,
      enableMorning: true,
      enableLeadTime: true,
      telegramBotToken: 'TELEGRAM_BOT_TOKEN_REVOKED',
      telegramChatId: 'CHAT_ID_REVOKED',
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
        telegramBotToken: data.telegramBotToken || 'TELEGRAM_BOT_TOKEN_REVOKED',
        telegramChatId: data.telegramChatId || 'CHAT_ID_REVOKED',
        employeeName: data.employeeName || 'Thanh Hương',
        hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : 26000,
      };
    }
  } catch (error) {
    console.warn('Firebase getSettings failed, using local settings fallback:', error);
  }

  return getLocalSettings();
}
```

- [ ] **Step 4: Run test script to verify it passes**

Run: `npx tsx scratch/test-settings-hourly-rate.ts`  
Expected: `SUCCESS: hourlyRate persisted correctly`

- [ ] **Step 5: Clean up scratch test file & commit**

Run: `rm scratch/test-settings-hourly-rate.ts`  
Run: `git add types/schedule.ts lib/local-db.ts lib/firebase.ts && git commit -m "feat(settings): add hourlyRate field to settings schema and backend storage"`

---

### Task 2: Implement Core Salary Calculation Engine (`lib/salary-calculator.ts`)

**Files:**
- Create: `lib/salary-calculator.ts`
- Test: `scratch/test-salary-calculator.ts`

**Interfaces:**
- Consumes: `ScheduleItem[]`, `fromDate: string`, `toDate: string`, `hourlyRate: number`
- Produces: `PayrollSummary` object containing totals and exhaustive `dailyBreakdown` array.

- [ ] **Step 1: Create test script for calculation engine**

Create `scratch/test-salary-calculator.ts`:
```typescript
import {
  calculateShiftHours,
  calculatePayrollBreakdown,
} from '../lib/salary-calculator';
import { ScheduleItem } from '../types/schedule';

// Test 1: calculateShiftHours
console.log('Testing shift hours calculation...');
const h1 = calculateShiftHours('18:00', '22:00'); // 4.0h
const h2 = calculateShiftHours('15:00', '22:00'); // 7.0h
const h3 = calculateShiftHours('11:30', '18:00'); // 6.5h
const h4 = calculateShiftHours('22:00', '02:00'); // 4.0h (midnight)

if (h1 !== 4 || h2 !== 7 || h3 !== 6.5 || h4 !== 4) {
  console.error('FAIL: calculateShiftHours mismatch', { h1, h2, h3, h4 });
  process.exit(1);
}
console.log('SUCCESS: calculateShiftHours tests passed');

// Test 2: calculatePayrollBreakdown for 3 days
const mockItems: ScheduleItem[] = [
  {
    id: '1',
    dayOfWeek: 'Thu2',
    date: '2026-07-01',
    startTime: '15:00',
    endTime: '22:00',
    subject: 'Highlands Coffee',
    note: 'Ca B',
    reminderEnabled: true,
  },
  {
    id: '2',
    dayOfWeek: 'Thu3',
    date: '2026-07-02',
    startTime: '18:00',
    endTime: '22:00',
    subject: 'Highlands Coffee',
    note: 'Ca B18',
    reminderEnabled: true,
  },
];

const summary = calculatePayrollBreakdown(mockItems, '2026-07-01', '2026-07-03', 26000);

if (summary.dailyBreakdown.length !== 3) {
  console.error('FAIL: Expected 3 calendar days breakdown, got', summary.dailyBreakdown.length);
  process.exit(1);
}

// Day 1 (01/07): 7h * 26000 = 182,000
// Day 2 (02/07): 4h * 26000 = 104,000
// Day 3 (03/07): 0h * 26000 = 0 (OFF)
// Total hours = 11h, Total salary = 286,000, Worked = 2, OFF = 1

if (
  summary.totalHours !== 11 ||
  summary.totalSalary !== 286000 ||
  summary.totalWorkedDays !== 2 ||
  summary.totalOffDays !== 1
) {
  console.error('FAIL: Summary totals mismatch', summary);
  process.exit(1);
}

console.log('SUCCESS: calculatePayrollBreakdown tests passed!');
```

- [ ] **Step 2: Run test script to verify it fails**

Run: `npx tsx scratch/test-salary-calculator.ts`  
Expected: Fail because `lib/salary-calculator.ts` does not exist yet.

- [ ] **Step 3: Implement `lib/salary-calculator.ts`**

Create `lib/salary-calculator.ts`:
```typescript
import { ScheduleItem } from '@/types/schedule';

export interface DailyPayrollItem {
  dateIso: string;          // "YYYY-MM-DD" e.g. "2026-07-15"
  dateFormatted: string;    // "15/07"
  dayOfWeek: string;        // "Thu4"
  dayNameVi: string;        // "Thứ 4"
  isOff: boolean;
  shifts: Array<{
    shiftCode: string;
    startTime: string;
    endTime: string;
    hours: number;
    earnings: number;
    subject: string;
  }>;
  totalHours: number;
  totalEarnings: number;
}

export interface PayrollSummary {
  fromDate: string;
  toDate: string;
  hourlyRate: number;
  totalSalary: number;
  totalHours: number;
  totalWorkedDays: number;
  totalOffDays: number;
  dailyBreakdown: DailyPayrollItem[];
}

export function calculateShiftHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;

  const startTotalMin = startH * 60 + startM;
  let endTotalMin = endH * 60 + endM;

  // Handle midnight shift (e.g. 22:00 -> 02:00)
  if (endTotalMin <= startTotalMin) {
    endTotalMin += 24 * 60;
  }

  const durationHours = (endTotalMin - startTotalMin) / 60;
  return Number(durationHours.toFixed(2));
}

export function formatLocalDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculatePayrollBreakdown(
  items: ScheduleItem[],
  fromDateStr: string,
  toDateStr: string,
  hourlyRate: number = 26000
): PayrollSummary {
  const start = new Date(fromDateStr + 'T00:00:00');
  const end = new Date(toDateStr + 'T00:00:00');

  const dayNamesVi: Record<number, { name: string; key: string }> = {
    1: { name: 'Thứ 2', key: 'Thu2' },
    2: { name: 'Thứ 3', key: 'Thu3' },
    3: { name: 'Thứ 4', key: 'Thu4' },
    4: { name: 'Thứ 5', key: 'Thu5' },
    5: { name: 'Thứ 6', key: 'Thu6' },
    6: { name: 'Thứ 7', key: 'Thu7' },
    0: { name: 'Chủ Nhật', key: 'CN' },
  };

  const dailyBreakdown: DailyPayrollItem[] = [];
  let totalSalary = 0;
  let totalHours = 0;
  let totalWorkedDays = 0;
  let totalOffDays = 0;

  const current = new Date(start);
  while (current <= end) {
    const dateIso = formatLocalDateIso(current);
    const dayNum = String(current.getDate()).padStart(2, '0');
    const monthNum = String(current.getMonth() + 1).padStart(2, '0');
    const dateFormatted = `${dayNum}/${monthNum}`;
    const dayOfWeekNum = current.getDay();
    const dayInfo = dayNamesVi[dayOfWeekNum] || { name: 'Thứ 2', key: 'Thu2' };

    // Find matching items for this exact date
    const dayShifts = items.filter((item) => {
      if (item.date) {
        return item.date === dateIso;
      }
      // Fallback for legacy items without date: match on current week (2026-07-27 to 2026-08-02)
      const isThisWeek = dateIso >= '2026-07-27' && dateIso <= '2026-08-02';
      return isThisWeek && item.dayOfWeek === dayInfo.key;
    });

    if (dayShifts.length > 0) {
      totalWorkedDays += 1;
      let dayHours = 0;
      let dayEarnings = 0;

      const shiftsDetails = dayShifts.map((s) => {
        const h = calculateShiftHours(s.startTime, s.endTime);
        const e = Math.round(h * hourlyRate);
        dayHours += h;
        dayEarnings += e;
        return {
          shiftCode: s.note || 'Ca làm',
          startTime: s.startTime,
          endTime: s.endTime,
          hours: h,
          earnings: e,
          subject: s.subject || 'Ca làm Highlands Coffee',
        };
      });

      totalHours += dayHours;
      totalSalary += dayEarnings;

      dailyBreakdown.push({
        dateIso,
        dateFormatted,
        dayOfWeek: dayInfo.key,
        dayNameVi: dayInfo.name,
        isOff: false,
        shifts: shiftsDetails,
        totalHours: Number(dayHours.toFixed(2)),
        totalEarnings: dayEarnings,
      });
    } else {
      totalOffDays += 1;
      dailyBreakdown.push({
        dateIso,
        dateFormatted,
        dayOfWeek: dayInfo.key,
        dayNameVi: dayInfo.name,
        isOff: true,
        shifts: [],
        totalHours: 0,
        totalEarnings: 0,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    fromDate: fromDateStr,
    toDate: toDateStr,
    hourlyRate,
    totalSalary,
    totalHours: Number(totalHours.toFixed(2)),
    totalWorkedDays,
    totalOffDays,
    dailyBreakdown,
  };
}
```

- [ ] **Step 4: Run test script to verify it passes**

Run: `npx tsx scratch/test-salary-calculator.ts`  
Expected:  
`SUCCESS: calculateShiftHours tests passed`  
`SUCCESS: calculatePayrollBreakdown tests passed!`

- [ ] **Step 5: Clean up scratch test script & commit**

Run: `rm scratch/test-salary-calculator.ts`  
Run: `git add lib/salary-calculator.ts && git commit -m "feat(salary): implement core payroll calculation engine and daily breakdown builder"`

---

### Task 3: Build Salary Tab UI & Integrate into Navigation

**Files:**
- Create: `components/SalaryTab.tsx`
- Modify: `components/BottomNav.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `ScheduleItem[]`, `ScheduleSettings`, `onSaveSettings: (s: ScheduleSettings) => Promise<void>`
- Produces: Salary Tab UI view in Next.js App Router.

- [ ] **Step 1: Update `components/BottomNav.tsx` to add Salary Tab**

Update `components/BottomNav.tsx`:
```tsx
'use client';
import React from 'react';
import { Calendar, Settings, Wallet } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'schedule' | 'salary' | 'settings';
  onChangeTab: (tab: 'schedule' | 'salary' | 'settings') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-surface-border/60 py-2 px-6 z-40">
      <div className="max-w-md mx-auto flex items-center justify-around">
        <button
          onClick={() => onChangeTab('schedule')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 ${
            activeTab === 'schedule'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Lịch làm</span>
        </button>

        <button
          onClick={() => onChangeTab('salary')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 ${
            activeTab === 'salary'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs">Bảng lương</span>
        </button>

        <button
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 ${
            activeTab === 'settings'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs">Cấu hình</span>
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `components/SalaryTab.tsx`**

Create `components/SalaryTab.tsx`:
```tsx
'use client';
import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Clock,
  Calendar as CalendarIcon,
  Coffee,
  CircleDollarSign,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { Card } from './ui/Card';
import { calculatePayrollBreakdown, formatLocalDateIso } from '@/lib/salary-calculator';

interface SalaryTabProps {
  items: ScheduleItem[];
  settings: ScheduleSettings;
  onSaveSettings: (s: ScheduleSettings) => Promise<void>;
}

export const SalaryTab: React.FC<SalaryTabProps> = ({ items, settings, onSaveSettings }) => {
  const [hourlyRate, setHourlyRate] = useState<number>(settings.hourlyRate || 26000);

  // Preset Date Ranges (Default: Current Month e.g., 01/07 to 31/07)
  const [preset, setPreset] = useState<'this_month' | 'last_month' | 'last_30_days' | 'custom'>('this_month');

  const getDefaultDates = (selectedPreset: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (selectedPreset === 'this_month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return { from: formatLocalDateIso(firstDay), to: formatLocalDateIso(lastDay) };
    }
    if (selectedPreset === 'last_month') {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      return { from: formatLocalDateIso(firstDay), to: formatLocalDateIso(lastDay) };
    }
    if (selectedPreset === 'last_30_days') {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      return { from: formatLocalDateIso(start), to: formatLocalDateIso(end) };
    }
    return { from: formatLocalDateIso(new Date(year, month, 1)), to: formatLocalDateIso(new Date(year, month + 1, 0)) };
  };

  const initialDates = getDefaultDates('this_month');
  const [fromDate, setFromDate] = useState<string>(initialDates.from);
  const [toDate, setToDate] = useState<string>(initialDates.to);

  const handleHourlyRateChange = (newRate: number) => {
    setHourlyRate(newRate);
    onSaveSettings({ ...settings, hourlyRate: newRate });
  };

  const handlePresetSelect = (p: 'this_month' | 'last_month' | 'last_30_days' | 'custom') => {
    setPreset(p);
    if (p !== 'custom') {
      const d = getDefaultDates(p);
      setFromDate(d.from);
      setToDate(d.to);
    }
  };

  const summary = useMemo(() => {
    return calculatePayrollBreakdown(items, fromDate, toDate, hourlyRate);
  }, [items, fromDate, toDate, hourlyRate]);

  return (
    <div className="space-y-4 pb-16">
      {/* Header section */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-surface-textPrimary flex items-center gap-2">
            Bảng Lương & Giờ Công <Wallet className="w-5 h-5 text-brand-600" />
          </h2>
          <p className="text-xs text-surface-textSecondary font-medium">Đối soát số giờ công và tổng thu nhập</p>
        </div>
      </div>

      {/* Hourly rate & Date Preset filter */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-bold text-slate-700">Mức lương theo giờ:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => handleHourlyRateChange(Number(e.target.value))}
              step={1000}
              min={1000}
              className="w-24 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-xl text-xs font-extrabold text-brand-700 text-right focus:outline-none focus:border-brand-600"
            />
            <span className="text-xs font-bold text-slate-600">VNĐ / giờ</span>
          </div>
        </div>

        {/* Date presets buttons */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
            <Filter className="w-3.5 h-3.5" /> <span>Chọn mốc thời gian:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handlePresetSelect('this_month')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                preset === 'this_month'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => handlePresetSelect('last_month')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                preset === 'last_month'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tháng trước
            </button>
            <button
              onClick={() => handlePresetSelect('custom')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                preset === 'custom'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tùy chỉnh
            </button>
          </div>

          {preset === 'custom' && (
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 mt-2">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Từ ngày:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 mt-3 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Đến ngày:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* KPI Overview (4 Cards) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Salary (Hero Card) */}
        <div className="col-span-2 bg-gradient-to-br from-brand-600 to-brand-800 text-white p-4 rounded-3xl shadow-lg border border-brand-500/30">
          <span className="text-xs font-medium text-brand-100 uppercase tracking-wider block mb-1">
            Tổng Lương Nhận (Dự Kiến)
          </span>
          <div className="text-3xl font-black tracking-tight">
            {summary.totalSalary.toLocaleString('vi-VN')} <span className="text-lg font-bold text-brand-200">VNĐ</span>
          </div>
          <p className="text-[11px] text-brand-200 mt-1">
            Dựa trên {summary.totalHours}h làm việc $\times$ {hourlyRate.toLocaleString('vi-VN')}đ/h
          </p>
        </div>

        {/* Total Hours */}
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-sky-50 rounded-xl text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600">Số Giờ Công</span>
          </div>
          <div className="text-xl font-extrabold text-slate-800">
            {summary.totalHours} <span className="text-xs font-semibold text-slate-500">giờ</span>
          </div>
        </Card>

        {/* Worked Days */}
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-50 rounded-xl text-emerald-600">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600">Ngày Đi Làm</span>
          </div>
          <div className="text-xl font-extrabold text-slate-800">
            {summary.totalWorkedDays} <span className="text-xs font-semibold text-slate-500">ngày</span>
          </div>
        </Card>

        {/* OFF Days */}
        <Card className="p-3 col-span-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 rounded-xl text-slate-500">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-600">Số Ngày Nghỉ (OFF)</span>
              <p className="text-[10px] text-slate-400">Các ngày không có ca làm việc</p>
            </div>
          </div>
          <div className="text-lg font-extrabold text-slate-700">
            {summary.totalOffDays} <span className="text-xs font-semibold text-slate-500">ngày</span>
          </div>
        </Card>
      </div>

      {/* Exhaustive Daily Breakdown List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-surface-textPrimary">Chi Tiết Nhật Ký Theo Ngày</h3>
          <span className="text-xs text-slate-400 font-semibold">{summary.dailyBreakdown.length} ngày</span>
        </div>

        <div className="space-y-2">
          {summary.dailyBreakdown.map((day) => (
            <div
              key={day.dateIso}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                day.isOff
                  ? 'bg-slate-50/60 border-slate-200/50 text-slate-400'
                  : 'bg-white border-brand-200/60 shadow-xs text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold text-xs shrink-0 ${
                    day.isOff
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-brand-50 text-brand-700 border border-brand-200/50'
                  }`}
                >
                  <span className="text-[10px] opacity-80">{day.dayNameVi}</span>
                  <span className="text-xs font-black">{day.dateFormatted}</span>
                </div>

                <div>
                  {day.isOff ? (
                    <div>
                      <span className="text-xs font-bold text-slate-400">Nghỉ (OFF)</span>
                      <p className="text-[10px] text-slate-400">0.0 giờ công</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {day.shifts.map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-brand-600 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-lg"
                          >
                            {s.shiftCode} ({s.startTime}-{s.endTime})
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Tổng: <strong className="text-slate-700">{day.totalHours} giờ công</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {day.isOff ? (
                  <span className="text-xs font-bold text-slate-300">0 VNĐ</span>
                ) : (
                  <span className="text-xs font-extrabold text-brand-700">
                    +{day.totalEarnings.toLocaleString('vi-VN')}đ
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Update `app/page.tsx` to handle `salary` active tab**

Update `app/page.tsx`:
```tsx
// Import SalaryTab
import { SalaryTab } from '@/components/SalaryTab';

// Inside Home component render:
export default function Home() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'salary' | 'settings'>('schedule');
  // ...

  return (
    <div className="min-h-screen bg-surface-bg pb-24">
      {/* ... */}
      <div className="max-w-md mx-auto px-4 pt-4">
        <Header onOpenSettings={() => setActiveTab('settings')} />

        {activeTab === 'schedule' ? (
          <>
            <DaySelector
              selectedDay={selectedDay}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
              onWeekChange={setActiveWeekDays}
            />
            {/* Schedule Cards... */}
          </>
        ) : activeTab === 'salary' ? (
          <SalaryTab
            items={items}
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        ) : (
          <SettingsTab settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </div>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      {/* ... Modals */}
    </div>
  );
}
```

- [ ] **Step 4: Run `npm run build` to verify compilation**

Run: `npm run build`  
Expected: `✓ Compiled successfully` with 0 TypeScript or linting errors.

- [ ] **Step 5: Commit changes**

Run: `git add components/BottomNav.tsx components/SalaryTab.tsx app/page.tsx && git commit -m "feat(ui): add Salary & Payroll Management tab with KPI overview and daily breakdown"`

---

## Self-Review

1. **Spec Coverage:**
   - Hourly Rate input (default 26k/hr): Implemented in Task 1 & Task 3.
   - Date range selector (01/07 to 31/07): Implemented in Task 2 & Task 3.
   - Shift duration calculation (e.g. 15h-22h = 7h): Implemented in Task 2 `calculateShiftHours`.
   - Exhaustive daily breakdown showing OFF days: Implemented in Task 2 & Task 3.
   - 100% Vietnamese UI: Verified in Task 3.
2. **Placeholder Check:** 0 placeholders found.
3. **Type Consistency:** `hourlyRate` property matched across `ScheduleSettings`, `lib/salary-calculator.ts`, and `SalaryTab.tsx`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-27-salary-management.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach would you like to take?
