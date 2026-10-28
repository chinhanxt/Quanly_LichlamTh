import fs from 'fs';
import path from 'path';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { getDefaultRate } from './salary-calculator';
import { DEFAULT_GROQ_MODEL } from './expense-io';
import { User } from '@/types/user';

const DATA_DIR = path.join(process.cwd(), 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export const DEFAULT_USERS: User[] = [
  { username: 'thanhhuong', password: '1515', displayName: 'Thanh Hương' },
  { username: 'chinhan', password: '1515', displayName: 'Chí Nhân' },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getUsersLocal(): User[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
      return [...DEFAULT_USERS];
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users local:', err);
    return [...DEFAULT_USERS];
  }
}

export function saveUsersLocal(users: User[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users local:', err);
  }
}

export function getUserLocal(username: string): User | undefined {
  const users = getUsersLocal();
  return users.find((u) => u.username === username);
}

export function verifyUserPasswordLocal(username: string, pass: string): boolean {
  const user = getUserLocal(username);
  if (!user) return false;
  return user.password === pass;
}

export function updateUserPasswordLocal(username: string, newPass: string): boolean {
  const users = getUsersLocal();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) return false;
  users[idx].password = newPass;
  saveUsersLocal(users);
  return true;
}

export function getLocalScheduleItems(): ScheduleItem[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(SCHEDULE_FILE)) return [];
    const raw = fs.readFileSync(SCHEDULE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local schedule:', err);
    return [];
  }
}

export function saveLocalScheduleItems(items: ScheduleItem[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local schedule:', err);
  }
}

export function getScheduleItemsForUserLocal(username: string): ScheduleItem[] {
  try {
    ensureDataDir();
    const userScheduleFile = path.join(DATA_DIR, `schedule_${username}.json`);
    if (fs.existsSync(userScheduleFile)) {
      const raw = fs.readFileSync(userScheduleFile, 'utf-8');
      return JSON.parse(raw);
    }
    // Inheritance: thanhhuong falls back to legacy schedule.json
    if (username === 'thanhhuong') {
      return getLocalScheduleItems();
    }
    return [];
  } catch (err) {
    console.error(`Error reading schedule for user ${username}:`, err);
    return [];
  }
}

export function saveScheduleItemsForUserLocal(username: string, newItems: ScheduleItem[], merge: boolean = true): ScheduleItem[] {
  try {
    ensureDataDir();
    const userScheduleFile = path.join(DATA_DIR, `schedule_${username}.json`);
    let existingItems: ScheduleItem[] = [];
    if (fs.existsSync(userScheduleFile)) {
      try {
        existingItems = JSON.parse(fs.readFileSync(userScheduleFile, 'utf-8'));
      } catch {}
    } else if (username === 'thanhhuong' && fs.existsSync(SCHEDULE_FILE)) {
      existingItems = getLocalScheduleItems();
    }

    let mergedItems: ScheduleItem[];

    if (merge && existingItems.length > 0) {
      const newDates = new Set(newItems.map((i) => i.date).filter((d): d is string => Boolean(d && d.trim())));
      const newDays = new Set(newItems.map((i) => i.dayOfWeek));
      const hasItemsWithoutDate = newItems.some((i) => !i.date || !i.date.trim());

      const preserved = existingItems.filter((existing) => {
        if (existing.date && existing.date.trim()) {
          if (newDates.size > 0 && newDates.has(existing.date.trim())) {
            return false; // Overwrite
          }
          return true; // Keep
        }
        if (hasItemsWithoutDate && newDays.has(existing.dayOfWeek)) {
          return false; // Overwrite
        }
        return true; // Keep
      });

      mergedItems = [...preserved, ...newItems];
    } else {
      mergedItems = newItems;
    }

    fs.writeFileSync(userScheduleFile, JSON.stringify(mergedItems, null, 2), 'utf-8');
    if (username === 'thanhhuong') {
      saveLocalScheduleItems(mergedItems);
    }
    return mergedItems;
  } catch (err) {
    console.error(`Error saving schedule for user ${username}:`, err);
    return newItems;
  }
}

export function addScheduleItemForUserLocal(username: string, item: Omit<ScheduleItem, 'id'> & { id?: string }): ScheduleItem {
  const items = getScheduleItemsForUserLocal(username);
  const newItem: ScheduleItem = {
    ...item,
    id: item.id || ('local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    username,
  };
  items.push(newItem);
  const userScheduleFile = path.join(DATA_DIR, `schedule_${username}.json`);
  fs.writeFileSync(userScheduleFile, JSON.stringify(items, null, 2), 'utf-8');
  if (username === 'thanhhuong') {
    saveLocalScheduleItems(items);
  }
  return newItem;
}

export function updateScheduleItemForUserLocal(username: string, id: string, update: Partial<ScheduleItem>): boolean {
  const items = getScheduleItemsForUserLocal(username);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...update };
  const userScheduleFile = path.join(DATA_DIR, `schedule_${username}.json`);
  fs.writeFileSync(userScheduleFile, JSON.stringify(items, null, 2), 'utf-8');
  if (username === 'thanhhuong') {
    saveLocalScheduleItems(items);
  }
  return true;
}

