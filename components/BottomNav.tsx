'use client';
import React from 'react';
import { Calendar, Wallet, StickyNote, Receipt, HeartHandshake } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'locket' | 'schedule' | 'salary' | 'notes' | 'expense' | 'notifications' | 'settings';
  onChangeTab: (tab: 'locket' | 'schedule' | 'salary' | 'notes' | 'expense' | 'notifications' | 'settings') => void;
  isChinhan?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, isChinhan }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-surface-border/60 py-2 px-4 sm:px-6 z-40">
      <div className="max-w-md mx-auto flex items-center justify-around">
        <button
          onClick={() => onChangeTab('locket')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'locket'
              ? 'text-purple-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-purple-600 font-medium'
          }`}
        >
          <HeartHandshake className="w-5 h-5" />
          <span className="text-xs">Locket</span>
        </button>

        <button
          onClick={() => onChangeTab('schedule')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'schedule'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Lịch làm</span>
        </button>

        <button
          onClick={() => onChangeTab('salary')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'salary'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs">Bảng lương</span>
        </button>

        <button
          onClick={() => onChangeTab('notes')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'notes'
              ? 'text-brand-600 font-bold scale-105'
              : 'text-surface-textSecondary hover:text-brand-500 font-medium'
          }`}
        >
          <StickyNote className="w-5 h-5" />
          <span className="text-xs">Ghi chú</span>
        </button>

        {isChinhan && (
          <button
            onClick={() => onChangeTab('expense')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
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

