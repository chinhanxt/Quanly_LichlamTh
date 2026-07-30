'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ScheduleItem } from '@/types/schedule';
import { Button } from './ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ScheduleItem>) => void;
  initialData?: ScheduleItem | null;
  currentDay: string;
}

export const ScheduleFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, currentDay }) => {
  const [form, setForm] = useState<{
    dayOfWeek: ScheduleItem['dayOfWeek'];
    date?: string;
    startTime: string;
    endTime: string;
    subject: string;
    location: string;
    note: string;
    reminderEnabled: boolean;
  }>({
    dayOfWeek: currentDay as ScheduleItem['dayOfWeek'],
    date: '',
    startTime: '08:00',
    endTime: '10:00',
    subject: '',
    location: '',
    note: '',
    reminderEnabled: true,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        dayOfWeek: initialData.dayOfWeek,
        date: initialData.date || '',
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        subject: initialData.subject,
        location: initialData.location || '',
        note: initialData.note || '',
        reminderEnabled: initialData.reminderEnabled,
      });
    } else {
      setForm((prev) => ({ ...prev, dayOfWeek: currentDay as ScheduleItem['dayOfWeek'], date: '' }));
    }
  }, [initialData, currentDay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-4xl sm:rounded-4xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-surface-textPrimary">
            {initialData ? 'Chỉnh sửa ca học' : 'Thêm ca học mới'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
            onClose();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Thứ trong tuần</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value as ScheduleItem['dayOfWeek'] })}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600 font-medium"
            >
              <option value="Thu2">Thứ 2 (Mon)</option>
              <option value="Thu3">Thứ 3 (Tue)</option>
              <option value="Thu4">Thứ 4 (Wed)</option>
              <option value="Thu5">Thứ 5 (Thu)</option>
              <option value="Thu6">Thứ 6 (Fri)</option>
              <option value="Thu7">Thứ 7 (Sat)</option>
              <option value="CN">Chủ Nhật (Sun)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Môn học / Công việc</label>
            <input
              type="text"
              required
              placeholder="VD: Mạng máy tính"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Giờ kết thúc</label>
              <input
                type="time"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Địa điểm / Phòng học</label>
            <input
              type="text"
              placeholder="VD: Phòng A201"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Ghi chú thêm</label>
            <input
              type="text"
              placeholder="VD: Mang laptop & đọc bài trước"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-brand-50/50 rounded-2xl">
            <span className="text-sm font-semibold text-brand-700">Tự động gửi Telegram nhắc nhở</span>
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })}
              className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
            />
          </div>

          <Button type="submit" fullWidth className="mt-4">
            {initialData ? 'Lưu thay đổi' : 'Tạo ca học'}
          </Button>
        </form>
      </div>
    </div>
  );
};
