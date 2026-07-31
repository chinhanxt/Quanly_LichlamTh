'use client';

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Trash2, 
  Key, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Send,
  Sliders,
  DollarSign
} from 'lucide-react';
import { ExpenseItem, ScheduleSettings } from '@/types/schedule';
import { useToast } from '@/components/ui/Toast';

function getWeeksForMonth(year: number, month: number) {
  const weeks = [];
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);

  let curr = new Date(firstDayOfMonth);
  const dayOfW = curr.getDay();
  const distToMon = (dayOfW + 6) % 7;
  curr.setDate(curr.getDate() - distToMon);

  while (curr <= lastDayOfMonth) {
    const weekStart = new Date(curr);
    const weekEnd = new Date(curr);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const days = [];
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      days.push({
        dateIso: iso,
        dayLabel: `${dd}/${mm}`,
        dayOfWeek: dayLabels[i],
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() + 1 === month,
      });
    }

    const startDd = String(weekStart.getDate()).padStart(2, '0');
    const startMm = String(weekStart.getMonth() + 1).padStart(2, '0');
    const endDd = String(weekEnd.getDate()).padStart(2, '0');
    const endMm = String(weekEnd.getMonth() + 1).padStart(2, '0');

    weeks.push({
      label: `Tuần từ ${startDd}/${startMm} đến ${endDd}/${endMm}`,
      startDateIso: weekStart.toISOString().split('T')[0],
      endDateIso: weekEnd.toISOString().split('T')[0],
      days,
    });

    curr.setDate(curr.getDate() + 7);
  }

  return weeks;
}

interface ExpenseTabProps {
  settings: ScheduleSettings;
  onSaveSettings: (newSettings: Partial<ScheduleSettings>) => Promise<void>;
}

