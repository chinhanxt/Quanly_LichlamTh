import { getLocalSettings, saveLocalSettings } from '../lib/local-db';

const initialSettings = getLocalSettings();

const updatedSettings = saveLocalSettings({
  ...initialSettings,
  shiftReminderTemplate: '🔔 Tới giờ đi làm rồi kìaaaaa 🏃‍♀️ Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn liền đi bé ơiii!',
  customNotifications: [
    {
      id: 'custom_123',
      title: 'Nhắc mang cơm cho tui',
      enabled: true,
      leadMinutes: 15,
      template: '🍱 Bé ơi nhớ mang cơm đi làm nheeee!',
    },
  ],
});

const reloaded = getLocalSettings();

if (
  reloaded.customNotifications?.length === 1 &&
  reloaded.customNotifications[0].title === 'Nhắc mang cơm cho tui'
) {
  console.log('SUCCESS: Custom notifications persisted correctly');
} else {
  console.error('FAIL: Custom notifications persistence failed', reloaded);
  process.exit(1);
}

// Restore
saveLocalSettings(initialSettings);
