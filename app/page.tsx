'use client';
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { DaySelector } from '@/components/DaySelector';
import { ScheduleCard } from '@/components/ScheduleCard';
import { ScheduleFormModal } from '@/components/ScheduleFormModal';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { BottomNav } from '@/components/BottomNav';
import { SettingsTab } from '@/components/SettingsTab';
import { SalaryTab } from '@/components/SalaryTab';
import { NotesTab } from '@/components/NotesTab';
import { NotificationsTab } from '@/components/NotificationsTab';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function Home() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'schedule' | 'salary' | 'notes' | 'notifications' | 'settings'>('schedule');
  const [selectedDay, setSelectedDay] = useState<string>('Thu2');
  const [selectedDate, setSelectedDate] = useState<string>('');
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

  useEffect(() => {
    fetchItems();
    fetchSettings();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedule');
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
      const res = await fetch('/api/settings');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/schedule/${targetId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'info',
          title: 'Đã xóa ca làm việc',
          message: 'Ca làm việc đã được xóa khỏi thời khóa biểu.',
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

  const filteredItems = items.filter((item) => {
    if (item.date && selectedDate) {
      return item.date === selectedDate;
    }
    return item.dayOfWeek === selectedDay;
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
                  />
                ))
              )}
            </div>

            {/* Floating Action Button (+) */}
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="fixed bottom-20 right-6 w-14 h-14 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-pill hover:bg-brand-700 active:scale-95 transition-all z-30"
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          </>
        ) : activeTab === 'salary' ? (
          <SalaryTab items={items} settings={settings} onSaveSettings={handleSaveSettings} />
        ) : activeTab === 'notes' ? (
          <NotesTab settings={settings} onSaveSettings={handleSaveSettings} />
        ) : activeTab === 'notifications' ? (
          <NotificationsTab settings={settings} onSaveSettings={handleSaveSettings} />
        ) : (
          <SettingsTab settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab as any} onChangeTab={setActiveTab as any} />

      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
        currentDay={selectedDay}
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
    </div>
  );
}
