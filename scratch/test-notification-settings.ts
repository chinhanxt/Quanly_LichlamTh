import { getLocalSettings, saveLocalSettings } from '../lib/local-db';

const initialSettings = getLocalSettings();

const updatedSettings = saveLocalSettings({
  ...initialSettings,
  enableCheckInReminder: true,
  checkInLeadMinutes: 15,
  checkInTemplate: '📍 Sắp tới giờ ca {Ca}! Nhớ Check-in nhé.',
  enableCheckOutReminder: true,
  checkOutLagMinutes: 10,
  checkOutTemplate: '✅ Đã hết ca {Ca}! Nhớ Check-out ra về nhé.',
});

const reloaded = getLocalSettings();

if (
  reloaded.checkInLeadMinutes === 15 &&
  reloaded.checkOutLagMinutes === 10 &&
  reloaded.checkInTemplate?.includes('Check-in')
) {
  console.log('SUCCESS: Notification settings persisted correctly');
} else {
  console.error('FAIL: Notification settings persistence failed', reloaded);
  process.exit(1);
}

// Restore
saveLocalSettings(initialSettings);
