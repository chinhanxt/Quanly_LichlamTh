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
  addScheduleItemForUserLocal,
  updateScheduleItemForUserLocal,
  deleteScheduleItemForUserLocal,
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
      const defaultRate = username === 'chinhan' ? 100000 : 26000;
      const rate = typeof data.hourlyRate === 'number' && data.hourlyRate !== 26000 ? data.hourlyRate : defaultRate;

      if (!data.telegramBotToken || data.telegramBotToken === 'mock-token') {
        data.telegramBotToken = '8741966025:AAF7BnBefwwEYEHQv0V2mz6tKRrs6aAeb2c';
      }
      if (!data.telegramChatId || data.telegramChatId === '20002') {
        data.telegramChatId = '5842766685';
      }
      if (data.allowedChatIdsStr === '20002') {
        data.allowedChatIdsStr = '5842766685';
      }

      if (username === 'chinhan') {
        if (!data.shiftReminderTemplate || data.shiftReminderTemplate.includes('🏃‍♂️') || data.shiftReminderTemplate.includes('Dậy đi làm cha ơi')) {
          data.shiftReminderTemplate = local.shiftReminderTemplate;
        }
        if (!data.checkInTemplate || data.checkInTemplate.includes('🚨') || data.checkInTemplate.includes('tới đít rồi nè')) {
          data.checkInTemplate = local.checkInTemplate;
        }
        if (!data.checkOutTemplate || data.checkOutTemplate.includes('🏃‍♀️') || data.checkOutTemplate.includes('Hết ca rồi lượn lẹ')) {
          data.checkOutTemplate = local.checkOutTemplate;
        }
        if (!data.notesTemplate || data.notesTemplate.includes('📝') || data.notesTemplate.includes('ăn chửi')) {
          data.notesTemplate = local.notesTemplate;
        }
        if (!data.morningSummaryTemplate || data.morningSummaryTemplate.includes('☀️') || data.morningSummaryTemplate.includes('Dậy đi cày')) {
          data.morningSummaryTemplate = local.morningSummaryTemplate;
        }
      }

      return {
        ...local,
        ...data,
        hourlyRate: rate,
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
    return items;
  } catch (error) {
    console.warn(`Firebase getScheduleItemsForUser failed for ${username}, falling back to local db:`, error);
  }
  return getScheduleItemsForUserLocal(username);
}

export async function saveScheduleItemsForUser(username: string, newItems: ScheduleItem[], merge: boolean = true): Promise<ScheduleItem[]> {
  try {
    const userColRef = collection(db, `schedules_${username}`);
    let itemsToSave = newItems;

    if (merge) {
      const existingItems = await getScheduleItemsForUser(username);
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

      const deletedItems = existingItems.filter((existing) => !preserved.includes(existing));
      for (const oldItem of deletedItems) {
        if (oldItem.id) {
          try {
            await deleteDoc(doc(db, `schedules_${username}`, oldItem.id));
          } catch {}
        }
      }

      itemsToSave = newItems;
    } else {
      const existingSnap = await getDocs(userColRef);
      for (const docSnap of existingSnap.docs) {
        await deleteDoc(doc(db, `schedules_${username}`, docSnap.id));
      }
    }

    for (const item of itemsToSave) {
      const { id, ...itemData } = item;
      if (id) {
        await setDoc(doc(db, `schedules_${username}`, id), { ...itemData, username }, { merge: true });
      } else {
        const docRef = await addDoc(userColRef, { ...itemData, username });
        item.id = docRef.id;
      }
    }
  } catch (error) {
    console.warn(`Firebase saveScheduleItemsForUser failed for ${username}, saving local fallback:`, error);
  }
  return saveScheduleItemsForUserLocal(username, newItems, merge);
}

export async function addScheduleItemForUser(username: string, item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
  try {
    const docRef = await addDoc(collection(db, `schedules_${username}`), { ...item, username });
    const newItem = { ...item, id: docRef.id, username };
    addScheduleItemForUserLocal(username, newItem);
    return newItem;
  } catch (error) {
    console.warn(`Firebase addScheduleItemForUser failed for ${username}, using local db fallback:`, error);
    return addScheduleItemForUserLocal(username, item);
  }
}

