import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { User } from '@/types/user';
import {
  getLocalScheduleItems,
  addLocalScheduleItem,
  updateLocalScheduleItem,
  deleteLocalScheduleItem,
  getLocalSettings,
  saveLocalSettings,
  getUserLocal,
  updateUserPasswordLocal,
  getSettingsForUserLocal,
  saveSettingsForUserLocal,
  getScheduleItemsForUserLocal,
  saveScheduleItemsForUserLocal,
} from './local-db';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'testhuy-68af2.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'testhuy-68af2',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'testhuy-68af2.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// User Auth Firestore functions
export async function getUserFromFirestore(username: string): Promise<User | null> {
  const localUser = getUserLocal(username);
  try {
    const docRef = doc(db, 'users', username);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        username: data.username || localUser?.username || username,
        password: data.password || localUser?.password || '',
        displayName: data.displayName || localUser?.displayName || username,
        createdAt: data.createdAt || localUser?.createdAt,
      };
    }
  } catch (error) {
    console.warn(`Firebase getUserFromFirestore failed for ${username}, falling back to local:`, error);
  }
  return localUser || null;
}

export async function verifyUserPasswordInFirestore(username: string, pass: string): Promise<boolean> {
  const user = await getUserFromFirestore(username);
  if (!user) return false;
  return user.password === pass;
}

export async function updateUserPasswordInFirestore(username: string, newPass: string): Promise<boolean> {
  const localUser = getUserLocal(username);
  try {
    const docRef = doc(db, 'users', username);
    await setDoc(
      docRef,
      {
        username,
        password: newPass,
        displayName: localUser?.displayName || username,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`Firebase updateUserPasswordInFirestore failed for ${username}, updating local fallback:`, error);
  }
  return updateUserPasswordLocal(username, newPass);
}

// User-scoped settings functions
export async function getSettingsForUser(username: string): Promise<ScheduleSettings> {
  const local = getSettingsForUserLocal(username);
  try {
    const docRef = doc(db, 'settings', username);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...local,
        ...data,
        username,
      } as ScheduleSettings;
    } else if (username === 'thanhhuong') {
      const legacyDocRef = doc(db, 'settings', 'config');
      const legacySnap = await getDoc(legacyDocRef);
      if (legacySnap.exists()) {
        const data = legacySnap.data();
        return {
          ...local,
          ...data,
          username: 'thanhhuong',
        } as ScheduleSettings;
      }
    }
  } catch (error) {
    console.warn(`Firebase getSettingsForUser failed for ${username}, using local settings fallback:`, error);
  }
  return local;
}

export async function saveSettingsForUser(username: string, settings: ScheduleSettings): Promise<ScheduleSettings> {
  const updatedSettings = { ...settings, username };
  try {
    const docRef = doc(db, 'settings', username);
    await setDoc(docRef, updatedSettings, { merge: true });
    if (username === 'thanhhuong') {
      const legacyDocRef = doc(db, 'settings', 'config');
      await setDoc(legacyDocRef, updatedSettings, { merge: true });
    }
  } catch (error) {
    console.warn(`Firebase saveSettingsForUser failed for ${username}, saving local settings fallback:`, error);
  }
  return saveSettingsForUserLocal(username, updatedSettings);
}

// User-scoped schedule items functions
export async function getScheduleItemsForUser(username: string): Promise<ScheduleItem[]> {
  try {
    const querySnapshot = await getDocs(collection(db, `schedules_${username}`));
    const items: ScheduleItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        dayOfWeek: data.dayOfWeek,
        date: data.date || '',
        startTime: data.startTime,
        endTime: data.endTime,
        subject: data.subject,
        location: data.location || '',
        note: data.note || '',
        reminderEnabled: Boolean(data.reminderEnabled),
        username,
      });
    });
    if (items.length > 0) return items;
    if (username === 'thanhhuong') {
      const legacyItems = await getScheduleItems();
      if (legacyItems.length > 0) return legacyItems;
    }
  } catch (error) {
    console.warn(`Firebase getScheduleItemsForUser failed for ${username}, falling back to local db:`, error);
  }
  return getScheduleItemsForUserLocal(username);
}

export async function saveScheduleItemsForUser(username: string, items: ScheduleItem[]): Promise<ScheduleItem[]> {
  try {
    const userColRef = collection(db, `schedules_${username}`);
    const existingSnap = await getDocs(userColRef);
    for (const docSnap of existingSnap.docs) {
      await deleteDoc(doc(db, `schedules_${username}`, docSnap.id));
    }
    for (const item of items) {
      const { id, ...itemData } = item;
      await addDoc(userColRef, { ...itemData, username });
    }
    if (username === 'thanhhuong') {
      await saveScheduleItemsForWeek(items);
    }
  } catch (error) {
    console.warn(`Firebase saveScheduleItemsForUser failed for ${username}, saving local fallback:`, error);
  }
  return saveScheduleItemsForUserLocal(username, items);
}

// CRUD for Schedule Items with local fallback (legacy)
export async function getScheduleItems(): Promise<ScheduleItem[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'schedule'));
    const items: ScheduleItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        dayOfWeek: data.dayOfWeek,
        date: data.date || '',
        startTime: data.startTime,
        endTime: data.endTime,
        subject: data.subject,
        location: data.location || '',
        note: data.note || '',
        reminderEnabled: Boolean(data.reminderEnabled),
      });
    });
    if (items.length > 0) return items;
  } catch (error) {
    console.warn('Firebase getScheduleItems failed, falling back to local db:', error);
  }
  return getLocalScheduleItems();
}

