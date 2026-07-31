'use client';
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, X, Calendar, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (targetMonth: number, targetYear: number, sheetUrl?: string) => Promise<void>;
  initialSheetUrl?: string;
  employeeName?: string;
  availableMonths?: number[];
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  onSync,
  initialSheetUrl,
  employeeName = 'Nguyễn Chí Nhân',
  availableMonths = [7, 8],
}) => {
  const now = new Date();
  const defaultMonth = availableMonths.includes(now.getMonth() + 1)
    ? now.getMonth() + 1
    : availableMonths[availableMonths.length - 1] || 7;

  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
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

  useEffect(() => {
    if (availableMonths && availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

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

  const monthOptions = availableMonths && availableMonths.length > 0
    ? availableMonths
    : [7, 8];

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
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Month & Year Custom Styled Dropdowns */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Chọn Kỳ/Tháng Lịch Trực Trên Sheet
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Custom Month Select Box */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1 ml-0.5">Tháng (Đang có trên Sheet)</span>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full appearance-none px-4 py-3 bg-emerald-50/40 hover:bg-emerald-50/80 border-2 border-emerald-500/40 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-2xs pr-10 cursor-pointer"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m} className="font-extrabold text-slate-900 py-1">
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Custom Year Select Box */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1 ml-0.5">Năm</span>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full appearance-none px-4 py-3 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200/80 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-2xs pr-10 cursor-pointer"
                  >
                    {[2026].map((y) => (
                      <option key={y} value={y} className="font-extrabold text-slate-900 py-1">
                        Năm {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" fullWidth disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 py-3.5 text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-98 transition-all">
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Đang tải từ Google Sheet...
                </>
              ) : (
                `Bắt đầu tải lịch Tháng ${selectedMonth}/${selectedYear}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
