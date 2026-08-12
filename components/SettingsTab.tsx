'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldCheck, Database, CheckCircle2, RefreshCw, Trash2, Plus, Lock, KeyRound, Copy } from 'lucide-react';
import { ScheduleSettings } from '@/types/schedule';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';

import { useAuth } from '@/components/AuthProvider';

interface SettingsTabProps {
  settings: ScheduleSettings;
  onSaveSettings: (s: ScheduleSettings) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onSaveSettings }) => {
  const { changePassword } = useAuth();
  const [form, setForm] = useState<ScheduleSettings>(settings);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const { showToast } = useToast();
  const [copiedCronUrl, setCopiedCronUrl] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast({ type: 'error', title: 'Lỗi', message: 'Mật khẩu mới và xác nhận không khớp' });
      return;
    }
    if (newPassword.length < 4) {
      showToast({ type: 'error', title: 'Lỗi', message: 'Mật khẩu mới phải từ 4 ký tự trở lên' });
      return;
    }
    setChangingPass(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast({ type: 'success', title: 'Thành công', message: 'Đã cập nhật mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Đổi mật khẩu thất bại' });
    } finally {
      setChangingPass(false);
    }
  };

  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when parent props change
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Automatic auto-save on field changes with 400ms debounce
  const updateForm = (updated: ScheduleSettings) => {
    setForm(updated);
    setSavingStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSaveSettings(updated);
        setSavingStatus('saved');
        setTimeout(() => setSavingStatus('idle'), 2500);
      } catch (err: any) {
        setSavingStatus('idle');
        showToast({
          type: 'error',
          title: 'Lưu tự động thất bại',
          message: err.message || 'Không thể kết nối đến cơ sở dữ liệu'
        });
      }
    }, 400);
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      const res = await fetch('/api/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: form.telegramBotToken,
          telegramChatId: form.telegramChatId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          title: 'Kết nối Telegram thành công',
          message: 'Đã gửi tin nhắn thử nghiệm tới Telegram!'
        });
      } else {
        showToast({
          type: 'error',
          title: 'Kiểm tra Telegram thất bại',
          message: json.error || 'Token hoặc Chat ID không hợp lệ'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi gửi Telegram',
        message: err.message || 'Không thể kết nối mạng'
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    try {
      const res = await fetch('/api/gemini-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: form.geminiApiKey,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          title: 'Kiểm tra Gemini API thành công',
          message: 'Model Gemini 2.5 Flash hợp lệ và đang hoạt động tốt!'
        });
      } else {
        showToast({
          type: 'error',
          title: 'Gemini API Key không hợp lệ',
          message: json.error || 'Vui lòng kiểm tra lại API Key'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi kiểm tra Gemini API',
        message: err.message || 'Lỗi kết nối máy chủ'
      });
    } finally {
      setTestingGemini(false);
    }
  };

  const [settingUpWebhook, setSettingUpWebhook] = useState(false);

  const handleSetupWebhook = async () => {
    setSettingUpWebhook(true);
    try {
      const res = await fetch('/api/telegram-setup-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: form.telegramBotToken,
          customWebhookUrl: form.customWebhookUrl,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          title: 'Kích hoạt Webhook thành công',
          message: `Đã kết nối Webhook Telegram tới URL: ${json.webhookUrl}`
        });
      } else {
        showToast({
          type: 'error',
          title: 'Kích hoạt Webhook thất bại',
          message: json.error || 'Không thể thiết lập Webhook với Telegram'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi kích hoạt Webhook',
        message: err.message || 'Lỗi kết nối máy chủ'
      });
    } finally {
      setSettingUpWebhook(false);
    }
  };

  const handleCopyCronUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://schedule-telegram-app.vercel.app';
    const cronUrl = `${origin}/api/cron/reminders`;
    navigator.clipboard.writeText(cronUrl);
    setCopiedCronUrl(true);
    showToast({
      type: 'success',
      title: 'Đã sao chép Webcron URL',
      message: 'Đã copy URL nhắc nhở để dán vào console.cron-job.org!'
    });
    setTimeout(() => setCopiedCronUrl(false), 2500);
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-surface-textPrimary">Cấu hình Hệ thống</h2>
          <p className="text-xs text-surface-textSecondary">Tự động lưu mọi thay đổi trực tiếp vào hệ thống</p>
        </div>

        {/* Auto-save status indicator badge */}
        <div className="text-xs font-semibold">
          {savingStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" /> Đang lưu...
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã tự động lưu
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. Cấu hình Telegram Bot & Hệ thống */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-surface-textPrimary">Cấu hình Kết nối Telegram & AI</h3>
              <p className="text-xs text-surface-textSecondary">Nhập Token Bot, Chat ID cá nhân/nhóm và API Key</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Telegram Bot Token
              </label>
              <input
                type="text"
                value={form.telegramBotToken || ''}
                onChange={(e) => updateForm({ ...form, telegramBotToken: e.target.value })}
                placeholder="Ví dụ: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Telegram Chat ID mặc định
              </label>
              <input
                type="text"
                value={form.telegramChatId || ''}
                onChange={(e) => updateForm({ ...form, telegramChatId: e.target.value })}
                placeholder="Ví dụ: 123456789 hoặc -100123456789"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            {/* Dynamic Multi-row Allowed Telegram Chat IDs List */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              {(() => {
                const list = form.allowedChatIds && form.allowedChatIds.length > 0
                  ? form.allowedChatIds
                  : (form.allowedChatIdsStr
                    ? form.allowedChatIdsStr.split(',').map((s) => s.trim()).filter(Boolean)
                    : (form.telegramChatId ? [form.telegramChatId] : ['']));

                const handleRowChange = (index: number, val: string) => {
                  const nextList = [...list];
                  nextList[index] = val;
                  updateForm({
                    ...form,
                    allowedChatIds: nextList,
                    allowedChatIdsStr: nextList.filter(Boolean).join(','),
                  });
                };

                const handleAddRow = () => {
                  const nextList = [...list, ''];
                  updateForm({
                    ...form,
                    allowedChatIds: nextList,
                    allowedChatIdsStr: nextList.filter(Boolean).join(','),
                  });
                };

                const handleRemoveRow = (index: number) => {
                  const nextList = list.filter((_, i) => i !== index);
                  const finalArr = nextList.length > 0 ? nextList : [''];
                  updateForm({
                    ...form,
                    allowedChatIds: finalArr,
                    allowedChatIdsStr: finalArr.filter(Boolean).join(','),
                  });
                };

                return (
                  <div className="space-y-2">
                    {list.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-400 w-4 text-right">{idx + 1}.</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleRowChange(idx, e.target.value)}
                          placeholder="Ví dụ: 123456789"
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600 transition-colors"
                        />
                        {list.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="mt-1 py-1.5 px-3 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Thêm trường tài khoản</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3. Tên nhân viên trên bảng lịch (dùng cho OCR)
              </label>
              <input
                type="text"
                value={form.employeeName || ''}
                onChange={(e) => updateForm({ ...form, employeeName: e.target.value })}
                placeholder="Ví dụ: Thanh Hương"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Google Gemini API Key (Model 2.5 Flash OCR chuẩn 100%)
              </label>
              <input
                type="password"
                value={form.geminiApiKey || ''}
                onChange={(e) => updateForm({ ...form, geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
              <div className="flex items-center justify-between mt-1.5 flex-wrap gap-2">
                <p className="text-[10px] text-slate-400">
                  Tự động dùng AI Gemini 2.5 Flash đọc lịch khi có Key.
                </p>
                <button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={testingGemini}
                  className="px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 font-bold rounded-xl text-xs hover:bg-brand-100 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>{testingGemini ? 'Đang test...' : 'Test Gemini API Key'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                5. Webhook URL Telegram tùy chỉnh
              </label>
              <input
                type="text"
                value={form.customWebhookUrl || ''}
                onChange={(e) => updateForm({ ...form, customWebhookUrl: e.target.value })}
                placeholder="https://schedule-telegram-app.vercel.app/api/telegram-webhook"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
              <div className="flex items-center justify-between mt-1.5 flex-wrap gap-2">
                <p className="text-[10px] text-slate-400">
                  URL Webhook để Telegram tự động gửi tin nhắn & ảnh lịch về ứng dụng.
                </p>
                <button
                  type="button"
                  onClick={handleSetupWebhook}
                  disabled={settingUpWebhook}
                  className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 font-bold rounded-xl text-xs hover:bg-sky-100 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>{settingUpWebhook ? 'Đang kích hoạt...' : 'Kích hoạt Webhook'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6. Webcron Hẹn Giờ Nhắc Nhở Tự Động (cron-job.org)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/api/cron/reminders` : 'https://schedule-telegram-app.vercel.app/api/cron/reminders'}
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCronUrl}
                  className="px-3 py-2 bg-brand-50 border border-brand-200 text-brand-700 font-bold rounded-xl text-xs hover:bg-brand-100 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedCronUrl ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-brand-600" />}
                  <span>{copiedCronUrl ? 'Đã chép!' : 'Copy URL'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Dán URL này vào trang hẹn giờ <a href="https://console.cron-job.org/jobs" target="_blank" rel="noreferrer" className="text-brand-600 underline font-semibold">console.cron-job.org</a> (tần suất 1 - 5 phút/lần) để tự động kích hoạt thông báo Telegram.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                7. Google Sheet Link Đồng Bộ Lịch (cho Chí Nhân / CTV Viện AI)
              </label>
              <input
                type="text"
                value={form.googleSheetUrl || ''}
                onChange={(e) => updateForm({ ...form, googleSheetUrl: e.target.value })}
                placeholder="https://docs.google.com/spreadsheets/d/1UnBM5lf3RNOtY7ACJ5soHDgOTz2rPZqr/edit?gid=229272214#gid=229272214"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Đường dẫn Google Sheet bảng phân công lịch trực công nhật CTV Viện AI.
              </p>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={testingTelegram}
              className="w-full py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>{testingTelegram ? 'Đang gửi...' : 'Test gửi tin nhắn Telegram'}</span>
            </button>
          </div>
        </Card>

        {/* 2. 🔑 Đổi Mật Khẩu Tài Khoản */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-surface-textPrimary">🔑 Đổi Mật Khẩu Tài Khoản</h3>
              <p className="text-xs text-surface-textSecondary">Cập nhật mật khẩu đăng nhập vào ứng dụng</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu mới (ít nhất 4 ký tự)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <button
              type="submit"
              disabled={changingPass}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4 text-white" />
              <span>{changingPass ? 'Đang cập nhật...' : '🔑 Cập nhật mật khẩu'}</span>
            </button>
          </form>
        </Card>

        {/* 3. Trạng thái kết nối Firebase Firestore */}
        <Card className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-surface-textPrimary">Cơ sở dữ liệu Firebase Cloud Firestore</h3>
              <p className="text-xs text-emerald-600 font-medium">● Project ID: testhuy-68af2</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
