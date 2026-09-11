'use client';
import React, { useState, useEffect } from 'react';
import { RefreshCw, GraduationCap, BookOpen, Layers, Sparkles } from 'lucide-react';
import { StudyScheduleData, StudyClassItem } from '@/types/study';
import { StudyCard } from './StudyCard';
import { DaySelector, getTodayInfo } from './DaySelector';
import { useToast } from './ui/Toast';
import { useAuth } from './AuthProvider';

interface StudyTabProps {
  selectedDay: string;
  selectedDate: string;
  onSelectDay: (dayKey: string, fullDateIso: string) => void;
}

export const StudyTab: React.FC<StudyTabProps> = ({
  selectedDay,
  selectedDate,
  onSelectDay,
}) => {
  const { user } = useAuth();
  const username = user?.username || 'thanhhuong';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [studyData, setStudyData] = useState<StudyScheduleData | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'courses'>('day');

  const fetchStudySchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/study', {
        headers: { 'x-username': username },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStudyData(json.data);
      } else {
        setStudyData(null);
      }
    } catch (err: any) {
      console.error('Fetch study schedule error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudySchedule();
  }, [username]);

  const handleSyncTkb = async () => {
    try {
      setSyncing(true);
      showToast({
        type: 'info',
        title: 'Đang đồng bộ TKB...',
        message: 'Đang kéo dữ liệu thời khóa biểu từ API...',
      });

      const res = await fetch('/api/study/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': username,
        },
      });
      const json = await res.json();

      if (json.success) {
        setStudyData(json.data);
        showToast({
          type: 'success',
          title: 'Đồng bộ thành công! 🎓',
          message: json.message || 'Đã cập nhật dữ liệu lịch học mới nhất.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Đồng bộ thất bại',
          message: json.error || 'Không thể đồng bộ TKB từ máy chủ.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi mạng',
        message: err.message || 'Lỗi kết nối API đồng bộ',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Filter classes for selectedDate
  const currentDayClasses: StudyClassItem[] = React.useMemo(() => {
    if (!studyData || !studyData.weeks || !selectedDate) return [];

    const result: StudyClassItem[] = [];
    Object.values(studyData.weeks).forEach((week) => {
      if (Array.isArray(week.days)) {
        week.days.forEach((day) => {
          if (day.dateIso === selectedDate && Array.isArray(day.classes)) {
            result.push(...day.classes);
          }
        });
      }
    });

    return result.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [studyData, selectedDate]);

  return (
    <div className="space-y-3">
      {/* Student Profile Header & Sync Bar */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-indigo-100 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-slate-900 truncate">
                  {studyData?.student?.name || 'Bùi Thanh Hương'}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200/70 rounded-md shrink-0">
                  {studyData?.student?.className || 'HUB'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {studyData?.student?.semester || 'HK1 (2026 - 2027)'} • {studyData?.student?.totalCredits || 20} TC
              </p>
            </div>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncTkb}
            disabled={syncing}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            title="Đồng bộ lại TKB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{syncing ? 'Đang kéo...' : 'Đồng bộ'}</span>
          </button>
        </div>

        {/* View Switcher Chips */}
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              viewMode === 'day'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Theo ngày</span>
          </button>

          <button
            onClick={() => setViewMode('courses')}
            className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              viewMode === 'courses'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Môn học ({studyData?.courses?.length || 8})</span>
          </button>
        </div>
      </div>

      {viewMode === 'day' ? (
        <>
          {/* Day Selector */}
          <DaySelector
            selectedDay={selectedDay}
            selectedDate={selectedDate}
            onSelectDay={onSelectDay}
          />

          {/* Classes list */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm">
                Đang tải lịch học từ máy chủ...
              </div>
            ) : currentDayClasses.length === 0 ? (
              <div className="text-center py-10 bg-white/80 rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  🎓
                </div>
                <h4 className="text-base font-extrabold text-slate-700">Không có lịch học</h4>
                <p className="text-xs text-slate-400">Ngày này bạn không có tiết học nào tại trường.</p>
              </div>
            ) : (
              currentDayClasses.map((c, idx) => (
                <StudyCard key={`${c.courseId}-${c.time}-${idx}`} item={c} />
              ))
            )}
          </div>
        </>
      ) : (
        /* All Courses List View */
        <div className="space-y-2">
          {studyData?.courses?.map((course) => (
            <div
              key={course.id}
              className="bg-white/95 rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1.5 overflow-hidden whitespace-nowrap">
                <h4 className="text-xs font-black text-slate-900 truncate" title={course.name}>
                  {course.name}
                </h4>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200/60 shrink-0">
                  {course.credits} TC
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium overflow-hidden whitespace-nowrap">
                <span className="truncate">GV: {course.teacher || 'Chưa xếp'}</span>
                <span className="text-slate-400 shrink-0 text-[10px]">{course.classCode}</span>
              </div>

              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 overflow-hidden whitespace-nowrap">
                <span>{course.startDate} ➔ {course.endDate}</span>
                <span className="text-indigo-600 font-semibold">{course.sessions?.length || 0} buổi/tuần</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
