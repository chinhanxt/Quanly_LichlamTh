'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Sun,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  Check,
  Pencil,
  Smile,
} from 'lucide-react';
import { ScheduleSettings, CustomNotificationItem } from '@/types/schedule';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';
import { useAuth } from '@/components/AuthProvider';

interface NotificationsTabProps {
  settings: ScheduleSettings;
  onSaveSettings: (s: ScheduleSettings) => Promise<void>;
}

// Popular Facebook / run.vn Smileys List
const FACEBOOK_EMOJIS = [
  '😀', '😃', '😄', '😆', '😅', '😂', '🤣', '😊', '😇', '😈',
  '👿', '🤡', '👻', '💀', '👽', '👾', '🤖', '💩', '🎃', '🏃‍♂️',
  '🚨', '🏃‍♀️', '📝', '☀️', '💸', '🥳', '⚡', '🔥', '👑', '😎',
  '🤑', '🤔', '🤪', '🤐', '📍', '🔔', '💬', '🚀', '❤️', '👍',
];

// GenZ Sarcastic / Raw Humor Default Templates
const GENZ_DEFAULT_TEMPLATES = {
  shift:
    '🏃‍♂️ Dậy đi làm cha ơi! Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn lẹ không trễ giờ chừ!',
  checkIn:
    '🚨 Alo alo! Ca {Ca} tới đít rồi nè! Check-in lẹ không là bị trừ lương sấp mặt bây giờ 💸',
  checkOut:
    '🏃‍♀️ Hết ca rồi lượn lẹ! Ca {Ca} xong rồi nè. Bấm Check-out rồi vọt về thôi 🥳',
  notes:
    '📝 Note ca {Ca} nè: {GhiChú}. Quên cái này là ăn chửi ráng chịu nha! ⚡',
  morning:
    '☀️ Dậy đi cày em ơi! Hôm nay cày ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Chúc cày cuốc vui vẻ không bị ăn chửi nhé 🔥',
};

// Custom Select Component
interface CustomSelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (val: T) => void;
  className?: string;
}

