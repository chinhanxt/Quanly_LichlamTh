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
  setDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';
import { User } from '@/types/user';
import { getDefaultRate } from './salary-calculator';
import {
  getLocalScheduleItems,
  addLocalScheduleItem,
  updateLocalScheduleItem,
  deleteLocalScheduleItem,
  stripRemovedSettings,
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
    let snap = await getDoc(doc(db, 'settings', username));
    if (!snap.exists() && username === 'thanhhuong') {
      snap = await getDoc(doc(db, 'settings', 'config'));
    }
    if (snap.exists()) {
      const data = snap.data();
      return stripRemovedSettings({
        ...local,
        ...data,
        hourlyRate: typeof data.hourlyRate === 'number' && data.hourlyRate > 0 ? data.hourlyRate : getDefaultRate(username),
        geminiApiKey: data.geminiApiKey || local.geminiApiKey || process.env.GEMINI_API_KEY || '',
        username,
      }) as ScheduleSettings;
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

// Expense storage (Firestore only — local file fallback is ephemeral on Vercel)
import { ExpenseItem } from '@/types/schedule';

export type NewExpense = Omit<ExpenseItem, 'id' | 'username'> & { id?: string };

function normalizeExpense(username: string, data: any): Omit<ExpenseItem, 'id'> {
  return {
    date: data.date || new Date().toISOString().split('T')[0],
    type: data.type === 'Thu' ? 'Thu' : 'Chi',
    category: data.category || 'Khác',
    amount: Math.round(Number(data.amount) || 0),
    description: data.description || '',
    rawText: data.rawText || '',
    createdAt: data.createdAt || new Date().toISOString(),
    username,
  };
}

export async function getExpenseItemsForUser(username: string): Promise<ExpenseItem[]> {
  const querySnapshot = await getDocs(collection(db, `expenses_${username}`));
  const items: ExpenseItem[] = [];
  querySnapshot.forEach((docSnap) => {
    items.push({ id: docSnap.id, ...normalizeExpense(username, docSnap.data()) });
  });
  items.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  return items;
}

export async function addExpenseItemsForUser(username: string, newItems: NewExpense[]): Promise<ExpenseItem[]> {
  const colRef = collection(db, `expenses_${username}`);
  const batch = writeBatch(db);
  const saved: ExpenseItem[] = [];
  for (const item of newItems) {
    const ref = item.id ? doc(colRef, item.id) : doc(colRef);
    const data = normalizeExpense(username, item);
    batch.set(ref, data);
    saved.push({ id: ref.id, ...data });
  }
  await batch.commit();
  return saved;
}

export async function updateExpenseItemForUser(username: string, id: string, patch: Partial<ExpenseItem>): Promise<void> {
  const { id: _id, username: _u, ...rest } = patch;
  if (rest.amount !== undefined) rest.amount = Math.round(Number(rest.amount) || 0);
  await setDoc(doc(db, `expenses_${username}`, id), rest, { merge: true });
}

export async function deleteExpenseItemForUser(username: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `expenses_${username}`, id));
}
