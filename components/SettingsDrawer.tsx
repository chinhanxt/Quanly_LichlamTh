'use client';
import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { ScheduleSettings } from '@/types/schedule';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: ScheduleSettings;
  onSaveSettings: (s: ScheduleSettings) => void;
}

export const SettingsDrawer: React.FC<Props> = ({ isOpen, onClose, settings, onSaveSettings }) => {
  const [form, setForm] = useState<ScheduleSettings>(settings);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!isOpen) return null;

  const { showToast } = useToast();

  const handleTestTelegram = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/telegram-test', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          title: 'Gửi thử nghiệm Telegram',
          message: 'Đã gửi tin nhắn thử nghiệm Telegram Bot thành công!'
        });
      } else {
        showToast({
          type: 'error',
          title: 'Lỗi gửi Telegram',
          message: json.error || 'Vui lòng kiểm tra TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi gửi Telegram',
        message: err.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-surface-textPrimary">Cấu hình Telegram Bot</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-surface-textPrimary">Nhắc tổng quan buổi sáng</span>
                <input
                  type="checkbox"
                  checked={form.enableMorning}
                  onChange={(e) => setForm({ ...form, enableMorning: e.target.checked })}
                  className="w-5 h-5 accent-brand-600 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Giờ gửi tin nhắn:</span>
                <input
                  type="time"
                  value={form.morningTime}
                  onChange={(e) => setForm({ ...form, morningTime: e.target.value })}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-surface-textPrimary">Nhắc trước ca học</span>
                <input
                  type="checkbox"
                  checked={form.enableLeadTime}
                  onChange={(e) => setForm({ ...form, enableLeadTime: e.target.checked })}
                  className="w-5 h-5 accent-brand-600 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Số phút nhắc trước:</span>
                <select
                  value={form.leadTimeMinutes}
                  onChange={(e) => setForm({ ...form, leadTimeMinutes: Number(e.target.value) })}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  <option value={15}>15 phút</option>
                  <option value={30}>30 phút</option>
                  <option value={60}>60 phút</option>
                </select>
              </div>
            </div>

            <Button variant="secondary" fullWidth onClick={handleTestTelegram} disabled={testing}>
              <Send className="w-4 h-4" /> {testing ? 'Đang gửi...' : 'Test gửi Telegram ngay'}
            </Button>
          </div>
        </div>

        <Button
          fullWidth
          onClick={() => {
            onSaveSettings(form);
            onClose();
          }}
        >
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
};
