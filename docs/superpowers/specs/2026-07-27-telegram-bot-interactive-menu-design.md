# Telegram Interactive Bot System Design Specification

## Overview
This document specifies the architecture, user interaction model, data flows, and API endpoints for the **Telegram Interactive Assistant Bot** for the Next.js Schedule App.

The bot provides a hierarchical menu system (`ReplyKeyboard` & `InlineKeyboard`), AI-powered image OCR schedule import via direct Telegram photo uploads, modular salary and shift statistics breakdown, and seamless user note management directly inside Telegram.

---

## 1. System Architecture & Components

```
+------------------------+       +------------------------------------+
|  Telegram Bot Client   | <---> | Next.js Telegram Webhook Endpoint  |
|  (User & Partner)      |       | (/api/telegram-webhook/route.ts)   |
+------------------------+       +------------------------------------+
                                                  |
                                                  v
                               +------------------------------------+
                               |  Session State & Database Handler  |
                               |  (Firebase Realtime DB / Local DB) |
                               +------------------------------------+
                                                  |
                                                  v
                               +------------------------------------+
                               |  Gemini AI Vision OCR Engine       |
                               |  (/api/ocr/route.ts & ocr-parser)  |
                               +------------------------------------+
```

### Components:
1. **Telegram Webhook Route (`app/api/telegram-webhook/route.ts`)**:
   - Handles incoming HTTP `POST` requests from Telegram API.
   - Evaluates text commands, button clicks (`callback_query`), photo messages (`message.photo`), and user session states.
2. **Telegram Webhook Setup API (`app/api/telegram-setup-webhook/route.ts`)**:
   - Allows automatic 1-click Webhook registration from the web UI Settings tab.
3. **Session State Storage (`userNotes` & `telegramSessionState` in Database)**:
   - Stores user conversation state (`IDLE`, `AWAITING_NOTE`, `AWAITING_OCR_CONFIRM`).
   - Temporary payload buffer for pending OCR schedule items awaiting confirmation.
4. **OCR Image Processing Pipeline**:
   - Downloads photo files via Telegram `getFile` API.
   - Converts photo buffer to base64 and invokes `parseScheduleFromImage`.

---

## 2. Menu Hierarchy & Interactions

### Main Menu (`ReplyKeyboard`)
```
+------------------------------------+------------------------------------+
| 📸 Gửi Ảnh Lịch                    | 📋 Ca Làm Hôm Nay                  |
+------------------------------------+------------------------------------+
| 💰 Bảng Lương                      | 📝 Ghi Chú                         |
+------------------------------------+------------------------------------+
```

### Sub-Menu: Salary & Statistics (`ReplyKeyboard`)
Activated by clicking `💰 Bảng Lương`:
```
+------------------------------------+------------------------------------+
| 📊 Lương Tuần Này                  | 🗓️ Lương Tháng Này                 |
+------------------------------------+------------------------------------+
| ⏱️ Chi Tiết Giờ Làm                | 🔙 Menu Chính                      |
+------------------------------------+------------------------------------+
```

### Sub-Menu: Notes Management (`ReplyKeyboard`)
Activated by clicking `📝 Ghi Chú`:
```
+------------------------------------+------------------------------------+
| 📋 Xem Ghi Chú                     | ➕ Thêm Ghi Chú                    |
+------------------------------------+------------------------------------+
| ✅ Đã Hoàn Thành                   | 🔙 Menu Chính                      |
+------------------------------------+------------------------------------+
```

---

## 3. Data Flows & Key Workflows

### Workflow A: Direct Schedule Image Upload & AI OCR Import
1. User uploads a schedule image in Telegram.
2. Bot acknowledges: `⏳ Đang đọc lịch làm bằng AI Gemini, chờ bé xíu nhé...`.
3. Bot calls Gemini Vision OCR to extract shift items.
4. Bot stores extracted items in `telegramSessionState.pendingSchedule` and sends an `InlineKeyboard` preview:
   ```text
   📸 AI đã nhận diện được 4 ca làm:
   • Thứ 2 (27/07): Ca B18 (18:00 - 22:00)
   • Thứ 3 (28/07): Ca B16 (16:00 - 22:00)
   • Thứ 6 (31/07): Ca B18 (18:00 - 22:00)
   • Thứ 7 (01/08): Ca B (16:00 - 23:00)

   👉 Bấm nút bên dưới để xác nhận nhập lịch vào hệ thống:
   [ ✅ Xác Nhận Nhập Lịch ]   [ ❌ Hủy Bỏ ]
   ```
5. User clicks `[ ✅ Xác Nhận Nhập Lịch ]`:
   - Shifts are written into database schedule.
   - Bot edits message to: `🎉 Đã lưu 4 ca làm thành công! Hệ thống đã tự động cài đặt nhắc nhở Telegram.`

### Workflow B: Modular Salary Breakdown
- `📊 Lương Tuần Này`: Calculates hours & salary from Monday to Sunday of the current week (e.g. `4 ca làm = 18.0 giờ = 468,000 VNĐ`).
- `🗓️ Lương Tháng Này`: Calculates total accumulated salary for the month up to current date.
- `⏱️ Chi Tiết Giờ Làm`: Displays count of specific shift codes (e.g., `3 ca B18, 1 ca B16`).

### Workflow C: Creating Notes via Conversation
1. User clicks `[ ➕ Thêm Ghi Chú ]`.
2. Bot sets `userState = 'AWAITING_NOTE'` and replies: `✍️ Hãy gõ nội dung ghi chú của bạn (Ví dụ: "Mang áo đồng phục mới")...`.
3. User types message text.
4. Bot saves note into `settings.userNotes`, clears `userState`, and replies: `✅ Đã lưu ghi chú thành công!`.

---

## 4. API Endpoints Specification

### `POST /api/telegram-webhook`
- Accepts Telegram `Update` object.
- Validates bot token authorization.
- Routes request based on `message.text`, `message.photo`, or `callback_query`.
- Returns HTTP 200 OK.

### `POST /api/telegram-setup-webhook`
- Body: `{ telegramBotToken: string, webhookUrl: string }`
- Registers domain webhook via `https://api.telegram.org/bot<token>/setWebhook`.
- Returns `{ success: boolean, result: any }`.

---

## 5. Security & Verification
- Webhook authorization token check.
- Error handling for invalid photos or unrecognized OCR text with graceful fallbacks.
- Environment variable configuration for `NEXT_PUBLIC_APP_URL`.
