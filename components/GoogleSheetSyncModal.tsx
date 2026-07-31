'use client';
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, X, Calendar, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (targetMonth: number, targetYear: number, sheetUrl?: string) => Promise<void>;
  initialSheetUrl?: string;
  employeeName?: string;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  onSync,
  initialSheetUrl,
  employeeName = 'Nguyễn Chí Nhân',
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [sheetUrl, setSheetUrl] = useState<string>(
    initialSheetUrl ||
      'https://docs.google.com/spreadsheets/d/1UnBM5lf3RNOtY7ACJ5soHDgOTz2rPZqr/edit?gid=229272214#gid=229272214'
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialSheetUrl) {
      setSheetUrl(initialSheetUrl);
    }
  }, [initialSheetUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSync(selectedMonth, selectedYear, sheetUrl);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Đồng bộ Google Sheet</h3>
              <p className="text-xs text-slate-500 font-medium">
                Chọn tháng cần tải lịch làm cho <span className="font-bold text-emerald-700">{employeeName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Month & Year Selectors */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Chọn Kỳ/Tháng Lịch Trực
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1 ml-0.5">Tháng</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1 ml-0.5">Năm</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Google Sheet URL Input */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-slate-700">Link Google Sheet (Tùy chọn)</label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
            />
            <p className="text-[10px] text-slate-400">
              Nếu bạn xem tháng khác, hãy dán liên kết Google Sheet có chứa GID tương ứng của tháng đó.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <Button variant="secondary" fullWidth onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Đang đồng bộ...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>Đồng Bộ Ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