export async function addScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
  try {
    const docRef = await addDoc(collection(db, 'schedule'), item);
    const newItem = { ...item, id: docRef.id };
    addLocalScheduleItem(item); // Keep local backup synced
    return newItem;
  } catch (error) {
    console.warn('Firebase addScheduleItem failed, using local db fallback:', error);
    return addLocalScheduleItem(item);
  }
}

export async function updateScheduleItem(id: string, item: Partial<ScheduleItem>): Promise<boolean> {
  try {
    const docRef = doc(db, 'schedule', id);
    await updateDoc(docRef, item as any);
    updateLocalScheduleItem(id, item);
    return true;
  } catch (error) {
    console.warn('Firebase updateScheduleItem failed, updating local db fallback:', error);
    return updateLocalScheduleItem(id, item);
  }
}

export async function deleteScheduleItem(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'schedule', id);
    await deleteDoc(docRef);
    deleteLocalScheduleItem(id);
    return true;
  } catch (error) {
    console.warn('Firebase deleteScheduleItem failed, deleting from local db fallback:', error);
    return deleteLocalScheduleItem(id);
  }
}

// CRUD for Settings with local fallback (legacy)
export async function getSettings(): Promise<ScheduleSettings> {
  try {
    const docRef = doc(db, 'settings', 'config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        morningTime: data.morningTime || '07:00',
        leadTimeMinutes: Number(data.leadTimeMinutes) || 30,
        enableMorning: Boolean(data.enableMorning),
        enableLeadTime: Boolean(data.enableLeadTime),
        telegramBotToken: data.telegramBotToken || 'TELEGRAM_BOT_TOKEN_REVOKED',
        telegramChatId: data.telegramChatId || 'CHAT_ID_REVOKED',
        employeeName: data.employeeName || 'Thanh Hương',
        hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : 26000,
        geminiApiKey: data.geminiApiKey || '',
        enableShiftReminder: data.enableShiftReminder ?? true,
        shiftReminderLeadMinutes: data.shiftReminderLeadMinutes !== undefined ? Number(data.shiftReminderLeadMinutes) : 30,
        shiftReminderTemplate: data.shiftReminderTemplate || '🏃‍♂️ Dậy đi làm cha ơi! Ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Đứng dậy sửa soạn lẹ không trễ giờ chừ!',
        enableCheckInReminder: data.enableCheckInReminder ?? true,
        checkInLeadMinutes: data.checkInLeadMinutes !== undefined ? Number(data.checkInLeadMinutes) : 15,
        checkInTemplate: data.checkInTemplate || '🚨 Alo alo! Ca {Ca} tới đít rồi nè! Check-in lẹ không là bị trừ lương sấp mặt bây giờ 💸',
        enableCheckOutReminder: data.enableCheckOutReminder ?? true,
        checkOutLagMinutes: data.checkOutLagMinutes !== undefined ? Number(data.checkOutLagMinutes) : 10,
        checkOutTemplate: data.checkOutTemplate || '🏃‍♀️ Hết ca rồi lượn lẹ! Ca {Ca} xong rồi nè. Bấm Check-out rồi vọt về thôi 🥳',
        enableNotesReminder: data.enableNotesReminder ?? true,
        notesLeadMinutes: data.notesLeadMinutes !== undefined ? Number(data.notesLeadMinutes) : 15,
        notesTemplate: data.notesTemplate || '📝 Note ca {Ca} nè: {GhiChú}. Quên cái này là ăn chửi ráng chịu nha! ⚡',
        notesTimingMode: data.notesTimingMode || 'before_shift',
        notesFixedTime: data.notesFixedTime || '08:00',
        userNotes: Array.isArray(data.userNotes) ? data.userNotes : [],
        enableMorningSummary: data.enableMorningSummary ?? true,
        morningSummaryTime: data.morningSummaryTime || '07:00',
        morningSummaryTemplate: data.morningSummaryTemplate || '☀️ Dậy đi cày em ơi! Hôm nay cày ca {Ca} ({ThờiGian}) ở {ĐịaĐiểm} nè. Chúc cày cuốc vui vẻ không bị ăn chửi nhé 🔥',
        telegramSessionState: data.telegramSessionState || { userState: 'IDLE' },
        customNotifications: Array.isArray(data.customNotifications) ? data.customNotifications : [],
        sentRemindersLog: typeof data.sentRemindersLog === 'object' && data.sentRemindersLog !== null ? data.sentRemindersLog : {},
        allowedChatIdsStr: data.allowedChatIdsStr || '',
        allowedChatIds: Array.isArray(data.allowedChatIds) ? data.allowedChatIds : [],
      };
    }
  } catch (error) {
    console.warn('Firebase getSettings failed, using local settings fallback:', error);
  }

  return getLocalSettings();
}

export async function updateSettings(settings: ScheduleSettings): Promise<ScheduleSettings> {
  const username = settings.username || 'thanhhuong';
  return saveSettingsForUser(username, settings);
}

export async function saveScheduleItemsForWeek(newItems: ScheduleItem[]): Promise<void> {
  const currentShifts = await getScheduleItems();

  const newDates = new Set(newItems.map((i) => i.date).filter(Boolean));
  const newDays = new Set(newItems.map((i) => i.dayOfWeek));

  const shiftsToDelete = currentShifts.filter((existing) => {
    if (existing.date && newDates.size > 0) {
      return newDates.has(existing.date);
    }
    return newDays.has(existing.dayOfWeek);
  });

  for (const oldShift of shiftsToDelete) {
    await deleteScheduleItem(oldShift.id);
  }

  for (const item of newItems) {
    const { id, ...itemWithoutId } = item;
    await addScheduleItem(itemWithoutId);
  }
}
