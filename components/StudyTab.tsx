'use client';
import React, { useState, useEffect } from 'react';
import { RefreshCw, GraduationCap } from 'lucide-react';
import { StudyScheduleData, StudyClassItem } from '@/types/study';
import { StudyCard } from './StudyCard';
import { DaySelector } from './DaySelector';
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
      {/* Student Profile Header - Compact & Sleek */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-indigo-100/80 px-3 py-2 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <h3 className="text-xs font-black text-slate-900 truncate">
                  {studyData?.student?.name || 'Bùi Thanh Hương'}
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-md shrink-0">
                  {studyData?.student?.className || 'HUB'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {studyData?.student?.semester || 'HK1 (2026 - 2027)'} • {studyData?.student?.totalCredits || 20} TC
              </p>
            </div>
          </div>

          {/* Compact Sync Button */}
          <button
            onClick={handleSyncTkb}
            disabled={syncing}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            title="Đồng bộ lại TKB"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{syncing ? 'Đang kéo...' : 'Đồng bộ'}</span>
          </button>
        </div>
      </div>

      {/* Day Selector with custom Title "Lịch Học" */}
      <DaySelector
        title="Lịch Học"
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
    </div>
  );
};
