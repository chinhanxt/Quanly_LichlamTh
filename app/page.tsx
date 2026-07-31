'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Camera, FileSpreadsheet } from 'lucide-react';
import { Header } from '@/components/Header';
import { DaySelector, getTodayInfo } from '@/components/DaySelector';
import { ScheduleCard } from '@/components/ScheduleCard';
import { ScheduleFormModal } from '@/components/ScheduleFormModal';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { BottomNav } from '@/components/BottomNav';
import { SettingsTab } from '@/components/SettingsTab';
import { SalaryTab } from '@/components/SalaryTab';
import { NotesTab } from '@/components/NotesTab';
import { NotificationsTab } from '@/components/NotificationsTab';
import { ExpenseTab } from '@/components/ExpenseTab';
import { OcrPreviewModal } from '@/components/OcrPreviewModal';
import { OcrLoadingModal } from '@/components/OcrLoadingModal';
import { GoogleSheetSyncModal } from '@/components/GoogleSheetSyncModal';
import { GoogleSheetLoadingModal } from '@/components/GoogleSheetLoadingModal';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { parseScheduleImage, ParsedShiftResult } from '@/lib/ocr-parser';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { user } = useAuth();
  const isChinhan = user?.username === 'chinhan';
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'schedule' | 'salary' | 'notes' | 'expense' | 'notifications' | 'settings'>('schedule');
  const [selectedDay, setSelectedDay] = useState<string>(() => getTodayInfo().dayKey);
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayInfo().dateIso);
  const [activeWeekDays, setActiveWeekDays] = useState<Array<{ key: string; fullDateIso: string }>>([]);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [settings, setSettings] = useState<ScheduleSettings>({
    morningTime: '07:00',
    leadTimeMinutes: 30,
    enableMorning: true,
    enableLeadTime: true,
    telegramBotToken: 'TELEGRAM_BOT_TOKEN_REVOKED',
    telegramChatId: 'CHAT_ID_REVOKED',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);

  // OCR Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrPreviewShifts, setOcrPreviewShifts] = useState<ParsedShiftResult[]>([]);
  const [isOcrPreviewOpen, setIsOcrPreviewOpen] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchSettings();
  }, [user?.username]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedule', {
        headers: { 'x-username': user?.username || 'chinhan' },
      });
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-username': user?.username || 'chinhan' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSettings({
          ...json.data,
          telegramBotToken: json.data.telegramBotToken || 'TELEGRAM_BOT_TOKEN_REVOKED',
          telegramChatId: json.data.telegramChatId || 'CHAT_ID_REVOKED',
        });
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
    if (isChinhan) {
      // Trigger Realtime Google Sheet Cell Push
      try {
        await fetch('/api/sync-google-sheet/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-username': user?.username || 'chinhan',
          },
          body: JSON.stringify({
            date: data.date || selectedDate,
            dayOfWeek: data.dayOfWeek || selectedDay,
            action: 'upsert',
            shiftType: data.note || (data.startTime?.startsWith('07') ? 'SANG' : 'CHIEU'),
            subject: data.subject,
          }),
        });
      } catch (e) {
        console.error('Sheet push error:', e);
      }

      showToast({
        type: 'success',
        title: 'Đã Cập Nhật Realtime Sang Google Sheet ⚡',
        message: `Đã tự động điền 'x' vào ca ${data.subject || 'làm'} trên Google Sheet của Quản lý.`,
      });
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteItem = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const targetId = deletingId;
    const targetItem = items.find((i) => i.id === targetId);
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
        if (isChinhan && targetItem) {
          // Trigger Realtime Google Sheet Cell Push (Remove 'x')
          try {
            await fetch('/api/sync-google-sheet/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-username': user?.username || 'chinhan',
              },
              body: JSON.stringify({
                date: targetItem.date,
                dayOfWeek: targetItem.dayOfWeek,
                action: 'delete',
              }),
            });
          } catch (e) {
            console.error('Sheet push delete error:', e);
          }
        }

        showToast({
          type: 'info',
          title: 'Đã Xóa & Bỏ \'x\' Trên Google Sheet ⚡',
          message: targetItem?.date
            ? `Đã xóa ca làm và tự động bỏ dấu 'x' ngày ${targetItem.date} trên Google Sheet!`
            : 'Đã xóa ca làm và tự động đồng bộ bỏ dấu \'x\' trên Google Sheet của Quản lý.',
        });
      }
    } catch (e) {
      console.error('Delete API error:', e);
    } finally {
      fetchItems();
    }
  };

  const handleSaveSettings = async (newSettings: ScheduleSettings) => {
    setSettings(newSettings);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        settings.employeeName || 'Thanh Hương',
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

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isSheetSyncing, setIsSheetSyncing] = useState(false);
  const [syncTargetMonth, setSyncTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [syncTargetYear, setSyncTargetYear] = useState<number>(new Date().getFullYear());

  const handleSyncGoogleSheet = async (
    tMonth?: number,
    tYear?: number,
    sheetUrl?: string
  ) => {
    const targetMonth = tMonth || new Date().getMonth() + 1;
    const targetYear = tYear || new Date().getFullYear();
    setSyncTargetMonth(targetMonth);
    setSyncTargetYear(targetYear);
    setIsSheetSyncing(true);

    try {
      const res = await fetch('/api/sync-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMonth,
          targetYear,
          sheetUrl,
          employeeName: settings.employeeName || (user?.username === 'chinhan' ? 'Nguyễn Chí Nhân' : 'Thanh Hương'),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          title: 'Đồng bộ Google Sheet thành công',
          message: json.message,
        });
        fetchItems();
      } else {
        showToast({
          type: 'error',
          title: 'Lỗi đồng bộ Google Sheet',
          message: json.error || 'Không thể đồng bộ từ Google Sheet',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi kết nối',
        message: err.message || 'Lỗi kết nối Google Sheet',
      });
    } finally {
      setIsSheetSyncing(false);
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
          onOpenNotifications={() => setActiveTab('notifications')}
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
                  {!isChinhan && (
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setIsModalOpen(true);
                      }}
                      className="mt-2 text-brand-600 text-xs font-semibold hover:underline"
                    >
                      + Thêm lịch thủ công
                    </button>
                  )}
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

              {/* Show GG Sheet button ONLY for chinhan */}
              {isChinhan ? (
                <button
                  onClick={() => setIsSheetModalOpen(true)}
                  disabled={isSheetSyncing}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  title="Đồng bộ từ Google Sheet"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>GG Sheet</span>
                </button>
              ) : (
                /* Show Import Ảnh button ONLY for non-chinhan users (thanhhuong) */
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isOcrLoading}
                    className="px-4 py-3 bg-white hover:bg-slate-50 text-brand-700 font-extrabold text-xs rounded-full shadow-lg border border-slate-200/80 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-brand-600" />
                    <span>{isOcrLoading ? 'Đang đọc...' : 'Import Ảnh'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setIsModalOpen(true);
                    }}
                    className="w-14 h-14 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-pill hover:bg-brand-700 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-7 h-7 text-white" />
                  </button>
                </>
              )}
            </div>
          </>
        ) : activeTab === 'salary' ? (
          <SalaryTab items={items} settings={settings} onSaveSettings={handleSaveSettings} />
        ) : activeTab === 'notes' ? (
          <NotesTab settings={settings} onSaveSettings={handleSaveSettings} items={items} />
        ) : activeTab === 'expense' ? (
          <ExpenseTab settings={settings} onSaveSettings={handleSaveSettings} />
        ) : activeTab === 'notifications' ? (
          <NotificationsTab settings={settings} onSaveSettings={handleSaveSettings} />
        ) : (
          <SettingsTab settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab as any} onChangeTab={setActiveTab as any} isChinhan={isChinhan} />

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

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
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
        employeeName={settings.employeeName || 'Thanh Hương'}
      />

      <GoogleSheetSyncModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        onSync={handleSyncGoogleSheet}
        initialSheetUrl={settings.googleSheetUrl}
        employeeName={settings.employeeName || (user?.username === 'chinhan' ? 'Nguyễn Chí Nhân' : 'Thanh Hương')}
      />

      <GoogleSheetLoadingModal
        isOpen={isSheetSyncing}
        employeeName={settings.employeeName || (user?.username === 'chinhan' ? 'Nguyễn Chí Nhân' : 'Thanh Hương')}
        month={syncTargetMonth}
        year={syncTargetYear}
      />
    </div>
  );
}
