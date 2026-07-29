import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ScheduleItem, ScheduleSettings } from '@/types/schedule';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials');
  }

  return new JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function getDoc() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

  const auth = getAuth();
  const doc = new GoogleSpreadsheet(sheetId, auth);
  await doc.loadInfo();
  return doc;
}

// Ensure sheets exist with proper headers
export async function initSheets() {
  const doc = await getDoc();

  let scheduleSheet = doc.sheetsByTitle['ThoiKhoaBieu'];
  if (!scheduleSheet) {
    scheduleSheet = await doc.addSheet({
      title: 'ThoiKhoaBieu',
      headerValues: ['id', 'dayOfWeek', 'startTime', 'endTime', 'subject', 'location', 'note', 'reminderEnabled']
    });
  }

  let settingsSheet = doc.sheetsByTitle['CauHinh'];
  if (!settingsSheet) {
    settingsSheet = await doc.addSheet({
      title: 'CauHinh',
      headerValues: ['morningTime', 'leadTimeMinutes', 'enableMorning', 'enableLeadTime']
    });
    await settingsSheet.addRow({
      morningTime: '07:00',
      leadTimeMinutes: '30',
      enableMorning: 'true',
      enableLeadTime: 'true'
    });
  }
  return doc;
}

export async function getScheduleItems(): Promise<ScheduleItem[]> {
  const doc = await initSheets();
  const sheet = doc.sheetsByTitle['ThoiKhoaBieu'];
  const rows = await sheet.getRows();

  return rows.map((row) => ({
    id: row.get('id') || '',
    dayOfWeek: row.get('dayOfWeek') as ScheduleItem['dayOfWeek'],
    startTime: row.get('startTime') || '',
    endTime: row.get('endTime') || '',
    subject: row.get('subject') || '',
    location: row.get('location') || '',
    note: row.get('note') || '',
    reminderEnabled: row.get('reminderEnabled') === 'true',
  }));
}

export async function addScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
  const doc = await initSheets();
  const sheet = doc.sheetsByTitle['ThoiKhoaBieu'];
  const id = `item_${Date.now()}`;
  
  const newItem: ScheduleItem = { ...item, id };
  await sheet.addRow({
    id: newItem.id,
    dayOfWeek: newItem.dayOfWeek,
    startTime: newItem.startTime,
    endTime: newItem.endTime,
    subject: newItem.subject,
    location: newItem.location,
    note: newItem.note || '',
    reminderEnabled: String(newItem.reminderEnabled),
  });

  return newItem;
}

export async function updateScheduleItem(id: string, item: Partial<ScheduleItem>): Promise<boolean> {
  const doc = await initSheets();
  const sheet = doc.sheetsByTitle['ThoiKhoaBieu'];
  const rows = await sheet.getRows();
  const targetRow = rows.find((r) => r.get('id') === id);

  if (!targetRow) return false;

  if (item.dayOfWeek) targetRow.set('dayOfWeek', item.dayOfWeek);
  if (item.startTime) targetRow.set('startTime', item.startTime);
  if (item.endTime) targetRow.set('endTime', item.endTime);
  if (item.subject) targetRow.set('subject', item.subject);
  if (item.location !== undefined) targetRow.set('location', item.location);
  if (item.note !== undefined) targetRow.set('note', item.note);
  if (item.reminderEnabled !== undefined) targetRow.set('reminderEnabled', String(item.reminderEnabled));

  await targetRow.save();
  return true;
}

export async function deleteScheduleItem(id: string): Promise<boolean> {
  const doc = await initSheets();
  const sheet = doc.sheetsByTitle['ThoiKhoaBieu'];
  const rows = await sheet.getRows();
  const targetRow = rows.find((r) => r.get('id') === id);

  if (!targetRow) return false;
  await targetRow.delete();
  return true;
}

export async function getSettings(): Promise<ScheduleSettings> {
  const doc = await initSheets();
  const sheet = doc.sheetsByTitle['CauHinh'];
  const rows = await sheet.getRows();
  
  if (rows.length === 0) {
    return { morningTime: '07:00', leadTimeMinutes: 30, enableMorning: true, enableLeadTime: true };
  }

  const row = rows[0];
  return {
    morningTime: row.get('morningTime') || '07:00',
    leadTimeMinutes: parseInt(row.get('leadTimeMinutes') || '30', 10),
    enableMorning: row.get('enableMorning') === 'true',
    enableLeadTime: row.get('enableLeadTime') === 'true',
  };
}

export async function updateSettings(settings: ScheduleSettings): Promise<ScheduleSettings> {
  const doc = await initSheets();
  const sheet = doc.sheetsByTitle['CauHinh'];
  const rows = await sheet.getRows();

  if (rows.length === 0) {
    await sheet.addRow({
      morningTime: settings.morningTime,
      leadTimeMinutes: String(settings.leadTimeMinutes),
      enableMorning: String(settings.enableMorning),
      enableLeadTime: String(settings.enableLeadTime),
    });
  } else {
    const row = rows[0];
    row.set('morningTime', settings.morningTime);
    row.set('leadTimeMinutes', String(settings.leadTimeMinutes));
    row.set('enableMorning', String(settings.enableMorning));
    row.set('enableLeadTime', String(settings.enableLeadTime));
    await row.save();
  }

  return settings;
}
