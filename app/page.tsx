'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Camera } from 'lucide-react';
import { Header } from '@/components/Header';
import { DaySelector, getTodayInfo } from '@/components/DaySelector';
import { ScheduleCard } from '@/components/ScheduleCard';
import { ScheduleFormModal } from '@/components/ScheduleFormModal';
import { BottomNav } from '@/components/BottomNav';
import { SettingsTab } from '@/components/SettingsTab';
import { SalaryTab } from '@/components/SalaryTab';
import { ExpenseTab } from '@/components/ExpenseTab';
import { OcrPreviewModal } from '@/components/OcrPreviewModal';
import { OcrLoadingModal } from '@/components/OcrLoadingModal';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { parseScheduleImage, ParsedShiftResult } from '@/lib/ocr-parser';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/components/AuthProvider';
import { StudyTab } from '@/components/StudyTab';

// Import ảnh lịch chỉ dùng cho Thanh Hương — AI dò đúng dòng tên này trong ảnh bảng phân ca
const OCR_EMPLOYEE_NAME = 'Thanh Hương';

export default function Home() {
  const { user } = useAuth();
  const isChinhan = user?.username === 'chinhan';
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'schedule' | 'study' | 'salary' | 'expense' | 'settings'>('schedule');
  const [selectedDay, setSelectedDay] = useState<string>(() => getTodayInfo().dayKey);
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayInfo().dateIso);
  const [activeWeekDays, setActiveWeekDays] = useState<Array<{ key: string; fullDateIso: string }>>([]);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [settings, setSettings] = useState<ScheduleSettings>({});
  // Tài khoản đang hiển thị — dùng để bỏ qua response/lưu trễ của tài khoản trước khi đổi
  const activeUserRef = useRef(user?.username);
  activeUserRef.current = user?.username;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);

  // OCR Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrPreviewShifts, setOcrPreviewShifts] = useState<ParsedShiftResult[]>([]);
  const [isOcrPreviewOpen, setIsOcrPreviewOpen] = useState(false);

  useEffect(() => {
    if (!user?.username) return;
    setItems([]);
    setSettings({});
    if (user.username === 'chinhan') {
      setActiveTab((tab) => (tab === 'study' ? 'schedule' : tab));
    }
    fetchItems();
    fetchSettings();
  }, [user?.username]);

  const fetchItems = async () => {
    const username = user?.username;
    if (!username) return;
    try {
      setLoading(true);
      const res = await fetch('/api/schedule', {
        headers: { 'x-username': username },
      });
      const json = await res.json();
      if (json.success && activeUserRef.current === username) setItems(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const username = user?.username;
    if (!username) return;
    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-username': username },
      });
      const json = await res.json();
      if (json.success && json.data && activeUserRef.current === username) {
        setSettings({ ...json.data, username });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectDay = (dayKey: string, fullDateIso: string) => {
    setSelectedDay(dayKey);
    setSelectedDate(fullDateIso);
  };

  const handleSaveItem = async (data: Partial<ScheduleItem>) => {
    if (editingItem) {
      await fetch(`/api/schedule/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-username': user?.username || 'chinhan',
        },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': user?.username || 'chinhan',
        },
        body: JSON.stringify(data),
      });
    }
    fetchItems();
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteItem = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const targetId = deletingId;
    setDeletingId(null);
    setItems((prev) => prev.filter((i) => i.id !== targetId));
    try {
      const res = await fetch(`/api/schedule/${targetId}`, {
        method: 'DELETE',
        headers: {
          'x-username': user?.username || 'chinhan',
        },
      });
      const json = await res.json();
      if (json.success) {
        showToast({ type: 'info', message: 'Đã xóa ca làm' });
      }
    } catch (e) {
      console.error('Delete API error:', e);
    } finally {
      fetchItems();
    }
  };

  const handleSaveSettings = async (newSettings: ScheduleSettings) => {
    const username = activeUserRef.current;
    // Chỉ lưu khi settings thuộc đúng tài khoản đang mở (tránh ghi đè chéo sau khi đổi tài khoản)
    if (!username || newSettings.username !== username) return;
    setSettings(newSettings);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-username': username },
      body: JSON.stringify(newSettings),
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOcrLoading(true);
    showToast({
      type: 'info',
      title: 'Đang quét ảnh lịch...',
      message: 'Đang bóc tách thông tin ca làm việc từ ảnh...',
    });

    try {
      const res = await parseScheduleImage(
        file,
        OCR_EMPLOYEE_NAME,
        settings.geminiApiKey
      );
      if (res.success && res.data) {
        setOcrPreviewShifts(res.data);
        setIsOcrPreviewOpen(true);
      } else {
        showToast({
          type: 'error',
          title: 'Lỗi đọc ảnh',
          message: res.error || 'Không thể đọc dữ liệu lịch từ ảnh.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi OCR',
        message: err.message || 'Lỗi xử lý ảnh',
      });
    } finally {
      setIsOcrLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmOcrSave = async (parsedShifts: ParsedShiftResult[]) => {
    const itemsToSave: Partial<ScheduleItem>[] = parsedShifts
      .filter((s) => !s.isOff)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        date: s.date || '',
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject || `Highlands Coffee (Ca ${s.shiftCode})`,
        location: 'Highlands Coffee',
        note: s.shiftCode,
        reminderEnabled: true,
      }));

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToSave),
      });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          title: 'Nhập lịch thành công',
          message: 'Đã lưu lịch làm việc mới vào thời khóa biểu!',
        });
        fetchItems();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi lưu lịch',
        message: err.message || 'Không thể lưu lịch làm việc.',
      });
    }
  };


  const filteredItems = items.filter((item) => {
    if (selectedDate) {
      if (item.date) {
        return item.date === selectedDate;
      }
      return item.dayOfWeek === selectedDay;
    }
    return item.dayOfWeek === selectedDay;
  }).sort((a, b) => {
    const timeA = a.startTime || '00:00';
    const timeB = b.startTime || '00:00';
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="min-h-screen bg-surface-bg pb-24">
      <div className="max-w-md mx-auto px-4 pt-4">
        <Header
          onOpenSettings={() => setActiveTab('settings')}
        />

        {activeTab === 'schedule' ? (
          <>
            <DaySelector
              selectedDay={selectedDay}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
              onWeekChange={setActiveWeekDays}
            />

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-slate-400 font-medium text-sm">
                  Đang tải thời khóa biểu...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-10 bg-white/80 rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    ☕
                  </div>
                  <h4 className="text-base font-extrabold text-slate-700">Nghỉ (OFF)</h4>
                  <p className="text-xs text-slate-400">Không có ca làm việc trong ngày này</p>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setIsModalOpen(true);
                    }}
                    className="mt-2 text-brand-600 text-xs font-semibold hover:underline"
                  >
                    + Thêm lịch thủ công
                  </button>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <ScheduleCard
                    key={item.id}
                    item={item}
                    onEdit={(it) => {
                      setEditingItem(it);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteItem}
                    isChinhan={isChinhan}
                  />
                ))
              )}
            </div>

            {/* Floating Action Buttons */}
            <div className="fixed bottom-20 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 z-30 flex-wrap justify-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {/* Import ảnh lịch (OCR) chỉ cho Thanh Hương */}
              {!isChinhan && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOcrLoading}
                  className="px-4 py-3 bg-white hover:bg-slate-50 text-brand-700 font-extrabold text-xs rounded-full shadow-lg border border-slate-200/80 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-brand-600" />
                  <span>{isOcrLoading ? 'Đang đọc...' : 'Import Ảnh'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
                className="w-14 h-14 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-pill hover:bg-brand-700 active:scale-95 transition-all cursor-pointer shrink-0"
                aria-label="Thêm ca làm"
              >
                <Plus className="w-7 h-7 text-white" />
              </button>
            </div>
          </>
        ) : activeTab === 'study' && !isChinhan ? (
          <StudyTab
            selectedDay={selectedDay}
            selectedDate={selectedDate}
            onSelectDay={handleSelectDay}
          />
        ) : activeTab === 'salary' ? (
          <SalaryTab key={user?.username} items={items} settings={settings} onSaveSettings={handleSaveSettings} payMode={isChinhan ? 'perShift' : 'hourly'} />
        ) : activeTab === 'expense' ? (
          <ExpenseTab key={user?.username} username={user?.username || ''} settings={settings} onSaveSettings={handleSaveSettings} />
        ) : (
          <SettingsTab key={user?.username} settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} isChinhan={isChinhan} />

      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
        currentDay={selectedDay}
        currentDate={selectedDate}
        isChinhan={isChinhan}
      />

      <OcrPreviewModal
        isOpen={isOcrPreviewOpen}
        onClose={() => setIsOcrPreviewOpen(false)}
        initialShifts={ocrPreviewShifts}
        onConfirmSave={handleConfirmOcrSave}
      />

      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onCancel={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa ca làm"
        message="Bạn có chắc chắn muốn xóa ca làm này khỏi thời khóa biểu không?"
      />

      <OcrLoadingModal
        isOpen={isOcrLoading}
        employeeName={OCR_EMPLOYEE_NAME}
      />

    </div>
  );
}