export async function updateScheduleItemForUser(username: string, id: string, itemUpdate: Partial<ScheduleItem>): Promise<boolean> {
  try {
    const docRef = doc(db, `schedules_${username}`, id);
    await setDoc(docRef, itemUpdate, { merge: true });
    if (username === 'thanhhuong') {
      try {
        await setDoc(doc(db, 'schedule', id), itemUpdate, { merge: true });
      } catch {}
    }
  } catch (error) {
    console.warn(`Firebase updateScheduleItemForUser failed for ${username}, updating local db fallback:`, error);
  }
  return updateScheduleItemForUserLocal(username, id, itemUpdate);
}

export async function deleteScheduleItemForUser(username: string, id: string): Promise<boolean> {
  let firestoreDeleted = false;
  try {
    const docRef = doc(db, `schedules_${username}`, id);
    await deleteDoc(docRef);
    firestoreDeleted = true;
    if (username === 'thanhhuong') {
      try {
        await deleteDoc(doc(db, 'schedule', id));
      } catch {}
    }
  } catch (error) {
    console.warn(`Firebase deleteScheduleItemForUser failed for ${username}, deleting from local db fallback:`, error);
  }
  const localDeleted = deleteScheduleItemForUserLocal(username, id);
  return firestoreDeleted || localDeleted;
}

// CRUD for Schedule Items with local fallback (legacy)
export async function getScheduleItems(): Promise<ScheduleItem[]> {
  return getScheduleItemsForUser('thanhhuong');
}

export async function addScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
  return addScheduleItemForUser('thanhhuong', item);
}

export async function updateScheduleItem(id: string, item: Partial<ScheduleItem>): Promise<boolean> {
  return updateScheduleItemForUser('thanhhuong', id, item);
}

export async function deleteScheduleItem(id: string): Promise<boolean> {
  return deleteScheduleItemForUser('thanhhuong', id);
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
        telegramBotToken: data.telegramBotToken || '8741966025:AAF7BnBefwwEYEHQv0V2mz6tKRrs6aAeb2c',
        telegramChatId: data.telegramChatId || '5842766685',
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

// Expense storage functions with Firestore + local fallback
import { ExpenseItem } from '@/types/schedule';
import {
  getExpenseItemsForUserLocal,
  addExpenseItemForUserLocal,
  deleteExpenseItemForUserLocal
} from './local-db';

export async function getExpenseItemsForUser(username: string): Promise<ExpenseItem[]> {
  try {
    const colRef = collection(db, `expenses_${username}`);
    const querySnapshot = await getDocs(colRef);
    const items: ExpenseItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        date: data.date || '',
        type: data.type || 'Chi',
        category: data.category || 'Khác',
        amount: Number(data.amount) || 0,
        description: data.description || '',
        rawText: data.rawText || '',
        createdAt: data.createdAt || new Date().toISOString(),
        username,
      });
    });

    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (items.length > 0) return items;
  } catch (error) {
    console.warn(`Firebase getExpenseItemsForUser failed for ${username}, falling back to local:`, error);
  }
  return getExpenseItemsForUserLocal(username);
}

export async function addExpenseItemForUser(username: string, item: Omit<ExpenseItem, 'id'> & { id?: string }): Promise<ExpenseItem> {
  const localItem = addExpenseItemForUserLocal(username, item);
  try {
    const colRef = collection(db, `expenses_${username}`);
    const docData = {
      date: item.date || new Date().toISOString().split('T')[0],
      type: item.type || 'Chi',
      category: item.category || 'Khác',
      amount: Number(item.amount) || 0,
      description: item.description || '',
      rawText: item.rawText || '',
      createdAt: localItem.createdAt || new Date().toISOString(),
      username,
    };
    const docRef = await addDoc(colRef, docData);
    return { ...localItem, id: docRef.id };
  } catch (error) {
    console.warn(`Firebase addExpenseItemForUser failed for ${username}, saved locally:`, error);
  }
  return localItem;
}

export async function deleteExpenseItemForUser(username: string, id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, `expenses_${username}`, id));
  } catch (error) {
    console.warn(`Firebase deleteExpenseItemForUser failed for ${username}, deleting local:`, error);
  }
  return deleteExpenseItemForUserLocal(username, id);
}
