# Multi-User Authentication & Data Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-user authentication with 2 initial accounts (`thanhhuong` and `chinhan`), full-screen login barrier, in-app password change, isolated schedule data per user, and multi-user Telegram webhook routing.

**Architecture:** A custom session cookie (`app_session`) authenticates requests. Firestore/Local-DB schema is scoped under `users/{username}` so schedules, settings, and notes are strictly isolated per user.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Context, Tailwind CSS, Firebase Firestore / Local JSON fallback.

## Global Constraints

- User accounts: `thanhhuong` (pass: `1515`, display: `Thanh Hương`), `chinhan` (pass: `1515`, display: `Chí Nhân`).
- All pre-existing schedules, notes, and settings must be assigned to `thanhhuong`.
- No Firebase Auth dependency; credentials and passwords stored directly in database scope for easy in-app password change.
- Strict full-screen auth lock when not logged in.
- Header displays personalized `Xin chào, <DisplayName>! 👋`.

---

### Task 1: User Types & User-Scoped Database Layer

**Files:**
- Create: `types/user.ts`
- Modify: `types/schedule.ts`
- Modify: `lib/local-db.ts`
- Modify: `lib/firebase.ts`
- Create: `tests/user-auth-db.test.ts`

**Interfaces:**
- Consumes: Existing `ScheduleSettings`, `ScheduleItem`, `UserNote`
- Produces: `User` interface, `getSettingsForUser(username)`, `getScheduleItemsForUser(username)`, `verifyUserPassword(username, pass)`, `updateUserPassword(username, newPass)`

- [ ] **Step 1: Write the failing unit test for user authentication and data isolation**

```typescript
// tests/user-auth-db.test.ts
import test from 'node.test';
import assert from 'node:assert/strict';
import { verifyUserPasswordLocal, updateUserPasswordLocal, getSettingsForUserLocal } from '../lib/local-db';

test('User Auth & Database Isolation', async (t) => {
  await t.test('should verify default user password correctly', async () => {
    const valid = verifyUserPasswordLocal('thanhhuong', '1515');
    assert.equal(valid, true);

    const invalid = verifyUserPasswordLocal('thanhhuong', 'wrongpass');
    assert.equal(invalid, false);
  });

  await t.test('should allow updating user password', async () => {
    updateUserPasswordLocal('thanhhuong', 'newpass123');
    assert.equal(verifyUserPasswordLocal('thanhhuong', 'newpass123'), true);
    // Reset back
    updateUserPasswordLocal('thanhhuong', '1515');
  });

  await t.test('should return scoped settings for user', async () => {
    const settings = getSettingsForUserLocal('thanhhuong');
    assert.ok(settings);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/user-auth-db.test.ts`
Expected: FAIL (modules/functions not exported yet)

- [ ] **Step 3: Implement minimal user types and database functions**

Create `types/user.ts`:
```typescript
export interface User {
  username: string;
  password: string;
  displayName: string;
  createdAt?: string;
}

export interface AuthSessionUser {
  username: string;
  displayName: string;
}
```

Update `lib/local-db.ts`:
Add `DEFAULT_USERS` array:
```typescript
export const DEFAULT_USERS: User[] = [
  { username: 'thanhhuong', password: '1515', displayName: 'Thanh Hương' },
  { username: 'chinhan', password: '1515', displayName: 'Chí Nhân' },
];
```
Add functions: `getUserLocal(username)`, `verifyUserPasswordLocal(username, pass)`, `updateUserPasswordLocal(username, newPass)`, `getSettingsForUserLocal(username)`, `saveSettingsForUserLocal(username, settings)`, `getScheduleItemsForUserLocal(username)`, `saveScheduleItemsForUserLocal(username, items)`.

Update `lib/firebase.ts`:
Add user-scoped Firestore helpers: `getUserFromFirestore(username)`, `verifyUserPasswordInFirestore(username, pass)`, `updateUserPasswordInFirestore(username, newPass)`, `getSettingsForUser(username)`, `saveSettingsForUser(username, settings)`, `getScheduleItemsForUser(username)`, `saveScheduleItemsForUser(username, items)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/user-auth-db.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add types/user.ts types/schedule.ts lib/local-db.ts lib/firebase.ts tests/user-auth-db.test.ts
git commit -m "feat: implement user-scoped database access and authentication methods"
```

---

### Task 2: Auth API Routes & Session Management

**Files:**
- Create: `lib/auth-session.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/me/route.ts`
- Create: `app/api/auth/change-password/route.ts`
- Create: `tests/auth-api.test.ts`

**Interfaces:**
- Consumes: `verifyUserPassword`, `updateUserPassword` from `lib/firebase.ts` & `lib/local-db.ts`
- Produces: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/change-password`

- [ ] **Step 1: Write failing integration test for Auth API endpoints**

```typescript
// tests/auth-api.test.ts
import test from 'node.test';
import assert from 'node:assert/strict';
import { POST as loginPOST } from '../app/api/auth/login/route';
import { GET as meGET } from '../app/api/auth/me/route';

