# Thiết Kế Sửa Lỗi OCR & Tăng Độ Chính Xác Cho schedule-telegram-app

**Ngày:** 27-07-2026  
**Trạng thái:** Đã duyệt bởi User  

---

## 1. Tổng Quan Vấn Đề

Dự án hiện gặp 2 vấn đề lớn ở tính năng Import Ảnh lịch làm việc qua OCR:
1. **Lỗi `Failed to fetch`:** Do ứng dụng gọi Tesseract.js ở phía Client (Trình duyệt) khi API Server bị lỗi, khiến trình duyệt tìm cách tải worker, WASM và file dữ liệu tiếng Việt từ các CDN nước ngoài (`cdn.jsdelivr.net` / `tessdata.projectnaptha.com`), dẫn đến lỗi kết nối mạng/CORS.
2. **Độ chính xác chưa cao:** Chưa tối ưu hóa tiền xử lý ảnh qua Sharp trước khi đưa vào Tesseract, và thuật toán tách dòng `parseScheduleLine` chưa bao quát hết các biến thể OCR nhầm lẫn của bảng lịch (đặc biệt lịch làm việc Highlands Coffee).

---

## 2. Mục Tiêu & Phạm Vi Giải Pháp

- **100% Server OCR:** Chuyển toàn bộ quá trình OCR về Server API (`/api/ocr`), loại bỏ hoàn toàn Client-side fallback gọi CDN ngoài.
- **Nạp dữ liệu offline cục bộ:** Lưu và gzipping 2 file ngôn ngữ `vie.traineddata.gz` và `eng.traineddata.gz` ngay tại máy chủ Node.js để Tesseract đọc trực tiếp offline.
- **Tối ưu hình ảnh:** Nâng cấp Sharp pipeline với các bước: Resize (1800px), Grayscale, Normalize, Sharpen để văn bản trong bảng lịch nổi bật.
- **Chuẩn hóa nhận diện ca làm:** Mở rộng từ điển quy đổi ca làm (fuzzy shift code matching) cho các ca phổ biến (B18, B16, B17, A11, A, B, khung giờ tùy chỉnh `11-18H`, `14-18H`,...) và lọc các cột tổng giờ rác.

---

## 3. Kiến Trúc Chi Tiết

### 3.1. Cấu Trúc File & Luồng Xử Lý Data

```mermaid
flowchart TD
    A[User upload ảnh lịch] --> B[app/page.tsx: handleFileUpload]
    B --> C[lib/ocr-parser.ts: parseScheduleImage]
    C -->|POST /api/ocr| D[app/api/ocr/route.ts]
    D --> E[Sharp image preprocessing]
    E --> F[Tesseract Node Worker with vie+eng offline .gz]
    F --> G[lib/ocr-parser.ts: matchEmployeeLine & parseScheduleLine]
    G --> H[Trả về JSON ParsedShiftResult[]]
    H --> I[Giao diện OcrPreviewModal hiển thị 7 ngày để xác nhận]
```

### 3.2. Chi Tiết Thay Đổi Các File

#### A. File `app/api/ocr/route.ts`
- **Tiền xử lý Sharp:**
  ```ts
  const processedBuffer = await sharp(inputBuffer)
    .resize({ width: 1800, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.5 })
    .toBuffer();
  ```
- **Tesseract Worker Offline:**
  Nạp file ngôn ngữ `.gz` cục bộ qua tham số `gzip: true` và `langPath: process.cwd()`.

#### B. File `lib/ocr-parser.ts`
- **Loại bỏ Client fallback:** Trong `parseScheduleImage`, xóa bỏ hoàn toàn phần khởi tạo `createWorker` ở phía trình duyệt để không bao giờ xảy ra lỗi "Failed to fetch" từ CDN ngoài. Trả về thông báo lỗi trực tiếp từ phản hồi của Server API.
- **Tối ưu `matchEmployeeLine`:** Loại bỏ dấu tiếng Việt, làm sạch chuỗi, khớp từ linh hoạt (word-level matching) với tên nhân viên trong Cấu hình.
- **Tối ưu `parseScheduleLine`:**
  - Hỗ trợ ký tự ngăn bảng `|` hoặc khoảng trắng.
  - Lọc bỏ ô tổng giờ ở cuối dòng (ví dụ `tong`, `total`, `h`, `gio`, `28h`, `30h`).
  - Quy đổi linh hoạt các mã ca nhầm lẫn do OCR:
    - **Ca B18:** `B18`, `BIS`, `BIG`, `MIS`, `BH`, `BI`, `B1`, `818`, `BS`, `B1S`, `BI8`, `B1B`, `B1O`, `B19` -> `18:00 - 22:00`
    - **Ca B16:** `B16`, `B6`, `BIE`, `MIE`, `B1E`, `M1E`, `BI6`, `MI6`, `BE`, `ME`, `B16H` -> `16:00 - 22:00`
    - **Ca B17:** `B17`, `B7` -> `17:00 - 22:00`
    - **Ca A11:** `A11`, `ALL`, `A11H` -> `07:00 - 11:00`
    - **Ca A:** `A`, `A1` -> `07:00 - 15:00`
    - **Ca B:** `B`, `5`, `S` -> `15:00 - 22:00`
    - **Giờ tùy chỉnh:** `11-18H`, `14-18H`, `10-14H`, `8-16H` -> bóc tách chính xác `HH:MM`.
    - **OFF:** `OFF`, `OF`, `NGHI`, `N`, `-`, `X`, `0` -> Ca nghỉ.

#### C. Chuẩn Bị Dữ Liệu Ngôn Ngữ
- Gzip 2 file `vie.traineddata` và `eng.traineddata` thành `vie.traineddata.gz` và `eng.traineddata.gz` đặt tại thư mục gốc của dự án.

---

## 4. Kiểm Thử & Xác Nhận (Verification)

1. **Gzip File Check:** Kiểm tra sự tồn tại của `vie.traineddata.gz` và `eng.traineddata.gz`.
2. **Server API Test:** Gửi ảnh mẫu qua `/api/ocr` kiểm tra trả về HTTP 200 JSON chứa đúng 7 ngày ca làm.
3. **Client Network Check:** Đảm bảo khi bấm Import Ảnh không xuất hiện bất kỳ request ngoài nào tới jsdelivr/unpkg CDN.
