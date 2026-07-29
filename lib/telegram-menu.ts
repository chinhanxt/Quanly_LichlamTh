import { ScheduleItem } from '../types/schedule';
import { calculateShiftHours } from './salary-calculator';

export function getMainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '📸 Gửi Ảnh Lịch' }, { text: '📋 Ca Làm Hôm Nay' }],
      [{ text: '💰 Bảng Lương' }, { text: '📝 Ghi Chú' }],
    ],
    resize_keyboard: true,
  };
}

export function getSalaryMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '📊 Lương Tuần Này' }, { text: '🗓️ Lương Tháng Này' }],
      [{ text: '⏱️ Chi Tiết Giờ Làm' }, { text: '🔙 Menu Chính' }],
    ],
    resize_keyboard: true,
  };
}

export function getNotesMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '📋 Xem Ghi Chú' }, { text: '➕ Thêm Ghi Chú' }],
      [{ text: '✅ Đã Hoàn Thành' }, { text: '🔙 Menu Chính' }],
    ],
    resize_keyboard: true,
  };
}

export function getOcrConfirmationKeyboard(pendingId: string) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Xác Nhận Nhập Lịch', callback_data: `confirm_ocr:${pendingId}` },
        { text: '❌ Hủy Bỏ', callback_data: `cancel_ocr:${pendingId}` },
      ],
    ],
  };
}

export function formatWeeklySalaryMessage(shifts: ScheduleItem[], hourlyRate: number = 26000): string {
  let totalHours = 0;
  shifts.forEach((s) => {
    totalHours += calculateShiftHours(s.startTime, s.endTime);
  });
  const totalSalary = Math.round(totalHours * hourlyRate);

  return (
    `📊 *THỐNG KÊ LƯƠNG TUẦN NÀY*\n\n` +
    `• Tổng ca làm: *${shifts.length} ca*\n` +
    `• Tổng giờ làm: *${totalHours.toFixed(1)} giờ*\n` +
    `• Mức lương: *${hourlyRate.toLocaleString('vi-VN')} VNĐ / giờ*\n\n` +
    `💰 *Ước tính lương tuần: ${totalSalary.toLocaleString('vi-VN')} VNĐ*`
  );
}

export function formatMonthlySalaryMessage(shifts: ScheduleItem[], hourlyRate: number = 26000): string {
  let totalHours = 0;
  shifts.forEach((s) => {
    totalHours += calculateShiftHours(s.startTime, s.endTime);
  });
  const totalSalary = Math.round(totalHours * hourlyRate);

  return (
    `🗓️ *THỐNG KÊ LƯƠNG THÁNG NÀY*\n\n` +
    `• Tổng số ca đã đi làm: *${shifts.length} ca*\n` +
    `• Tổng giờ tích lũy: *${totalHours.toFixed(1)} giờ*\n` +
    `• Mức lương: *${hourlyRate.toLocaleString('vi-VN')} VNĐ / giờ*\n\n` +
    `💵 *TỔNG LƯƠNG THÁNG TÍCH LŨY: ${totalSalary.toLocaleString('vi-VN')} VNĐ*`
  );
}

export function formatShiftDetailsMessage(shifts: ScheduleItem[]): string {
  if (!shifts || shifts.length === 0) return '⏱️ Hiện chưa có dữ liệu ca làm nào.';

  let grandTotalHours = 0;
  let grandTotalShifts = 0;
  const weekMap: Record<string, { label: string; hours: number; count: number }> = {};

  shifts.forEach((s, idx) => {
    const hours = calculateShiftHours(s.startTime, s.endTime);
    grandTotalHours += hours;
    grandTotalShifts += 1;

    let weekKey = 'Tuần 1';
    if (s.date) {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) {
        const day = d.getDay();
        const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diffToMon);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const fmtMon = monday.getDate().toString().padStart(2, '0') + '/' + (monday.getMonth() + 1).toString().padStart(2, '0');
        const fmtSun = sunday.getDate().toString().padStart(2, '0') + '/' + (sunday.getMonth() + 1).toString().padStart(2, '0');
        weekKey = `Tuần (${fmtMon} - ${fmtSun})`;
      }
    } else {
      const weekNum = Math.floor(idx / 7) + 1;
      weekKey = `Tuần ${weekNum}`;
    }

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { label: weekKey, hours: 0, count: 0 };
    }
    weekMap[weekKey].hours += hours;
    weekMap[weekKey].count += 1;
  });

  let msg = `⏱️ *BẢNG THỐNG KÊ CHI TIẾT GIỜ LÀM*\n\n`;
  Object.values(weekMap).forEach((w) => {
    msg += `• *${w.label}*: ${w.hours.toFixed(1)} giờ làm (${w.count} ca)\n`;
  });
  msg += `\n🏁 *TỔNG CỘNG TẤT CẢ: ${grandTotalHours.toFixed(1)} GIỜ LÀM* (${grandTotalShifts} ca)`;
  return msg;
}
