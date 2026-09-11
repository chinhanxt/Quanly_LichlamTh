'use client';
import React from 'react';
import { Calendar, GraduationCap, Wallet, StickyNote, Receipt } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'schedule' | 'study' | 'salary' | 'notes' | 'expense' | 'notifications' | 'settings';
  onChangeTab: (tab: 'schedule' | 'study' | 'salary' | 'notes' | 'expense' | 'notifications' | 'settings') => void;
  isChinhan?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, isChinhan }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-surface-border/60 py-2 px-3 sm:px-6 z-40">
      <div className="max-w-md mx-auto flex items-center justify-around">

        {/* Tab 1: Lịch làm */}
        <button
          onClick={() => onChangeTab('schedule')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'schedule'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Lịch làm</span>
        </button>

        {/* Tab 2: Lịch học (Đứng kế Tab 1 Lịch làm) */}
        <button
          onClick={() => onChangeTab('study')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'study'
              ? 'text-indigo-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-indigo-600 font-medium'
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-xs">Lịch học</span>
        </button>

        {/* Tab 3: Bảng lương */}
        <button
          onClick={() => onChangeTab('salary')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'salary'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs">Bảng lương</span>
        </button>

        {/* Tab 4: Ghi chú */}
        <button
          onClick={() => onChangeTab('notes')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'notes'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <StickyNote className="w-5 h-5" />
          <span className="text-xs">Ghi chú</span>
        </button>

        {/* Tab 5 (Optional for Chinhan): Chi tiêu */}
        {isChinhan && (
          <button
            onClick={() => onChangeTab('expense')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
              activeTab === 'expense'
                ? 'text-brand-600 font-bold scale-105'
                : 'text-surface-textSecondary hover:text-brand-500 font-medium'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-xs">Chi tiêu</span>
          </button>
        )}
      </div>
    </div>
  );
};

