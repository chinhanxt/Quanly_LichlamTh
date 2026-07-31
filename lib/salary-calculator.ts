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
        const isPerShift =
          s.note?.includes('100.000') ||
          s.note?.includes('CTV') ||
          s.subject?.includes('Viện AI') ||
          s.subject?.includes('CTV') ||
          hourlyRate >= 100000;
        const shiftRate = hourlyRate >= 100000 ? hourlyRate : 100000;
        const e = isPerShift ? shiftRate : Math.round(h * hourlyRate);
        dayHours += h;
        dayEarnings += e;
        const rawCode = s.note || 'Làm';
        const cleanCode = rawCode.replace(/^ca\s+/i, '').trim();
        return {
          shiftCode: cleanCode || rawCode,
          startTime: s.startTime,
          endTime: s.endTime,
          hours: h,
          earnings: e,
          subject: s.subject || 'Công việc',
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
