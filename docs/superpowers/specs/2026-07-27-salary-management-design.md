# Design Spec: Quản Lý Lương & Bảng Tính Giờ Công (Salary & Payroll Management)

**Date:** 2026-07-27  
**Status:** Approved  
**Author:** Pair Programmer & User  

---

## 1. Overview & Objective

Hệ thống quản lý thời khóa biểu và lịch làm việc cần bổ sung thêm Tab thứ 3 **"Bảng Lương" (Salary Management)** trên ứng dụng Web Next.js. Chức năng này giúp người dùng tự động tính toán tổng số giờ công và tổng số tiền lương theo khoảng thời gian tùy chọn (ví dụ: từ ngày 1 đến ngày 31 tháng 7).

### Mục tiêu chính:
- Thêm ô cấu hình mức lương theo giờ (ví dụ `26,000 VNĐ / giờ`), hỗ trợ tự động lưu.
- Chọn mốc thời gian linh hoạt với nút chọn nhanh (*Tháng này*, *Tháng trước*, *30 ngày qua*) hoặc tùy chỉnh ngày bắt đầu / kết thúc.
- Tính toán chính xác tổng số giờ công (hỗ trợ số giờ lẻ như `7.5 giờ`) và tổng số tiền nhận.
- Nhật ký chi tiết liệt kê **đầy đủ 100% tất cả các ngày trong khoảng thời gian đã chọn** (bao gồm cả ngày nghỉ OFF) để đối soát minh bạch, không bỏ sót bất kỳ ngày nào.

---

## 2. Data Models & API Interface

### 2.1 Type Definitions (`types/schedule.ts`)

```typescript
export interface ScheduleItem {
  id: string;
  dayOfWeek: 'Thu2' | 'Thu3' | 'Thu4' | 'Thu5' | 'Thu6' | 'Thu7' | 'CN';
  date?: string;         // Định dạng "YYYY-MM-DD" cho từng ngày cụ thể
  startTime: string;     // "18:00"
  endTime: string;       // "22:00"
  subject: string;       // "Ca làm Highlands Coffee"
  location: string;      // "Highlands Coffee"
  note?: string;         // "Ca B18"
  reminderEnabled: boolean;
}

export interface ScheduleSettings {
  morningTime: string;       // "07:00"
  leadTimeMinutes: number;   // 30
  enableMorning: boolean;    // true
  enableLeadTime: boolean;   // true
  telegramBotToken?: string;
  telegramChatId?: string;
  employeeName?: string;     // "Thanh Hương"
  geminiApiKey?: string;     // Google Gemini API Key cho AI OCR
  hourlyRate?: number;       // Đơn giá lương/giờ (mặc định: 26000)
}
```

### 2.2 Database & API Layer (`lib/firebase.ts` & `lib/local-db.ts`)
- Thêm trường `hourlyRate` vào cấu hình `settings` trong Firebase Firestore và Local DB JSON.
- Đảm bảo `/api/settings` lưu và trả về `hourlyRate`.
- Đảm bảo `/api/schedule` hỗ trợ trả về mảng các `ScheduleItem` có chứa `date` (`YYYY-MM-DD`).

---

## 3. Salary Calculation Algorithm

Khi người dùng chọn mốc thời gian từ `fromDate` đến `toDate` (Ví dụ: `2026-07-01` đến `2026-07-31`):

1. **Tạo chuỗi tất cả các ngày liên tục (`calendarDays`):**
   Tạo mảng chứa tất cả các ngày từ `fromDate` đến `toDate`. Với tháng 7, mảng gồm 31 phần tử từ `2026-07-01` đến `2026-07-31`.

2. **Tính toán số giờ cho từng ca làm việc (`calculateShiftHours`):**
   ```typescript
   function calculateShiftHours(startTime: string, endTime: string): number {
     const [startH, startM] = startTime.split(':').map(Number);
     const [endH, endM] = endTime.split(':').map(Number);
     const startTotalMin = startH * 60 + startM;
     let endTotalMin = endH * 60 + endM;
     
     // Xử lý ca qua đêm (Ví dụ 22:00 -> 02:00)
     if (endTotalMin <= startTotalMin) {
       endTotalMin += 24 * 60;
     }
     
     return Number(((endTotalMin - startTotalMin) / 60).toFixed(2));
   }
   ```

