'use client';
import React from 'react';
import { Clock, MapPin, User, Building2, BookOpen } from 'lucide-react';
import { StudyClassItem } from '@/types/study';
import { Card } from './ui/Card';

interface StudyCardProps {
  item: StudyClassItem;
}

export const StudyCard: React.FC<StudyCardProps> = ({ item }) => {
  // Shorten campus string to prevent overflowing
  const shortCampus = item.campus
    ? item.campus.replace(/\s*-\s*Thủ Đức/i, '').replace(/\s*-\s*Quận\s*\d+/i, '').trim()
    : 'HUB';

  // Shorten period e.g. "Tiết 6-10" -> "T6-10"
  const shortPeriod = item.period ? item.period.replace(/^Tiết\s+/i, 'T') : '';

  return (
    <Card className="p-3.5 mb-2.5 relative overflow-hidden group hover:border-indigo-400/40 transition-all shadow-xs rounded-2xl border-indigo-100/70 bg-white/95">
      {/* Row 1: Time, Period, Room, Credits */}
      <div className="flex items-center justify-between gap-1.5 mb-2 whitespace-nowrap overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-indigo-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{item.time}</span>
          </span>

          {shortPeriod && (
            <span className="bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              {shortPeriod}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap">
            <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
            <span>{item.room}</span>
          </span>

          <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
            {item.credits} TC
          </span>
        </div>
      </div>

      {/* Row 2: Course Name (Single Line, Truncate) */}
      <div className="flex items-center gap-1.5 mb-1.5 overflow-hidden">
        <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <h3
          className="text-sm font-black text-slate-900 leading-none truncate whitespace-nowrap flex-1"
          title={item.name}
        >
          {item.name}
        </h3>
        <span className="text-[10px] font-semibold text-slate-400 shrink-0 whitespace-nowrap">
          {item.courseId}
        </span>
      </div>

      {/* Row 3: Teacher & Campus (Single Line, Truncate, No Wrap) */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium overflow-hidden whitespace-nowrap pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate whitespace-nowrap" title={item.teacher}>
            {item.teacher || 'Chưa xếp GV'}
          </span>
        </div>

        <span className="text-slate-300 shrink-0">•</span>

        <div className="flex items-center gap-1 min-w-0 shrink-0 max-w-[140px] truncate">
          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate whitespace-nowrap text-[10px]" title={item.campus}>
            {shortCampus}
          </span>
        </div>
      </div>
    </Card>
  );
};
