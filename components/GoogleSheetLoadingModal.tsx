'use client';
import React from 'react';
import { FileSpreadsheet, Sparkles } from 'lucide-react';

interface GoogleSheetLoadingModalProps {
  isOpen: boolean;
  employeeName: string;
  month: number;
  year: number;
}

export const GoogleSheetLoadingModal: React.FC<GoogleSheetLoadingModalProps> = ({
  isOpen,
  employeeName,
  month,
  year,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200">
        {/* Animated Sheet Scanner Graphic */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <FileSpreadsheet className="w-8 h-8 text-white animate-pulse" />
            <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
          </div>
        </div>

        {/* Header & Account Info */}
        <div className="space-y-2">
          <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">
            Đang đồng bộ Google Sheet...
          </h3>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 rounded-full border border-emerald-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping shrink-0" />
            <span className="text-xs font-bold text-emerald-900">
              Đang tải lịch cho: <span className="text-emerald-700 font-extrabold">{employeeName || 'Nguyễn Chí Nhân'}</span>
            </span>
          </div>
        </div>

        {/* Month Subtitle */}
        <div className="text-xs font-bold text-slate-600 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200/80 inline-block">
          📅 Kỳ trực Tháng {month}/{year}
        </div>

        {/* Micro Description */}
        <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
          Hệ thống đang kết nối và bóc tách các buổi trực công nhật từ Google Sheet...
        </p>

        {/* Progress Bar Animation */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full w-full animate-indeterminate rounded-full" />
        </div>
      </div>
    </div>
  );
};