3. **Map thông tin cho từng ngày (`dailyBreakdown`):**
   - Với mỗi ngày `D` (`YYYY-MM-DD`):
     - Tìm các `ScheduleItem` thuộc ngày `D` (`item.date === D`).
     - **Nếu có ca làm:**
       - Tổng số giờ trong ngày $H_{day} = \sum \text{calculateShiftHours}(shift)$.
       - Lương trong ngày $S_{day} = H_{day} \times \text{hourlyRate}$.
       - Trạng thái: `WORKED`.
     - **Nếu không có ca làm:**
       - Số giờ công $H_{day} = 0.0$.
       - Lương trong ngày $S_{day} = 0$.
       - Trạng thái: `OFF`.

4. **Tổng hợp KPIs:**
   - **Tổng lương dự kiến:** $\sum S_{day}$
   - **Tổng số giờ công:** $\sum H_{day}$
   - **Số ngày đi làm:** Số lượng ngày có $H_{day} > 0$
   - **Số ngày nghỉ (OFF):** Số lượng ngày có $H_{day} = 0$

---

## 4. UI Architecture & Components

### 4.1 Navigation (`components/BottomNav.tsx`)
Bổ sung Tab thứ 3 với icon `Wallet`:
```tsx
<button onClick={() => onChangeTab('salary')}>
  <Wallet className="w-5 h-5" />
  <span className="text-xs">Bảng Lương</span>
</button>
```

### 4.2 Component `components/SalaryTab.tsx`
Cấu trúc giao diện từ trên xuống dưới:

1. **Header Cấu Hình Lương & Mốc Thời Gian:**
   - Ô nhập mức lương theo giờ: `[ 26,000 ] VNĐ / giờ` (Tự động lưu debounced).
   - Thanh chọn khoảng ngày với các nút preset:
     - `Tháng này` (Ví dụ 01/07 - 31/07)
     - `Tháng trước` (Ví dụ 01/06 - 30/06)
     - `30 ngày qua`
     - `Tùy chỉnh`: Hiện 2 ô chọn ngày `Từ ngày` $\rightarrow$ `Đến ngày`.

2. **Bảng Thống Kê KPI (4 Thẻ):**
   - **Thẻ 1 (Lớn nhất):** 💰 **TỔNG LƯƠNG NHẬN** (Ví dụ `4,550,000 VNĐ`).
   - **Thẻ 2:** ⏱️ **TỔNG GIỜ CÔNG** (Ví dụ `175.0 giờ`).
   - **Thẻ 3:** 📅 **NGÀY ĐI LÀM** (Ví dụ `25 ngày`).
   - **Thẻ 4:** ☕ **NGÀY NGHỈ (OFF)** (Ví dụ `6 ngày`).

3. **Danh Sách Nhật Ký Chi Tiết (Exhaustive Daily Breakdown List):**
   - Liệt kê đầy đủ 100% tất cả các ngày trong khoảng thời gian đã chọn (từ ngày 1 đến 31).
   - **Thẻ Ngày Có Làm:** Nổi bật với tông màu Tím/Xanh, hiển thị tên ca làm (e.g. `Ca B18: 18h - 22h`), số giờ (`4.0 giờ`), số tiền (`104,000đ`).
   - **Thẻ Ngày Nghỉ (OFF):** Nổi bật với tông màu Xám nhẹ, hiển thị `Nghỉ (OFF)`, `0.0 giờ`, `0đ`.

---

## 5. Verification & Testing Strategy

1. **Kiểm thử đơn vị tính số giờ (Unit Test):**
   - Test ca 18:00 - 22:00 = 4.0 giờ.
   - Test ca 15:00 - 22:00 = 7.0 giờ.
   - Test ca lẻ 11:30 - 18:00 = 6.5 giờ.
2. **Kiểm thử bảng nhật ký (Exhaustive Range Check):**
   - Chọn từ 01/07/2026 đến 31/07/2026: Đảm bảo danh sách trả về đúng 31 phần tử đại diện cho 31 ngày.
3. **Kiểm thử tính lương chính xác:**
   - Thay đổi mức lương từ 26,000đ sang 30,000đ: Kiểm tra tổng tiền và tiền từng ngày nhảy đúng lập tức.
4. **Kiểm thử Next.js Production Build:**
   - Chạy `npm run build` đảm bảo 0 lỗi TypeScript và 0 lỗi compilation.
