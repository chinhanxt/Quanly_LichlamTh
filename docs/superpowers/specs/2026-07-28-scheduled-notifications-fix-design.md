# Scheduled Notifications & Deduplication Architecture Design

**Date:** 2026-07-28  
**Status:** Approved  
**Target Project:** `/home/chinhan/schedule-telegram-app`

---

## 1. Executive Summary

The `schedule-telegram-app` application automates shift notifications, check-in/check-out reminders, morning summaries, and custom notes via Telegram. Currently, notifications fail to trigger at shift times because:
1. `vercel.json` is set to `"0 7 * * *"` (once daily at 07:00 UTC / 14:00 ICT), and Vercel Hobby limits cron jobs to once per day.
2. The cron endpoint lacks a stateful deduplication mechanism (`sentRemindersLog`), forcing narrow time windows that can miss notifications if cron execution drifts.
3. Date vs `dayOfWeek` matching logic needs normalization to prevent past weekly shifts from triggering unexpectedly.

This document specifies the design for high-frequency external webcron integration (via `cron-job.org` or similar), dual-mode authentication, stateful notification deduplication, and refined shift matching.

---

## 2. Architecture & Design Specifications

### 2.1 Dual Authentication for `/api/cron/reminders/route.ts`

The endpoint must authenticate requests securely whether called by Vercel Cron or an external HTTP webcron service:
* **Header Support:** `Authorization: Bearer <CRON_SECRET>`
* **Query Parameter Support:** `GET /api/cron/reminders?secret=<CRON_SECRET>`
* **Behavior:**
  * If `CRON_SECRET` is defined in environment variables, the endpoint checks both the `Authorization` header and the `secret` query parameter.
  * If neither matches, it returns `{ "error": "Unauthorized" }` with HTTP status `401`.
  * If `CRON_SECRET` is omitted (e.g. during local testing), access is permitted.

---

### 2.2 Notification Deduplication (`sentRemindersLog`)

To allow external webcron services to ping `/api/cron/reminders` every 1 to 5 minutes safely without spamming duplicate Telegram messages:

#### Data Structure Addition (`types/schedule.ts` & Firestore `settings/config`):
```typescript
export interface ScheduleSettings extends NotificationSettings {
  // ... existing fields
  sentRemindersLog?: Record<string, string>; // Maps reminderKey -> ISO Timestamp
}
```

#### Deduplication Keys Format:
* **Morning Summary:** `${currentYYYYMMDD}_morning_summary`
* **Shift Start Reminder:** `${currentYYYYMMDD}_${shiftId}_shift_start`
* **Check-In Reminder:** `${currentYYYYMMDD}_${shiftId}_check_in`
* **Check-Out Reminder:** `${currentYYYYMMDD}_${shiftId}_check_out`
* **Notes Reminder:** `${currentYYYYMMDD}_${shiftId}_notes`
* **Fixed-Time Notes:** `${currentYYYYMMDD}_fixed_notes`
* **Custom Notification:** `${currentYYYYMMDD}_${shiftId}_custom_${customNotificationId}`

#### Lifecycle & Garbage Collection:
* Before sending any Telegram message, the cron handler checks if `sentRemindersLog[key]` exists. If true, the reminder is skipped.
* After a successful Telegram message send, `sentRemindersLog[key] = new Date().toISOString()` is recorded, and updated settings are persisted.
* During each cron run, any log keys with timestamps older than 48 hours are automatically pruned to prevent document size growth.

---

### 2.3 Normalized Shift & Time Window Matching

#### Shift Date Filtering:
A shift is eligible for today's evaluations if:
* `item.reminderEnabled !== false` AND
* If `item.date` is populated: `item.date === currentYYYYMMDD`
* If `item.date` is empty/undefined: `item.dayOfWeek === currentDayOfWeek`

#### Timing Thresholds (Evaluated against ICT UTC+7):
1. **Morning Summary:**
   * Condition: `currentTimeStr >= morningSummaryTime` AND key `YYYY-MM-DD_morning_summary` not sent.
2. **Shift Start Reminder:**
   * Condition: `diffMinutes >= 0 && diffMinutes <= shiftLeadMins` AND key `YYYY-MM-DD_${shiftId}_shift_start` not sent.
3. **Check-In Reminder:**
   * Condition: `diffMinutes >= 0 && diffMinutes <= checkInLeadMins` AND key `YYYY-MM-DD_${shiftId}_check_in` not sent.
4. **Check-Out Reminder:**
   * Condition: `lagMinutes >= 0 && lagMinutes <= checkOutLagMins + 30` AND key `YYYY-MM-DD_${shiftId}_check_out` not sent.
5. **Notes Memo Reminder:**
   * `before_shift`: `diffMinutes >= 0 && diffMinutes <= notesLeadMins` AND key `YYYY-MM-DD_${shiftId}_notes` not sent.
   * `fixed_time`: `currentTimeStr >= notesFixedTime` AND key `YYYY-MM-DD_fixed_notes` not sent.

---

### 2.4 Persistence Layer Integration

Updates required across:
1. `types/schedule.ts`: Add `sentRemindersLog` to `ScheduleSettings`.
2. `lib/firebase.ts`: Include `sentRemindersLog` in `getSettings()` fallback and `updateSettings()`.
3. `lib/local-db.ts`: Include `sentRemindersLog` in default and read/write settings.

---

## 3. External Webcron Setup Workflow

1. Deploy app to Vercel and set Environment Variable `CRON_SECRET=your_chosen_secret`.
2. Register a free account on `cron-job.org`.
3. Create a Cron Job pointing to: `https://<your-vercel-domain>/api/cron/reminders?secret=your_chosen_secret`
4. Set execution interval to every 1 minute or every 5 minutes.
5. Verify logs in `cron-job.org` execution history.
