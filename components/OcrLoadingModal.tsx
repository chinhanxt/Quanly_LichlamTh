'use client';
import React from 'react';
import { Sparkles, ScanLine } from 'lucide-react';

interface OcrLoadingModalProps {
  isOpen: boolean;
  employeeName: string;
}

export const OcrLoadingModal: React.FC<OcrLoadingModalProps> = ({ isOpen, employeeName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Animated Scanner Graphic */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-brand-400/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-brand-500/10 animate-pulse" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <ScanLine className="w-8 h-8 text-white animate-pulse" />
            <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
          </div>
        </div>

        {/* Header & Account Name */}
        <div className="space-y-2">
          <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">
            Đang bóc tách lịch làm...
          </h3>
          
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-50/90 rounded-full border border-brand-200/80 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping shrink-0" />
            <span className="text-xs font-bold text-brand-900">
              Đang lấy lịch cho: <span className="text-brand-700 font-extrabold">{employeeName || 'Thanh Hương'}</span>
            </span>
          </div>
        </div>

        {/* Micro Description */}
        <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
          AI Gemini đang đọc ảnh và tự động phân tích ca làm việc. Vui lòng chờ trong giây lát...
        </p>

        {/* Progress Bar Animation */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-brand-500 to-purple-600 h-full w-full animate-indeterminate rounded-full" />
        </div>
      </div>
    </div>
  );
};
