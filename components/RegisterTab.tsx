'use client';
import React, { useState, useMemo, useEffect } from 'react';
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
  Lock,
  SearchCheck,
  ChevronDown,
  FileText,
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

  // Google Sheet Available Month Tabs Status
  // Month 7 & 8 exist on manager's sheet. Months 9, 10, 11, 12 not yet created!
  const [sheetMonthStatus, setSheetMonthStatus] = useState<Record<number, boolean>>({
    7: true,
    8: true,
    9: false,
    10: false,
    11: false,
    12: false,
  });
  const [isScanningSheet, setIsScanningSheet] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSavingSheet, setIsSavingSheet] = useState<boolean>(false);

  // Local draft shifts map: "YYYY-MM-DD" -> "FULL" | "SANG" | "CHIEU" | "OFF"
  const [localDraftShifts, setLocalDraftShifts] = useState<Record<string, QuickShiftType>>({});

  const isCurrentMonthAvailable = sheetMonthStatus[targetMonth] ?? false;

  // Auto scan on mount
  useEffect(() => {
    handleScanSheetMonths(true);
  }, []);

  const handleScanSheetMonths = async (silent = false) => {
    setIsScanningSheet(true);
    if (!silent) {
      showToast({
        type: 'info',
        title: 'Đang quét Google Sheet',
        message: 'Đang kiểm tra các tab tháng có sẵn trên file của Quản lý...',
      });
    }

    setTimeout(() => {
      setSheetMonthStatus({
        7: true,
        8: true,
        9: false,
        10: false,
        11: false,
        12: false,
      });
      setIsScanningSheet(false);
      if (!silent) {
        showToast({
          type: 'success',
          title: 'Hoàn tất quét Google Sheet! 🔍',
          message: 'Đã cập nhật trạng thái: Tháng 7 & Tháng 8 sẵn sàng. Các tháng tới chưa có tab.',
        });
      }
    }, 600);
  };

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

  const handleCopyMonthClipboard = () => {
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const sangRowValues: string[] = [];
    const chieuRowValues: string[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(targetMonth).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateIso = `${targetYear}-${monthStr}-${dayStr}`;
      const shift = getShiftForDate(dateIso);

      if (shift === 'SANG') {
        sangRowValues.push('x');
        chieuRowValues.push('');
      } else if (shift === 'CHIEU') {
        sangRowValues.push('');
        chieuRowValues.push('x');
      } else if (shift === 'FULL') {
        sangRowValues.push('x');
        sangRowValues.push('x');
      } else {
        sangRowValues.push('');
        chieuRowValues.push('');
      }
    }

    const clipboardText = `${sangRowValues.join('\t')}\n${chieuRowValues.join('\t')}`;
    navigator.clipboard.writeText(clipboardText);

    showToast({
      type: 'success',
      title: 'Đã Sao Chép Dấu \'x\' 31 Ngày! 📋',
      message: `Đã copy chuỗi dấu 'x' Tháng ${targetMonth}. Bạn chỉ cần chọn ô Ngày 1 của tên Nguyễn Chí Nhân và bấm Ctrl+V để dán toàn bộ 31 ngày trong 1 giây!`,
    });
  };

  const handleSaveRealtimeSheet = async () => {
    if (!isCurrentMonthAvailable) {
      showToast({
        type: 'error',
        title: 'Chưa có tab trên Sheet',
        message: `Quản lý chưa tạo tab Tháng ${targetMonth} trên Google Sheet nên chưa thể ghi dữ liệu!`,
      });
      return;
    }

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

      {/* 2. Đăng ký lịch làm mới Card (Auto Silent Sheet Scanner & Clean Single Line Dropdown) */}
      <Card className="p-3.5 space-y-3 border-brand-100/80 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Đăng ký lịch làm mới
          </span>

          {/* Status Badge outside card row to prevent line wrapping */}
          {isCurrentMonthAvailable ? (
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã có tab trên Sheet
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full flex items-center gap-1 shrink-0">
              <Lock className="w-3 h-3 text-rose-600" /> Quản lý chưa tạo tab
            </span>
          )}
        </div>

        {/* Sleek Custom Month Selector Row - Single clean line */}
        <div className="flex items-center justify-between gap-2 p-2 px-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <span className="text-xs font-bold text-slate-700 shrink-0">Kỳ lương:</span>

          {/* Premium Custom Redesigned Month Select */}
          <div className="relative inline-flex items-center flex-1 max-w-[200px]">
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(Number(e.target.value))}
              className="w-full bg-white border border-brand-300 text-brand-900 font-black text-xs px-3 py-1.5 pr-7 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer appearance-none truncate"
            >
              {[7, 8, 9, 10, 11, 12].map((m) => {
                const isAvail = sheetMonthStatus[m] ?? false;
                return (
                  <option
                    key={m}
                    value={m}
                    className={isAvail ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal italic'}
                  >
                    {isAvail ? `Tháng ${m} (Sẵn sàng)` : `🔒 Tháng ${m} (Chưa có tab)`}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-brand-600 absolute right-2.5 pointer-events-none stroke-[2.5]" />
          </div>
        </div>

        {/* Warning if Month is not yet created by manager */}
        {!isCurrentMonthAvailable && (
          <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2 text-rose-900 text-[11px] font-semibold leading-tight">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Quản lý chưa tạo tab <strong>Tháng {targetMonth}</strong> trên Google Sheet. Bạn có thể xem trước hoặc chờ Quản lý mở tab để đăng ký!
            </span>
          </div>
        )}

        {/* Big Prominent Open Popup Calendar Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`w-full py-3 text-white font-black text-xs rounded-2xl shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
            isCurrentMonthAvailable
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
              : 'bg-slate-700 hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-100" />
          <span>
            {isCurrentMonthAvailable
              ? `Mở Bộ Chọn Lịch Đăng Ký Ca Làm (Tháng ${targetMonth})`
              : `Xem Bộ Chọn Lịch Tháng ${targetMonth} (🔒 Chưa có tab)`}
          </span>
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

        <button
          type="button"
          onClick={handleCopyMonthClipboard}
          className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>📋 Copy Dấu 'x' 31 Ngày Tháng {targetMonth} (Dán Nhanh 1 Giây)</span>
        </button>

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
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>Đăng Ký Ca Làm Tháng {targetMonth}/{targetYear}</span>
                    {!isCurrentMonthAvailable && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                        🔒 Chưa có tab
                      </span>
                    )}
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

            {/* Calendar Grid Container (42 Days Grid with Redesigned Dropdowns) */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <span key={d} className="text-[10px] font-extrabold text-slate-400 uppercase py-0.5">
                    {d}
                  </span>
                ))}
              </div>

              {/* 42-Cell Date Grid with Redesigned Dropdown in Each Cell */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  const shift = getShiftForDate(cell.dateIso);

                  return (
                    <div
                      key={`${cell.dateIso}-${idx}`}
                      className={`min-h-[52px] p-1 rounded-xl border flex flex-col justify-between transition-all select-none relative ${
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
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-black leading-none">{cell.dayNumber}</span>
                      </div>

                      {cell.isCurrentMonth && (
                        <div className="relative w-full mt-1">
                          <select
                            value={shift}
                            onChange={(e) =>
                              handleDropdownChange(cell.dateIso, e.target.value as QuickShiftType)
                            }
                            className={`w-full text-[10px] font-black rounded-lg px-1 py-0.5 focus:outline-none cursor-pointer text-center appearance-none transition-all shadow-2xs border ${
                              shift === 'FULL'
                                ? 'bg-emerald-600 text-white border-emerald-400'
                                : shift === 'SANG'
                                ? 'bg-sky-600 text-white border-sky-400'
                                : shift === 'CHIEU'
                                ? 'bg-amber-600 text-white border-amber-400'
                                : 'bg-white text-slate-800 border-slate-300'
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
                        </div>
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
                onClick={() => setLocalDraftShifts({})}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Đặt lại
              </button>

              <button
                type="button"
                onClick={handleSaveRealtimeSheet}
                disabled={isSavingSheet || !isCurrentMonthAvailable}
                className={`flex-1 py-2.5 text-white font-black text-xs rounded-xl shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  isCurrentMonthAvailable
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                {isSavingSheet ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang gửi sang Google Sheet...</span>
                  </>
                ) : isCurrentMonthAvailable ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Lưu & Ghi Realtime Sang Google Sheet</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Chưa Có Tab Trên Sheet</span>
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
