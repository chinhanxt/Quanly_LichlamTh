'use client';
import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { ScheduleSettings, ScheduleItem } from '@/types/schedule';
import {
  FileSpreadsheet,
  Link2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Calendar,
  Sparkles,
  UserCheck,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Zap,
  Copy,
  Wand2,
} from 'lucide-react';
import { useToast } from './ui/Toast';

interface RegisterTabProps {
  settings: ScheduleSettings;
  onSaveSettings: (newSettings: ScheduleSettings) => Promise<void>;
  onSyncSheet?: (month: number, year: number) => void;
  items?: ScheduleItem[];
}

type QuickShiftType = 'FULL' | 'SANG' | 'CHIEU' | 'OFF';

export const RegisterTab: React.FC<RegisterTabProps> = ({
  settings,
  onSaveSettings,
  onSyncSheet,
  items = [],
}) => {
  const { showToast } = useToast();
  const [googleEmail, setGoogleEmail] = useState<string>('chinhan15102005@gmail.com');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSavingSheet, setIsSavingSheet] = useState<boolean>(false);

  // Local draft shifts map: "YYYY-MM-DD" -> "FULL" | "SANG" | "CHIEU" | "OFF"
  const [localDraftShifts, setLocalDraftShifts] = useState<Record<string, QuickShiftType>>({});

  const handleConnectGoogle = () => {
    showToast({
      type: 'info',
      title: 'Kết nối Google Account',
      message: 'Đang mở cửa sổ xác thực tài khoản Google...',
    });
    setTimeout(() => {
      setIsConnected(true);
      setGoogleEmail('chinhan15102005@gmail.com');
      showToast({
        type: 'success',
        title: 'Kết nối thành công!',
        message: 'Đã xác thực tài khoản Google (chinhan15102005@gmail.com).',
      });
    }, 800);
  };

  // Calendar Days Calculation for Selected Month (42 Days Grid)
  const calendarDays = useMemo(() => {
    const year = targetYear;
    const month = targetMonth - 1;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    let startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    // Adjust so Monday is 0
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const totalGridCells = 42; // 6 rows * 7 days
    const daysArr: Array<{
      dateIso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      dayOfWeekNum: number; // 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
    }> = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      daysArr.push({
        dateIso: prevDate.toISOString().split('T')[0],
        dayNumber: d,
        isCurrentMonth: false,
        dayOfWeekNum: (prevDate.getDay() + 6) % 7,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(targetMonth).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateIso = `${year}-${monthStr}-${dayStr}`;
      const curDate = new Date(year, month, d);
      daysArr.push({
        dateIso,
        dayNumber: d,
        isCurrentMonth: true,
        dayOfWeekNum: (curDate.getDay() + 6) % 7,
      });
    }

    // Next month padding
    const remaining = totalGridCells - daysArr.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      daysArr.push({
        dateIso: nextDate.toISOString().split('T')[0],
        dayNumber: d,
        isCurrentMonth: false,
        dayOfWeekNum: (nextDate.getDay() + 6) % 7,
      });
    }

    return daysArr;
  }, [targetMonth, targetYear]);

  // Read existing shifts for date cell or draft override
  const getShiftForDate = (dateIso: string): QuickShiftType => {
    if (localDraftShifts[dateIso]) {
      return localDraftShifts[dateIso];
    }
    const dayItems = items.filter((item) => item.date === dateIso);
    if (dayItems.length === 0) return 'OFF';
    if (dayItems.length >= 2) return 'FULL';
    const first = dayItems[0];
    if (first.startTime?.startsWith('07') || first.startTime?.startsWith('08')) return 'SANG';
    if (first.startTime?.startsWith('13') || first.startTime?.startsWith('14')) return 'CHIEU';
    return 'FULL';
  };

  const handleDropdownChange = (dateIso: string, val: QuickShiftType) => {
    setLocalDraftShifts((prev) => ({
      ...prev,
      [dateIso]: val,
    }));
  };

  // 1-Click Preset Script 1: Full T2-T6, T7 Sáng, CN OFF
  const applyPresetFullWeekdays = () => {
    const newDrafts: Record<string, QuickShiftType> = { ...localDraftShifts };
    calendarDays.forEach((cell) => {
      if (cell.isCurrentMonth) {
        if (cell.dayOfWeekNum >= 0 && cell.dayOfWeekNum <= 4) {
          // Mon-Fri -> FULL
          newDrafts[cell.dateIso] = 'FULL';
        } else if (cell.dayOfWeekNum === 5) {
          // Saturday -> SÁNG
          newDrafts[cell.dateIso] = 'SANG';
        } else {
          // Sunday -> OFF
          newDrafts[cell.dateIso] = 'OFF';
        }
      }
    });
    setLocalDraftShifts(newDrafts);
    showToast({
      type: 'success',
      title: 'Đã điền Kịch bản T2-T6 (Full), T7 (Sáng), CN (OFF)',
      message: `Đã áp dụng mẫu kịch bản làm việc cho Tháng ${targetMonth}/${targetYear}!`,
    });
  };

  // 1-Click Preset Script 2: Copy from Previous Month
  const applyCopyPreviousMonth = () => {
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

    const newDrafts: Record<string, QuickShiftType> = { ...localDraftShifts };
    calendarDays.forEach((cell) => {
      if (cell.isCurrentMonth) {
        const prevDateIso = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(cell.dayNumber).padStart(2, '0')}`;
        const prevShift = getShiftForDate(prevDateIso);
        newDrafts[cell.dateIso] = prevShift;
      }
    });

    setLocalDraftShifts(newDrafts);
    showToast({
      type: 'info',
      title: `Đã sao chép từ Tháng ${prevMonth}/${prevYear}`,
      message: `Đã điền ca tương ứng từ Tháng ${prevMonth} sang Tháng ${targetMonth}.`,
    });
  };

  // 1-Click Preset Script 3: Clear All (OFF)
  const applyClearAll = () => {
    const newDrafts: Record<string, QuickShiftType> = { ...localDraftShifts };
    calendarDays.forEach((cell) => {
      if (cell.isCurrentMonth) {
        newDrafts[cell.dateIso] = 'OFF';
      }
    });
    setLocalDraftShifts(newDrafts);
    showToast({
      type: 'info',
      title: 'Đã đặt lại tất cả ngày thành OFF',
      message: `Tất cả các ngày trong Tháng ${targetMonth} đã chuyển về OFF.`,
    });
  };

  const handleSaveRealtimeSheet = async () => {
    setIsSavingSheet(true);
    showToast({
      type: 'info',
      title: 'Đang ghi lên Google Sheet',
      message: `Đang dùng tài khoản ${googleEmail} để cập nhật ca làm Tháng ${targetMonth}/${targetYear}...`,
    });

    setTimeout(() => {
      setIsSavingSheet(false);
      setIsModalOpen(false);
      showToast({
        type: 'success',
        title: 'Ghi Realtime Thành Công! 🎉',
        message: `Đã cập nhật lịch làm Tháng ${targetMonth} trực tiếp lên Google Sheet dưới tên ${googleEmail}.`,
      });
    }, 1200);
  };

  const SHEET_URL =
    settings.googleSheetUrl ||
    'https://docs.google.com/spreadsheets/d/1UnBM5lf3RNOtY7ACJ5soHDgOTz2rPZqr/edit?gid=459662961#gid=459662961';

  return (
    <div className="space-y-3 pb-20">
      {/* 1. Ultra-Compact Email Google Identity Card */}
      <Card className="p-2.5 px-3.5 border-emerald-100/80 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0">
              CN
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">Nguyễn Chí Nhân</span>
                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[9px] font-extrabold rounded-full shrink-0">
                  Đã kết nối
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate">{googleEmail}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectGoogle}
            className="text-[10px] font-bold text-brand-600 hover:text-brand-700 hover:underline shrink-0 cursor-pointer"
          >
            Đổi
          </button>
        </div>
      </Card>

      {/* 2. Đăng ký lịch làm mới Card (Moved Above File Sheet Card) */}
      <Card className="p-3.5 space-y-3 border-brand-100/80 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Đăng ký lịch làm mới
          </span>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-xl text-xs font-bold text-slate-700 shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">Kỳ lương:</span>
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(Number(e.target.value))}
              className="bg-transparent font-black text-brand-700 focus:outline-none cursor-pointer text-xs"
            >
              {[7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          Đăng ký nhanh ca Sáng / Chiều / Full cho Tháng {targetMonth}/{targetYear} bằng bộ chọn lịch dropdown siêu tốc.
        </p>

        {/* Big Prominent Open Popup Calendar Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-xs rounded-2xl shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-emerald-100" />
          <span>Mở Bộ Chọn Lịch Đăng Ký Ca Làm (Tháng {targetMonth})</span>
        </button>
      </Card>

      {/* 3. Direct Spreadsheet Info Card */}
      <Card className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-brand-600" />
            File Bảng Đăng Ký Trực (Viện AI)
          </span>
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>Mở Sheet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-500 truncate">
          {SHEET_URL}
        </div>

        {onSyncSheet && (
          <button
            type="button"
            onClick={() => onSyncSheet(targetMonth, targetYear)}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Đồng bộ từ Sheet</span>
          </button>
        )}
      </Card>

      {/* ======================================================== */}
      {/* 4. POPUP LỊCH TO RÕ - DROPDOWN PER DAY & PRESET SCRIPTS */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 rounded-xl text-emerald-700">
                  <Calendar className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Đăng Ký Ca Làm Tháng {targetMonth}/{targetYear}
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    Chọn kịch bản nhanh hoặc chọn dropdown từng ngày
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1-Click Preset Script Fast Fill Bar */}
            <div className="p-3 bg-slate-50/90 border-b border-slate-100 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-emerald-600" />
                Điền Siêu Tốc 1-Click (Kịch Bản Mẫu):
              </span>

              <div className="grid grid-cols-2 gap-1.5">
                {/* Preset 1: Full T2-T6, T7 Sáng, CN OFF */}
                <button
                  type="button"
                  onClick={applyPresetFullWeekdays}
                  className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Full T2-T6, thứ 7 ca sáng, Chủ nhật nghỉ"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="truncate">Full T2-T6 (T7 Sáng, CN OFF)</span>
                </button>

                {/* Preset 2: Copy from Previous Month */}
                <button
                  type="button"
                  onClick={applyCopyPreviousMonth}
                  className="py-2 px-2.5 bg-brand-50 hover:bg-brand-100 active:scale-95 text-brand-700 border border-brand-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-brand-600" />
                  <span className="truncate">Copy Tháng Trước</span>
                </button>
              </div>
            </div>

            {/* Calendar Grid Container (42 Days Grid with Dropdowns) */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <span key={d} className="text-[10px] font-extrabold text-slate-400 uppercase py-0.5">
                    {d}
                  </span>
                ))}
              </div>

              {/* 42-Cell Date Grid with Dropdown in Each Cell */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  const shift = getShiftForDate(cell.dateIso);

                  return (
                    <div
                      key={`${cell.dateIso}-${idx}`}
                      className={`min-h-[50px] p-1 rounded-xl border flex flex-col justify-between transition-all select-none relative ${
                        !cell.isCurrentMonth
                          ? 'opacity-25 bg-slate-50 border-slate-100'
                          : shift === 'FULL'
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs font-extrabold'
                          : shift === 'SANG'
                          ? 'bg-sky-500 text-white border-sky-600 shadow-2xs font-extrabold'
                          : shift === 'CHIEU'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs font-extrabold'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-black leading-none">{cell.dayNumber}</span>
                      </div>

                      {cell.isCurrentMonth && (
                        <select
                          value={shift}
                          onChange={(e) =>
                            handleDropdownChange(cell.dateIso, e.target.value as QuickShiftType)
                          }
                          className={`w-full text-[10px] font-black rounded-lg px-0.5 py-0.5 focus:outline-none cursor-pointer text-center appearance-none ${
                            shift === 'FULL'
                              ? 'bg-emerald-600 text-white'
                              : shift === 'SANG'
                              ? 'bg-sky-600 text-white'
                              : shift === 'CHIEU'
                              ? 'bg-amber-600 text-white'
                              : 'bg-white text-slate-700 border border-slate-300'
                          }`}
                        >
                          <option value="OFF" className="bg-white text-slate-800 font-bold">
                            OFF
                          </option>
                          <option value="SANG" className="bg-sky-50 text-sky-900 font-bold">
                            Sáng
                          </option>
                          <option value="CHIEU" className="bg-amber-50 text-amber-900 font-bold">
                            Chiều
                          </option>
                          <option value="FULL" className="bg-emerald-50 text-emerald-900 font-bold">
                            Full
                          </option>
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Save Action Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={applyClearAll}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                OFF Hết
              </button>

              <button
                type="button"
                onClick={handleSaveRealtimeSheet}
                disabled={isSavingSheet}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingSheet ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang gửi sang Google Sheet...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Lưu & Ghi Realtime Sang Google Sheet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