export function deleteScheduleItemForUserLocal(username: string, id: string): boolean {
  const items = getScheduleItemsForUserLocal(username);
  const initialLen = items.length;
  let filtered = items.filter((i) => i.id !== id);

  if (filtered.length === initialLen && id) {
    filtered = items.filter((i) => !(i.id && (i.id.includes(id) || id.includes(i.id))));
  }

  const userScheduleFile = path.join(DATA_DIR, `schedule_${username}.json`);
  fs.writeFileSync(userScheduleFile, JSON.stringify(filtered, null, 2), 'utf-8');
  if (username === 'thanhhuong') {
    saveLocalScheduleItems(filtered);
  }
  return filtered.length < initialLen || initialLen === 0;
}

export function addLocalScheduleItem(item: Omit<ScheduleItem, 'id'>): ScheduleItem {
  return addScheduleItemForUserLocal('thanhhuong', item);
}

export function updateLocalScheduleItem(id: string, update: Partial<ScheduleItem>): boolean {
  return updateScheduleItemForUserLocal('thanhhuong', id, update);
}

export function deleteLocalScheduleItem(id: string): boolean {
  return deleteScheduleItemForUserLocal('thanhhuong', id);
}

// Field cấu hình thông báo/ghi chú/Telegram đã bỏ — lọc khỏi mọi nguồn settings
export const REMOVED_SETTINGS_FIELDS = [
  'telegramBotToken', 'telegramChatId', 'customWebhookUrl', 'allowedChatIds', 'allowedChatIdsStr',
  'telegramSessionState', 'locketBotToken', 'locketChatId',
  'morningTime', 'leadTimeMinutes', 'enableMorning', 'enableLeadTime',
  'enableShiftReminder', 'shiftReminderLeadMinutes', 'shiftReminderTemplate',
  'enableCheckInReminder', 'checkInLeadMinutes', 'checkInTemplate',
  'enableCheckOutReminder', 'checkOutLagMinutes', 'checkOutTemplate',
  'enableNotesReminder', 'notesLeadMinutes', 'notesTemplate', 'notesTimingMode', 'notesFixedTime',
  'enableMorningSummary', 'morningSummaryTime', 'morningSummaryTemplate',
  'customNotifications', 'sentRemindersLog',
  'employeeName', 'googleSheetUrl', 'expenseGoogleSheetUrl',
];

export function stripRemovedSettings<T extends Record<string, any>>(data: T): T {
  const result: Record<string, any> = { ...data };
  for (const key of REMOVED_SETTINGS_FIELDS) delete result[key];
  return result as T;
}

function readJson(file: string): Record<string, any> | null {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    // ignore broken local cache
  }
  return null;
}

export function getLocalSettings(): ScheduleSettings {
  ensureDataDir();
  const parsed = readJson(SETTINGS_FILE) || {};
  return stripRemovedSettings({
    ...parsed,
    hourlyRate: typeof parsed.hourlyRate === 'number' ? parsed.hourlyRate : getDefaultRate('thanhhuong'),
    geminiApiKey: parsed.geminiApiKey || process.env.GEMINI_API_KEY || '',
  });
}

export function saveLocalSettings(settings: ScheduleSettings): ScheduleSettings {
  try {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local settings:', err);
  }
  return settings;
}

export function getSettingsForUserLocal(username: string): ScheduleSettings {
  try {
    ensureDataDir();
    const parsed = readJson(path.join(DATA_DIR, `settings_${username}.json`))
      || (username === 'thanhhuong' ? readJson(SETTINGS_FILE) : null)
      || {};
    return stripRemovedSettings({
      ...parsed,
      hourlyRate: typeof parsed.hourlyRate === 'number' && parsed.hourlyRate > 0 ? parsed.hourlyRate : getDefaultRate(username),
      geminiApiKey: parsed.geminiApiKey || process.env.GEMINI_API_KEY || '',
      groqApiKey: parsed.groqApiKey || process.env.GROQ_API_KEY || '',
      groqModel: parsed.groqModel || DEFAULT_GROQ_MODEL,
      username,
    });
  } catch (err) {
    return { hourlyRate: getDefaultRate(username), username };
  }
}

export function saveSettingsForUserLocal(username: string, settings: ScheduleSettings): ScheduleSettings {
  try {
    ensureDataDir();
    const userSettingsFile = path.join(DATA_DIR, `settings_${username}.json`);
    const settingsToSave = { ...settings, username };
    fs.writeFileSync(userSettingsFile, JSON.stringify(settingsToSave, null, 2), 'utf-8');
    if (username === 'thanhhuong') {
      saveLocalSettings(settingsToSave);
    }
    return settingsToSave;
  } catch (err) {
    console.error(`Error saving settings for user ${username}:`, err);
    return settings;
  }
}
