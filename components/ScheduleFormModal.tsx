'use client';
import React, { useState, useEffect } from 'react';
import { X, Sun, Sunset, Clock, MapPin, Tag } from 'lucide-react';
import { ScheduleItem } from '@/types/schedule';
import { Button } from './ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ScheduleItem>) => void;
  initialData?: ScheduleItem | null;
  currentDay: string;
  currentDate?: string;
  isChinhan?: boolean;
}

export const ScheduleFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentDay,
  currentDate,
  isChinhan = false,
}) => {
  const [shiftType, setShiftType] = useState<'SANG' | 'CHIEU'>('SANG');

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
    date: currentDate || '',
    startTime: '07:30',
    endTime: '11:30',
    subject: 'Ca Sáng (Viện AI)',
    location: 'Viện Trí tuệ nhân tạo và Chuyển đổi số',
    note: 'Sáng',
    reminderEnabled: true,
  });

  useEffect(() => {
    if (initialData) {
      const isMorning = initialData.startTime?.startsWith('07') || initialData.startTime?.startsWith('08');
      setShiftType(isMorning ? 'SANG' : 'CHIEU');
      setForm({
        dayOfWeek: initialData.dayOfWeek,
        date: initialData.date || '',
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        subject: initialData.subject,
        location: initialData.location || (isChinhan ? 'Viện Trí tuệ nhân tạo và Chuyển đổi số' : ''),
        note: initialData.note || '',
        reminderEnabled: initialData.reminderEnabled,
      });
    } else {
      setShiftType('SANG');
      setForm({
        dayOfWeek: currentDay as ScheduleItem['dayOfWeek'],
        date: currentDate || '',
        startTime: isChinhan ? '07:30' : '08:00',
        endTime: isChinhan ? '11:30' : '10:00',
        subject: isChinhan ? 'Ca Sáng (Viện AI)' : '',
        location: isChinhan ? 'Viện Trí tuệ nhân tạo và Chuyển đổi số' : '',
        note: isChinhan ? 'Sáng' : '',
        reminderEnabled: true,
      });
    }
  }, [initialData, currentDay, currentDate, isChinhan]);

  if (!isOpen) return null;

  const handleSelectShiftType = (type: 'SANG' | 'CHIEU') => {
    setShiftType(type);
    if (type === 'SANG') {
      setForm((prev) => ({
        ...prev,
        startTime: '07:30',
        endTime: '11:30',
        subject: 'Ca Sáng (Viện AI)',
        location: 'Viện Trí tuệ nhân tạo và Chuyển đổi số',
        note: 'Sáng',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        startTime: '13:30',
        endTime: '16:30',
        subject: 'Ca Chiều (Viện AI)',
        location: 'Viện Trí tuệ nhân tạo và Chuyển đổi số',
        note: 'Chiều',
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-4xl sm:rounded-4xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            {initialData ? 'Chỉnh sửa ca làm' : 'Thêm ca làm mới'}
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
          {/* Thứ trong tuần */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Thứ trong tuần</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value as ScheduleItem['dayOfWeek'] })}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600 font-bold text-slate-800 text-sm cursor-pointer"
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

          {/* Special Simplified Form for chinhan: 2 Shift Buttons (Ca Sáng / Ca Chiều) - No manual time picker! */}
          {isChinhan ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Chọn Ca Trực (Viện AI):</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Ca Sáng Button */}
                <button
                  type="button"
                  onClick={() => handleSelectShiftType('SANG')}
                  className={`p-3.5 rounded-2xl border-2 font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    shiftType === 'SANG'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md scale-102'
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <Sun className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-sm">Ca Sáng</span>
                  <span className="text-[10px] opacity-90 font-normal">07:30 - 11:30</span>
                </button>

                {/* Ca Chiều Button */}
                <button
                  type="button"
                  onClick={() => handleSelectShiftType('CHIEU')}
                  className={`p-3.5 rounded-2xl border-2 font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    shiftType === 'CHIEU'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-102'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Sunset className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-sm">Ca Chiều</span>
                  <span className="text-[10px] opacity-90 font-normal">13:30 - 16:30</span>
                </button>
              </div>
            </div>
          ) : (
            /* Standard Form for non-chinhan users */
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Môn học / Công việc</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mạng máy tính"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600 font-medium"
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
            </>
          )}

          {/* Telegram Reminder Checkbox */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-xs font-bold text-slate-700">Tự động gửi Telegram báo ca</span>
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })}
              className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
            />
          </div>

          <Button type="submit" fullWidth className="mt-4 py-3.5 text-sm font-black rounded-2xl">
            {initialData ? 'Lưu thay đổi' : 'Tạo ca làm mới'}
          </Button>
        </form>
      </div>
    </div>
  );
};