export const ExpenseTab: React.FC<ExpenseTabProps> = ({ settings, onSaveSettings }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawInput, setRawInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'Thu' | 'Chi'>('all');
  const [autoAddK, setAutoAddK] = useState<boolean>(true);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleQuickAdd = (keyword: string) => {
    setRawInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return keyword + ' ';
      if (trimmed.endsWith(',')) return trimmed + ' ' + keyword + ' ';
      return trimmed + ', ' + keyword + ' ';
    });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 50);
  };

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [groqKey, setGroqKey] = useState(settings.groqApiKey || '');
  const [groqModel, setGroqModel] = useState(settings.groqModel || 'llama-3.3-70b-versatile');
  const [sheetUrl, setSheetUrl] = useState(settings.expenseGoogleSheetUrl || 'https://docs.google.com/spreadsheets/d/1XDHEr5jhqppyuxMu9posBwjNQj_6lddZCSmqBv2SAYk/edit?gid=0#gid=0');
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.expenseAppsScriptUrl || '');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expense', {
        headers: { 'x-username': 'chinhan' }
      });
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
      }
    } catch (e) {
      console.error('Fetch expenses error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleParseAndSave = async () => {
    if (!rawInput.trim()) {
      showToast({ message: 'Vui lòng nhập nội dung thu/chi!', type: 'error' });
      return;
    }

    try {
      setIsParsing(true);
      const d = new Date();
      const clientDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const res = await fetch('/api/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': 'chinhan'
        },
        body: JSON.stringify({ rawText: rawInput, autoAddK, clientDate: clientDateStr }),
      });

      const json = await res.json();
      if (json.success) {
        showToast({ message: json.message || 'Ghi sổ thành công!', type: 'success' });
        setRawInput('');
        if (json.data && Array.isArray(json.data)) {
          setItems(prev => [...json.data, ...prev]);
        } else {
          fetchExpenses();
        }
      } else {
        showToast({ message: json.error || 'Không thể bóc tách thu/chi', type: 'error' });
      }
    } catch (err: any) {
      showToast({ message: 'Lỗi gửi dữ liệu: ' + err.message, type: 'error' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/expense?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-username': 'chinhan' }
      });
      const json = await res.json();
      if (json.success) {
        showToast({ message: 'Đã xóa giao dịch!', type: 'success' });
        setItems(prev => prev.filter(i => i.id !== id));
      }
    } catch (e) {
      showToast({ message: 'Lỗi xóa giao dịch', type: 'error' });
    }
  };

  const handleTestKey = async () => {
    try {
      setIsTestingKey(true);
      const res = await fetch('/api/expense/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: groqKey, model: groqModel }),
      });

      const json = await res.json();
      if (json.success) {
        showToast({ message: '✅ Groq API Key hoạt động hoàn hảo!', type: 'success' });
      } else {
        showToast({ message: '❌ Key lỗi: ' + json.error, type: 'error' });
      }
    } catch (e: any) {
      showToast({ message: '❌ Lỗi kết nối Groq API', type: 'error' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveExpenseSettings = async () => {
    try {
      setIsSavingSettings(true);
      await onSaveSettings({
        groqApiKey: groqKey,
        groqModel,
        expenseGoogleSheetUrl: sheetUrl,
        expenseAppsScriptUrl: appsScriptUrl,
      });
      showToast({ message: 'Đã lưu cấu hình Chi tiêu cho tài khoản Chí Nhân!', type: 'success' });
      setShowSettings(false);
    } catch (e) {
      showToast({ message: 'Không thể lưu cấu hình', type: 'error' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Calculations
  const totalIncome = items
    .filter(i => i.type === 'Thu')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalExpense = items
    .filter(i => i.type === 'Chi')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  const filteredItems = items.filter(i => {
    if (filterType === 'Thu') return i.type === 'Thu';
    if (filterType === 'Chi') return i.type === 'Chi';
    return true;
  });

  const examples = [
    "Sáng phở 40k, ly cafe 25k",
    "Được sếp thưởng 2 củ",
    "Đổ xăng 50k, mua áo 350k",
    "Hôm qua nhận lương 15tr"
  ];

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Settings Toggle Button (Compact) */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition-all ${
            showSettings 
              ? 'bg-brand-50 border-brand-200 text-brand-600' 
              : 'bg-white border-surface-border text-surface-textSecondary hover:text-brand-600 shadow-xs'
          }`}
          title="Cài đặt Groq Key & Google Sheet"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Cài đặt Sheet</span>
        </button>
      </div>

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <div className="bg-white rounded-3xl p-5 border border-brand-100 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-brand-600" /> Cài Đặt Chi Tiêu (Chí Nhân)
            </span>
            <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-semibold">
              Chỉ dùng cho tk chinhan
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Groq API Key</label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Model AI</label>
            <select
              value={groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
              className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Khuyên dùng - Siêu giỏi tiếng Việt)</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Phản hồi cực nhanh)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Google Sheet URL</label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Apps Script Webhook URL (Liên kết Google Sheet)</label>
            <input
              type="text"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-gray-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleTestKey}
              disabled={isTestingKey}
              className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              {isTestingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              Kiểm tra Key
            </button>
            <button
              onClick={handleSaveExpenseSettings}
              disabled={isSavingSettings}
              className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              {isSavingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Lưu Cài Đặt'}
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-emerald-50/80 border border-emerald-100 p-3 rounded-2xl text-center shadow-sm">
          <div className="flex items-center justify-center gap-1 text-emerald-700 text-[11px] font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> Tổng Thu
          </div>
          <div className="text-sm font-extrabold text-emerald-700 mt-1 truncate">
            {totalIncome.toLocaleString('vi-VN')}đ
          </div>
        </div>

        <div className="bg-rose-50/80 border border-rose-100 p-3 rounded-2xl text-center shadow-sm">
          <div className="flex items-center justify-center gap-1 text-rose-700 text-[11px] font-semibold">
            <TrendingDown className="w-3.5 h-3.5" /> Tổng Chi
          </div>
          <div className="text-sm font-extrabold text-rose-700 mt-1 truncate">
            {totalExpense.toLocaleString('vi-VN')}đ
          </div>
        </div>

        <div className={`p-3 rounded-2xl text-center shadow-sm border ${
          balance >= 0 ? 'bg-blue-50/80 border-blue-100 text-blue-700' : 'bg-amber-50/80 border-amber-100 text-amber-700'
        }`}>
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold">
            <DollarSign className="w-3.5 h-3.5" /> Còn Lại
          </div>
          <div className="text-sm font-extrabold mt-1 truncate">
            {balance.toLocaleString('vi-VN')}đ
          </div>
        </div>
      </div>

        {/* Input Form Card */}
      <div className="bg-gradient-to-b from-white to-gray-50/50 rounded-3xl p-4 shadow-sm border border-brand-100/60 space-y-3.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Nhập Văn Bản Thu/Chi
          </label>
          <button
            type="button"
            onClick={() => setAutoAddK(!autoAddK)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs select-none ${
              autoAddK 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
            title="Bật/Tắt tự động thêm 'k' sau số tiền (Ví dụ: Nhập 45 -> 45k)"
          >
            <span className={`w-2 h-2 rounded-full ${autoAddK ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
            <span>Tự thêm "k" (45 ➔ 45k)</span>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={autoAddK ? "Ví dụ: Ăn 45, Uống 30, Đổ xăng 50..." : "Ví dụ: Ăn 45k, Uống 30k, Đổ xăng 50k..."}
          className="w-full h-24 p-3 border border-gray-200/80 rounded-2xl text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white outline-none transition-all resize-none shadow-xs"
        />

        {/* Quick Shortcut Buttons */}
        <div>
          <div className="text-[10px] font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
            <span>⚡ Nút bấm nhanh (Bấm rồi tự điền số tiền):</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => handleQuickAdd('Ăn')}
              className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <span>🍲</span>
              <span>Ăn</span>
            </button>
            <button
              onClick={() => handleQuickAdd('Uống')}
              className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <span>☕</span>
              <span>Uống</span>
            </button>
            <button
              onClick={() => handleQuickAdd('Đổ xăng')}
              className="py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <span>⛽</span>
              <span>Đổ xăng</span>
            </button>
            <button
              onClick={() => handleQuickAdd('Đi chợ')}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <span>🛒</span>
              <span>Đi chợ</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleParseAndSave}
          disabled={isParsing || !rawInput.trim()}
          className="w-full py-3 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-brand-500/25 disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99]"
        >
          {isParsing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang gửi...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Gửi thu/chi</span>
            </>
          )}
        </button>
      </div>

      {/* Month Navigation & Filter Header */}
      <div className="bg-white rounded-3xl p-4 border border-surface-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear(prev => prev - 1);
                } else {
                  setSelectedMonth(prev => prev - 1);
                }
                setSelectedDayIso(null);
              }}
              className="p-1.5 hover:bg-gray-100 rounded-xl transition-all text-gray-600 cursor-pointer"
            >
              ◀
            </button>
            <span className="font-extrabold text-sm text-gray-800">
              Tháng {String(selectedMonth).padStart(2, '0')}/{selectedYear}
            </span>
            <button
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear(prev => prev + 1);
                } else {
                  setSelectedMonth(prev => prev + 1);
                }
                setSelectedDayIso(null);
              }}
              className="p-1.5 hover:bg-gray-100 rounded-xl transition-all text-gray-600 cursor-pointer"
            >
              ▶
            </button>
          </div>

          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterType === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('Thu')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterType === 'Thu' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Thu
            </button>
            <button
              onClick={() => setFilterType('Chi')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterType === 'Chi' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Chi
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Cards Grouped History */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-xs text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" /> Đang tải lịch sử chi tiêu...
          </div>
        ) : (
          (() => {
            const weeks = getWeeksForMonth(selectedYear, selectedMonth);

            return weeks.map((week, wIdx) => {
              const weekItems = filteredItems.filter(
                (i) => i.date >= week.startDateIso && i.date <= week.endDateIso
              );

              const weekIncome = weekItems
                .filter((i) => i.type === 'Thu')
                .reduce((s, i) => s + (i.amount || 0), 0);

              const weekExpense = weekItems
                .filter((i) => i.type === 'Chi')
                .reduce((s, i) => s + (i.amount || 0), 0);

              const weekNet = weekIncome - weekExpense;

              return (
                <div
                  key={wIdx}
                  className="bg-white rounded-3xl p-4 border border-surface-border shadow-xs space-y-3"
                >
                  {/* Week Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                      <span className="font-extrabold text-xs text-gray-800">
                        {week.label}
                      </span>
                    </div>

                    <div className="text-xs font-bold">
                      <span className="text-gray-500">{weekItems.length} mục</span>
                      <span className="text-gray-300 mx-1">•</span>
                      <span
                        className={
                          weekNet > 0
                            ? 'text-emerald-600 font-extrabold'
                            : weekNet < 0
                            ? 'text-rose-600 font-extrabold'
                            : 'text-gray-400'
                        }
                      >
                        {weekNet > 0 ? '+' : ''}
                        {weekNet.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>

                  {/* 7 Days Grid (T2 .. CN) */}
                  <div className="grid grid-cols-7 gap-1">
                    {week.days.map((day, dIdx) => {
                      const dayItems = filteredItems.filter((i) => i.date === day.dateIso);
                      const dayIncome = dayItems
                        .filter((i) => i.type === 'Thu')
                        .reduce((s, i) => s + (i.amount || 0), 0);
                      const dayExpense = dayItems
                        .filter((i) => i.type === 'Chi')
                        .reduce((s, i) => s + (i.amount || 0), 0);
                      const dayNet = dayIncome - dayExpense;

                      const isSelected = selectedDayIso === day.dateIso;

                      let badgeText = '';
                      let badgeStyle = '';

                      if (dayItems.length > 0) {
                        if (dayExpense > 0 && dayIncome === 0) {
                          const formatted = dayExpense >= 1000000 
                            ? `${(dayExpense / 1000000).toFixed(1).replace('.0', '')}M` 
                            : `${Math.round(dayExpense / 1000)}k`;
                          badgeText = `-${formatted}`;
                          badgeStyle = 'bg-rose-500 text-white font-bold';
                        } else if (dayIncome > 0 && dayExpense === 0) {
                          const formatted = dayIncome >= 1000000 
                            ? `${(dayIncome / 1000000).toFixed(1).replace('.0', '')}M` 
                            : `${Math.round(dayIncome / 1000)}k`;
                          badgeText = `+${formatted}`;
                          badgeStyle = 'bg-emerald-500 text-white font-bold';
                        } else {
                          const absVal = Math.abs(dayNet);
                          const formatted = absVal >= 1000000 
                            ? `${(absVal / 1000000).toFixed(1).replace('.0', '')}M` 
                            : `${Math.round(absVal / 1000)}k`;
                          badgeText = dayNet >= 0 ? `+${formatted}` : `-${formatted}`;
                          badgeStyle = dayNet >= 0 ? 'bg-emerald-500 text-white font-bold' : 'bg-rose-500 text-white font-bold';
                        }
                      }

                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (dayItems.length > 0) {
                              setSelectedDayIso(isSelected ? null : day.dateIso);
                            }
                          }}
                          className={`flex flex-col items-center justify-between py-2 px-0.5 rounded-2xl border text-center min-h-[58px] transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/50 shadow-sm ring-2 ring-brand-400/30'
                              : day.isCurrentMonth
                              ? 'border-gray-100 hover:border-brand-200 bg-white'
                              : 'border-transparent opacity-40 bg-gray-50/50'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-gray-400">
                            {day.dayOfWeek}
                          </span>

                          <span className="text-[11px] font-extrabold text-gray-700">
                            {day.dayLabel}
                          </span>

                          {dayItems.length > 0 ? (
                            <span
                              className={`text-[9px] px-0.5 py-0.5 rounded-lg w-full truncate whitespace-nowrap overflow-hidden leading-tight block mt-0.5 ${badgeStyle}`}
                            >
                              {badgeText}
                            </span>
                          ) : (
                            <span className="h-4"></span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Day Details Expansion */}
                  {selectedDayIso &&
                    week.days.some((d) => d.dateIso === selectedDayIso) && (
                      <div className="pt-2 border-t border-gray-100 space-y-2 animate-in fade-in duration-200">
                        <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                          <span>
                            Chi tiết ngày {selectedDayIso.split('-').reverse().join('/')}:
                          </span>
                          <button
                            onClick={() => setSelectedDayIso(null)}
                            className="text-[10px] text-gray-400 hover:text-gray-600"
                          >
                            ✕ Đóng
                          </button>
                        </div>

                        {filteredItems
                          .filter((i) => i.date === selectedDayIso)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="bg-gray-50/80 rounded-2xl p-3 border border-gray-200/60 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                                    item.type === 'Thu'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {item.type === 'Thu' ? '+' : '-'}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-gray-800">
                                    {item.description}
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    {item.category}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-extrabold ${
                                    item.type === 'Thu'
                                      ? 'text-emerald-600'
                                      : 'text-rose-600'
                                  }`}
                                >
                                  {item.type === 'Thu' ? '+' : '-'}
                                  {item.amount.toLocaleString('vi-VN')}đ
                                </span>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 text-gray-300 hover:text-rose-500 rounded-lg transition-all"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              );
            });
          })()
        )}
      </div>
    </div>
  );
};
