import fs from 'fs';
import path from 'path';
import { ScheduleItem, ScheduleSettings, ExpenseItem } from '@/types/schedule';
import { User } from '@/types/user';

const DATA_DIR = path.join(process.cwd(), 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOCKET_PHOTOS_FILE = path.join(DATA_DIR, 'locket_photos.json');

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

const DEFAULT_SETTINGS: ScheduleSettings = {
  morningTime: '07:00',
  leadTimeMinutes: 30,
  enableMorning: true,
  enableLeadTime: true,
  telegramBotToken: '',
  telegramChatId: '',
  employeeName: 'Thanh Hương',
  hourlyRate: 26000,
  enableShiftReminder: true,
  shiftReminderLeadMinutes: 30,
  shiftReminderTemplate: '🏃‍♂️ Dậy đi làm cha ơi! Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn lẹ không trễ giờ chừ!',
  enableCheckInReminder: true,
  checkInLeadMinutes: 15,
  checkInTemplate: '🚨 Alo alo! Ca {Ca} tới đít rồi nè! Check-in lẹ không là bị trừ lương sấp mặt bây giờ 💸',
  enableCheckOutReminder: true,
  checkOutLagMinutes: 10,
  checkOutTemplate: '🏃‍♀️ Hết ca rồi lượn lẹ! Ca {Ca} xong rồi nè. Bấm Check-out rồi vọt về thôi 🥳',
  enableNotesReminder: true,
  notesLeadMinutes: 15,
  notesTemplate: '📝 Note ca {Ca} nè: {GhiChú}. Quên cái này là ăn chửi ráng chịu nha! ⚡',
  notesTimingMode: 'before_shift',
  notesFixedTime: '08:00',
  userNotes: [],
  enableMorningSummary: true,
  morningSummaryTime: '07:00',
  morningSummaryTemplate: '☀️ Dậy đi cày em ơi! Hôm nay cày ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Chúc cày cuốc vui vẻ không bị ăn chửi nhé 🔥',
  customNotifications: [],
  customWebhookUrl: 'https://schedule-telegram-app.vercel.app/api/telegram-webhook',
  sentRemindersLog: {},
  allowedChatIdsStr: '',
};

export function getLocalSettings(): ScheduleSettings {
  try {
    ensureDataDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { ...DEFAULT_SETTINGS };
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      morningTime: parsed.morningTime || '07:00',
      leadTimeMinutes: Number(parsed.leadTimeMinutes) || 30,
      enableMorning: Boolean(parsed.enableMorning ?? true),
      enableLeadTime: Boolean(parsed.enableLeadTime ?? true),
      telegramBotToken: parsed.telegramBotToken || '',
      telegramChatId: parsed.telegramChatId || '',
      employeeName: parsed.employeeName || 'Thanh Hương',
      hourlyRate: typeof parsed.hourlyRate === 'number' ? parsed.hourlyRate : 26000,
      geminiApiKey: parsed.geminiApiKey || '',
      customWebhookUrl: parsed.customWebhookUrl || 'https://schedule-telegram-app.vercel.app/api/telegram-webhook',
      enableShiftReminder: parsed.enableShiftReminder ?? true,
      shiftReminderLeadMinutes: parsed.shiftReminderLeadMinutes !== undefined ? Number(parsed.shiftReminderLeadMinutes) : 30,
      shiftReminderTemplate: parsed.shiftReminderTemplate || '🔔 Tới giờ đi làm rồi kìaaaaa 🏃‍♀️ Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn liền đi bé ơiii!',
      enableCheckInReminder: parsed.enableCheckInReminder ?? true,
      checkInLeadMinutes: parsed.checkInLeadMinutes !== undefined ? Number(parsed.checkInLeadMinutes) : 15,
      checkInTemplate: parsed.checkInTemplate || '📍 Alo alo! Ca {Ca} tới đít rồi nè 🚨 Mau mau Check-in không là bị phạt tiền nha bé iu 💸!',
      enableCheckOutReminder: parsed.enableCheckOutReminder ?? true,
      checkOutLagMinutes: parsed.checkOutLagMinutes !== undefined ? Number(parsed.checkOutLagMinutes) : 10,
      checkOutTemplate: parsed.checkOutTemplate || '✅ Hếtttt giời rồiiii! 🎉 Ca {Ca} xong rồi nè. Mau mau Check-out rồi lượn về với tui nhanh lênnnn! 💕',
      enableNotesReminder: parsed.enableNotesReminder ?? true,
      notesLeadMinutes: parsed.notesLeadMinutes !== undefined ? Number(parsed.notesLeadMinutes) : 15,
      notesTemplate: parsed.notesTemplate || '📝 Note nhẹ cho bé nè: {GhiChú} ✨ Đừng có quên đó nheee!',
      notesTimingMode: parsed.notesTimingMode || 'before_shift',
      notesFixedTime: parsed.notesFixedTime || '08:00',
      userNotes: Array.isArray(parsed.userNotes) ? parsed.userNotes : [],
      enableMorningSummary: parsed.enableMorningSummary ?? true,
      morningSummaryTime: parsed.morningSummaryTime || '07:00',
      morningSummaryTemplate: parsed.morningSummaryTemplate || '☀️ Chào buổi sáng công chúa! 👑 Hôm nay bé có ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Chúc em bé một ngày làm việc siêu vui vẻ nhaaa ❤️',
      telegramSessionState: parsed.telegramSessionState || { userState: 'IDLE' },
      customNotifications: Array.isArray(parsed.customNotifications) ? parsed.customNotifications : [],
      sentRemindersLog: typeof parsed.sentRemindersLog === 'object' && parsed.sentRemindersLog !== null ? parsed.sentRemindersLog : {},
    };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
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
    const userSettingsFile = path.join(DATA_DIR, `settings_${username}.json`);
    if (fs.existsSync(userSettingsFile)) {
      const raw = fs.readFileSync(userSettingsFile, 'utf-8');
      const parsed = JSON.parse(raw);
      const user = getUserLocal(username);
      const defaultEmpName = user ? user.displayName : (username === 'chinhan' ? 'Nguyễn Chí Nhân' : username);
      const empName = (username !== 'thanhhuong' && (!parsed.employeeName || parsed.employeeName === 'Thanh Hương'))
        ? defaultEmpName
        : (parsed.employeeName || defaultEmpName);
      const defaultRate = username === 'chinhan' ? 100000 : 26000;
      const rate = typeof parsed.hourlyRate === 'number' && parsed.hourlyRate !== 26000 ? parsed.hourlyRate : defaultRate;

      const chinhanDefaults = username === 'chinhan' ? {
        shiftReminderTemplate: "Nhắc nhở ca làm: Bạn có ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Hãy chuẩn bị kỹ lưỡng và xuất phát đúng giờ để hoàn thành tốt nhiệm vụ.",
        checkInTemplate: "Đã đến giờ vào ca: Hãy thực hiện check-in cho ca {Ca}. Tập trung cao độ, làm việc chuyên nghiệp và giữ vững phong độ.",
        checkOutTemplate: "Hoàn thành ca làm: Ca {Ca} đã kết thúc. Hãy kiểm tra lại công việc và thực hiện check-out. Cảm ơn bạn đã nỗ lực hết mình trong ca làm việc hôm nay.",
        notesTemplate: "Ghi chú ca {Ca}: {GhiChú}. Hãy lưu ý thực hiện đầy đủ để đảm bảo chất lượng công việc.",
        morningSummaryTemplate: "Chào buổi sáng: Lịch làm việc hôm nay của bạn gồm ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chúc bạn một ngày làm việc hiệu quả, kỷ luật và gặt hái nhiều kết quả tốt.",
        groqApiKey: parsed.groqApiKey || process.env.GROQ_API_KEY || '',
        groqModel: parsed.groqModel || 'llama-3.3-70b-versatile',
        expenseGoogleSheetUrl: parsed.expenseGoogleSheetUrl || 'https://docs.google.com/spreadsheets/d/1XDHEr5jhqppyuxMu9posBwjNQj_6lddZCSmqBv2SAYk/edit?gid=0#gid=0',
      } : {};

      return {
        ...DEFAULT_SETTINGS,
        ...chinhanDefaults,
        ...parsed,
        employeeName: empName,
        hourlyRate: rate,
        username,
      };
    }
    // Inheritance: thanhhuong inherits legacy settings.json
    if (username === 'thanhhuong') {
      const settings = getLocalSettings();
      return { ...settings, username: 'thanhhuong' };
    }
    // Other users get clean default settings with employeeName set to user's displayName
    const user = getUserLocal(username);
    const empName = user ? user.displayName : (username === 'chinhan' ? 'Nguyễn Chí Nhân' : username);
    const defaultRate = username === 'chinhan' ? 100000 : 26000;
    const chinhanDefaults = username === 'chinhan' ? {
      shiftReminderTemplate: "Nhắc nhở ca làm: Bạn có ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Hãy chuẩn bị kỹ lưỡng và xuất phát đúng giờ để hoàn thành tốt nhiệm vụ.",
      checkInTemplate: "Đã đến giờ vào ca: Hãy thực hiện check-in cho ca {Ca}. Tập trung cao độ, làm việc chuyên nghiệp và giữ vững phong độ.",
      checkOutTemplate: "Hoàn thành ca làm: Ca {Ca} đã kết thúc. Hãy kiểm tra lại công việc và thực hiện check-out. Cảm ơn bạn đã nỗ lực hết mình trong ca làm việc hôm nay.",
      notesTemplate: "Ghi chú ca {Ca}: {GhiChú}. Hãy lưu ý thực hiện đầy đủ để đảm bảo chất lượng công việc.",
      morningSummaryTemplate: "Chào buổi sáng: Lịch làm việc hôm nay của bạn gồm ca {Ca} ({ThờiGian}) tại {ĐịaĐiểm}. Chúc bạn một ngày làm việc hiệu quả, kỷ luật và gặt hái nhiều kết quả tốt.",
      groqApiKey: process.env.GROQ_API_KEY || '',
      groqModel: 'llama-3.3-70b-versatile',
      expenseGoogleSheetUrl: 'https://docs.google.com/spreadsheets/d/1XDHEr5jhqppyuxMu9posBwjNQj_6lddZCSmqBv2SAYk/edit?gid=0#gid=0',
    } : {};

    return {
      ...DEFAULT_SETTINGS,
      ...chinhanDefaults,
      employeeName: empName,
      hourlyRate: defaultRate,
      username,
    };
  } catch (err) {
    const user = getUserLocal(username);
    const empName = user ? user.displayName : username;
    return {
      ...DEFAULT_SETTINGS,
      employeeName: empName,
      username,
    };
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

export function getExpenseItemsForUserLocal(username: string): ExpenseItem[] {
  try {
    ensureDataDir();
    const userExpenseFile = path.join(DATA_DIR, `expense_${username}.json`);
    if (fs.existsSync(userExpenseFile)) {
      const raw = fs.readFileSync(userExpenseFile, 'utf-8');
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error(`Error reading expenses for user ${username}:`, err);
    return [];
  }
}

export function saveExpenseItemsForUserLocal(username: string, items: ExpenseItem[]): ExpenseItem[] {
  try {
    ensureDataDir();
    const userExpenseFile = path.join(DATA_DIR, `expense_${username}.json`);
    fs.writeFileSync(userExpenseFile, JSON.stringify(items, null, 2), 'utf-8');
    return items;
  } catch (err) {
    console.error(`Error saving expenses for user ${username}:`, err);
    return items;
  }
}

export function addExpenseItemForUserLocal(username: string, item: Omit<ExpenseItem, 'id'> & { id?: string }): ExpenseItem {
  const items = getExpenseItemsForUserLocal(username);
  const newItem: ExpenseItem = {
    ...item,
    id: item.id || ('exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    username,
    createdAt: item.createdAt || new Date().toISOString(),
  };
  items.unshift(newItem);
  saveExpenseItemsForUserLocal(username, items);
  return newItem;
}

export function deleteExpenseItemForUserLocal(username: string, id: string): boolean {
  const items = getExpenseItemsForUserLocal(username);
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length !== items.length) {
    saveExpenseItemsForUserLocal(username, filtered);
    return true;
  }
  return false;
}

// Locket Photos & Bot Settings Local Helpers
export interface LocketPhoto {
  id: string;
  sender: string;
  telegram_file_id: string;
  photo_message_id?: number;
  notify_message_id?: number;
  chat_id?: string;
  caption?: string;
  created_at: string;
}

export function getLocketPhotoByIdLocal(id: string): LocketPhoto | null {
  try {
    ensureDataDir();
    if (!fs.existsSync(LOCKET_PHOTOS_FILE)) return null;
    const raw = fs.readFileSync(LOCKET_PHOTOS_FILE, 'utf-8');
    const list: LocketPhoto[] = JSON.parse(raw);
    return list.find((p) => p.id === id) || null;
  } catch (err) {
    return null;
  }
}

export function getLocketPhotosLocal(page = 1, limit = 10): { photos: LocketPhoto[]; total: number; hasMore: boolean } {
  try {
    ensureDataDir();
    if (!fs.existsSync(LOCKET_PHOTOS_FILE)) {
      return { photos: [], total: 0, hasMore: false };
    }
    const raw = fs.readFileSync(LOCKET_PHOTOS_FILE, 'utf-8');
    const list: LocketPhoto[] = JSON.parse(raw);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = list.length;
    const start = (page - 1) * limit;
    const photos = list.slice(start, start + limit);
    return { photos, total, hasMore: start + limit < total };
  } catch (err) {
    console.error('Error reading locket photos local:', err);
    return { photos: [], total: 0, hasMore: false };
  }
}

export function saveLocketPhotoLocal(photo: LocketPhoto): boolean {
  try {
    ensureDataDir();
    let list: LocketPhoto[] = [];
    if (fs.existsSync(LOCKET_PHOTOS_FILE)) {
      try {
        const raw = fs.readFileSync(LOCKET_PHOTOS_FILE, 'utf-8');
        list = JSON.parse(raw);
      } catch {}
    }
    list.unshift(photo);
    fs.writeFileSync(LOCKET_PHOTOS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving locket photo local:', err);
    return false;
  }
}

export function getLocketBotSettingsLocal(): { locketBotToken: string; locketChatId: string } {
  try {
    const settings = getSettingsForUserLocal('chinhan');
    return {
      locketBotToken: settings.locketBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
      locketChatId: settings.locketChatId || process.env.TELEGRAM_CHAT_ID || '',
    };
  } catch (err) {
    return {
      locketBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      locketChatId: process.env.TELEGRAM_CHAT_ID || '',
    };
  }
}

export function saveLocketBotSettingsLocal(settings: { locketBotToken: string; locketChatId: string }): boolean {
  try {
    const currentSettings = getSettingsForUserLocal('chinhan');
    saveSettingsForUserLocal('chinhan', {
      ...currentSettings,
      locketBotToken: settings.locketBotToken,
      locketChatId: settings.locketChatId,
    });
    return true;
  } catch (err) {
    console.error('Error saving locket bot settings local:', err);
    return false;
  }
}

export function deleteLocketPhotoLocal(id: string): boolean {
  try {
    ensureDataDir();
    if (fs.existsSync(LOCKET_PHOTOS_FILE)) {
      const raw = fs.readFileSync(LOCKET_PHOTOS_FILE, 'utf-8');
      let list: LocketPhoto[] = JSON.parse(raw);
      list = list.filter((p) => p.id !== id);
      fs.writeFileSync(LOCKET_PHOTOS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
    return true;
  } catch (err) {
    console.error('Error deleting locket photo local:', err);
    return false;
  }
}

export const getLocketPhotos = getLocketPhotosLocal;
export const saveLocketPhoto = saveLocketPhotoLocal;
export const deleteLocketPhoto = deleteLocketPhotoLocal;
export const getLocketBotSettings = getLocketBotSettingsLocal;
export const saveLocketBotSettings = saveLocketBotSettingsLocal;

