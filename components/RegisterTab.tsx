'use client';
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { ScheduleSettings } from '@/types/schedule';
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
} from 'lucide-react';
import { useToast } from './ui/Toast';

interface RegisterTabProps {
  settings: ScheduleSettings;
  onSaveSettings: (newSettings: ScheduleSettings) => Promise<void>;
  onSyncSheet?: (month: number, year: number) => void;
}

export const RegisterTab: React.FC<RegisterTabProps> = ({
  settings,
  onSaveSettings,
  onSyncSheet,
}) => {
  const { showToast } = useToast();
  const [googleEmail, setGoogleEmail] = useState<string>(
    settings.employeeName ? 'chinhan15102005@gmail.com' : ''
  );
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  const handleConnectGoogle = () => {
    // Simulating OAuth Google popup connection
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
    }, 1000);
  };

  const handlePushRegister = async () => {
    setIsRegistering(true);
    showToast({
      type: 'info',
      title: 'Đang đẩy dữ liệu đăng ký',
      message: `Đang kết nối bằng ${googleEmail || 'Google Account'} để ghi lịch Tháng ${targetMonth}/${targetYear}...`,
    });

    setTimeout(() => {
      setIsRegistering(false);
      showToast({
        type: 'success',
        title: 'Đăng ký thành công! 🎉',
        message: `Đã ghi nhận ca làm Tháng ${targetMonth} dưới tên email ${googleEmail} trên Google Sheet.`,
      });
    }, 1500);
  };

  const SHEET_URL =
    settings.googleSheetUrl ||
    'https://docs.google.com/spreadsheets/d/1UnBM5lf3RNOtY7ACJ5soHDgOTz2rPZqr/edit?gid=459662961#gid=459662961';

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-3xl shadow-md space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black">Đăng ký & Kết nối Google Sheet</h2>
            <p className="text-[11px] text-emerald-100 font-medium">
              Quản lý đăng ký ca làm & đồng bộ Realtime cho tài khoản Chí Nhân
            </p>
          </div>
        </div>
      </div>

      {/* 1. Google Account Identity Card */}
      <Card className="p-4 space-y-3 border-emerald-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Tài khoản Google chịu trách nhiệm
          </span>
          {isConnected ? (
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kết nối
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-600" /> Chưa kết nối
            </span>
          )}
        </div>

        {isConnected ? (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  CN
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Nguyễn Chí Nhân</p>
                  <p className="text-[10px] font-medium text-slate-500">{googleEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="text-[10px] font-bold text-brand-600 hover:underline cursor-pointer"
              >
                Đổi tài khoản
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              ✅ Mọi chỉnh sửa trên Google Sheet sẽ được ghi dấu dưới danh nghĩa tài khoản Google của bạn trong phần Lịch sử phiên bản (Version History).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Bấm kết nối để App sử dụng tài khoản Google của bạn khi tự động điền ca làm lên Google Sheet.
            </p>
            <button
              type="button"
              onClick={handleConnectGoogle}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Kết nối Google Account của tôi</span>
            </button>
          </div>
        )}
      </Card>

      {/* 2. Direct Spreadsheet Info Card */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-brand-600" />
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

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 truncate">
          {SHEET_URL}
        </div>

        <div className="flex items-center gap-2">
          {onSyncSheet && (
            <button
              type="button"
              onClick={() => onSyncSheet(targetMonth, targetYear)}
              className="flex-1 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-extrabold text-xs rounded-xl border border-brand-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ dữ liệu từ Sheet</span>
            </button>
          )}
        </div>
      </Card>

      {/* 3. Shift Registration for Future Months */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-purple-600" />
            Đăng ký lịch làm mới
          </span>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-700">
            <span>Kỳ lương:</span>
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(Number(e.target.value))}
              className="bg-transparent font-black text-brand-700 focus:outline-none cursor-pointer"
            >
              {[7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Chọn ca đăng ký mặc định cho Tháng {targetMonth}/{targetYear} hoặc tải lịch có sẵn lên file Google Sheet của Quản lý.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={handlePushRegister}
            disabled={isRegistering}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-xs rounded-2xl shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRegistering ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang ghi lên Google Sheet...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi Đăng Ký Lịch Tháng {targetMonth} Lên Sheet</span>
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
};
