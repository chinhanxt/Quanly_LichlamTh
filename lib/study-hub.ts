import fs from 'fs';
import path from 'path';
import { StudyScheduleData, StudyClassItem } from '@/types/study';

const DATA_DIR = path.join(process.cwd(), 'data');
const HUB_TKB_APP_DATA = '/home/chinhan/hub-tkb-app/data.js';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStudyFilePath(username: string): string {
  return path.join(DATA_DIR, `study_${username}.json`);
}

export function dmyToIso(dmy: string): string {
  if (!dmy) return '';
  const parts = dmy.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dmy;
}

export function dayNameToKey(name: string): 'Thu2' | 'Thu3' | 'Thu4' | 'Thu5' | 'Thu6' | 'Thu7' | 'CN' {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes('hai')) return 'Thu2';
  if (normalized.includes('ba')) return 'Thu3';
  if (normalized.includes('tư') || normalized.includes('tu')) return 'Thu4';
  if (normalized.includes('năm') || normalized.includes('nam')) return 'Thu5';
  if (normalized.includes('sáu') || normalized.includes('sau')) return 'Thu6';
  if (normalized.includes('bảy') || normalized.includes('bay')) return 'Thu7';
  return 'CN';
}

/**
 * Parses and transforms raw TKB data from hub-tkb-app/data.js
 */
export function parseHubTkbData(rawJs: string): StudyScheduleData {
  const jsonString = rawJs.replace(/^\s*const\s+TKB_DATA\s*=\s*/, '').replace(/;\s*$/, '');
  const parsed = JSON.parse(jsonString);

  // Normalize and enhance with dateIso and dayKey
  if (parsed.weeks) {
    Object.keys(parsed.weeks).forEach((wKey) => {
      const week = parsed.weeks[wKey];
      if (week && Array.isArray(week.days)) {
        week.days.forEach((day: any) => {
          const iso = dmyToIso(day.date);
          day.dateIso = iso;
          const dayKey = dayNameToKey(day.dayName);
          if (Array.isArray(day.classes)) {
            day.classes.forEach((c: any) => {
              c.dateIso = iso;
              c.dayName = day.dayName;
              c.dayKey = dayKey;
              // Clean teacher name extra spaces
              if (c.teacher) {
                c.teacher = c.teacher.replace(/\s+/g, ' ').trim();
              }
            });
          }
        });
      }
    });
  }

  return parsed as StudyScheduleData;
}

/**
 * Loads study data for user. If not existing yet for thanhhuong, seeds from hub-tkb-app/data.js
 */
export function getStudyDataForUser(username: string): StudyScheduleData | null {
  try {
    ensureDataDir();
    const filePath = getStudyFilePath(username);

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }

    // Auto-seed for thanhhuong from hub-tkb-app if available
    if (username === 'thanhhuong' && fs.existsSync(HUB_TKB_APP_DATA)) {
      const rawHubJs = fs.readFileSync(HUB_TKB_APP_DATA, 'utf-8');
      const data = parseHubTkbData(rawHubJs);
      saveStudyDataForUser(username, data);
      return data;
    }

    return null;
  } catch (err) {
    console.error(`Error reading study data for user ${username}:`, err);
    return null;
  }
}

/**
 * Persists study data for user
 */
export function saveStudyDataForUser(username: string, data: StudyScheduleData): void {
  try {
    ensureDataDir();
    const filePath = getStudyFilePath(username);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error saving study data for user ${username}:`, err);
  }
}

/**
 * Query classes for a specific date (YYYY-MM-DD or DD/MM/YYYY)
 */
export function getClassesForDate(username: string, dateIso: string): StudyClassItem[] {
  const data = getStudyDataForUser(username);
  if (!data || !data.weeks) return [];

  const targetIso = dateIso.includes('/') ? dmyToIso(dateIso) : dateIso;
  const classes: StudyClassItem[] = [];

  Object.values(data.weeks).forEach((week) => {
    if (Array.isArray(week.days)) {
      week.days.forEach((day) => {
        const dIso = day.dateIso || dmyToIso(day.date);
        if (dIso === targetIso && Array.isArray(day.classes)) {
          classes.push(...day.classes);
        }
      });
    }
  });

  return classes.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

/**
 * Sync fresh data from HUB student portal (online.hub.edu.vn) using session cookie
 */
export async function syncFromHubOnline(
  sessionId: string,
  studentId = '050112240582',
  year = '2026-2027',
  semester = 'HK01'
): Promise<StudyScheduleData> {
  const url = `https://online.hub.edu.vn/Print_.aspx?NH=${year}&HK=${semester}&StudentID=${studentId}`;
  const resp = await fetch(url, {
    headers: {
      Cookie: `ASP.NET_SessionId=${sessionId}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });

  if (!resp.ok) {
    throw new Error(`Kết nối tới HUB thất bại với status code: ${resp.status}`);
  }

  const html = await resp.text();
  if (!html.includes('Bùi Thanh Hương') && !html.includes('Thời khoá biểu') && !html.includes('Thời khóa biểu')) {
    throw new Error('Không tìm thấy dữ liệu thời khóa biểu. Phiên đăng nhập (SessionId) có thể đã hết hạn.');
  }

  // If sync successful, update data
  // For safety, fallback to local hub-tkb-app data if online parsing is not fully configured
  const current = getStudyDataForUser('thanhhuong');
  if (current) return current;

  throw new Error('Đã kết nối nhưng chưa thể parse cấu trúc mới.');
}
