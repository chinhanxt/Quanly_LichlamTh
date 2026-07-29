# Multi-User Authentication & Data Isolation Design Specification

## 1. Overview
The goal of this system is to introduce strict multi-user authentication and data isolation for `schedule-telegram-app`. Access to the application is protected by a full-screen login barrier. Once authenticated, user data (schedules, notification settings, notes, salary calculations) is strictly isolated per user.

### Key Requirements
1. **Accounts**:
   - `thanhhuong` (Password: `1515`, Display Name: `Thanh Hương`) — Inherits all pre-existing schedule items, notification settings, and notes.
   - `chinhan` (Password: `1515`, Display Name: `Chí Nhân`) — Fresh isolated workspace.
2. **Strict Auth Lock**: Unauthenticated visitors cannot view or alter any schedule data.
3. **Personalized Header**: Header displays `Xin chào, <DisplayName>! 👋` dynamically based on the logged-in session.
4. **Custom Password Change**: Simple in-app password update in the Settings tab, persisting directly to the database without complex Firebase Auth dependencies.
5. **Telegram Bot Multi-User Routing**: Incoming Telegram webhook messages are automatically mapped to the user whose `allowedChatIds` contains the sender's Chat ID.

---

## 2. Authentication Architecture

### 2.1 API Endpoints
- `POST /api/auth/login`
  - **Body**: `{ username, password }`
  - **Behavior**: Verifies credentials against `users/{username}` store. On success, sets an HTTP-only session cookie (`app_session`) containing encrypted `{ username, displayName }` and returns `{ success: true, user: { username, displayName } }`.
- `POST /api/auth/logout`
  - **Behavior**: Clears the `app_session` cookie and returns `{ success: true }`.
- `GET /api/auth/me`
  - **Behavior**: Inspects session cookie. Returns `{ authenticated: true, user: { username, displayName } }` if valid, or `{ authenticated: false }`.
- `POST /api/auth/change-password`
  - **Body**: `{ currentPassword, newPassword }`
  - **Behavior**: Validates `currentPassword` for the logged-in session. Updates password in `users/{username}` database record.

### 2.2 Client Auth Guard
- An `AuthProvider` React Context manages auth state (`user`, `loading`, `login`, `logout`, `changePassword`).
- If `loading` is false and `user` is null: Renders a sleek, full-screen glassmorphism **Login Modal**.
- Header displays: `Xin chào, {user.displayName}! 👋` with a **🚪 Đăng xuất** button.

---

## 3. Data Storage & Isolation Architecture

### 3.1 Firebase Firestore Schema
- Document: `users/thanhhuong`
  - `{ username: "thanhhuong", password: "1515", displayName: "Thanh Hương" }`
  - Subcollection: `users/thanhhuong/settings/config`
  - Subcollection: `users/thanhhuong/schedules/items`
- Document: `users/chinhan`
  - `{ username: "chinhan", password: "1515", displayName: "Chí Nhân" }`
  - Subcollection: `users/chinhan/settings/config`
  - Subcollection: `users/chinhan/schedules/items`

### 3.2 Local DB Fallback (JSON files)
- `data/users.json`: Stores user credential objects.
- `data/settings_thanhhuong.json` & `data/schedules_thanhhuong.json`
- `data/settings_chinhan.json` & `data/schedules_chinhan.json`

### 3.3 Data Migration Strategy
- On first startup, if `users/thanhhuong` or `users/chinhan` does not exist:
  - System automatically seeds `thanhhuong` and copies existing root schedules & settings to `thanhhuong`'s store.
  - System seeds `chinhan` with default settings and empty schedule array.

---

## 4. Telegram Webhook Multi-User Routing
When Telegram webhook receives an incoming update from `chatId`:
1. Fetches settings for all users (`thanhhuong`, `chinhan`).
2. Identifies matching user `U` where `chatId` is in `U.settings.allowedChatIdsStr` or `U.settings.telegramChatId`.
3. If no match is found, responds with Access Denied message containing `chatId`.
4. If match is found, processes `/start`, OCR, and notes commands strictly within user `U`'s database scope.

---

## 5. User Interface Updates
1. **Header Component**: Replace static "Xin chào! 👋" with dynamic `Xin chào, {user.displayName}! 👋` + Logout action.
2. **Settings Tab**: Add a **🔑 Đổi mật khẩu tài khoản** section with inputs for Current Password, New Password, Confirm New Password, and a Change Password button.
