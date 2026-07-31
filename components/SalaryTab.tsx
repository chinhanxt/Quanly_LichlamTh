'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { calculatePayrollBreakdown, formatLocalDateIso, DailyPayrollItem } from '@/lib/salary-calculator';
import { Card } from './ui/Card';
import {
  Coins,
  Clock,
  CalendarCheck,
  Coffee,
  Edit2,
  Calendar as CalendarIcon,
  Check,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface SalaryTabProps {
  items: ScheduleItem[];
  settings: ScheduleSettings;
  onSaveSettings: (newSettings: ScheduleSettings) => Promise<void>;
}

type ViewMode = 'table' | 'list';

export interface WeeklyGridGroup {
  weekTitle: string;
  startDateStr: string;
  endDateStr: string;
  days: Array<DailyPayrollItem & { isOutsideMonth: boolean }>;
  totalHours: number;
  totalEarnings: number;
}

export const SalaryTab: React.FC<SalaryTabProps> = ({ items, settings, onSaveSettings }) => {
  // 1. Hourly rate state & inline edit
  const defaultRateForUser = (settings.username === 'chinhan' || settings.employeeName?.includes('Nhân')) ? 100000 : 26000;
  const currentRate = (settings.hourlyRate && settings.hourlyRate !== 26000) ? settings.hourlyRate : defaultRateForUser;
  const [hourlyRate, setHourlyRate] = useState<number>(currentRate);
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [rateInput, setRateInput] = useState<string>(currentRate.toString());
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  useEffect(() => {
    const rate = (settings.hourlyRate && settings.hourlyRate !== 26000) ? settings.hourlyRate : defaultRateForUser;
    setHourlyRate(rate);
    setRateInput(rate.toString());
  }, [settings.hourlyRate, defaultRateForUser]);

  const handleSaveRate = async () => {
    const parsed = parseInt(rateInput.replace(/\D/g, ''), 10);
    const validRate = isNaN(parsed) || parsed <= 0 ? defaultRateForUser : parsed;
    setHourlyRate(validRate);
    setRateInput(validRate.toString());
    setIsEditingRate(false);

    if (validRate !== settings.hourlyRate) {
      await onSaveSettings({
        ...settings,
        hourlyRate: validRate,
      });
    }
  };

  // 2. Month Offset State & Custom Range
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const getMonthRange = (offset: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const y = targetDate.getFullYear();

    return {
      fromDate: formatLocalDateIso(start),
      toDate: formatLocalDateIso(end),
      label: `${m}/${y}`,
      targetMonth: targetDate.getMonth(),
      targetYear: targetDate.getFullYear(),
    };
  };

  const currentMonthData = getMonthRange(monthOffset);
  const [fromDate, setFromDate] = useState<string>(currentMonthData.fromDate);
  const [toDate, setToDate] = useState<string>(currentMonthData.toDate);

  // Auto-switch to month containing items if current selected range has 0 items
  useEffect(() => {
    if (items && items.length > 0) {
      const dates = items.map((i) => i.date).filter((d): d is string => Boolean(d && d.trim()));
      if (dates.length > 0) {
        const hasCurrentItems = items.some(
          (i) => i.date && i.date >= fromDate && i.date <= toDate
        );
        if (!hasCurrentItems) {
          const firstDateIso = dates[0];
          const d = new Date(firstDateIso + 'T00:00:00');
          const now = new Date();
          const offset = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
          setMonthOffset(offset);
          const range = getMonthRange(offset);
          setFromDate(range.fromDate);
          setToDate(range.toDate);
        }
      }
    }
  }, [items]);

  const handleMonthStep = (delta: number) => {
    const newOffset = monthOffset + delta;
    setMonthOffset(newOffset);
    setIsCustomMode(false);
    const range = getMonthRange(newOffset);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  const handleResetCurrentMonth = () => {
    setMonthOffset(0);
    setIsCustomMode(false);
    const range = getMonthRange(0);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  // 3. Payroll calculation
  const rawPayroll = calculatePayrollBreakdown(items, fromDate, toDate, hourlyRate);

  // Group days into Monday-Sunday calendar weeks for the Weekly Table View
  const weeklyGroups = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const targetMonth = new Date(fromDate + 'T00:00:00').getMonth();
    const targetYear = new Date(fromDate + 'T00:00:00').getFullYear();

    // Map existing breakdown items by YYYY-MM-DD
    const breakdownMap = new Map<string, DailyPayrollItem>();
    rawPayroll.dailyBreakdown.forEach((item) => {
      breakdownMap.set(item.dateIso, item);
    });

    const startObj = new Date(fromDate + 'T00:00:00');
    const endObj = new Date(toDate + 'T00:00:00');

    // Find the Monday of the first week
    const firstMonday = new Date(startObj);
    const dayOfWeek = firstMonday.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstMonday.setDate(firstMonday.getDate() + distToMon);

    const groups: WeeklyGridGroup[] = [];
    const currMonday = new Date(firstMonday);

    while (currMonday <= endObj) {
      const weekDays: Array<DailyPayrollItem & { isOutsideMonth: boolean }> = [];
      let weekHours = 0;
      let weekEarnings = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(currMonday);
        d.setDate(currMonday.getDate() + i);
        const iso = formatLocalDateIso(d);
        const isOutsideMonth = d.getMonth() !== targetMonth || d.getFullYear() !== targetYear;

        let item = breakdownMap.get(iso);
        if (!item) {
          // If out of range, build dummy day item
          const dayNum = String(d.getDate()).padStart(2, '0');
          const monthNum = String(d.getMonth() + 1).padStart(2, '0');
          const dayKeys = ['CN', 'Thu2', 'Thu3', 'Thu4', 'Thu5', 'Thu6', 'Thu7'];
          const dayNamesVi = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

          // Check if schedule items exist for this exact date even if outside main range
          const matchingShifts = items.filter((s) => s.date === iso);
          const shiftsDetails = matchingShifts.map((s) => {
            const [sh, sm] = s.startTime.split(':').map(Number);
            const [eh, em] = s.endTime.split(':').map(Number);
            const dur = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
            const rawCode = s.note || 'Làm';
            const cleanCode = rawCode.replace(/^ca\s+/i, '').trim();
            return {
              shiftCode: cleanCode || rawCode,
              startTime: s.startTime,
              endTime: s.endTime,
              hours: dur,
              earnings: Math.round(dur * hourlyRate),
              subject: s.subject || 'Highlands Coffee',
            };
          });

          const totalH = shiftsDetails.reduce((acc, curr) => acc + curr.hours, 0);
          const totalE = shiftsDetails.reduce((acc, curr) => acc + curr.earnings, 0);

          item = {
            dateIso: iso,
            dateFormatted: `${dayNum}/${monthNum}`,
            dayOfWeek: dayKeys[d.getDay()],
            dayNameVi: dayNamesVi[d.getDay()],
            isOff: shiftsDetails.length === 0,
            shifts: shiftsDetails,
            totalHours: totalH,
            totalEarnings: totalE,
          };
        }

        if (!isOutsideMonth) {
          weekHours += item.totalHours;
          weekEarnings += item.totalEarnings;
        }

        weekDays.push({
          ...item,
          isOutsideMonth,
        });
      }

      const monNum = String(currMonday.getDate()).padStart(2, '0');
      const monMonth = String(currMonday.getMonth() + 1).padStart(2, '0');
      const sunDate = new Date(currMonday);
      sunDate.setDate(currMonday.getDate() + 6);
      const sunNum = String(sunDate.getDate()).padStart(2, '0');
      const sunMonth = String(sunDate.getMonth() + 1).padStart(2, '0');

      groups.push({
        weekTitle: `Tuần từ ${monNum}/${monMonth} đến ${sunNum}/${sunMonth}`,
        startDateStr: `${monNum}/${monMonth}`,
        endDateStr: `${sunNum}/${sunMonth}`,
        days: weekDays,
        totalHours: Number(weekHours.toFixed(2)),
        totalEarnings: weekEarnings,
      });

      currMonday.setDate(currMonday.getDate() + 7);
    }

    return groups;
  }, [fromDate, toDate, items, hourlyRate, rawPayroll]);

  const isCtvMode = settings.username === 'chinhan' || hourlyRate >= 100000;
  const totalShiftsCount = useMemo(() => {
    return rawPayroll.dailyBreakdown.reduce((acc, curr) => acc + curr.shifts.length, 0);
  }, [rawPayroll]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Hourly Rate Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý Bảng lương</h2>
          <p className="text-xs text-slate-500">
            {isCtvMode ? 'Tính toán công nhật CTV (100.000đ/buổi trực)' : 'Tính toán thu nhập và theo dõi ca làm việc'}
          </p>
        </div>

        {/* Inline Editable Hourly Rate - Large Touch Target for Mobile */}
        <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">{isCtvMode ? 'Đơn giá/buổi:' : 'Lương/giờ:'}</span>
          {isEditingRate ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRate();
                }}
                className="w-24 px-3 py-1.5 text-sm font-extrabold text-brand-700 bg-white border-2 border-brand-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                autoFocus
              />
              <span className="text-xs font-bold text-slate-600">VNĐ</span>
              <button
                type="button"
                onClick={handleSaveRate}
                className="p-2 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center"
                title="Xác nhận lưu lương"
                aria-label="Xác nhận lưu lương"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingRate(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-xl text-xs font-extrabold text-brand-700 transition-all active:scale-95 cursor-pointer shadow-2xs group"
            >
              <span className="text-sm font-black text-brand-700">{hourlyRate.toLocaleString('vi-VN')}</span>
              <span className="text-xs font-bold text-slate-500">{isCtvMode ? 'VNĐ/buổi' : 'VNĐ/h'}</span>
              <div className="p-1 bg-brand-50 rounded-lg text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Edit2 className="w-4 h-4 stroke-[2.2]" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Date Range Selector with Month Arrows Pill & Custom Toggle */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
            <CalendarIcon className="w-4 h-4 text-brand-600" />
            Kỳ lương
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Reset to current month icon button if monthOffset !== 0 */}
            {monthOffset !== 0 && (
              <button
                type="button"
                onClick={handleResetCurrentMonth}
                className="p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-xl transition-all cursor-pointer border border-brand-200/60"
                title="Về tháng hiện tại"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Symmetrical Month Navigation Pill with Left/Right Arrows */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 p-1 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => handleMonthStep(-1)}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-brand-600 rounded-xl transition-all active:scale-95 cursor-pointer"
                title="Tháng trước"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-extrabold text-brand-700 px-2 min-w-[95px] text-center select-none whitespace-nowrap">
                Tháng {currentMonthData.label}
              </span>

              <button
                type="button"
                onClick={() => handleMonthStep(1)}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-brand-600 rounded-xl transition-all active:scale-95 cursor-pointer"
                title="Tháng sau"
                aria-label="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Range Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className={`px-3 py-1.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                isCustomMode
                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              Tùy chỉnh
            </button>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {isCustomMode && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Từ ngày</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Đến ngày</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        )}
      </Card>

      {/* 4 KPI Overview Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Gross Salary */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-4 shadow-soft space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-100">Tổng lương tạm tính</span>
            <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <Coins className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-lg font-black tracking-tight">
            {rawPayroll.totalSalary.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span>
          </div>
          <p className="text-[10px] text-emerald-100/80">
            {isCtvMode ? `${hourlyRate.toLocaleString('vi-VN')} đ/buổi trực` : `${hourlyRate.toLocaleString('vi-VN')} đ/giờ`}
          </p>
        </div>

        {/* Card 2: Total Hours / Shifts */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">{isCtvMode ? 'Tổng buổi trực' : 'Tổng giờ làm'}</span>
            <div className="p-1.5 bg-sky-50 rounded-xl text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-slate-800 tracking-tight">
            {isCtvMode ? totalShiftsCount : rawPayroll.totalHours} <span className="text-xs font-normal text-slate-500">{isCtvMode ? 'buổi' : 'giờ'}</span>
          </div>
          <p className="text-[10px] text-slate-400">{isCtvMode ? 'Tính theo dấu (X) trực' : 'Tích lũy theo lịch làm'}</p>
        </div>

        {/* Card 3: Worked Days */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Số ngày đi làm</span>
            <div className="p-1.5 bg-brand-50 rounded-xl text-brand-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-slate-800 tracking-tight">
            {rawPayroll.totalWorkedDays} <span className="text-xs font-normal text-slate-500">ngày</span>
          </div>
          <p className="text-[10px] text-slate-400">Có ca được phân công</p>
        </div>

        {/* Card 4: OFF Days */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Số ngày nghỉ (OFF)</span>
            <div className="p-1.5 bg-amber-50 rounded-xl text-amber-600">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-slate-800 tracking-tight">
            {rawPayroll.totalOffDays} <span className="text-xs font-normal text-slate-500">ngày</span>
          </div>
          <p className="text-[10px] text-slate-400">Không có lịch làm</p>
        </div>
      </div>

      {/* View Mode Switcher Header: Bảng Tuần vs Danh Sách */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-800">Chi tiết đối soát ca làm</h3>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bảng Tuần</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: Bảng Tuần (Weekly Grid Table styled like schedule photo) */}
        {viewMode === 'table' && (
          <div className="space-y-4">
            {weeklyGroups.map((group, gIdx) => (
              <Card key={gIdx} className="p-3.5 space-y-3 border border-slate-200/80 shadow-xs">
                {/* Week Header Title & Summary */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                    {group.weekTitle}
                  </span>
                  <div className="text-xs font-extrabold text-brand-700">
                    {isCtvMode
                      ? `${group.days.reduce((acc, d) => acc + d.shifts.length, 0)} buổi`
                      : `${group.totalHours}h công`}{' '}
                    • +{group.totalEarnings.toLocaleString('vi-VN')}đ
                  </div>
                </div>

                {/* 7-Columns Weekly Schedule Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Row 1: Day of week labels */}
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((shortName, i) => (
                    <div key={i} className="text-[10px] font-bold text-slate-400 pb-1">
                      {shortName}
                    </div>
                  ))}

                  {/* Row 2 & 3: Calendar Cells */}
                  {group.days.map((day, dIdx) => {
                    const isDualShift = day.shifts.length >= 2;
                    const singleShift = day.shifts[0];
                    const isSang = singleShift && (singleShift.startTime.startsWith('07') || singleShift.startTime.startsWith('08') || singleShift.subject.includes('Sáng'));
                    const isChieu = singleShift && (singleShift.startTime.startsWith('13') || singleShift.startTime.startsWith('12') || singleShift.subject.includes('Chiều'));

                    let badgeText = 'Làm';
                    if (isDualShift) {
                      badgeText = 'Cả ngày';
                    } else if (isSang) {
                      badgeText = 'Ca Sáng';
                    } else if (isChieu) {
                      badgeText = 'Ca Chiều';
                    } else if (singleShift) {
                      badgeText = singleShift.shiftCode.length > 8 ? singleShift.shiftCode.substring(0, 7) : singleShift.shiftCode;
                    }

                    return (
                      <div
                        key={dIdx}
                        className={`flex flex-col items-center justify-between p-1 rounded-xl min-h-[72px] border transition-all ${
                          day.isOutsideMonth
                            ? 'bg-slate-100/60 border-slate-200/40 text-slate-400 opacity-45 cursor-not-allowed'
                            : day.isOff
                            ? 'bg-slate-50 border-slate-100 text-slate-400'
                            : 'bg-brand-50/70 border-brand-200/80 text-slate-800 shadow-2xs'
                        }`}
                      >
                        {/* Date */}
                        <span className={`text-[10px] font-extrabold ${day.isOutsideMonth ? 'text-slate-400' : 'text-slate-700'}`}>
                          {day.dateFormatted}
                        </span>

                        {/* Shift Code / Badge */}
                        {day.isOff ? (
                          <span className={`text-[10px] font-semibold my-1 ${day.isOutsideMonth ? 'text-slate-300' : 'text-slate-400'}`}>
                            OFF
                          </span>
                        ) : (
                          <div className="my-0.5 w-full flex flex-col items-center px-0.5">
                            <span
                              className={`text-[9px] font-extrabold px-1 py-0.5 rounded-md leading-tight block w-full whitespace-nowrap overflow-hidden text-ellipsis text-center ${
                                day.isOutsideMonth
                                  ? 'bg-slate-200 text-slate-500'
                                  : isDualShift
                                  ? 'bg-brand-700 text-white shadow-2xs'
                                  : 'bg-brand-600 text-white shadow-2xs'
                              }`}
                              title={day.shifts.map((s) => `${s.subject} (${s.startTime}-${s.endTime})`).join('\n')}
                            >
                              {badgeText}
                            </span>
                          </div>
                        )}

                        {/* Hours & Earnings */}
                        {!day.isOff ? (
                          <span className={`text-[9px] font-black ${day.isOutsideMonth ? 'text-slate-400' : 'text-emerald-700'}`}>
                            {isCtvMode ? `${day.shifts.length} ca` : `${day.totalHours}h`}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-300">{isCtvMode ? '0 ca' : '0h'}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* View Mode 2: Danh Sách Chi Tiết Theo Ngày */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {rawPayroll.dailyBreakdown.map((day) => (
              <div
                key={day.dateIso}
                className={`rounded-2xl p-3.5 transition-all border ${
                  day.isOff
                    ? 'bg-slate-50/70 border-slate-100'
                    : 'bg-white border-slate-200/80 shadow-xs hover:border-brand-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${
                        day.isOff
                          ? 'bg-slate-200/60 text-slate-500'
                          : 'bg-brand-50 text-brand-700 border border-brand-100'
                      }`}
                    >
                      <span className="text-[10px] leading-tight font-medium opacity-80">{day.dayNameVi}</span>
                      <span className="leading-tight">{day.dateFormatted}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {day.dayNameVi}, {day.dateFormatted}
                        </span>
                        {day.isOff ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
                            Nghỉ (OFF)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Đi làm
                          </span>
                        )}
                      </div>

                      {!day.isOff && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Tổng: <span className="font-semibold text-slate-700">{day.totalHours} giờ</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {!day.isOff ? (
                      <div className="text-sm font-extrabold text-emerald-600">
                        +{day.totalEarnings.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-slate-400">0 đ</div>
                    )}
                  </div>
                </div>

                {!day.isOff && day.shifts.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 space-y-2">
                    {day.shifts.map((shift, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-500" />
                          <span className="font-bold text-slate-700">{shift.shiftCode}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-medium">
                            {shift.startTime} - {shift.endTime}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-700">
                          {shift.hours} giờ <span className="text-slate-400 font-normal">({shift.earnings.toLocaleString('vi-VN')} đ)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
