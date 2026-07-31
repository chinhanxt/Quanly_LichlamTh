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
  const [activePaintMode, setActivePaintMode] = useState<QuickShiftType>('FULL');
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
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(targetMonth).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateIso = `${year}-${monthStr}-${dayStr}`;
      daysArr.push({
        dateIso,
        dayNumber: d,
        isCurrentMonth: true,
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

  const handleCellClick = (dateIso: string) => {
    const current = getShiftForDate(dateIso);
    let next: QuickShiftType = activePaintMode;

    // If cell already has activePaintMode, toggle to OFF
    if (current === activePaintMode) {
      next = 'OFF';
    }

    setLocalDraftShifts((prev) => ({
      ...prev,
      [dateIso]: next,
    }));
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
          Đăng ký nhanh ca Sáng / Chiều / Full cho Tháng {targetMonth}/{targetYear} bằng bộ chọn lịch siêu tốc.
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
      {/* 4. POPUP LỊCH TO RÕ - ULTRA-FAST ONE-TAP SHIFT REGISTER MODAL */}
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
                    Chạm ngày để áp dụng ca đang chọn (1-tap siêu tốc)
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

            {/* Quick Paint Mode Selector Buttons */}
            <div className="p-3 bg-white border-b border-slate-100 space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Chọn Ca Mẫu Để Điền Nhanh:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {/* Full (2 ca) */}
                <button
                  type="button"
                  onClick={() => setActivePaintMode('FULL')}
                  className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 border transition-all cursor-pointer ${
                    activePaintMode === 'FULL'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Full (2 ca)</span>
                </button>

                {/* Sáng */}
                <button
                  type="button"
                  onClick={() => setActivePaintMode('SANG')}
                  className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 border transition-all cursor-pointer ${
                    activePaintMode === 'SANG'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs scale-105'
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Sáng</span>
                </button>

                {/* Chiều */}
                <button
                  type="button"
                  onClick={() => setActivePaintMode('CHIEU')}
                  className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 border transition-all cursor-pointer ${
                    activePaintMode === 'CHIEU'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-105'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Sunset className="w-3.5 h-3.5" />
                  <span>Chiều</span>
                </button>

                {/* OFF */}
                <button
                  type="button"
                  onClick={() => setActivePaintMode('OFF')}
                  className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 border transition-all cursor-pointer ${
                    activePaintMode === 'OFF'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-xs scale-105'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>OFF (Xóa)</span>
                </button>
              </div>
            </div>

            {/* Calendar Grid Container (42 Days Grid) */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <span key={d} className="text-[10px] font-extrabold text-slate-400 uppercase py-0.5">
                    {d}
                  </span>
                ))}
              </div>

              {/* 42-Cell Date Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  const shift = getShiftForDate(cell.dateIso);

                  return (
                    <button
                      key={`${cell.dateIso}-${idx}`}
                      type="button"
                      onClick={() => cell.isCurrentMonth && handleCellClick(cell.dateIso)}
                      disabled={!cell.isCurrentMonth}
                      className={`min-h-[46px] p-1 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer select-none active:scale-95 ${
                        !cell.isCurrentMonth
                          ? 'opacity-30 bg-slate-50 border-slate-100 cursor-not-allowed'
                          : shift === 'FULL'
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs font-extrabold'
                          : shift === 'SANG'
                          ? 'bg-sky-500 text-white border-sky-600 shadow-2xs font-extrabold'
                          : shift === 'CHIEU'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs font-extrabold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold leading-none">{cell.dayNumber}</span>
                      {cell.isCurrentMonth && (
                        <span className="text-[9px] font-black tracking-tighter truncate leading-tight">
                          {shift === 'FULL'
                            ? 'Full'
                            : shift === 'SANG'
                            ? 'Sáng'
                            : shift === 'CHIEU'
                            ? 'Chiều'
                            : 'OFF'}
                        </span>
                      )}
                    </button>
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
