# Design Spec: Tab Quản Lý Thông Báo & Cấu Hình Nhắc Nhở (Notifications Control Center)

**Date:** 2026-07-27  
**Status:** Approved  
**Author:** Pair Programmer & User  

---

## 1. Overview & Objective

Ứng dụng quản lý lịch làm việc cần tách biệt chức năng **Cấu hình Thông báo (Notifications Tab)** ra khỏi Cấu hình Hệ thống chung (Settings Tab). Việc này giúp người dùng dễ dàng bật/tắt từng loại thông báo (Check-in, Check-out, Nhắc đi làm, Ghi chú ca làm, Báo sáng), cài đặt thời gian báo riêng biệt cho từng loại (ví dụ: Check-in trước 15p, Check-out sau 10p), và tùy chỉnh nội dung tin nhắn gửi qua Telegram.

### Mục tiêu chính:
- Thay icon quả chuông nhỏ trên Header thành nút bấm nổi bật **`🔔 Thông báo`**. Khi bấm sẽ mở **Tab Thông Báo**.
- **Tab Cấu hình (Settings Tab):** Giữ lại các cài đặt hệ thống (Tên nhân viên, Gemini API Key, Lương theo giờ, Telegram Bot Token/Chat ID).
- **Tab Thông Báo (Notifications Tab):** 5 Thẻ Card riêng biệt quản lý 5 nhóm thông báo với công tắc gạt Bật/Tắt, thời gian báo riêng biệt, và mẫu tin nhắn tùy chỉnh.

---

## 2. Data Models & Interface Updates (`types/schedule.ts`)

```typescript
export interface NotificationSettings {
  // 1. Nhắc lịch đi làm (Shift Reminder)
  enableShiftReminder?: boolean;
  shiftReminderLeadMinutes?: number; // Mặc định: 30
  shiftReminderTemplate?: string;

  // 2. Nhắc Check-in vào ca
  enableCheckInReminder?: boolean;
  checkInLeadMinutes?: number;       // Mặc định: 15 (báo trước giờ vào ca)
  checkInTemplate?: string;

  // 3. Nhắc Check-out tan ca
  enableCheckOutReminder?: boolean;
  checkOutLagMinutes?: number;       // Mặc định: 10 (báo sau giờ tan ca)
  checkOutTemplate?: string;

  // 4. Nhắc Ghi chú ca làm (Notes Memo)
  enableNotesReminder?: boolean;
  notesLeadMinutes?: number;         // Mặc định: 15 (báo trước giờ vào ca)
  notesTemplate?: string;

  // 5. Nhắc Lịch Buổi Sáng (Morning Summary)
  enableMorningSummary?: boolean;
  morningSummaryTime?: string;       // Mặc định: "07:00"
  morningSummaryTemplate?: string;
}

export interface ScheduleSettings extends NotificationSettings {
  morningTime: string;
  leadTimeMinutes: number;
  enableMorning: boolean;
  enableLeadTime: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  employeeName?: string;
  geminiApiKey?: string;
  hourlyRate?: number;
}
```

---

## 3. Component Architecture & UI Flow

### 3.1 Header Navigation (`components/Header.tsx`)
- Đổi nút icon chuông thành nút **`🔔 Thông báo`** có chấm xanh trạng thái:
```tsx
<button
  onClick={onOpenNotifications}
  className="px-3.5 py-2 bg-white hover:bg-brand-50 rounded-2xl shadow-soft border border-surface-border/60 text-brand-600 font-bold text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
>
  <Bell className="w-4 h-4 text-brand-600" />
  <span>Thông báo</span>
  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
</button>
```

### 3.2 Main App Tab Routing (`app/page.tsx`)
- Thêm tab `'notifications'` vào `activeTab`:
  - `'schedule'` | `'salary'` | `'notifications'` | `'settings'`
- Khi `activeTab === 'notifications'`, hiển thị `<NotificationsTab settings={settings} onSaveSettings={handleSaveSettings} />`.

### 3.3 Component `components/NotificationsTab.tsx`
Cấu trúc 5 Thẻ Card điều khiển:

1. **Thẻ 1: 🔔 Nhắc Lịch Đi Làm (Shift Start Reminder)**
   - Toggle Bật/Tắt.
   - Chọn thời gian báo trước giờ làm: `15p`, `30p`, `45p`, `60p`, `90p`, `120p`.
   - Khung nhập Mẫu tin nhắn (Mặc định: `"🔔 Sắp tới ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chuẩn bị đi làm nhé!"`).

2. **Thẻ 2: 📍 Nhắc Check-in Vào Ca (Check-in Reminder)**
   - Toggle Bật/Tắt.
   - Chọn thời gian báo trước giờ vào ca: `5p`, `10p`, `15p`, `20p`, `30p`.
   - Khung nhập Mẫu tin nhắn (Mặc định: `"📍 Chuẩn bị tới giờ vào ca {Ca} ({ThờiGian})! Nhớ Check-in nhé."`).

3. **Thẻ 3: ✅ Nhắc Check-out Tan Ca (Check-out Reminder)**
   - Toggle Bật/Tắt.
   - Chọn thời gian báo **sau khi tan ca**: `5p`, `10p`, `15p`, `20p`, `30p`.
   - Khung nhập Mẫu tin nhắn (Mặc định: `"✅ Đã hết ca làm {Ca}! Nhớ Check-out ra về nhé."`).

4. **Thẻ 4: 📝 Nhắc Ghi Chú Ca Làm (Notes Memo)**
   - Toggle Bật/Tắt.
   - Chọn thời gian báo trước giờ làm: `10p`, `15p`, `30p`.
   - Khung nhập Mẫu tin nhắn (Mặc định: `"📝 Ghi chú ca {Ca}: {GhiChú}"`).

5. **Thẻ 5: ☀️ Nhắc Lịch Làm Buổi Sáng (Morning Summary)**
   - Toggle Bật/Tắt.
   - Ô chọn giờ báo sáng: Time Picker (`"07:00"`).
   - Khung nhập Mẫu tin nhắn (Mặc định: `"☀️ Chào buổi sáng! Hôm nay bạn có ca {Ca} từ {ThờiGian} tại {ĐịaĐiểm}."`).

---

## 4. Cron Reminders Engine (`app/api/cron/reminders/route.ts`)

- API Cron định kỳ tự động phân tích và thay thế các từ khóa `{Ca}`, `{ThờiGian}`, `{ĐịaĐiểm}`, `{GhiChú}` bằng thông tin ca làm thực tế trong ngày, sau đó gửi qua Telegram theo mốc thời gian riêng biệt đã cấu hình.

---

## 5. Verification & Testing Strategy

1. **Kiểm thử giao diện (UI Test):**
   - Bấm nút **`🔔 Thông báo`** trên Header: Chuyển mượt sang Tab Thông báo.
   - Bật/Tắt từng công tắc và chỉnh số phút/mẫu tin nhắn: Đảm bảo hiển thị badge `✓ Đã tự động lưu`.
2. **Kiểm thử đồng bộ dữ liệu (Data Persistence Test):**
   - Đóng ứng dụng và mở lại: Các cấu hình công tắc, số phút và mẫu tin nhắn vẫn được lưu nguyên vẹn trong Firebase/Local DB.
3. **Kiểm thử Next.js Build:**
   - Chạy `npm run build` đảm bảo 0 lỗi TypeScript và 0 lỗi compilation.