test('Auth API Routes', async (t) => {
  await t.test('should reject invalid login credentials', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'thanhhuong', password: 'wrong' }),
    });
    const res = await loginPOST(req);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  await t.test('should accept valid login for thanhhuong', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'thanhhuong', password: '1515' }),
    });
    const res = await loginPOST(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.displayName, 'Thanh Hương');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/auth-api.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Auth Session helper and API Routes**

Create `lib/auth-session.ts`:
Implement base64url or HMAC signed session token helper: `createSessionToken(payload)`, `parseSessionToken(token)`.

Create `app/api/auth/login/route.ts`:
Authenticate username/password via `verifyUserPasswordInFirestore` / `verifyUserPasswordLocal`. Set HTTP-only cookie `app_session`.

Create `app/api/auth/logout/route.ts`:
Clear `app_session` cookie.

Create `app/api/auth/me/route.ts`:
Parse `app_session` cookie and return current session user profile.

Create `app/api/auth/change-password/route.ts`:
Verify current password for session user and update password in DB.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/auth-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth-session.ts app/api/auth/login/route.ts app/api/auth/logout/route.ts app/api/auth/me/route.ts app/api/auth/change-password/route.ts tests/auth-api.test.ts
git commit -m "feat: implement Auth API routes and session cookie management"
```

---

### Task 3: Auth Provider & Glassmorphism Login Modal UI

**Files:**
- Create: `components/AuthProvider.tsx`
- Create: `components/LoginModal.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/Header.tsx`

**Interfaces:**
- Consumes: Auth API endpoints (`/api/auth/me`, `/api/auth/login`, `/api/auth/logout`)
- Produces: `useAuth()` hook, full-screen login barrier UI, dynamic personalized Header.

- [ ] **Step 1: Create `AuthProvider.tsx` Context**

Create `components/AuthProvider.tsx` managing `user`, `loading`, `login(u, p)`, `logout()`, `changePassword(oldP, newP)`.

- [ ] **Step 2: Create `LoginModal.tsx` Component**

Create `components/LoginModal.tsx`:
- Sleek full-screen glassmorphism card with username dropdown / text input, password field, show/hide password toggle, and "Đăng Nhập" submit button.
- Error alerts and smooth loading state.

- [ ] **Step 3: Wrap root `layout.tsx` and update `Header.tsx`**

Wrap `app/layout.tsx` with `AuthProvider`.
In `Header.tsx`:
- Render `Xin chào, {user.displayName}! 👋`
- Render a **🚪 Đăng xuất** button triggering `logout()`.

- [ ] **Step 4: Verify build locally**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/AuthProvider.tsx components/LoginModal.tsx app/layout.tsx components/Header.tsx
git commit -m "feat: add AuthProvider context, LoginModal UI barrier, and personalized Header"
```

---

### Task 4: Settings Tab Password Change & Multi-User Telegram Webhook

**Files:**
- Modify: `components/SettingsTab.tsx`
- Modify: `app/api/telegram-webhook/route.ts`
- Create: `tests/telegram-multiuser.test.ts`

**Interfaces:**
- Consumes: `changePassword()` from `AuthProvider`, `getSettingsForUser()`, `getScheduleItemsForUser()`
- Produces: Password change UI section in Settings, user-scoped Telegram Webhook routing.

- [ ] **Step 1: Write failing unit test for Multi-User Telegram Routing**

```typescript
// tests/telegram-multiuser.test.ts
import test from 'node.test';
import assert from 'node:assert/strict';
import { getSettingsForUserLocal, saveSettingsForUserLocal } from '../lib/local-db';

test('Telegram Multi-User Routing', async (t) => {
  await t.test('should isolate settings and chat IDs per user', async () => {
    saveSettingsForUserLocal('thanhhuong', { telegramChatId: '11111' } as any);
    saveSettingsForUserLocal('chinhan', { telegramChatId: '22222' } as any);

    const s1 = getSettingsForUserLocal('thanhhuong');
    const s2 = getSettingsForUserLocal('chinhan');

    assert.equal(s1.telegramChatId, '11111');
    assert.equal(s2.telegramChatId, '22222');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx tsx --test tests/telegram-multiuser.test.ts`
Expected: PASS

- [ ] **Step 3: Add Password Change section to `SettingsTab.tsx`**

In `components/SettingsTab.tsx`:
Add a **🔑 Đổi Mật Khẩu Tài Khoản** card containing:
- Mật khẩu hiện tại (Current password)
- Mật khẩu mới (New password)
- Xác nhận mật khẩu mới (Confirm new password)
- Button `🔑 Cập nhật mật khẩu` invoking `changePassword()`.

- [ ] **Step 4: Update `app/api/telegram-webhook/route.ts` for Multi-User Routing**

In `app/api/telegram-webhook/route.ts`:
Fetch settings for all active users (`thanhhuong`, `chinhan`).
Find matching user whose `telegramChatId` or `allowedChatIds` contains incoming `chatId`. Process OCR, schedule saves, and notes strictly within that target user's context.

- [ ] **Step 5: Verify build & tests**

Run: `npm run build && npx tsx --test tests/*.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add components/SettingsTab.tsx app/api/telegram-webhook/route.ts tests/telegram-multiuser.test.ts
git commit -m "feat: add in-app password change section and multi-user Telegram webhook routing"
```
