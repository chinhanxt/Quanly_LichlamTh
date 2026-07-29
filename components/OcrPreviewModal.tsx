'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, X, Clock } from 'lucide-react';
import { ParsedShiftResult } from '@/lib/ocr-parser';
import { Button } from './ui/Button';
import { format24hRange } from '@/lib/time-formatter';

const DAY_NAME_MAP: Record<string, string> = {
  Thu2: 'Thứ 2 (Mon)',
  Thu3: 'Thứ 3 (Tue)',
  Thu4: 'Thứ 4 (Wed)',
  Thu5: 'Thứ 5 (Thu)',
  Thu6: 'Thứ 6 (Fri)',
  Thu7: 'Thứ 7 (Sat)',
  CN: 'Chủ Nhật (Sun)',
};

interface OcrPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShifts: ParsedShiftResult[];
  onConfirmSave: (shifts: ParsedShiftResult[]) => Promise<void>;
}

export const OcrPreviewModal: React.FC<OcrPreviewModalProps> = ({
  isOpen,
  onClose,
  initialShifts,
  onConfirmSave,
}) => {
  const [shifts, setShifts] = useState<ParsedShiftResult[]>(initialShifts);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  if (!isOpen) return null;

  const handleShiftChange = (index: number, field: keyof ParsedShiftResult, value: any) => {
    const updated = [...shifts];
    updated[index] = { ...updated[index], [field]: value };
    setShifts(updated);
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onConfirmSave(shifts);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-surface-textPrimary">Xác nhận Lịch học / Làm việc (7 Ngày)</h3>
              <p className="text-xs text-surface-textSecondary">Kiểm tra & chỉnh sửa trước khi lưu vào Firebase</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {shifts.map((shift, idx) => (
            <div key={shift.dayOfWeek} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-slate-800">
                    {DAY_NAME_MAP[shift.dayOfWeek] || shift.dayOfWeek}
                  </span>
                  {!shift.isOff && shift.startTime && shift.endTime && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-xl text-brand-800 font-extrabold text-sm shadow-xs">
                      <Clock className="w-4 h-4 text-brand-600" />
                      <span>Ca {format24hRange(shift.startTime, shift.endTime)}</span>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!shift.isOff}
                    onChange={(e) => handleShiftChange(idx, 'isOff', !e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Có ca làm</span>
                </label>
              </div>

              {!shift.isOff && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Giờ bắt đầu</label>
                    <input
                      type="text"
                      placeholder="18:00"
                      value={shift.startTime}
                      onChange={(e) => handleShiftChange(idx, 'startTime', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 text-center focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Giờ kết thúc</label>
                    <input
                      type="text"
                      placeholder="22:00"
                      value={shift.endTime}
                      onChange={(e) => handleShiftChange(idx, 'endTime', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 text-center focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center gap-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button fullWidth onClick={handleSubmit} disabled={saving}>
            {saving ? 'Đang lưu...' : <><CheckCircle2 className="w-4 h-4" /> Lưu Lịch 1 Tuần</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
