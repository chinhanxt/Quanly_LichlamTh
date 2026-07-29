# 📅 Quanly_LichlamTh (Schedule Telegram App)

![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?logo=nextdotjs)
![Telegram](https://img.shields.io/badge/Telegram_Bot-API-26A5E4?logo=telegram)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38BDF8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)

**Quanly_LichlamTh** (Schedule Telegram App) là ứng dụng Web App hiện đại tích hợp **Telegram Bot** và **Trí Tuệ Nhân Tạo / OCR**, giúp người dùng tự động quản lý lịch làm thêm, phân tích ảnh phân ca, nhắc nhở giờ làm việc qua Telegram và theo dõi thu nhập hàng tháng.

---

## ✨ Tính Năng Nổi Bật

### 1. 📅 Quản Lý Lịch Làm & Tính Lương Tự Động
- **Lập lịch tuần & ca làm**: Đăng ký ca sáng, chiều, tối hoặc ca linh hoạt.
- **Tính toán thu nhập thông minh**: Tự động tính số giờ làm, lương theo ca, lương tăng ca và ước tính tổng thu nhập tháng.
- **Theo dõi Check-in / Check-out**: Đánh giá chính xác thời gian bắt đầu và kết thúc ca làm thực tế.

### 2. 🤖 Trợ Lý Telegram Bot Nhắc Nhở Tự Động (`/api/cron/reminders`)
- **Thông báo tổng hợp đầu ngày (07:00 AM)**: Gửi tin nhắn Telegram tóm tắt danh sách ca làm việc trong ngày.
- **Cảnh báo trước ca làm (30 - 60 phút)**: Nhắc nhở người dùng chuẩn bị đi làm.
- **Nhắc Check-in / Check-out**: Đảm bảo không quên ghi nhận giờ làm.
- **Nhắc ghi chú & công việc cố định**: Tự động gửi nhắc nhở các công việc cá nhân.
- **Cơ chế chống lặp (`sentRemindersLog`)**: Đảm bảo mỗi thông báo chỉ gửi đúng 1 lần duy nhất trong ngày.

### 3. 📷 Nhận Diện Ảnh Lịch Phân Ca Bằng OCR (Tesseract OCR Engine)
- **Tải ảnh lịch làm việc**: Upload hình ảnh bảng phân ca tuần/tháng.
- **Tự động nhận diện chữ tiếng Việt (`vie.traineddata` & `eng.traineddata`)**: Bóc tách tên nhân viên, ngày làm và thời gian ca tự động điền vào lịch.

### 4. 🔒 Phân Quyền Multi-User & Đồng Bộ Đám Mây (Firebase Firestore)
- **Đa người dùng (Multi-User Scoping)**: Mỗi người dùng có không gian quản lý lịch và cài đặt Telegram riêng biệt.
- **Firebase Sync**: Lưu trữ dữ liệu an toàn trên Firebase Cloud Firestore kết hợp Local Fallback.

### 5. 🎨 Giao Diện Glassmorphism Dark Mode
- Thiết kế hiện đại theo chuẩn trải nghiệm người dùng cao cấp, tối ưu trên cả Mobile và Desktop.

---

## 🌐 Hướng Dẫn Quản Lý & Tắt Deploy Trực Tiếp Trên Vercel

*Lưu ý: Khi bạn xóa dự án ở máy tính cá nhân (local), trang web và API đã deploy trên Vercel vẫn tiếp tục hoạt động bình thường trên đám mây.*

Nếu bạn muốn tạm dừng hoặc ngắt hoàn toàn ứng dụng trên Vercel, hãy thực hiện theo các hướng dẫn sau:

#### 🔹 Cách 1: Tạm dừng dự án (Pause Project - *Khuyên dùng nếu chỉ muốn tắt tạm thời*)
1. Đăng nhập vào [https://vercel.com](https://vercel.com) -> Chọn dự án của bạn.
2. Vào **Settings** -> Cuộn xuống phần **Pause Project**.
3. Bấm **Pause** -> Web và API sẽ lập tức ngừng hoạt động (người dùng truy cập sẽ nhận thông báo tạm dừng).
4. Khi nào muốn chạy lại chỉ cần vào bấm **Unpause**.

#### 🔹 Cách 2: Tắt Cron Job / Webhook (Nếu chỉ muốn tắt nhắc nhở Telegram)
1. Vào dự án trên Vercel -> Chọn **Settings** -> **Environment Variables**.
2. Đổi hoặc xóa biến `CRON_SECRET` / Token Telegram -> Webcron sẽ không còn kích hoạt gửi tin nhắn được nữa.

#### 🔹 Cách 3: Xóa vĩnh viễn dự án khỏi Vercel (Delete Project)
1. Vào dự án trên Vercel -> Chọn **Settings** -> Tab **General**.
2. Cuộn xuống cuối trang tìm vùng màu đỏ **Delete Project**.
3. Bấm **Delete** và gõ lại tên dự án để xác nhận xóa vĩnh viễn bản deploy khỏi Vercel.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend / Backend Framework**: Next.js 15 (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS, Lucide React Icons, Glassmorphism design system.
- **Database & Cloud**: Firebase Firestore, Firebase App Check.
- **AI & Processing**: Tesseract.js (OCR), Node-Canvas.
- **Automation & Deployment**: Telegram Bot API, Vercel Cron / Webcron Integration.

---

## 📁 Cấu Trúc Dự Án

```text
Quanly_LichlamTh/
├── app/                        # Next.js App Router (Pages & API Routes)
│   ├── api/
│   │   ├── cron/reminders/     # Webhook/Cron nhắc nhở Telegram
│   │   ├── settings/           # API quản lý cấu hình người dùng
│   │   └── ocr/                # API nhận diện ảnh phân ca
│   ├── layout.tsx
│   └── page.tsx                # Trang Dashboard chính
├── components/                 # Các UI Tabs & Modals
│   ├── ScheduleTab.tsx         # Quản lý Lịch Làm
│   ├── IncomeTab.tsx           # Theo dõi Thu Nhập
│   ├── NotesTab.tsx            # Quản lý Ghi Chú
│   ├── OCRTab.tsx              # Đọc ảnh bảng phân ca
│   └── SettingsTab.tsx         # Cấu hình Telegram Bot Token & Webcron
├── lib/                        # Firebase & Telegram SDK Helpers
│   ├── firebase.ts
│   └── telegram.ts
├── data/                       # Bộ Dữ Liệu Ngôn Ngữ OCR (eng, vie)
├── types/                      # TypeScript Interface Definitions
├── vercel.json                 # Cấu hình Vercel Cron
├── package.json
└── README.md
```

---

## ⚙️ Cấu Hình Hẹn Giờ Thông Báo (Cron Reminders) Trực Tiếp Hoặc Webcron

Do gói **Vercel Hobby** giới hạn tần suất Cron Job 1 lần/ngày, ứng dụng tích hợp sẵn đường dẫn API công khai có bảo mật Secret Key để kết nối với các dịch vụ Webcron ngoài (như [cron-job.org](https://cron-job.org)).

### Các bước cài đặt:

1. **Thiết lập secret key trên Vercel:**
   - Vào Vercel Dashboard -> chọn Project -> **Settings** -> **Environment Variables**.
   - Thêm biến môi trường: `CRON_SECRET` = `<Mã_Bảo_Mật_Của_Bạn>` (ví dụ: `my_telegram_cron_secret_888`).

2. **Tạo Cron Job trên cron-job.org:**
   - Đăng ký tài khoản miễn phí tại [cron-job.org](https://cron-job.org).
   - Đặt URL: `https://<tên-app-của-bạn>.vercel.app/api/cron/reminders?secret=<Mã_Bảo_Mật_Của_Bạn>`
   - Đặt tần suất (Execution schedule): **Mỗi 1 phút** hoặc **Mỗi 5 phút**.
   - Bấm **Save**.

---

## 🚀 Hướng Dẫn Khởi Chạy Local

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Cấu hình file môi trường (.env.local)
cp .env.example .env.local

# 3. Chạy Dev Server
npm run dev
```

Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000).

---

## 📜 Giấy Phép (License)
Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
