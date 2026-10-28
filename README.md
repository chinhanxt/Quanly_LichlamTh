# 📅 Quanly_LichlamTh

![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?logo=nextdotjs)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38BDF8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)

Web app quản lý lịch làm, lịch học, bảng lương, ghi chú và chi tiêu — đọc ảnh bảng phân ca bằng Gemini AI / OCR, lưu dữ liệu trên Firebase Firestore.

## ✨ Tính năng

- **Lịch làm & tính lương**: đăng ký ca, tính giờ làm, lương theo ca, hệ số ngày lễ.
- **Lịch học**: thời khóa biểu HUB.
- **Nhập lịch từ ảnh**: Gemini 2.5 Flash (khi có API key) hoặc Tesseract OCR.
- **Đồng bộ Google Sheet**: lấy lịch trực từ bảng phân công.
- **Chi tiêu**: ghi thu/chi bằng câu tự nhiên qua Groq AI, đẩy sang Google Sheet.
- **Đa người dùng**: mỗi tài khoản có lịch và cấu hình riêng.

## 🛠️ Công nghệ

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Firebase Firestore, Gemini API, Groq API, Tesseract.js.

## 📁 Cấu trúc

```text
app/
  api/            # auth, schedule, settings, ocr, gemini-test, expense, study, sync-google-sheet
  page.tsx        # Dashboard chính
components/       # Các tab (Lịch làm, Lịch học, Lương, Ghi chú, Chi tiêu, Cấu hình) & modal
lib/              # Firebase, OCR parser, Google Sheets, tính lương
types/            # TypeScript types
tests/            # node:test (npm test)
```

## ⚙️ Chạy local

```bash
npm install
cp .env.example .env.local   # điền key nếu cần
npm run dev
npm test
```

## 🚀 Deploy

```bash
vercel --prod
```
