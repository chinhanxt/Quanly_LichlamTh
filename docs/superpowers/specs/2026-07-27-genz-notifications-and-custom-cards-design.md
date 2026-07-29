# Design Spec: Thông Báo Phong Cách GenZ, Nút Gửi Thử Telegram & Thêm Thông Báo Tùy Chỉnh

**Date:** 2026-07-27  
**Status:** Approved  
**Author:** Pair Programmer & User  

---

## 1. Overview & Objectives

Nâng cấp **Trung Tâm Thông Báo (Notifications Control Center)** dành riêng cho người yêu với 3 cải tiến chính:
1. **Phong cách GenZ vui vẻ, cợt nhã & tình cảm:** Đổi toàn bộ các mẫu tin nhắn mặc định sang văn phong ngọt ngào, hóm hỉnh và GenZ (ví dụ: *"Tới giờ đi làm rồi kìaaaaa 🏃‍♀️ Ca {Ca} ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn liền đi bé ơiii!"*).
2. **Nút "🧪 Gửi thử Telegram" trên mọi Thẻ Thông báo:** Cho phép bấm gửi ngay tin nhắn mẫu thử nghiệm sang Telegram để xem trước giao diện hiển thị thực tế trên điện thoại.
3. **Nút "+ Thêm thông báo mới":** Cho phép tạo thêm bất kỳ thông báo tùy chỉnh nào về sau (Ví dụ: *"Nhắc mang cơm cho tui"*, *"Nhắc uống nước"*, *"Nhắc nộp báo cáo"*), hỗ trợ gạt Bật/Tắt, đổi giờ báo, sửa mẫu tin, Gửi thử và Xóa thông báo.

---

## 2. Interface & Schema Updates (`types/schedule.ts`)

```typescript
export interface CustomNotificationItem {
  id: string;
  title: string;
  enabled: boolean;
  leadMinutes: number; // Số phút báo trước ca làm (hoặc giờ cụ thể)
  template: string;
}

export interface NotificationSettings {
  // 1. Nhắc lịch đi làm (Shift Reminder)
  enableShiftReminder?: boolean;
  shiftReminderLeadMinutes?: number;
  shiftReminderTemplate?: string;

  // 2. Nhắc Check-in vào ca
  enableCheckInReminder?: boolean;
  checkInLeadMinutes?: number;
  checkInTemplate?: string;

  // 3. Nhắc Check-out tan ca
  enableCheckOutReminder?: boolean;
  checkOutLagMinutes?: number;
  checkOutTemplate?: string;

  // 4. Nhắc Ghi chú ca làm (Notes Memo)
  enableNotesReminder?: boolean;
  notesLeadMinutes?: number;
  notesTemplate?: string;

  // 5. Nhắc Lịch Buổi Sáng (Morning Summary)
  enableMorningSummary?: boolean;
  morningSummaryTime?: string;
  morningSummaryTemplate?: string;

  // 6. Danh sách thông báo tùy chỉnh tự thêm
  customNotifications?: CustomNotificationItem[];
}
```

---

## 3. Mẫu Tin Nhắn Mặc Định GenZ Vui Vẻ 💖

1. **Shift Start Reminder:**
   `"🔔 Tới giờ đi làm rồi kìaaaaa 🏃‍♀️ Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn liền đi bé ơiii!"`
2. **Check-in Reminder:**
   `"📍 Alo alo! Ca {Ca} tới đít rồi nè 🚨 Mau mau Check-in không là bị phạt tiền nha bé iu 💸!"`
3. **Check-out Reminder:**
   `"✅ Hếtttt giời rồiiii! 🎉 Ca {Ca} xong rồi nè. Mau mau Check-out rồi lượn về với tui nhanh lênnnn! 💕"`
4. **Notes Memo:**
   `"📝 Note nhẹ cho bé nè: {GhiChú} ✨ Đừng có quên đó nheee!"`
5. **Morning Summary:**
   `"☀️ Chào buổi sáng công chúa! 👑 Hôm nay bé có ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Chúc em bé một ngày làm việc vui vẻ nhaaa ❤️"`

---

## 4. UI & Action Requirements

### 4.1 Nút "🧪 Gửi thử Telegram"
- Xuất hiện ở góc trên/dưới của **mỗi Thẻ Thông Báo** (bao gồm cả các thẻ tùy chỉnh tự thêm).
- Khi bấm, thay thế thử từ khóa `{Ca}` thành `B18`, `{ThờiGian}` thành `18:00 - 22:00`, `{ĐịaĐiểm}` thành `Highlands Coffee`, `{GhiChú}` thành `Mang laptop`.
- Gọi API `/api/telegram-test` gửi trực tiếp tin nhắn sang Telegram Bot và hiển thị toast `🚀 Đã gửi thử tin nhắn qua Telegram!`.

### 4.2 Nút "+ Thêm thông báo mới"
- Đặt ở cuối danh sách các thẻ thông báo.
- Khi bấm, hiển thị Modal hoặc Form thêm mới:
  - Nhập tên thông báo (Ví dụ: `Nhắc mang cơm cho tui`).
  - Chọn thời gian báo trước (Ví dụ: `15 phút`).
  - Nhập mẫu tin nhắn ban đầu.
- Cho phép chỉnh sửa, bật/tắt, gửi thử và nút **Xóa (Trash Icon)** thẻ tùy chỉnh bất kỳ lúc nào.
