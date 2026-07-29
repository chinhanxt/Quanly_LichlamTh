import { format24hTime } from './time-formatter';

export interface ParsedShiftResult {
  dayOfWeek: 'Thu2' | 'Thu3' | 'Thu4' | 'Thu5' | 'Thu6' | 'Thu7' | 'CN';
  date?: string;
  dayLabel: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  isOff: boolean;
  subject: string;
}

export function cleanText(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

export function getNameWords(employeeName: string): string[] {
  return employeeName
    .split(/\s+/)
    .map((w) => cleanText(w))
    .filter((w) => w.length >= 2);
}

export function matchEmployeeLine(lines: string[], employeeName: string): string | null {
  const cleanTarget = cleanText(employeeName);
  const nameWords = getNameWords(employeeName);

  const isHeaderLine = (cleanLine: string) => {
    return (
      cleanLine.includes('stt') &&
      (cleanLine.includes('hoten') || cleanLine.includes('ten') || cleanLine.includes('chucvu') || cleanLine.includes('thu'))
    );
  };

  // 1. Exact clean substring match (e.g. "thanhhuong")
  const exact = lines.find((line) => {
    const cleanL = cleanText(line);
    return !isHeaderLine(cleanL) && cleanL.includes(cleanTarget);
  });
  if (exact) return exact;

  // 2. Score all non-header lines by number of target name words matched (e.g. 'thanh' + 'huong')
  let bestLine: string | null = null;
  let maxMatchedWords = 0;

  for (const line of lines) {
    const cleanLine = cleanText(line);
    if (isHeaderLine(cleanLine)) continue;

    const count = nameWords.reduce((acc, word) => acc + (cleanLine.includes(word) ? 1 : 0), 0);

    if (count > maxMatchedWords) {
      maxMatchedWords = count;
      bestLine = line;
    }
  }

  if (bestLine && maxMatchedWords > 0) {
    return bestLine;
  }

  return null;
}

export function getCleanShiftCodeName(code: string, startTime?: string, endTime?: string): string {
  if (!code) return 'Ca làm';
  const rawClean = code.trim().toUpperCase();
  const clean = rawClean.replace(/[^A-Z0-9]/g, '');

  if (['B18', 'BIS', 'BIG', 'MIS', 'BH', 'BI', 'B1', '818', 'BS', 'B1S', 'BI8', 'B1B', 'B1O', 'B19'].includes(clean)) return 'Ca B18';
  if (['B16', 'B6', 'BIE', 'MIE', 'B1E', 'M1E', 'BI6', 'MI6', 'BE', 'ME', 'B16H'].includes(clean)) return 'Ca B16';
  if (['B17', 'B7'].includes(clean)) return 'Ca B17';
  if (['A11', 'ALL', 'A11H'].includes(clean)) return 'Ca A11';
  if (['B', '5', 'S'].includes(clean)) return 'Ca B';
  if (['A', 'A1'].includes(clean)) return 'Ca A';

  const rangeMatch = rawClean.match(/^(\d{1,2})[-:](\d{1,2})H?$/i);
  if (rangeMatch) {
    return `Ca ${rangeMatch[1]}h-${rangeMatch[2]}h`;
  }

  const fourDigitMatch = rawClean.match(/^(\d{2})(\d{2})H?$/i);
  if (fourDigitMatch) {
    const s = parseInt(fourDigitMatch[1], 10);
    const e = parseInt(fourDigitMatch[2], 10);
    if (s >= 7 && s <= 22 && e >= 7 && e <= 23 && s < e) {
      return `Ca ${s}h-${e}h`;
    }
  }

  if (startTime && endTime) {
    return `Ca ${format24hTime(startTime)}-${format24hTime(endTime)}`;
  }

  return 'Ca làm';
}

export function parseShiftCode(code: string): { startTime: string; endTime: string; isOff: boolean; shiftCode?: string } {
  const rawClean = code.trim().toUpperCase();
  const clean = rawClean.replace(/[^A-Z0-9]/g, '');

  if (
    !clean ||
    ['OFF', 'OF', 'OM', 'OK', '0H', 'OH', 'NGHI', 'N', 'OFFOFF', 'OP', 'TOM', 'WAN', 'SW', 'OW', '0W', 'OW1', '0W1', 'ME', 'DO', 'ĐÓ', '-', 'X', '0'].includes(clean) ||
    rawClean === '-'
  ) {
    return { startTime: '', endTime: '', isOff: true, shiftCode: 'OFF' };
  }

  // Predefined fuzzy B18 shift codes (including OCR misreads: MIS, MI, MI8, M18, MI, MÌ, MIE, BI8, B18, BIS...)
  if (['B18', 'BIS', 'BIG', 'MIS', 'MI', 'MÌ', 'MI8', 'M18', 'MIE', 'BH', 'B1', '818', 'BS', 'B1S', 'BI8', 'B1B', 'B1O', 'B19'].includes(clean) || clean === 'MI' || clean === 'MÌ' || clean === 'BIS' || clean === 'MIE') {
    return { startTime: '18:00', endTime: '22:00', isOff: false, shiftCode: 'B18' };
  }

  // Predefined fuzzy B16 shift codes (including OCR misreads: B16, B6, BIE, MIE, B1E, M1E, BI6, MI6, BE, ME, B16H, MIC, BI...)
  if (['B16', 'B6', 'MIC', 'BI', 'BIE', 'B1E', 'M1E', 'BI6', 'MI6', 'BE', 'ME', 'B16H', 'BIC'].includes(clean) || clean === 'BIC' || clean === 'MIC' || clean === 'BI') {
    return { startTime: '16:00', endTime: '22:00', isOff: false, shiftCode: 'B16' };
  }

  // Predefined fuzzy B17 shift codes
  if (['B17', 'B7'].includes(clean)) {
    return { startTime: '17:00', endTime: '22:00', isOff: false, shiftCode: 'B17' };
  }

  // Predefined fuzzy A11 shift codes
  if (['A11', 'ALL', 'A11H'].includes(clean)) {
    return { startTime: '07:00', endTime: '11:00', isOff: false, shiftCode: 'A11' };
  }

  // Standalone A or A1
  if (['A', 'A1'].includes(clean)) {
    return { startTime: '07:00', endTime: '15:00', isOff: false, shiftCode: 'A' };
  }

  // Standalone B or 5 or S
  if (['B', '5', 'S'].includes(clean)) {
    return { startTime: '15:00', endTime: '22:00', isOff: false, shiftCode: 'B' };
  }

  // Regex pattern for explicit hour ranges: e.g. "11-18H", "14-18H", "10-14H", "8-16H"
  const rangeMatch = rawClean.match(/^(\d{1,2})[-:](\d{1,2})H?$/i);
  if (rangeMatch) {
    const startH = rangeMatch[1].padStart(2, '0');
    const endH = rangeMatch[2].padStart(2, '0');
    return { startTime: `${startH}:00`, endTime: `${endH}:00`, isOff: false, shiftCode: `${rangeMatch[1]}-${rangeMatch[2]}H` };
  }

  // 4-digit numbers: 1418H -> 14-18H, 1115H -> 11-15H, 1014H -> 10-14H, 1016H -> 10-16H
  const fourDigitMatch = rawClean.match(/^(\d{2})(\d{2})H?$/i);
  if (fourDigitMatch) {
    const s = parseInt(fourDigitMatch[1], 10);
    const e = parseInt(fourDigitMatch[2], 10);
    if (s >= 7 && s <= 22 && e >= 7 && e <= 23 && s < e) {
      const startH = String(s).padStart(2, '0');
      const endH = String(e).padStart(2, '0');
      return { startTime: `${startH}:00`, endTime: `${endH}:00`, isOff: false, shiftCode: `${s}-${e}H` };
    }
  }

  return { startTime: '', endTime: '', isOff: true, shiftCode: 'OFF' };
}

export function parseScheduleLine(matchedLine: string, employeeName: string): ParsedShiftResult[] {
  let shiftTokens: string[] = [];

  // 1. If line contains pipe '|' separators, parse table cells directly
  if (matchedLine.includes('|')) {
    const cells = matchedLine.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 8) {
      const nameWords = getNameWords(employeeName);
      const nameCellIdx = cells.findIndex((c) => {
        const cleanC = cleanText(c);
        return nameWords.some((nw) => cleanC.includes(nw));
      });

      if (nameCellIdx !== -1) {
        shiftTokens = cells.slice(nameCellIdx + 2);
      }
    }
  }

  // 2. Fallback space tokenization
  if (shiftTokens.length < 7) {
    let line = matchedLine
      .replace(/(\d{1,2})\s*[-:]\s*(\d{1,2})\s*H?/gi, '$1-$2H')
      .replace(/(\d{2})\s+(\d{2})\s*H?/g, '$1$2H')
      .replace(/\b(level|p|nv|stt)\s*\d+\b/gi, '')
      .replace(/\b(full|part)\s*time\b/gi, '')
      .replace(/\b(barista|supervisor|leader|staff|basa|swine|bus|tom)\b/gi, '');

    const rawTokens = line.split(/[\s|:\[\]]+/).filter(Boolean);
    const nameWords = getNameWords(employeeName);
    const cleanTargetName = cleanText(employeeName);

    const metadataIgnore = [
      'barista', 'level1', 'level2', 'level', 'position', 'fulltime', 'parttime', 'full', 'part', 'time',
      'nv', 'nvb', 'p1', 'p2', 'ft', 'pt', 'super', 'supervisor', 'leader', 'staff', 'basa', 'swine', 'bus',
      'nbuen', 'teen', 'min', 'ime', 'tom'
    ];

    const tokens = rawTokens.filter((token, idx) => {
      const cleanT = cleanText(token);
      if (!cleanT) return false;
      if (idx <= 1 && /^\d{1,2}\.?$/.test(token)) return false;
      if (nameWords.some((nw) => cleanT === nw)) return false;
      if (cleanT === cleanTargetName) return false;
      if (metadataIgnore.includes(cleanT)) return false;
      return true;
    });

    shiftTokens = [...tokens];
  }

  while (shiftTokens.length > 7) {
    const lastToken = shiftTokens[shiftTokens.length - 1];
    const cleanLast = cleanText(lastToken);
    if (/^\d{1,3}(h|gio)?$/i.test(lastToken) || ['tong', 'total', 'h', 'gio'].includes(cleanLast)) {
      shiftTokens.pop();
    } else {
      break;
    }
  }

  const days: Array<'Thu2' | 'Thu3' | 'Thu4' | 'Thu5' | 'Thu6' | 'Thu7' | 'CN'> = [
    'Thu2', 'Thu3', 'Thu4', 'Thu5', 'Thu6', 'Thu7', 'CN'
  ];

  return days.map((day, idx) => {
    const code = shiftTokens[idx] || 'OFF';
    const parsed = parseShiftCode(code);
    return {
      dayOfWeek: day,
      dayLabel: day,
      shiftCode: parsed.shiftCode || code,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      isOff: parsed.isOff,
      subject: `Highlands Coffee (Ca ${parsed.shiftCode || code})`,
    };
  });
}

export async function parseScheduleImage(
  imageFile: File,
  employeeName: string,
  geminiApiKey?: string
): Promise<{ success: boolean; data?: ParsedShiftResult[]; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('employeeName', employeeName);
    if (geminiApiKey) {
      formData.append('geminiApiKey', geminiApiKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));

    if (res.ok && json.success && json.data) {
      return { success: true, data: json.data };
    }

    return {
      success: false,
      error: json.error || 'Không thể quét lịch từ ảnh.'
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Quá thời gian xử lý (Timeout). Vui lòng thử lại với ảnh nhỏ hơn hoặc rõ nét hơn.'
      };
    }
    return {
      success: false,
      error: 'Không thể kết nối đến máy chủ OCR: ' + (err.message || 'Lỗi hệ thống')
    };
  }
}

