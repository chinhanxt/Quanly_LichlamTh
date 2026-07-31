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
      const res = await fetch('/api/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': 'chinhan'
        },
        body: JSON.stringify({ rawText: rawInput }),
      });

      const json = await res.json();
      if (json.success) {
        showToast({ message: json.message || 'Ghi sổ thành công!', type: 'success' });
        setRawInput('');
        fetchExpenses();
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
    <div className="space-y-5 pb-24 max-w-md mx-auto">
      {/* Top Header & Settings Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-surface-text flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-600" />
            Quản Lý Chi Tiêu AI
          </h2>
          <p className="text-xs text-surface-textSecondary mt-0.5">
            Bóc tách thu/chi thông minh bằng Groq Llama 3.3
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2.5 rounded-xl border transition-all ${
            showSettings 
              ? 'bg-brand-50 border-brand-200 text-brand-600' 
              : 'bg-white border-surface-border text-surface-textSecondary hover:text-brand-600'
          }`}
          title="Cài đặt Groq Key & Google Sheet"
        >
          <Sliders className="w-5 h-5" />
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Apps Script Webhook URL (Nút đẩy dữ liệu tùy chọn)</label>
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
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-surface-border space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> Nhập Văn Bản Thu/Chi
          </label>
          <span className="text-[10px] text-gray-400">Tự bóc tách bằng Groq AI</span>
        </div>

        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Ví dụ: sáng ăn hủ tiếu 45k, mua ly cafe 30k, chiều sếp thưởng 500k..."
          className="w-full h-24 p-3 border border-gray-200 rounded-2xl text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all resize-none"
        />

        {/* Quick Example Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => setRawInput(ex)}
              className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 rounded-full transition-all"
            >
              + {ex}
            </button>
          ))}
        </div>

        <button
          onClick={handleParseAndSave}
          disabled={isParsing || !rawInput.trim()}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isParsing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>AI Groq đang phân tích...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Phân Tích & Ghi Vào Google Sheet</span>
            </>
          )}
        </button>
      </div>

      {/* Transaction History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-gray-800">
            Lịch Sử Thu/Chi ({filteredItems.length})
          </h3>
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

        {loading ? (
          <div className="text-center py-8 text-xs text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" /> Đang tải danh sách...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-gray-200">
            <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Chưa có giao dịch thu/chi nào.</p>
            <p className="text-[11px] text-gray-400 mt-1">Hãy gõ văn bản ở trên để AI phân tích nhé!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3.5 border border-surface-border flex items-center justify-between shadow-xs hover:border-brand-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                    item.type === 'Thu' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {item.type === 'Thu' ? '+' : '-'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">
                      {item.description}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>{item.date}</span>
                      <span>•</span>
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-md">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-extrabold ${
                    item.type === 'Thu' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {item.type === 'Thu' ? '+' : '-'}{item.amount.toLocaleString('vi-VN')}đ
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-gray-300 hover:text-rose-500 rounded-lg transition-all"
                    title="Xóa giao dịch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
