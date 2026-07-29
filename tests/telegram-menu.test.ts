import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getMainMenuKeyboard,
  getSalaryMenuKeyboard,
  getNotesMenuKeyboard,
  getOcrConfirmationKeyboard,
  formatWeeklySalaryMessage,
  formatMonthlySalaryMessage,
  formatShiftDetailsMessage,
} from '../lib/telegram-menu';

describe('Telegram Menu Helper', () => {
  it('should generate valid main menu reply keyboard', () => {
    const kb = getMainMenuKeyboard();
    assert.strictEqual(kb.keyboard.length, 2);
    assert.ok(kb.keyboard[0][0].text.includes('📸 Gửi Ảnh Lịch'));
    assert.ok(kb.keyboard[0][1].text.includes('📋 Ca Làm Hôm Nay'));
    assert.ok(kb.keyboard[1][0].text.includes('💰 Bảng Lương'));
    assert.ok(kb.keyboard[1][1].text.includes('📝 Ghi Chú'));
    assert.strictEqual(kb.resize_keyboard, true);
  });

  it('should generate valid salary menu reply keyboard', () => {
    const kb = getSalaryMenuKeyboard();
    assert.strictEqual(kb.keyboard.length, 2);
    assert.ok(kb.keyboard[0][0].text.includes('📊 Lương Tuần Này'));
    assert.ok(kb.keyboard[0][1].text.includes('🗓️ Lương Tháng Này'));
    assert.ok(kb.keyboard[1][0].text.includes('⏱️ Chi Tiết Giờ Làm'));
    assert.ok(kb.keyboard[1][1].text.includes('🔙 Menu Chính'));
    assert.strictEqual(kb.resize_keyboard, true);
  });

  it('should generate valid notes menu reply keyboard', () => {
    const kb = getNotesMenuKeyboard();
    assert.strictEqual(kb.keyboard.length, 2);
    assert.ok(kb.keyboard[0][0].text.includes('📋 Xem Ghi Chú'));
    assert.ok(kb.keyboard[0][1].text.includes('➕ Thêm Ghi Chú'));
    assert.ok(kb.keyboard[1][0].text.includes('✅ Đã Hoàn Thành'));
    assert.ok(kb.keyboard[1][1].text.includes('🔙 Menu Chính'));
    assert.strictEqual(kb.resize_keyboard, true);
  });

  it('should generate valid OCR confirmation inline keyboard', () => {
    const pendingId = 'test_ocr_123';
    const kb = getOcrConfirmationKeyboard(pendingId);
    assert.strictEqual(kb.inline_keyboard.length, 1);
    assert.strictEqual(kb.inline_keyboard[0][0].text, '✅ Xác Nhận Nhập Lịch');
    assert.strictEqual(kb.inline_keyboard[0][0].callback_data, `confirm_ocr:${pendingId}`);
    assert.strictEqual(kb.inline_keyboard[0][1].text, '❌ Hủy Bỏ');
    assert.strictEqual(kb.inline_keyboard[0][1].callback_data, `cancel_ocr:${pendingId}`);
  });

  it('should format weekly salary message correctly', () => {
    const mockShifts = [
      { id: '1', date: '2026-07-27', dayOfWeek: 'Thu2', startTime: '18:00', endTime: '22:00', subject: 'Ca làm', location: 'Highlands', note: 'B18', reminderEnabled: true },
    ];
    const msg = formatWeeklySalaryMessage(mockShifts as any, 26000);
    assert.ok(msg.includes('LƯƠNG TUẦN NÀY'));
    assert.ok(msg.includes('104.000') || msg.includes('104,000'));
    assert.ok(msg.includes('4.0 giờ') || msg.includes('4 giờ'));
  });

  it('should format monthly salary message correctly', () => {
    const mockShifts = [
      { id: '1', date: '2026-07-27', dayOfWeek: 'Thu2', startTime: '18:00', endTime: '22:00', subject: 'Ca làm', location: 'Highlands', note: 'B18', reminderEnabled: true },
    ];
    const msg = formatMonthlySalaryMessage(mockShifts as any, 26000);
    assert.ok(msg.includes('LƯƠNG THÁNG NÀY'));
    assert.ok(msg.includes('104.000') || msg.includes('104,000'));
  });

  it('should format shift details message correctly', () => {
    const mockShifts = [
      { id: '1', date: '2026-07-27', dayOfWeek: 'Thu2', startTime: '18:00', endTime: '22:00', subject: 'Ca làm', location: 'Highlands', note: 'B18', reminderEnabled: true },
      { id: '2', date: '2026-07-28', dayOfWeek: 'Thu3', startTime: '18:00', endTime: '22:00', subject: 'Ca làm', location: 'Highlands', note: 'B18', reminderEnabled: true },
    ];
    const msg = formatShiftDetailsMessage(mockShifts as any);
    assert.ok(msg.includes('CHI TIẾT GIỜ LÀM'));
    assert.ok(msg.includes('8.0 GIỜ LÀM') || msg.includes('8 giờ làm'));
  });
});
