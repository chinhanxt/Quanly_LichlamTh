'use client';
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';

interface DaySelectorProps {
  selectedDay: string;
  selectedDate: string;
  onSelectDay: (dayKey: string, fullDateIso: string) => void;
  onWeekChange?: (weekDays: Array<{ key: string; fullDateIso: string }>) => void;
}

export function formatLocalDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to compute 7 week dates starting from Monday
export function getWeekDates(weekOffset: number = 0) {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  // Distance to Monday (0 is Sunday)
  const distanceToMon = (currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek) + weekOffset * 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMon);

  const daysKeys = ['Thu2', 'Thu3', 'Thu4', 'Thu5', 'Thu6', 'Thu7', 'CN'];
  const dayNamesVi = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
  const shortNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return daysKeys.map((key, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    return {
      key,
      nameVi: dayNamesVi[idx],
      shortName: shortNames[idx],
      dateStr: `${dayNum}/${monthNum}`,
      fullDateIso: formatLocalDateIso(d),
      fullDate: d,
      isToday: d.toDateString() === new Date().toDateString(),
    };
  });
}

export function getTodayInfo() {
  const weekDays = getWeekDates(0);
  const today = weekDays.find((w) => w.isToday) || weekDays[0];
  return { dayKey: today.key, dateIso: today.fullDateIso };
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  selectedDay,
  selectedDate,
  onSelectDay,
  onWeekChange,
}) => {
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const weekDays = getWeekDates(weekOffset);
  const firstDateStr = weekDays[0].dateStr;
  const lastDateStr = weekDays[6].dateStr;

  // Notify parent on week change
  useEffect(() => {
    if (onWeekChange) {
      onWeekChange(weekDays.map(w => ({ key: w.key, fullDateIso: w.fullDateIso })));
    }
  }, [weekOffset]);

  const handleOffsetChange = (newOffset: number) => {
    setWeekOffset(newOffset);
    const newDays = getWeekDates(newOffset);
    // Auto select the corresponding day or Monday in the new week
    const currentActiveDayInNewWeek = newDays.find(d => d.key === selectedDay) || newDays[0];
    onSelectDay(currentActiveDayInNewWeek.key, currentActiveDayInNewWeek.fullDateIso);
  };

  const getWeekLabel = () => {
    if (weekOffset === 0) return 'Tuần này';
    if (weekOffset === 1) return 'Tuần sau';
    if (weekOffset === -1) return 'Tuần trước';
    return weekOffset > 0 ? `+${weekOffset} Tuần` : `${weekOffset} Tuần`;
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-soft mb-6 border border-surface-border/60">
      {/* Header section with Week Navigation Controls */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-brand-50 rounded-xl text-brand-600 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-surface-textPrimary text-sm uppercase tracking-wide truncate">Lịch Làm Việc</h3>
            <p className="text-[11px] text-surface-textSecondary font-medium whitespace-nowrap">
              Từ {firstDateStr} đến {lastDateStr}
            </p>
          </div>
        </div>

        {/* Right Navigation controls container - FIXED NO WRAP */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reset button - ONLY ICON, NO TEXT */}
          <button
            onClick={() => handleOffsetChange(0)}
            disabled={weekOffset === 0}
            className={`p-2 rounded-2xl transition-all cursor-pointer flex items-center justify-center ${
              weekOffset !== 0
                ? 'bg-brand-50 text-brand-600 hover:bg-brand-100 active:scale-95 border border-brand-200/60 opacity-100'
                : 'opacity-0 pointer-events-none'
            }`}
            title="Trở lại tuần hiện tại"
            aria-label="Trở lại tuần hiện tại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Symmetrical Left & Right Arrows Pill */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 p-1 rounded-2xl shadow-xs">
            <button
              onClick={() => handleOffsetChange(weekOffset - 1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-brand-600 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Tuần trước"
              aria-label="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-brand-700 px-2 w-[68px] text-center select-none whitespace-nowrap">
              {getWeekLabel()}
            </span>

            <button
              onClick={() => handleOffsetChange(weekOffset + 1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-brand-600 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Tuần sau"
              aria-label="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of 7 Days - Unclipped, Spacious, Premium Design */}
      <div className="grid grid-cols-7 gap-1.5 py-1 px-0.5">
        {weekDays.map((day) => {
          const isActive = selectedDate === day.fullDateIso || (selectedDay === day.key && !selectedDate);
          return (
            <button
              key={day.key}
              onClick={() => onSelectDay(day.key, day.fullDateIso)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all duration-200 cursor-pointer select-none relative ${
                isActive
                  ? 'bg-gradient-to-b from-brand-600 to-brand-700 text-white font-bold shadow-md shadow-brand-600/25 border border-brand-500/30'
                  : 'text-slate-600 hover:bg-brand-50/80 hover:text-brand-600 font-semibold border border-transparent'
              }`}
            >
              {day.isToday && !isActive && (
                <span className="absolute -top-1 w-1.5 h-1.5 bg-brand-600 rounded-full"></span>
              )}
              {day.isToday && isActive && (
                <span className="absolute -top-1 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              )}
              <span className={`text-[11px] mb-1 ${isActive ? 'text-brand-100 opacity-90' : 'text-slate-500 font-medium'}`}>
                {day.shortName}
              </span>
              <span className={`text-xs ${isActive ? 'text-white font-bold' : 'text-slate-800'}`}>
                {day.dateStr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
