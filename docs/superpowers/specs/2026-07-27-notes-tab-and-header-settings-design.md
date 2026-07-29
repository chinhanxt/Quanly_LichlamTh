# Design Spec: Tab Ghi Chú Mới, Chuyển Cấu Hình Lên Header & Nâng Cấp Nhắc Nhở Ghi Chú

**Date:** 2026-07-27  
**Status:** Approved  
**Author:** Pair Programmer & User  

---

## 1. Overview & Objectives

Nâng cấp trải nghiệm ứng dụng với 3 thay đổi chiến lược:
1. **Chuyển Tab Cấu Hình lên Header:** Đặt nút Icon Bánh Răng **`⚙️ Cấu hình`** ở góc trên bên phải Header kế bên nút **`🔔 Thông báo`**.
2. **Tạo Tab Ghi Chú Mới (`NotesTab.tsx`):**
   - Thay thế Tab 3 trên thanh menu dưới cùng (`BottomNav.tsx`) thành Tab **`📝 Ghi chú`**.
   - Tự động ghi nhận ngày, giờ, phút khi tạo ghi chú (`20:02 - 27/07/2026`) và tự động lưu.
   - Hỗ trợ gán ghi chú cho **Ngày cụ thể** (`YYYY-MM-DD`) hoặc **Ca làm cụ thể** (`B18`, `B16`, `B`...).
3. **Nâng Cấp Thẻ 4 "Nhắc Ghi Chú Ca Làm" (Tab Thông Báo):**
   - Hỗ trợ 2 Chế độ thời gian báo: **`Trước ca làm`** (15p, 30p...) và **`Giờ cố định`** (ví dụ `08:00` sáng).
   - Động cơ Cron tự động tổng hợp danh sách các ghi chú đã gán để thay thế vào từ khóa `{GhiChú}` khi gửi Telegram.

---

## 2. Data Models & Interface Updates (`types/schedule.ts`)

```typescript
export interface UserNote {
  id: string;
  content: string;
  createdAt: string;         // ISO timestamp "2026-07-27T20:02:00.000Z"
  createdFormatted: string;   // "20:02 - 27/07/2026"
  targetDate?: string;       // "YYYY-MM-DD"
  targetShiftCode?: string;   // "B18", "B16", "B"
  completed?: boolean;
}

export interface NotificationSettings {
  // Card 4: Nhắc Ghi chú
  enableNotesReminder?: boolean;
  notesTimingMode?: 'before_shift' | 'fixed_time';
  notesLeadMinutes?: number;   // Dùng khi timingMode === 'before_shift'
  notesFixedTime?: string;     // Dùng khi timingMode === 'fixed_time' (Mặc định: "08:00")
  notesTemplate?: string;

  // Danh sách ghi chú người dùng
  userNotes?: UserNote[];
}
```

---

## 3. UI Flow & Component Design

### 3.1 Top Right Header (`components/Header.tsx`)
- Đặt 2 nút bên phải:
  - **`🔔 Thông báo`** (Chuyển sang Tab Thông Báo)
  - **`⚙️ Cấu hình`** (Icon bánh răng - Chuyển sang Tab Cấu Hình Hệ Thống)

### 3.2 Bottom Navigation Bar (`components/BottomNav.tsx`)
- 3 Tab menu dưới cùng:
  - `📅 Thời khóa biểu` (`'schedule'`)
  - `💰 Bảng lương` (`'salary'`)
  - `📝 Ghi chú` (`'notes'`)

### 3.3 New Component `components/NotesTab.tsx`
- **Khung Tạo Ghi Chú Nhanh:**
  - Textarea nhập nội dung ghi chú.
  - Tùy chọn gán ngày: Date picker.
  - Tùy chọn gán ca làm: Dropdown các ca (`B18`, `B16`, `B`...).
  - Tự động đóng dấu mốc thời gian tạo (`20:02 - 27/07/2026`).
- **Danh Sách Thẻ Ghi Chú:**
  - Checkbox đánh dấu (✓ Đã xong / Chưa hoàn thành).
  - Badge nhãn gán (`📅 Ngày 27/07/2026`, `⏰ Ca B18`).
  - Nút Chỉnh sửa nội dung & Nút Xóa ghi chú.
  - Badge trạng thái `✓ Đã tự động lưu`.

### 3.4 Thẻ 4 Nhắc Ghi Chú (`components/NotificationsTab.tsx`)
- Bổ sung bộ chọn 2 chế độ thời gian:
  - `[ 🟢 Trước ca làm ]` (chọn số phút trước ca).
  - `[ ⏰ Giờ cố định hàng ngày ]` (chọn giờ báo cố định `08:00`).

---

## 4. Telegram Cron Reminder Logic (`app/api/cron/reminders/route.ts`)

- Khi gửi thông báo ghi chú, cron handler sẽ tìm tất cả các ghi chú chưa hoàn thành trong `userNotes` khớp với ngày/ca làm hiện tại và định dạng thành danh sách gửi qua Telegram:
  ```text
  📝 Note nhẹ cho bé nè:
  • Mang laptop & áo đồng phục
  • Đổi ca với anh A
  ✨ Đừng có quên đó nheee!
  ```
