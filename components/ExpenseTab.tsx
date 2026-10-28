'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  ClipboardPaste,
  Sparkles,
  Settings2,
  Trash2,
  Loader2,
  Plus,
  X,
  ShieldCheck,
} from 'lucide-react';
import { ExpenseItem, ScheduleSettings } from '@/types/schedule';
import { useToast } from '@/components/ui/Toast';
import { Card } from './ui/Card';
import { isSecretMasked } from '@/lib/secrets';
import {
  EXPENSE_CATEGORIES,
  ExpenseDraft,
  ExpenseType,
  formatVnd,
  parseAmount,
  parseExpenseTable,
  toCsv,
} from '@/lib/expense-io';

interface ExpenseTabProps {
  username: string;
  settings: ScheduleSettings;
  onSaveSettings: (s: ScheduleSettings) => Promise<void>;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthKey = (offset: number) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatDayLabel = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  const names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return `${names[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const ExpenseTab: React.FC<ExpenseTabProps> = ({ username, settings, onSaveSettings }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  // Quick add form
  const [type, setType] = useState<ExpenseType>('Chi');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES.Chi[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // AI natural language
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  // Import / settings panels
  const [panel, setPanel] = useState<'none' | 'paste' | 'ai-settings'>('none');
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [groqKey, setGroqKey] = useState(settings.groqApiKey || '');
  const [groqModel, setGroqModel] = useState(settings.groqModel || 'llama-3.3-70b-versatile');
  const [testingKey, setTestingKey] = useState(false);

  useEffect(() => {
    setGroqKey(settings.groqApiKey || '');
    setGroqModel(settings.groqModel || 'llama-3.3-70b-versatile');
  }, [settings.groqApiKey, settings.groqModel]);

  const headers = { 'Content-Type': 'application/json', 'x-username': username };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expense', { headers: { 'x-username': username } });
      const json = await res.json();
      if (json.success) {
        const list: ExpenseItem[] = json.data || [];
        setItems(list);
        // Tháng hiện tại chưa có gì thì mở tháng gần nhất có giao dịch
        if (list.length > 0 && !list.some((i) => i.date.startsWith(monthKey(0)))) {
          const [ly, lm] = list[0].date.split('-').map(Number);
          const now = new Date();
          setMonthOffset((ly - now.getFullYear()) * 12 + (lm - 1 - now.getMonth()));
        }
      }
      else showToast({ type: 'error', message: json.error || 'Không tải được thu chi' });
    } catch {
      showToast({ type: 'error', message: 'Lỗi kết nối khi tải thu chi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) fetchItems();
  }, [username]);

  const sortItems = (list: ExpenseItem[]) =>
    [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const saveDrafts = async (drafts: ExpenseDraft[] | null, extra: Record<string, any> = {}) => {
    const res = await fetch('/api/expense', {
      method: 'POST',
      headers,
      body: JSON.stringify(drafts ? { items: drafts, ...extra } : extra),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Không lưu được');
    setItems((prev) => sortItems([...(json.data || []), ...prev]));
    return json;
  };

  // ---- Quick add ----
  const amountPreview = parseAmount(amountInput);

  const handleTypeChange = (t: ExpenseType) => {
    setType(t);
    setCategory(EXPENSE_CATEGORIES[t][0]);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPreview) {
      showToast({ type: 'error', message: 'Nhập số tiền, vd: 45 hoặc 45k, 1tr5' });
      amountRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await saveDrafts([{ date, type, category, amount: amountPreview, description: description.trim() || category }]);
      setAmountInput('');
      setDescription('');
      amountRef.current?.focus();
      showToast({ type: 'success', message: `Đã lưu ${type === 'Thu' ? '+' : '-'}${formatVnd(amountPreview)}` });
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiParsing(true);
    try {
      const json = await saveDrafts(null, { rawText: aiText, clientDate: todayIso() });
      setAiText('');
      showToast({ type: 'success', message: json.message || 'Đã lưu' });
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setAiParsing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa giao dịch này?')) return;
    const backup = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/expense?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err: any) {
      setItems(backup);
      showToast({ type: 'error', message: 'Xóa thất bại: ' + (err.message || '') });
    }
  };

  // ---- Import / export ----
  const importText = async (text: string) => {
    const drafts = parseExpenseTable(text, todayIso());
    if (drafts.length === 0) {
      showToast({ type: 'error', message: 'Không đọc được dòng nào. Cột: Ngày, Loại, Danh mục, Số tiền, Mô tả' });
      return;
    }
    setImporting(true);
    try {
      const json = await saveDrafts(drafts, { dedupe: true });
      showToast({ type: 'success', message: json.message });
      setPasteText('');
      setPanel('none');
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setImporting(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await importText(await file.text());
  };

  const exportCsv = (list: ExpenseItem[], label: string) => {
    if (list.length === 0) {
      showToast({ type: 'warning', message: 'Không có giao dịch để xuất' });
      return;
    }
    const blob = new Blob([toCsv(list)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thu-chi_${username}_${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- AI settings ----
  const handleSaveAiSettings = async () => {
    await onSaveSettings({ ...settings, groqApiKey: groqKey, groqModel });
    showToast({ type: 'success', message: 'Đã lưu cài đặt AI' });
    setPanel('none');
  };

  const handleTestKey = async () => {
    setTestingKey(true);
    try {
      const res = await fetch('/api/expense/test-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ apiKey: groqKey, model: groqModel }),
      });
      const json = await res.json();
      showToast(json.success
        ? { type: 'success', message: 'Groq API Key hoạt động!' }
        : { type: 'error', message: 'Key lỗi: ' + json.error });
    } catch {
      showToast({ type: 'error', message: 'Lỗi kết nối Groq API' });
    } finally {
      setTestingKey(false);
    }
  };

  // ---- Derived data ----
  const currentMonth = monthKey(monthOffset);
  const monthItems = useMemo(() => items.filter((i) => i.date.startsWith(currentMonth)), [items, currentMonth]);
  const totals = useMemo(() => {
    let thu = 0;
    let chi = 0;
    const byCategory: Record<string, number> = {};
    for (const i of monthItems) {
      if (i.type === 'Thu') thu += i.amount;
      else {
        chi += i.amount;
        byCategory[i.category] = (byCategory[i.category] || 0) + i.amount;
      }
    }
    const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    return { thu, chi, categories };
  }, [monthItems]);

  const groupedByDay = useMemo(() => {
    const groups: Array<{ date: string; items: ExpenseItem[]; net: number }> = [];
    for (const i of monthItems) {
      let g = groups[groups.length - 1];
      if (!g || g.date !== i.date) {
        g = { date: i.date, items: [], net: 0 };
        groups.push(g);
      }
      g.items.push(i);
      g.net += i.type === 'Thu' ? i.amount : -i.amount;
    }
    return groups;
  }, [monthItems]);

  const [y, m] = currentMonth.split('-');

  return (
    <div className="space-y-3 pb-12">
      {/* Month summary */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonthOffset((o) => o - 1)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer" aria-label="Tháng trước">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setMonthOffset(0)} className="text-sm font-extrabold text-slate-800 cursor-pointer">
            Tháng {m}/{y}
          </button>
          <button onClick={() => setMonthOffset((o) => o + 1)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer" aria-label="Tháng sau">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-emerald-50 py-2">
            <p className="text-[10px] font-bold text-emerald-700">Thu</p>
            <p className="text-sm font-black text-emerald-700">{formatVnd(totals.thu)}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 py-2">
            <p className="text-[10px] font-bold text-rose-700">Chi</p>
            <p className="text-sm font-black text-rose-700">{formatVnd(totals.chi)}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 py-2">
            <p className="text-[10px] font-bold text-slate-600">Còn lại</p>
            <p className={`text-sm font-black ${totals.thu - totals.chi >= 0 ? 'text-slate-800' : 'text-rose-700'}`}>
              {formatVnd(totals.thu - totals.chi)}
            </p>
          </div>
        </div>
        {totals.categories.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {totals.categories.map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-2 text-[11px]">
                <span className="w-20 shrink-0 font-semibold text-slate-600 truncate">{cat}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.max(4, (amount / totals.chi) * 100)}%` }} />
                </div>
                <span className="w-20 text-right font-bold text-slate-700">{formatVnd(amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick add */}
      <Card className="p-4">
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex p-1 bg-slate-100 rounded-2xl shrink-0">
              {(['Chi', 'Thu'] as ExpenseType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    type === t ? (t === 'Chi' ? 'bg-rose-500 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm') : 'text-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <input
                ref={amountRef}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                inputMode="decimal"
                placeholder="Số tiền: 45, 45k, 1tr5"
                className="w-full h-full px-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
              />
              {amountPreview > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                  {formatVnd(amountPreview)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES[type].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                  category === c ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)"
              className="flex-1 min-w-0 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
            />
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value || todayIso())}
              className="w-[8.5rem] px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer disabled:opacity-60 shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Lưu
            </button>
          </div>
        </form>

        {/* AI natural language */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
          <input
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAiParse();
              }
            }}
            placeholder="Hoặc gõ tự nhiên: ăn phở 45, đổ xăng 50k hôm qua"
            className="flex-1 min-w-0 px-3 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-indigo-400 focus:bg-white"
          />
          <button
            onClick={handleAiParse}
            disabled={aiParsing || !aiText.trim()}
            className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            title="Bóc tách bằng AI (Groq)"
          >
            {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI
          </button>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => exportCsv(monthItems, currentMonth)} className="flex flex-col items-center gap-1 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-600 hover:border-purple-300 cursor-pointer">
          <Download className="w-4 h-4 text-purple-600" /> Xuất tháng
        </button>
        <button onClick={() => exportCsv(items, 'tat-ca')} className="flex flex-col items-center gap-1 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-600 hover:border-purple-300 cursor-pointer">
          <Download className="w-4 h-4 text-purple-600" /> Xuất tất cả
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="flex flex-col items-center gap-1 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-600 hover:border-purple-300 cursor-pointer disabled:opacity-50">
          {importing ? <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> : <Upload className="w-4 h-4 text-purple-600" />} Nhập CSV
        </button>
        <button onClick={() => setPanel(panel === 'paste' ? 'none' : 'paste')} className="flex flex-col items-center gap-1 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-600 hover:border-purple-300 cursor-pointer">
          <ClipboardPaste className="w-4 h-4 text-purple-600" /> Dán Excel
        </button>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" onChange={handleFile} className="hidden" />
      </div>

      {panel === 'paste' && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">Dán bảng từ Excel / Google Sheet</p>
            <button onClick={() => setPanel('none')} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-[10px] text-slate-400">Cột: Ngày | Loại (Thu/Chi) | Danh mục | Số tiền | Mô tả. Có dòng tiêu đề thì cột nào cũng được. Dòng trùng sẽ tự bỏ qua.</p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={'05/10/2026\tChi\tĂn uống\t45000\tPhở'}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => importText(pasteText)}
            disabled={importing || !pasteText.trim()}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {importing ? 'Đang nhập...' : `Nhập ${parseExpenseTable(pasteText, todayIso()).length} dòng`}
          </button>
        </Card>
      )}

      {/* Transactions list */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h3 className="text-sm font-extrabold text-slate-800">Giao dịch ({monthItems.length})</h3>
        <button
          onClick={() => setPanel(panel === 'ai-settings' ? 'none' : 'ai-settings')}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-purple-600 cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" /> Cài đặt AI
        </button>
      </div>

      {panel === 'ai-settings' && (
        <Card className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Groq API Key</label>
            <input
              type="password"
              value={isSecretMasked(groqKey) ? '' : groqKey}
              onChange={(e) => setGroqKey(e.target.value.trim() || settings.groqApiKey || '')}
              placeholder={settings.groqApiKey ? `Đã lưu key ${settings.groqApiKey} — dán key mới để thay` : 'gsk_...'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
            <select
              value={groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
            >
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (nhanh)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleTestKey} disabled={testingKey} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
              <ShieldCheck className="w-3.5 h-3.5" /> {testingKey ? 'Đang test...' : 'Test key'}
            </button>
            <button onClick={handleSaveAiSettings} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer">
              Lưu
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : groupedByDay.length === 0 ? (
        <div className="text-center py-10 bg-white/80 rounded-3xl border border-slate-200/80 text-xs text-slate-400">
          Chưa có giao dịch trong tháng này
        </div>
      ) : (
        groupedByDay.map((g) => (
          <div key={g.date} className="bg-white rounded-3xl border border-surface-border/50 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100">
              <span className="text-[11px] font-extrabold text-slate-600">{formatDayLabel(g.date)}</span>
              <span className={`text-[11px] font-extrabold ${g.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {g.net >= 0 ? '+' : '-'}{formatVnd(Math.abs(g.net))}
              </span>
            </div>
            {g.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{i.description || i.category}</p>
                  <p className="text-[10px] text-slate-400">{i.category}</p>
                </div>
                <span className={`text-xs font-black shrink-0 ${i.type === 'Thu' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {i.type === 'Thu' ? '+' : '-'}{formatVnd(i.amount)}
                </span>
                <button
                  onClick={() => handleDelete(i.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                  aria-label="Xóa giao dịch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};
