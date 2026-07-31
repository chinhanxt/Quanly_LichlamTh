import { ScheduleItem } from '@/types/schedule';

export interface ParsedGoogleSheetResult {
  month: number;
  year: number;
  employeeName: string;
  totalShifts: number;
  totalSalary: number;
  items: Omit<ScheduleItem, 'id'>[];
}

export async function parseGoogleSheetSchedule(
  sheetUrl: string,
  targetEmployeeName: string = 'Nguyễn Chí Nhân',
  targetMonth?: number,
  targetYear?: number
): Promise<ParsedGoogleSheetResult> {
  let spreadsheetId = '1UnBM5lf3RNOtY7ACJ5soHDgOTz2rPZqr';
  let gid = '229272214';

  const matchId = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matchId && matchId[1]) spreadsheetId = matchId[1];

  const matchGid = sheetUrl.match(/gid=([0-9]+)/);
  if (matchGid && matchGid[1]) gid = matchGid[1];

  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(csvUrl, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Không thể kết nối đến Google Sheet. Vui lòng kiểm tra liên kết hoặc quyền truy cập.');
  }

  const text = await res.text();
  const lines = text.split('\n').map((l) => l.split(','));

  // 1. Detect Month & Year
  let month = new Date().getMonth() + 1;
  let year = new Date().getFullYear();
  for (const line of lines) {
    const joined = line.join(' ');
    const m = joined.match(/THÁNG\s+(\d+)\/(\d+)/i);
    if (m) {
      month = parseInt(m[1], 10);
      year = parseInt(m[2], 10);
      break;
    }
  }

  // Validate target Month & Year if requested by user
  if (targetMonth && targetYear) {
    if (month !== targetMonth || year !== targetYear) {
      throw new Error(
        `Không tìm thấy dữ liệu lịch trực cho Tháng ${targetMonth}/${targetYear} trong Google Sheet này! (Dữ liệu trang hiện tại là Tháng ${month}/${year}). Vui lòng kiểm tra lại liên kết hoặc mở đúng tab Tháng ${targetMonth}/${targetYear}.`
      );
    }
  }

  // 2. Locate Day headers (1..31)
  const dayColIndexMap: Record<number, number> = {};
  for (let r = 0; r < lines.length; r++) {
    const row = lines[r];
    for (let c = 0; c < row.length; c++) {
      const val = (row[c] || '').trim();
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 31) {
        dayColIndexMap[num] = c;
      }
    }
    if (Object.keys(dayColIndexMap).length >= 28) {
      break;
    }
  }

  if (Object.keys(dayColIndexMap).length === 0) {
    throw new Error('Không tìm thấy dòng danh sách các ngày (1-31) trong Google Sheet.');
  }

  // 3. Locate Person Row
  const normalizedTarget = targetEmployeeName.toLowerCase().trim();
  const targetTokens = normalizedTarget.split(/\s+/).filter(Boolean);

  let sangRow: string[] | null = null;
  let chieuRow: string[] | null = null;

  for (let r = 0; r < lines.length; r++) {
    const row = lines[r];
    const namePart = ((row[1] || '') + ' ' + (row[2] || '')).toLowerCase().trim();
    const isMatch = targetTokens.some((token) => namePart.includes(token));

    if (isMatch) {
      sangRow = row;
      chieuRow = lines[r + 1] || null;
      break;
    }
  }

  if (!sangRow) {
    throw new Error(`Không tìm thấy tên nhân viên "${targetEmployeeName}" trong Google Sheet.`);
  }

  // 4. Build schedule items
  const items: Omit<ScheduleItem, 'id'>[] = [];
  const dayKeys: Array<ScheduleItem['dayOfWeek']> = ['CN', 'Thu2', 'Thu3', 'Thu4', 'Thu5', 'Thu6', 'Thu7'];

  for (const [dayStr, colIdx] of Object.entries(dayColIndexMap)) {
    const day = parseInt(dayStr, 10);
    const sangVal = (sangRow[colIdx] || '').trim().toLowerCase();
    const chieuVal = chieuRow ? (chieuRow[colIdx] || '').trim().toLowerCase() : '';

    const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dObj = new Date(year, month - 1, day);
    const dayOfWeek = dayKeys[dObj.getDay()];

    if (sangVal === 'x') {
      items.push({
        dayOfWeek,
        date: dateIso,
        startTime: '08:00',
        endTime: '12:00',
        subject: 'Ca Sáng (Viện AI)',
        location: 'Viện Trí tuệ nhân tạo và Chuyển đổi số',
        note: 'CTV Công nhật (100.000đ)',
        reminderEnabled: true,
      });
    }

    if (chieuVal === 'x') {
      items.push({
        dayOfWeek,
        date: dateIso,
        startTime: '13:00',
        endTime: '17:00',
        subject: 'Ca Chiều (Viện AI)',
        location: 'Viện Trí tuệ nhân tạo và Chuyển đổi số',
        note: 'CTV Công nhật (100.000đ)',
        reminderEnabled: true,
      });
    }
  }

  return {
    month,
    year,
    employeeName: targetEmployeeName,
    totalShifts: items.length,
    totalSalary: items.length * 100000,
    items,
  };
}