function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className || ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 hover:border-brand-300 rounded-xl text-xs font-black text-brand-700 shadow-2xs flex items-center justify-between gap-2 transition-all active:scale-95 cursor-pointer"
      >
        <span>{selectedOption?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-brand-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-brand-100/80 rounded-2xl shadow-xl p-1.5 z-50 animate-fade-in space-y-0.5">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-brand-50 text-brand-700 font-black'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Auto-resizing Textarea
interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ value, className, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      className={`w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 focus:bg-white resize-none font-medium transition-all overflow-hidden leading-relaxed ${className || ''}`}
      {...props}
    />
  );
};

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [form, setForm] = useState({
    enableShiftReminder: settings.enableShiftReminder ?? settings.enableLeadTime ?? true,
    shiftReminderLeadMinutes: settings.shiftReminderLeadMinutes ?? settings.leadTimeMinutes ?? 30,
    shiftReminderTemplate: settings.shiftReminderTemplate || GENZ_DEFAULT_TEMPLATES.shift,

    enableCheckInReminder: settings.enableCheckInReminder ?? true,
    checkInLeadMinutes: settings.checkInLeadMinutes ?? 15,
    checkInTemplate: settings.checkInTemplate || GENZ_DEFAULT_TEMPLATES.checkIn,

    enableCheckOutReminder: settings.enableCheckOutReminder ?? true,
    checkOutLagMinutes: settings.checkOutLagMinutes ?? 10,
    checkOutTemplate: settings.checkOutTemplate || GENZ_DEFAULT_TEMPLATES.checkOut,

    enableNotesReminder: settings.enableNotesReminder ?? true,
    notesLeadMinutes: settings.notesLeadMinutes ?? 15,
    notesTimingMode: settings.notesTimingMode || 'before_shift',
    notesFixedTime: settings.notesFixedTime || '08:00',
    notesTemplate: settings.notesTemplate || GENZ_DEFAULT_TEMPLATES.notes,

    enableMorningSummary: settings.enableMorningSummary ?? settings.enableMorning ?? true,
    morningSummaryTime: settings.morningSummaryTime || settings.morningTime || '07:00',
    morningSummaryTemplate: settings.morningSummaryTemplate || GENZ_DEFAULT_TEMPLATES.morning,

    customNotifications: settings.customNotifications || [],
  });

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<Record<string, boolean>>({});

  const toggleExpand = (cardKey: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const toggleEmojiPicker = (cardKey: string) => {
    setShowEmojiPicker((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const { showToast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      enableShiftReminder: settings.enableShiftReminder ?? prev.enableShiftReminder,
      shiftReminderLeadMinutes: settings.shiftReminderLeadMinutes ?? prev.shiftReminderLeadMinutes,
      shiftReminderTemplate: settings.shiftReminderTemplate || prev.shiftReminderTemplate || GENZ_DEFAULT_TEMPLATES.shift,

      enableCheckInReminder: settings.enableCheckInReminder ?? prev.enableCheckInReminder,
      checkInLeadMinutes: settings.checkInLeadMinutes ?? prev.checkInLeadMinutes,
      checkInTemplate: settings.checkInTemplate || prev.checkInTemplate || GENZ_DEFAULT_TEMPLATES.checkIn,

      enableCheckOutReminder: settings.enableCheckOutReminder ?? prev.enableCheckOutReminder,
      checkOutLagMinutes: settings.checkOutLagMinutes ?? prev.checkOutLagMinutes,
      checkOutTemplate: settings.checkOutTemplate || prev.checkOutTemplate || GENZ_DEFAULT_TEMPLATES.checkOut,

      enableNotesReminder: settings.enableNotesReminder ?? prev.enableNotesReminder,
      notesLeadMinutes: settings.notesLeadMinutes ?? prev.notesLeadMinutes,
      notesTimingMode: settings.notesTimingMode || prev.notesTimingMode || 'before_shift',
      notesFixedTime: settings.notesFixedTime || prev.notesFixedTime || '08:00',
      notesTemplate: settings.notesTemplate || prev.notesTemplate || GENZ_DEFAULT_TEMPLATES.notes,

      enableMorningSummary: settings.enableMorningSummary ?? prev.enableMorningSummary,
      morningSummaryTime: settings.morningSummaryTime || prev.morningSummaryTime,
      morningSummaryTemplate: settings.morningSummaryTemplate || prev.morningSummaryTemplate || GENZ_DEFAULT_TEMPLATES.morning,

      customNotifications: settings.customNotifications || prev.customNotifications || [],
    }));
  }, [settings]);

  const updateForm = (nextForm: typeof form) => {
    setForm(nextForm);
    setSavingStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSaveSettings({
          ...settings,

          enableShiftReminder: nextForm.enableShiftReminder,
          shiftReminderLeadMinutes: nextForm.shiftReminderLeadMinutes,
          shiftReminderTemplate: nextForm.shiftReminderTemplate,

          enableCheckInReminder: nextForm.enableCheckInReminder,
          checkInLeadMinutes: nextForm.checkInLeadMinutes,
          checkInTemplate: nextForm.checkInTemplate,

          enableCheckOutReminder: nextForm.enableCheckOutReminder,
          checkOutLagMinutes: nextForm.checkOutLagMinutes,
          checkOutTemplate: nextForm.checkOutTemplate,

          enableNotesReminder: nextForm.enableNotesReminder,
          notesLeadMinutes: nextForm.notesLeadMinutes,
          notesTimingMode: nextForm.notesTimingMode as any,
          notesFixedTime: nextForm.notesFixedTime,
          notesTemplate: nextForm.notesTemplate,

          enableMorningSummary: nextForm.enableMorningSummary,
          morningSummaryTime: nextForm.morningSummaryTime,
          morningSummaryTemplate: nextForm.morningSummaryTemplate,

          customNotifications: nextForm.customNotifications,

          enableLeadTime: nextForm.enableShiftReminder,
          leadTimeMinutes: nextForm.shiftReminderLeadMinutes,
          enableMorning: nextForm.enableMorningSummary,
          morningTime: nextForm.morningSummaryTime,
        });
        setSavingStatus('saved');
        setTimeout(() => setSavingStatus('idle'), 2500);
      } catch (err: any) {
        setSavingStatus('idle');
        showToast({
          type: 'error',
          title: 'Lưu tự động thất bại',
          message: err.message || 'Không thể kết nối đến máy chủ',
        });
      }
    }, 400);
  };

  const appendTag = (fieldKey: keyof typeof form, tag: string) => {
    const currentVal = (form[fieldKey] as string) || '';
    updateForm({
      ...form,
      [fieldKey]: currentVal + (currentVal ? ' ' : '') + tag,
    });
  };

  const addCustomNotification = () => {
    const newCustomId = `custom_${Date.now()}`;
    const newCustom: CustomNotificationItem = {
      id: newCustomId,
      title: `Thông báo tùy chỉnh ${(form.customNotifications?.length || 0) + 1}`,
      enabled: true,
      timingMode: 'before_shift',
      leadMinutes: 30,
      lagMinutes: 10,
      fixedTime: '12:00',
      template: '🔥 Sắp tới ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} rồi nè! Note: {GhiChú}',
    };
    const nextList = [...(form.customNotifications || []), newCustom];
    updateForm({ ...form, customNotifications: nextList });
    setExpandedCards((prev) => ({ ...prev, [newCustomId]: true }));
  };

  const updateCustomNotification = (id: string, updates: Partial<CustomNotificationItem>) => {
    const nextList = (form.customNotifications || []).map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    updateForm({ ...form, customNotifications: nextList });
  };

  const removeCustomNotification = (id: string) => {
    const nextList = (form.customNotifications || []).filter((item) => item.id !== id);
    updateForm({ ...form, customNotifications: nextList });
  };

  const appendCustomTag = (id: string, tag: string) => {
    const target = (form.customNotifications || []).find((item) => item.id === id);
    if (!target) return;
    const currentVal = target.template || '';
    updateCustomNotification(id, {
      template: currentVal + (currentVal ? ' ' : '') + tag,
    });
  };

  const { user } = useAuth();
  const isChinhan = user?.username === 'chinhan';

  const handleTestSend = async (key: string, templateText: string) => {
    const token = settings.telegramBotToken;
    const chatId = settings.telegramChatId;

    if (!token || !chatId) {
      showToast({
        type: 'error',
        title: 'Chưa cấu hình Telegram',
        message: 'Vui lòng vào tab Cấu hình để nhập Bot Token và Chat ID trước!',
      });
      return;
    }

    setTestingKey(key);
    try {
      const sampleText = templateText
        .replace(/\{Ca\}/g, isChinhan ? 'Ca Sáng' : 'B18')
        .replace(/\{ThờiGian\}/g, isChinhan ? '07:30 - 11:30' : '18:00 - 22:00')
        .replace(/\{ĐịaĐiểm\}/g, isChinhan ? 'Viện Trí tuệ nhân tạo và Chuyển đổi số' : 'Highlands Coffee')
        .replace(/\{GhiChú\}/g, isChinhan ? 'Sáng' : 'Mang laptop & đồng phục');

      const res = await fetch('/api/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: token,
          telegramChatId: chatId,
          message: sampleText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast({
          type: 'success',
          title: 'Gửi thành công! 🚀',
          message: 'Tin nhắn thử nghiệm đã được gửi sang Telegram của bạn.',
        });
      } else {
        throw new Error(data.error || 'Gửi thất bại');
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Gửi thử nghiệm thất bại',
        message: err.message || 'Không thể kết nối đến Bot Telegram',
      });
    } finally {
      setTestingKey(null);
    }
  };

  // Helper component to render Facebook Emoji Bar
  const EmojiPickerBar = ({ onSelectEmoji }: { onSelectEmoji: (emoji: string) => void }) => (
    <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
          😃 Biểu tượng Facebook / Smileys (run.vn)
        </span>
        <span className="text-[10px] text-slate-400">Bấm icon để chèn vào tin nhắn</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto pr-1">
        {FACEBOOK_EMOJIS.map((emo) => (
          <button
            key={emo}
            type="button"
            onClick={() => onSelectEmoji(emo)}
            className="p-1 hover:bg-white rounded-lg text-base hover:scale-125 transition-all cursor-pointer"
          >
            {emo}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Status Indicator (Clean Title Only) */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-600" />
          <span>Cấu Hình Thông Báo</span>
        </h2>

        <div className="text-xs font-semibold">
          {savingStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" /> Đang lưu...
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> ✓ Đã tự động lưu
            </span>
          )}
        </div>
      </div>

      {/* Standardized Ultra-Compact Cards List */}
      <div className="space-y-3">
        {/* 1. Nhắc Trước Giờ Làm */}
        <Card className="p-3.5 rounded-2xl shadow-sm hover:shadow transition-all space-y-0 overflow-visible border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 bg-brand-50 rounded-xl text-brand-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-800 truncate">1. 🏃‍♂️ Nhắc Trước Giờ Làm</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">Báo trước giờ ca làm để chuẩn bị sửa soạn</p>
              </div>
            </div>

            {/* Controls: iOS Toggle Switch + Edit Pencil */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Robust Standard Tailwind iOS Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.enableShiftReminder}
                  onChange={(e) => updateForm({ ...form, enableShiftReminder: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>

              {/* Edit Pencil Button */}
              <button
                type="button"
                onClick={() => toggleExpand('shift')}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  expandedCards.shift
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title="Bấm để chỉnh nội dung & thời gian"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded Content & Keywords (ONLY shown when pencil button is clicked) */}
          {expandedCards.shift && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Thời gian báo trước ca:</span>
                <CustomSelect
                  value={form.shiftReminderLeadMinutes || 30}
                  onChange={(val) => updateForm({ ...form, shiftReminderLeadMinutes: val })}
                  options={[
                    { value: 15, label: '15 phút trước' },
                    { value: 30, label: '30 phút trước' },
                    { value: 45, label: '45 phút trước' },
                    { value: 60, label: '60 phút trước' },
                    { value: 90, label: '90 phút trước' },
                    { value: 120, label: '120 phút trước' },
                  ]}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mẫu tin nhắn Telegram:
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleEmojiPicker('shift')}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>{showEmojiPicker.shift ? 'Ẩn Icon run.vn' : '😃 Bật Icon run.vn'}</span>
                  </button>
                </div>

                {showEmojiPicker.shift && (
                  <div className="mb-2">
                    <EmojiPickerBar onSelectEmoji={(emo) => appendTag('shiftReminderTemplate', emo)} />
                  </div>
                )}

                <AutoResizeTextarea
                  value={form.shiftReminderTemplate || ''}
                  onChange={(e) => updateForm({ ...form, shiftReminderTemplate: e.target.value })}
                  placeholder="Nhập mẫu tin nhắn..."
                />

                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Từ khóa:</span>
                    {['{Ca}', '{ThờiGian}', '{ĐịaĐiểm}', '{GhiChú}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendTag('shiftReminderTemplate', tag)}
                        className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={testingKey === 'shift'}
                      onClick={() => handleTestSend('shift', form.shiftReminderTemplate || '')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testingKey === 'shift' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>🧪 Gửi thử Telegram</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 2. Nhắc Check-in Vào Ca */}
        <Card className="p-3.5 rounded-2xl shadow-sm hover:shadow transition-all space-y-0 overflow-visible border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 bg-brand-50 rounded-xl text-brand-600 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-800 truncate">2. 📍 Nhắc Check-in Vào Ca</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">Báo trước giờ vào ca để không quên điểm danh</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.enableCheckInReminder}
                  onChange={(e) => updateForm({ ...form, enableCheckInReminder: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>

              <button
                type="button"
                onClick={() => toggleExpand('checkIn')}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  expandedCards.checkIn
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title="Bấm để chỉnh nội dung & thời gian"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expandedCards.checkIn && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Thời gian báo trước ca:</span>
                <CustomSelect
                  value={form.checkInLeadMinutes || 15}
                  onChange={(val) => updateForm({ ...form, checkInLeadMinutes: val })}
                  options={[
                    { value: 5, label: '5 phút trước' },
                    { value: 10, label: '10 phút trước' },
                    { value: 15, label: '15 phút trước' },
                    { value: 20, label: '20 phút trước' },
                    { value: 30, label: '30 phút trước' },
                  ]}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mẫu tin nhắn Telegram:
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleEmojiPicker('checkIn')}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>{showEmojiPicker.checkIn ? 'Ẩn Icon run.vn' : '😃 Bật Icon run.vn'}</span>
                  </button>
                </div>

                {showEmojiPicker.checkIn && (
                  <div className="mb-2">
                    <EmojiPickerBar onSelectEmoji={(emo) => appendTag('checkInTemplate', emo)} />
                  </div>
                )}

                <AutoResizeTextarea
                  value={form.checkInTemplate || ''}
                  onChange={(e) => updateForm({ ...form, checkInTemplate: e.target.value })}
                  placeholder="Nhập mẫu tin nhắn check-in..."
                />

                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Từ khóa:</span>
                    {['{Ca}', '{ThờiGian}', '{ĐịaĐiểm}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendTag('checkInTemplate', tag)}
                        className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={testingKey === 'checkIn'}
                      onClick={() => handleTestSend('checkIn', form.checkInTemplate || '')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testingKey === 'checkIn' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>🧪 Gửi thử Telegram</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 3. Nhắc Check-out Tan Ca */}
        <Card className="p-3.5 rounded-2xl shadow-sm hover:shadow transition-all space-y-0 overflow-visible border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 bg-brand-50 rounded-xl text-brand-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-800 truncate">3. ✅ Nhắc Check-out Tan Ca</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">Báo ngay khi vừa hết ca để quẹt thẻ ra về</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.enableCheckOutReminder}
                  onChange={(e) => updateForm({ ...form, enableCheckOutReminder: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>

              <button
                type="button"
                onClick={() => toggleExpand('checkOut')}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  expandedCards.checkOut
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title="Bấm để chỉnh nội dung & thời gian"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expandedCards.checkOut && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Thời gian báo sau tan ca:</span>
                <CustomSelect
                  value={form.checkOutLagMinutes || 10}
                  onChange={(val) => updateForm({ ...form, checkOutLagMinutes: val })}
                  options={[
                    { value: 5, label: '5 phút sau' },
                    { value: 10, label: '10 phút sau' },
                    { value: 15, label: '15 phút sau' },
                    { value: 20, label: '20 phút sau' },
                    { value: 30, label: '30 phút sau' },
                  ]}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mẫu tin nhắn Telegram:
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleEmojiPicker('checkOut')}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>{showEmojiPicker.checkOut ? 'Ẩn Icon run.vn' : '😃 Bật Icon run.vn'}</span>
                  </button>
                </div>

                {showEmojiPicker.checkOut && (
                  <div className="mb-2">
                    <EmojiPickerBar onSelectEmoji={(emo) => appendTag('checkOutTemplate', emo)} />
                  </div>
                )}

                <AutoResizeTextarea
                  value={form.checkOutTemplate || ''}
                  onChange={(e) => updateForm({ ...form, checkOutTemplate: e.target.value })}
                  placeholder="Nhập mẫu tin nhắn check-out..."
                />

                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Từ khóa:</span>
                    {['{Ca}', '{ThờiGian}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendTag('checkOutTemplate', tag)}
                        className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={testingKey === 'checkOut'}
                      onClick={() => handleTestSend('checkOut', form.checkOutTemplate || '')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testingKey === 'checkOut' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>🧪 Gửi thử Telegram</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 4. Nhắc Ghi Chú Ca Làm (Notes Memo) */}
        <Card className="p-3.5 rounded-2xl shadow-sm hover:shadow transition-all space-y-0 overflow-visible border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 bg-brand-50 rounded-xl text-brand-600 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-800 truncate">4. 📝 Nhắc Ghi Chú Ca Làm</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">Nhắc nhở công việc & item cần mang trước ca làm</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.enableNotesReminder}
                  onChange={(e) => updateForm({ ...form, enableNotesReminder: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>

              <button
                type="button"
                onClick={() => toggleExpand('notes')}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  expandedCards.notes
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title="Bấm để chỉnh nội dung & thời gian"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expandedCards.notes && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 animate-fade-in">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">Thời gian nhắc ghi chú:</span>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateForm({ ...form, notesTimingMode: 'before_shift' })}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                      (form.notesTimingMode || 'before_shift') === 'before_shift'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟢 Trước ca làm
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm({ ...form, notesTimingMode: 'fixed_time' })}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                      form.notesTimingMode === 'fixed_time'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⏰ Giờ cố định
                  </button>
                </div>
              </div>

              {(form.notesTimingMode || 'before_shift') === 'before_shift' ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Thời gian báo trước ca:</span>
                  <CustomSelect
                    value={form.notesLeadMinutes || 15}
                    onChange={(val) => updateForm({ ...form, notesLeadMinutes: val })}
                    options={[
                      { value: 10, label: '10 phút trước' },
                      { value: 15, label: '15 phút trước' },
                      { value: 30, label: '30 phút trước' },
                      { value: 45, label: '45 phút trước' },
                      { value: 60, label: '60 phút trước' },
                    ]}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Giờ gửi tin nhắn hàng ngày:</span>
                  <input
                    type="time"
                    value={form.notesFixedTime || '08:00'}
                    onChange={(e) => updateForm({ ...form, notesFixedTime: e.target.value })}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-700 focus:outline-none focus:border-brand-600"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mẫu tin nhắn Telegram:
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleEmojiPicker('notes')}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>{showEmojiPicker.notes ? 'Ẩn Icon run.vn' : '😃 Bật Icon run.vn'}</span>
                  </button>
                </div>

                {showEmojiPicker.notes && (
                  <div className="mb-2">
                    <EmojiPickerBar onSelectEmoji={(emo) => appendTag('notesTemplate', emo)} />
                  </div>
                )}

                <AutoResizeTextarea
                  value={form.notesTemplate || ''}
                  onChange={(e) => updateForm({ ...form, notesTemplate: e.target.value })}
                  placeholder="Nhập mẫu tin nhắn ghi chú..."
                />

                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Từ khóa:</span>
                    {['{Ca}', '{GhiChú}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendTag('notesTemplate', tag)}
                        className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={testingKey === 'notes'}
                      onClick={() => handleTestSend('notes', form.notesTemplate || '')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testingKey === 'notes' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>🧪 Gửi thử Telegram</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 5. Nhắc Lịch Làm Buổi Sáng (Morning Summary) */}
        <Card className="p-3.5 rounded-2xl shadow-sm hover:shadow transition-all space-y-0 overflow-visible border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 bg-brand-50 rounded-xl text-brand-600 shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-800 truncate">5. ☀️ Nhắc Lịch Buổi Sáng</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">Gửi tổng hợp tất cả các ca làm trong ngày</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.enableMorningSummary}
                  onChange={(e) => updateForm({ ...form, enableMorningSummary: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>

              <button
                type="button"
                onClick={() => toggleExpand('morning')}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  expandedCards.morning
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title="Bấm để chỉnh nội dung & thời gian"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expandedCards.morning && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Giờ gửi tin nhắn hàng ngày:</span>
                <input
                  type="time"
                  value={form.morningSummaryTime || '07:00'}
                  onChange={(e) => updateForm({ ...form, morningSummaryTime: e.target.value })}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-700 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mẫu tin nhắn Telegram:
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleEmojiPicker('morning')}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>{showEmojiPicker.morning ? 'Ẩn Icon run.vn' : '😃 Bật Icon run.vn'}</span>
                  </button>
                </div>

                {showEmojiPicker.morning && (
                  <div className="mb-2">
                    <EmojiPickerBar onSelectEmoji={(emo) => appendTag('morningSummaryTemplate', emo)} />
                  </div>
                )}

                <AutoResizeTextarea
                  value={form.morningSummaryTemplate || ''}
                  onChange={(e) => updateForm({ ...form, morningSummaryTemplate: e.target.value })}
                  placeholder="Nhập mẫu tin nhắn báo sáng..."
                />

                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Từ khóa:</span>
                    {['{Ca}', '{ThờiGian}', '{ĐịaĐiểm}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendTag('morningSummaryTemplate', tag)}
                        className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={testingKey === 'morning'}
                      onClick={() => handleTestSend('morning', form.morningSummaryTemplate || '')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testingKey === 'morning' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>🧪 Gửi thử Telegram</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Dynamic Custom Notification Cards */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <span>Thông Báo Tùy Chỉnh (Custom Cards)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {(form.customNotifications || []).length} thẻ đã tạo
          </span>
        </div>

        {(form.customNotifications || []).map((custom) => {
          const isExpanded = Boolean(expandedCards[custom.id]);
          return (
            <Card key={custom.id} className="p-3.5 rounded-2xl shadow-sm hover:shadow transition-all space-y-0 border border-indigo-100/90 bg-gradient-to-br from-white to-indigo-50/20 overflow-visible">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 bg-brand-50 rounded-xl text-brand-600 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={custom.title}
                      onChange={(e) => updateCustomNotification(custom.id, { title: e.target.value })}
                      placeholder="Tên thông báo..."
                      className="font-bold text-sm text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-600 focus:outline-none px-0.5 py-0 transition-colors w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={custom.enabled}
                      onChange={(e) => updateCustomNotification(custom.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>

                  <button
                    type="button"
                    onClick={() => toggleExpand(custom.id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                      isExpanded
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                    title="Bấm để chỉnh nội dung & thời gian"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeCustomNotification(custom.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 animate-fade-in">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 block">Điều kiện thời gian báo:</span>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => updateCustomNotification(custom.id, { timingMode: 'before_shift' })}
                        className={`py-1 px-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                          (custom.timingMode || 'before_shift') === 'before_shift'
                            ? 'bg-white text-brand-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Trước ca làm
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCustomNotification(custom.id, { timingMode: 'after_shift' })}
                        className={`py-1 px-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                          custom.timingMode === 'after_shift'
                            ? 'bg-white text-brand-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sau ca làm
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCustomNotification(custom.id, { timingMode: 'fixed_time' })}
                        className={`py-1 px-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                          custom.timingMode === 'fixed_time'
                            ? 'bg-white text-brand-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Giờ cố định
                      </button>
                    </div>
                  </div>

                  {(custom.timingMode || 'before_shift') === 'before_shift' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Thời gian báo trước ca:</span>
                      <CustomSelect
                        value={custom.leadMinutes || 30}
                        onChange={(val) => updateCustomNotification(custom.id, { leadMinutes: val })}
                        options={[
                          { value: 15, label: '15 phút trước ca' },
                          { value: 30, label: '30 phút trước ca' },
                          { value: 45, label: '45 phút trước ca' },
                          { value: 60, label: '60 phút trước ca' },
                          { value: 90, label: '90 phút trước ca' },
                          { value: 120, label: '120 phút trước ca' },
                        ]}
                      />
                    </div>
                  )}

                  {custom.timingMode === 'after_shift' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Thời gian báo sau tan ca:</span>
                      <CustomSelect
                        value={custom.lagMinutes || 10}
                        onChange={(val) => updateCustomNotification(custom.id, { lagMinutes: val })}
                        options={[
                          { value: 0, label: 'Đúng giờ tan ca' },
                          { value: 5, label: '5 phút sau tan ca' },
                          { value: 10, label: '10 phút sau tan ca' },
                          { value: 15, label: '15 phút sau tan ca' },
                          { value: 30, label: '30 phút sau tan ca' },
                          { value: 60, label: '60 phút sau tan ca' },
                        ]}
                      />
                    </div>
                  )}

                  {custom.timingMode === 'fixed_time' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Giờ gửi tin nhắn cố định:</span>
                      <input
                        type="time"
                        value={custom.fixedTime || '12:00'}
                        onChange={(e) => updateCustomNotification(custom.id, { fixedTime: e.target.value })}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-700 focus:outline-none focus:border-brand-600"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Mẫu tin nhắn Telegram:
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleEmojiPicker(custom.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 cursor-pointer"
                      >
                        <Smile className="w-3.5 h-3.5" />
                        <span>{showEmojiPicker[custom.id] ? 'Ẩn Icon run.vn' : '😃 Bật Icon run.vn'}</span>
                      </button>
                    </div>

                    {showEmojiPicker[custom.id] && (
                      <div className="mb-2">
                        <EmojiPickerBar onSelectEmoji={(emo) => appendCustomTag(custom.id, emo)} />
                      </div>
                    )}

                    <AutoResizeTextarea
                      value={custom.template || ''}
                      onChange={(e) => updateCustomNotification(custom.id, { template: e.target.value })}
                      placeholder="Nhập mẫu tin nhắn tùy chỉnh..."
                    />

                    <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Từ khóa:</span>
                        {['{Ca}', '{ThờiGian}', '{ĐịaĐiểm}', '{GhiChú}'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => appendCustomTag(custom.id, tag)}
                            className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={testingKey === custom.id}
                          onClick={() => handleTestSend(custom.id, custom.template || '')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {testingKey === custom.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>🧪 Gửi thử Telegram</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* Add New Custom Notification Card Button */}
        <button
          type="button"
          onClick={addCustomNotification}
          className="w-full py-3 px-4 bg-white hover:bg-brand-50/50 border-2 border-dashed border-brand-200 hover:border-brand-400 rounded-2xl text-brand-700 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm thẻ thông báo tùy chỉnh mới</span>
        </button>
      </div>
    </div>
  );
};
