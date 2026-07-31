'use client';
import React from 'react';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications, onOpenSettings }) => {
  const { user, logout } = useAuth();

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
        </div>
      </div>

      {/* 3 Icon Action Bar (Icon-only, clean, no text wrapping) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Notification Bell Icon */}
        <button
          onClick={onOpenNotifications}
          className="p-2.5 bg-white hover:bg-purple-50 rounded-2xl shadow-sm border border-purple-100 text-purple-600 active:scale-95 transition-all cursor-pointer relative"
          aria-label="Thông báo"
          title="Thông báo"
        >
          <Bell className="w-5 h-5 text-purple-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse ring-2 ring-white" />
        </button>

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
