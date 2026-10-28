'use client';
import React, { useState } from 'react';
import { Settings, LogOut, ArrowLeftRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { user, logout, switchAccount } = useAuth();
  const [switching, setSwitching] = useState(false);
  const otherAccount = user?.username === 'chinhan'
    ? { username: 'thanhhuong', label: 'Thanh Hương' }
    : { username: 'chinhan', label: 'Chí Nhân' };

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      await switchAccount(otherAccount.username);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="flex flex-row items-center justify-between py-4 px-1 mb-2 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/avatar.jpg"
          alt="Avatar"
          className="w-11 h-11 rounded-full object-cover border-2 border-purple-200 shadow-sm shrink-0"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Xin chào,</p>
          <h1 className="text-lg sm:text-xl font-black text-purple-600 leading-tight truncate">
            {user?.displayName || (user?.username === 'chinhan' ? 'Nguyễn Chí Nhân' : 'Thanh Hương')}
          </h1>
          <button
            onClick={handleSwitch}
            disabled={switching}
            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[11px] font-bold rounded-full active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            title={`Đổi sang ${otherAccount.label}`}
          >
            {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowLeftRight className="w-3 h-3" />}
            Đổi sang {otherAccount.label}
          </button>
        </div>
      </div>

      {/* Icon Action Bar (Icon-only, clean, no text wrapping) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Settings Gear Icon */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 bg-white hover:bg-purple-50 rounded-2xl shadow-sm border border-purple-100 text-slate-600 hover:text-purple-600 active:scale-95 transition-all cursor-pointer"
          aria-label="Cài đặt hệ thống"
          title="Cài đặt hệ thống"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Red SVG LogOut Door Icon */}
        <button
          onClick={logout}
          className="p-2.5 bg-rose-50/80 hover:bg-rose-100 rounded-2xl shadow-sm border border-rose-200/60 text-rose-600 active:scale-95 transition-all cursor-pointer"
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5 text-rose-600" />
        </button>
      </div>
    </header>
  );
};
