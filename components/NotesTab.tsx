'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Calendar,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ScheduleItem, ScheduleSettings, UserNote } from '@/types/schedule';
import { formatLocalDateIso } from '@/lib/salary-calculator';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';

interface NotesTabProps {
  settings: ScheduleSettings;
  onSaveSettings: (s: ScheduleSettings) => Promise<void>;
  items?: ScheduleItem[];
}

export function formatTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const dd = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${hh}:${mm} - ${dd}/${month}/${yyyy}`;
}

export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateDisplayLong(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yyyy = Number(parts[0]);
    const mm = Number(parts[1]) - 1;
    const dd = Number(parts[2]);
    const d = new Date(yyyy, mm, dd);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = dayNames[d.getDay()] || '';
    const formattedDD = String(dd).padStart(2, '0');
    const formattedMM = String(mm + 1).padStart(2, '0');
    return `${dayName}, ngày ${formattedDD}/${formattedMM}/${yyyy}`;
  }
  return dateStr;
}

export function getShiftBadgeForDate(iso: string, items: ScheduleItem[]): { code: string; hours: string } {
  const dayShifts = items.filter((it) => it.date === iso);

  if (dayShifts.length >= 2) {
    return { code: 'Full', hours: '2 ca' };
  }

  if (dayShifts.length === 1) {
    const s = dayShifts[0];
    const isSang = s.startTime.startsWith('07') || s.startTime.startsWith('08') || s.subject.includes('Sáng');
    const isChieu = s.startTime.startsWith('13') || s.startTime.startsWith('12') || s.subject.includes('Chiều');
    if (isSang) return { code: 'Sáng', hours: '1 ca' };
    if (isChieu) return { code: 'Chiều', hours: '1 ca' };
    const shiftName = s.note || s.subject || 'Làm';
    const code = shiftName.length > 6 ? shiftName.substring(0, 5) : shiftName;
    return { code, hours: '1 ca' };
  }

  return { code: 'OFF', hours: '0 ca' };
}

export const NotesTab: React.FC<NotesTabProps> = ({ settings, onSaveSettings, items = [] }) => {
  const [notes, setNotes] = useState<UserNote[]>(settings.userNotes || []);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Form states
  const [content, setContent] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetShiftCode, setTargetShiftCode] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Custom Calendar Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  const { showToast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNotes(settings.userNotes || []);
  }, [settings.userNotes]);

  const isChinhan = settings.username === 'chinhan' || settings.employeeName?.toLowerCase().includes('nhân');

  // Calculate Current Week Days (Mon-Sun) for 7-Column Pill Grid (matching exact user design)
  const currentWeekDays = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMon);

    const days = [];
    const dayNamesVi = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const shortNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = formatLocalDateIso(d);
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const dayIndex = d.getDay();

      const shiftInfo = getShiftBadgeForDate(iso, items);
      const todayIso = formatLocalDateIso(now);

      days.push({
        iso,
        dateFormatted: `${dayNum}/${monthNum}`,
        dayNameVi: dayNamesVi[dayIndex === 0 ? 6 : dayIndex - 1],
        shortName: shortNames[dayIndex === 0 ? 6 : dayIndex - 1],
        shiftCode: shiftInfo.code,
        hours: shiftInfo.hours,
        isToday: iso === todayIso,
        isPast: iso < todayIso,
      });
    }

    return days;
  }, [isChinhan, items]);

  // Generate 35-42 days for custom in-app calendar grid modal
  const calendarGridDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 for Monday

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - startOffset);

    const days = [];
    const todayIso = formatLocalDateIso(new Date());

    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = formatLocalDateIso(d);
      const dayNum = d.getDate();
      const isCurrentMonth = d.getMonth() === month;

      days.push({
        d,
        iso,
        dayNum,
        isCurrentMonth,
        isToday: iso === todayIso,
        isPast: iso < todayIso,
      });
    }

    return days;
  }, [calendarViewDate]);

  const updateNotes = (nextNotes: UserNote[]) => {
    setNotes(nextNotes);
    setSavingStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSaveSettings({
          ...settings,
          userNotes: nextNotes,
        });
        setSavingStatus('saved');
        setTimeout(() => setSavingStatus('idle'), 2500);
      } catch (err: any) {
        setSavingStatus('idle');
        showToast({
          type: 'error',
          title: 'Lưu tự động thất bại',
          message: err.message || 'Không thể lưu ghi chú vào cơ sở dữ liệu',
        });
      }
    }, 400);
  };

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast({
        type: 'error',
        title: 'Nội dung trống',
        message: 'Vui lòng nhập nội dung ghi chú!',
      });
      return;
    }

    const todayIso = formatLocalDateIso(new Date());
    if (targetDate && targetDate < todayIso) {
      showToast({
        type: 'error',
        title: 'Ngày không hợp lệ',
        message: 'Không thể chọn hoặc lưu ghi chú cho ngày trong quá khứ!',
      });
      return;
    }

    if (editingNoteId) {
      const nextNotes = notes.map((n) =>
        n.id === editingNoteId
          ? {
              ...n,
              content: content.trim(),
              targetDate: targetDate || undefined,
              targetShiftCode: targetShiftCode || undefined,
            }
          : n
      );
      updateNotes(nextNotes);
      setEditingNoteId(null);
      showToast({
        type: 'success',
        title: 'Đã cập nhật ghi chú',
        message: 'Ghi chú đã được lưu thành công.',
      });
    } else {
      const now = new Date();
      const newNote: UserNote = {
        id: `note_${Date.now()}`,
        content: content.trim(),
        createdAt: now.toISOString(),
        createdFormatted: formatTimestamp(now),
        targetDate: targetDate || undefined,
        targetShiftCode: targetShiftCode || undefined,
        completed: false,
      };
      const nextNotes = [newNote, ...notes];
      updateNotes(nextNotes);
      showToast({
        type: 'success',
        title: 'Đã tạo ghi chú mới',
        message: 'Ghi chú đã được lưu vào hệ thống.',
      });
    }

    setContent('');
    setTargetDate('');
    setTargetShiftCode('');
  };

  const handleEditClick = (note: UserNote) => {
    setEditingNoteId(note.id);
    setContent(note.content);
    setTargetDate(note.targetDate || '');
    setTargetShiftCode(note.targetShiftCode || '');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setContent('');
    setTargetDate('');
    setTargetShiftCode('');
  };

  const handleToggleComplete = (id: string) => {
    const nextNotes = notes.map((n) =>
      n.id === id ? { ...n, completed: !n.completed } : n
    );
    updateNotes(nextNotes);
  };

  const handleDeleteNote = (id: string) => {
    const nextNotes = notes.filter((n) => n.id !== id);
    if (editingNoteId === id) {
      handleCancelEdit();
    }
    updateNotes(nextNotes);
    showToast({
      type: 'info',
      title: 'Đã xóa ghi chú',
      message: 'Ghi chú đã được xóa thành công.',
    });
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Note Creation / Editing Input Form Card */}
      <Card className="space-y-4 border-brand-100 bg-white shadow-soft">
        <form onSubmit={handleSubmitNote} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-surface-textPrimary flex items-center gap-1.5">
              {editingNoteId ? (
                <>
                  <Edit3 className="w-4 h-4 text-brand-600" />
                  Sửa Ghi Chú
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-brand-600" />
                  Thêm Ghi Chú Mới
                </>
              )}
            </h3>

            {/* Auto-save status indicator */}
            <div className="text-xs font-semibold flex items-center gap-2">
              {savingStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Đang lưu...
                </span>
              )}
              {savingStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> ✓ Đã lưu
                </span>
              )}
              {savingStatus === 'idle' && notes.length > 0 && (
                <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <Check className="w-3 h-3 text-emerald-500" /> ✓ Đã lưu
                </span>
              )}

              {editingNoteId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Hủy sửa
                </button>
              )}
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isChinhan
                  ? 'Nhập nội dung ghi chú (ví dụ: Chuẩn bị tài liệu báo cáo Viện AI, nộp bảng công nhật...)'
                  : 'Nhập nội dung ghi chú (ví dụ: Mang đồng phục mới, quẹt thẻ điểm danh, đổi ca cho chị Hằng...)'
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white resize-none transition-all"
            />
          </div>

          {/* Compact Sleek DatePicker Trigger Control */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="block text-xs font-extrabold text-slate-800 flex items-center justify-between">
              <span>📅 Ngày áp dụng ghi chú:</span>
              {targetDate && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetDate('');
                    setTargetShiftCode('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  ✕ Bỏ gán ngày
                </button>
              )}
            </label>

            {/* Compact Date Button */}
            <button
              type="button"
              onClick={() => setShowCalendarModal(true)}
              className={`w-full py-2.5 px-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                targetDate
                  ? 'bg-brand-50/80 border-brand-300 text-brand-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Calendar className={`w-4 h-4 shrink-0 ${targetDate ? 'text-brand-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {targetDate ? formatDateDisplayLong(targetDate) : 'Chưa chọn ngày (Áp dụng chung)'}
                </span>
              </div>

              <span className="text-[11px] font-bold text-brand-600 bg-brand-100/80 px-2.5 py-1 rounded-lg shrink-0">
                {targetDate ? 'Đổi Lịch 📅' : 'Mở Lịch 📅'}
              </span>
            </button>
          </div>

          {/* Exact 7-Column Grid Pill Layout (Mon-Sun, No scrollbar, exact match with uploaded image design) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-500 block">
              ⚡ Hoặc chọn nhanh ca làm tuần này:
            </label>

            {/* 7 Columns Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {currentWeekDays.map((day) => {
                const isSelected = targetDate === day.iso;
                return (
                  <div key={day.iso} className="flex flex-col items-center gap-1">
                    {/* Header Label: T2, T3, T4... */}
                    <span
                      className={`text-[11px] font-extrabold tracking-tight ${
                        day.isToday ? 'text-brand-600' : 'text-slate-400'
                      }`}
                    >
                      {day.shortName}
                    </span>

                    {/* Pill Card */}
                    <button
                      type="button"
                      disabled={day.isPast}
                      onClick={() => {
                        if (day.isPast) return;
                        if (isSelected) {
                          setTargetDate('');
                          setTargetShiftCode('');
                        } else {
                          setTargetDate(day.iso);
                          setTargetShiftCode(day.shiftCode === 'OFF' ? '' : day.shiftCode);
                        }
                      }}
                      className={`w-full py-2.5 px-0.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        day.isPast
                          ? 'bg-slate-100/60 border-slate-200/50 text-slate-300 opacity-40 cursor-not-allowed pointer-events-none'
                          : isSelected
                          ? 'bg-brand-600 text-white border-brand-600 shadow-md scale-105 font-bold ring-2 ring-brand-400/30 cursor-pointer'
                          : day.isToday
                          ? 'bg-sky-50/80 border-sky-200 text-slate-900 shadow-2xs hover:bg-sky-100 cursor-pointer'
                          : 'bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300 cursor-pointer'
                      }`}
                    >
                      {/* Date (06/07) */}
                      <span
                        className={`text-[11px] font-black tracking-tighter ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {day.dateFormatted}
                      </span>

                      {/* Shift Code (OFF, B18...) */}
                      <span
                        className={`text-[10px] font-extrabold uppercase ${
                          isSelected
                            ? 'text-white/90'
                            : day.shiftCode === 'OFF'
                            ? 'text-slate-400'
                            : 'text-brand-700'
                        }`}
                      >
                        {day.shiftCode}
                      </span>

                      {/* Hours (0h, 4h, 7h) */}
                      <span
                        className={`text-[9px] font-medium ${
                          isSelected ? 'text-brand-100' : 'text-slate-300'
                        }`}
                      >
                        {day.hours}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {editingNoteId ? (
                <>
                  <Check className="w-4 h-4" /> Lưu Cập Nhật
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Tạo Ghi Chú Nhanh
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Saved Notes List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-800">
            Danh sách ghi chú ({notes.length})
          </h3>
          <span className="text-xs text-slate-400">
            {notes.filter((n) => n.completed).length}/{notes.length} đã hoàn thành
          </span>
        </div>

        {notes.length === 0 ? (
          <Card className="text-center py-8 bg-slate-50/60 border-dashed border-slate-200">
            <StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Chưa có ghi chú nào</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Gõ ghi chú vào ô trên và chạm chọn ngày để lưu nhắc nhở nhé!
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                  note.completed
                    ? 'bg-slate-50/70 border-slate-200/60 opacity-60'
                    : 'bg-white border-slate-200 shadow-xs hover:border-brand-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(note.id)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                        note.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-brand-500 bg-white'
                      }`}
                      title={note.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu đã hoàn thành'}
                    >
                      {note.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-1 flex-1">
                      <p
                        className={`text-xs font-bold leading-relaxed ${
                          note.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-800'
                        }`}
                      >
                        {note.content}
                      </p>

                      {/* Timestamp & Target Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Tạo lúc: {note.createdFormatted}
                        </span>

                        {note.targetDate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-100">
                            📅 {formatDateDisplay(note.targetDate)}
                          </span>
                        )}

                        {note.targetShiftCode && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            ⏰ Ca {note.targetShiftCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditClick(note)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                      title="Sửa ghi chú"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa ghi chú"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CUSTOM BEAUTIFUL IN-APP CALENDAR MODAL */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 space-y-4 border border-brand-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                Bộ Chọn Lịch Tuỳ Chỉnh
              </h3>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month & Year Navigation Control Pill */}
            <div className="flex items-center justify-between bg-slate-100/80 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  const prevM = new Date(calendarViewDate);
                  prevM.setMonth(prevM.getMonth() - 1);
                  setCalendarViewDate(prevM);
                }}
                className="p-2 hover:bg-white text-slate-700 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-black text-slate-800">
                Tháng {String(calendarViewDate.getMonth() + 1).padStart(2, '0')} / {calendarViewDate.getFullYear()}
              </span>

              <button
                type="button"
                onClick={() => {
                  const nextM = new Date(calendarViewDate);
                  nextM.setMonth(nextM.getMonth() + 1);
                  setCalendarViewDate(nextM);
                }}
                className="p-2 hover:bg-white text-slate-700 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w) => (
                <span key={w} className="text-[11px] font-black text-brand-600">
                  {w}
                </span>
              ))}
            </div>

            {/* 35-Day Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarGridDays.map((day) => {
                const isSelected = targetDate === day.iso;
                const shiftBadge = getShiftBadgeForDate(day.iso, items);
                const isOff = shiftBadge.code === 'OFF';

                let badgeStyle = 'bg-slate-200 text-slate-600';
                if (shiftBadge.code === 'Full') {
                  badgeStyle = isSelected ? 'bg-white text-purple-700 font-black' : 'bg-purple-600 text-white';
                } else if (shiftBadge.code === 'Sáng') {
                  badgeStyle = isSelected ? 'bg-white text-amber-700 font-black' : 'bg-amber-500 text-white';
                } else if (shiftBadge.code === 'Chiều') {
                  badgeStyle = isSelected ? 'bg-white text-sky-700 font-black' : 'bg-sky-500 text-white';
                } else if (!isOff) {
                  badgeStyle = isSelected ? 'bg-white text-brand-700 font-black' : 'bg-brand-600 text-white';
                }

                return (
                  <button
                    key={day.iso}
                    type="button"
                    disabled={day.isPast}
                    onClick={() => {
                      if (day.isPast) return;
                      setTargetDate(day.iso);
                      setTargetShiftCode(isOff ? '' : shiftBadge.code);
                      setShowCalendarModal(false);
                    }}
                    className={`min-h-[48px] w-full p-1 rounded-2xl transition-all flex flex-col items-center justify-between border ${
                      day.isPast
                        ? 'text-slate-300/50 opacity-30 cursor-not-allowed pointer-events-none bg-slate-50 border-transparent'
                        : isSelected
                        ? 'bg-brand-600 text-white shadow-md font-black scale-105 border-brand-600 ring-2 ring-brand-300 cursor-pointer'
                        : day.isToday
                        ? 'bg-brand-50 text-brand-900 font-extrabold border-brand-300 shadow-2xs hover:bg-brand-100 cursor-pointer'
                        : day.isCurrentMonth
                        ? 'bg-slate-50/90 border-slate-200/80 text-slate-800 hover:bg-slate-100 cursor-pointer'
                        : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <span className={`text-[11px] leading-none font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {day.dayNum}
                    </span>

                    {!isOff ? (
                      <span className={`text-[9px] leading-tight font-extrabold px-1 py-0.5 rounded-md transition-colors ${badgeStyle}`}>
                        {shiftBadge.code}
                      </span>
                    ) : (
                      <span className="text-[9px] leading-tight text-slate-300 font-medium">OFF</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setTargetDate('');
                  setTargetShiftCode('');
                  setShowCalendarModal(false);
                }}
                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                ✕ Bỏ chọn ngày
              </button>

              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
