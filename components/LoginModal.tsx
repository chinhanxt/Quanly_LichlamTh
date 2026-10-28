'use client';
import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, AlertCircle, Eye, EyeOff, CalendarCheck2, ArrowRight } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { user, loading, login } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading || user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(password);
    } catch (err: any) {
      setError(err.message || 'Mật khẩu không đúng');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-5">
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-indigo-300/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 mb-5">
            <CalendarCheck2 className="w-8 h-8 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Lịch làm & Thu chi</h1>
          <p className="text-sm text-slate-500 mt-1">Nhập mật khẩu để tiếp tục</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-purple-900/5 rounded-3xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-600 mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                autoComplete="current-password"
                placeholder="••••"
                className={`w-full pl-4 pr-12 py-3.5 bg-slate-50 border rounded-2xl text-base font-semibold tracking-wider text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:ring-4 transition-all ${
                  error
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-purple-500 focus:ring-purple-500/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs font-medium text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl shadow-lg shadow-purple-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang vào...
              </>
            ) : (
              <>
                Đăng nhập <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-6">Vào xong có thể đổi qua lại Thanh Hương ⇄ Chí Nhân</p>
      </div>
    </div>
  );
};
