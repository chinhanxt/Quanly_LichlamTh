'use client';
import React from 'react';
import { Clock, MapPin, Edit3, Trash2, Bell, BellOff, Tag } from 'lucide-react';
import { ScheduleItem } from '@/types/schedule';
import { Card } from './ui/Card';
import { format24hRange } from '@/lib/time-formatter';
import { getCleanShiftCodeName } from '@/lib/ocr-parser';

interface ScheduleCardProps {
  item: ScheduleItem;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({ item, onEdit, onDelete }) => {
  const rawNote = item.note ? item.note.replace(/^Ca\s+/i, '') : '';
  const displayNote = item.note ? getCleanShiftCodeName(rawNote, item.startTime, item.endTime) : '';

  // Check if displayNote just duplicates time range (e.g. "Ca 07:30-11:30")
  const isTimeDuplicate = displayNote && displayNote.toLowerCase().includes(item.startTime);

  return (
    <Card className="p-3.5 mb-2.5 relative overflow-hidden group hover:border-brand-500/30 transition-all shadow-xs rounded-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Header Row: Time Range Badge + Telegram Status Pill */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="bg-brand-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs shrink-0">
              <Clock className="w-3 h-3" />
              {format24hRange(item.startTime, item.endTime)}
            </span>

            {item.reminderEnabled ? (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Bell className="w-3 h-3 text-emerald-600" /> Tự động báo Telegram
              </span>
            ) : (
              <span className="text-slate-500 bg-slate-100 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <BellOff className="w-3 h-3 text-slate-400" /> Tắt thông báo
              </span>
            )}
          </div>

          {/* Shift Subject Title */}
          <h3 className="text-sm font-black text-slate-900 leading-tight mb-1 truncate">{item.subject}</h3>

          {/* Location */}
          {item.location && (
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span className="truncate">{item.location}</span>
            </p>
          )}

          {/* Compact Shift Note Badge (B18 / CTV...) - Hide if just duplicates time */}
          {displayNote && !isTimeDuplicate && (
            <div className="mt-1 inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-900 px-2 py-0.5 rounded-lg text-[10px] font-bold">
              <Tag className="w-3 h-3 text-brand-600" />
              <span className="truncate">{displayNote}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Edit & Delete */}
        <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-0.5">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Sửa ca làm"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Xóa ca làm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
};
