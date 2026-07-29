'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { VectorPetMascot } from './VectorPetMascot';
import { Loader2, AlertCircle, ChevronDown, Check, User } from 'lucide-react';

const USER_OPTIONS = [
  { value: 'thanhhuong', label: 'Thanh Hương', badge: '🌸', subtitle: 'thanhhuong' },
  { value: 'chinhan', label: 'Chí Nhân', badge: '⚡', subtitle: 'chinhan' },
];

export const LoginModal: React.FC = () => {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('thanhhuong');
  const [password, setPassword] = useState('1515');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusField, setFocusField] = useState<'username' | 'password' | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Idle state tracking (2 seconds of inactivity)
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 2000);
  };

  useEffect(() => {
    resetIdleTimer();
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        if (focusField === 'username') setFocusField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [focusField]);

  if (loading || user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Mật khẩu chưa đúng rồi nè, thử lại nghen!');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUserOption = USER_OPTIONS.find((opt) => opt.value === username) || USER_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xl p-4 transition-all duration-300">
      {/* MAIN LOGIN CARD */}
      <div className="max-w-sm w-full bg-white backdrop-blur-2xl border border-purple-100 shadow-2xl shadow-purple-950/40 rounded-[2.5rem] text-slate-800 relative overflow-visible transition-all">
        {/* Ambient background glow inside card */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Integrated Clean Mascot Header */}
        <VectorPetMascot focusField={focusField} isIdle={isIdle} />

        {/* 2. Card Content Body */}
        <div className="p-6 sm:p-8 pt-2 relative z-10">
          <div className="flex flex-col items-center text-center mb-5">
            <h2 className="text-2xl font-black tracking-tight text-purple-950 lowercase">
              cổng nhà
            </h2>
            <p className="text-xs font-medium text-purple-600/80 mt-0.5">
              chọn tên rồi nhập mật khẩu vô nghen 🐾
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Custom Styled Account Selection Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/60 mb-1.5 ml-1">
                Bạn là ai đó?
              </label>

              {/* Selected Option Button */}
              <button
                type="button"
                onClick={() => {
                  resetIdleTimer();
                  setIsDropdownOpen((prev) => !prev);
                  setFocusField(isDropdownOpen ? null : 'username');
                }}
                className={`w-full px-4 py-3 bg-purple-50/60 border hover:border-purple-300 focus:outline-none rounded-2xl text-purple-950 font-bold text-sm transition-all flex items-center justify-between cursor-pointer ${
                  isDropdownOpen ? 'border-purple-600 bg-white ring-4 ring-purple-500/10' : 'border-purple-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shadow-xs">
                    {selectedUserOption.badge}
                  </span>
                  <div className="text-left">
                    <span className="block text-sm font-extrabold text-purple-950">{selectedUserOption.label}</span>
                    <span className="block text-[11px] font-medium text-purple-500/80">({selectedUserOption.subtitle})</span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-purple-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-purple-700' : ''}`} />
              </button>

              {/* Custom Popover Dropdown Options Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-purple-100 shadow-2xl rounded-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {USER_OPTIONS.map((option) => {
                    const isSelected = option.value === username;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setUsername(option.value);
                          setIsDropdownOpen(false);
                          setFocusField(null);
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-50 text-purple-950 font-bold'
                            : 'hover:bg-purple-50/60 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shadow-xs">
                            {option.badge}
                          </span>
                          <div>
                            <span className="block text-sm font-extrabold text-purple-950">{option.label}</span>
                            <span className="block text-[11px] text-purple-500">@{option.subtitle}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-600 font-bold" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900/60 mb-1.5 ml-1">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => {
                  resetIdleTimer();
                  setIsDropdownOpen(false);
                  setFocusField('password');
                }}
                onBlur={() => setFocusField(null)}
                placeholder="Nhập mật khẩu (1515)"
                required
                className="w-full px-4 py-3.5 bg-purple-50/60 border border-purple-100 hover:border-purple-200 focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-500/10 rounded-2xl text-purple-950 font-bold text-sm outline-none transition-all placeholder:text-purple-300"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang mở cổng...</span>
                </>
              ) : (
                <span>dô điiii</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
