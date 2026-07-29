import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';

export interface ParsedShiftResult {
  dayOfWeek: 'Thu2' | 'Thu3' | 'Thu4' | 'Thu5' | 'Thu6' | 'Thu7' | 'CN';
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

export function parseShiftCode(code: string): { startTime: string; endTime: string; isOff: boolean; shiftCode?: string } {
  const rawClean = code.trim().toUpperCase();
  const clean = rawClean.replace(/[^A-Z0-9]/g, '');

  if (
    !clean ||
    ['OFF', 'OF', 'OM', 'OK', '0H', 'OH', 'NGHI', 'NGHI', 'N', 'OFFOFF'].includes(clean) ||
    clean === '-' ||
    clean === 'X' ||
    clean === '0'
  ) {
    return { startTime: '', endTime: '', isOff: true, shiftCode: 'OFF' };
  }

  // Predefined fuzzy B18 shift codes (OCR misreads: B18, BIS, BIG, MIS, MIE, BH, BI, B1, 818, BS, B1S, BI8, B1B, B1O, B19)
  if (['B18', 'BIS', 'BIG', 'MIS', 'MIE', 'BH', 'BI', 'B1', '818', 'BS', 'B1S', 'BI8', 'B1B', 'B1O', 'B19'].includes(clean)) {
    return { startTime: '18:00', endTime: '22:00', isOff: false, shiftCode: 'B18' };
  }

  // Predefined fuzzy B16 shift codes: B16, B6, BIE, B1E, BI6, BE
  if (['B16', 'B6', 'BIE', 'B1E', 'BI6', 'BE', 'B16H'].includes(clean)) {
    return { startTime: '16:00', endTime: '22:00', isOff: false, shiftCode: 'B16' };
  }

  // Predefined fuzzy B17 shift codes: B17, B7
  if (['B17', 'B7'].includes(clean)) {
    return { startTime: '17:00', endTime: '22:00', isOff: false, shiftCode: 'B17' };
  }

  // Predefined fuzzy A11 shift codes (OCR misreads: A11, ALL, A11H)
  if (['A11', 'ALL', 'A11H'].includes(clean)) {
    return { startTime: '07:00', endTime: '11:00', isOff: false, shiftCode: 'A11' };
  }

  // Standalone B or 5 or S
  if (['B', '5', 'S'].includes(clean)) {
    return { startTime: '15:00', endTime: '22:00', isOff: false, shiftCode: 'B' };
  }

  // Standalone A or A1
  if (['A', 'A1'].includes(clean)) {
    return { startTime: '07:00', endTime: '15:00', isOff: false, shiftCode: 'A' };
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

  return { startTime: '08:00', endTime: '16:00', isOff: false, shiftCode: code };
}

export function parseScheduleLine(matchedLine: string, employeeName: string): ParsedShiftResult[] {
  // If line contains pipe '|' separators, split into table cells first
  let shiftTokens: string[] = [];

  if (matchedLine.includes('|')) {
    const cells = matchedLine.split('|').map(c => c.trim()).filter(Boolean);
    // cells[0] is STT (e.g. "4"), cells[1] is Name (e.g. "ThanhHương"), cells[2] is Position (e.g. "Bmsm")
    // cells[3..9] are the 7 shift cells!
    if (cells.length >= 8) {
      // Find which cell contains the employee name
      const nameWords = getNameWords(employeeName);
      const nameCellIdx = cells.findIndex(c => {
        const cleanC = cleanText(c);
        return nameWords.some(nw => cleanC.includes(nw));
      });

      if (nameCellIdx !== -1) {
        // Cells after position cell (nameCellIdx + 2) are shift cells
        const potentialShifts = cells.slice(nameCellIdx + 2);
        shiftTokens = potentialShifts;
      }
    }
  }

  if (shiftTokens.length < 7) {
    // Fallback space tokenization
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

  if (shiftTokens.length > 7) {
    const lastToken = shiftTokens[shiftTokens.length - 1];
    const cleanLast = cleanText(lastToken);
    if (/^\d{1,3}(h|gio)?$/i.test(lastToken) || ['tong', 'total', 'h', 'gio'].includes(cleanLast)) {
      shiftTokens.pop();
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

async function debugOcr() {
  const imagePath = '/home/chinhan/Downloads/download.jpeg';
  const inputBuffer = fs.readFileSync(imagePath);
  
  const processedBuffer = await sharp(inputBuffer)
    .resize({ width: 1800 })
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
  
  const worker = await createWorker('vie+eng');
  const ret = await worker.recognize(processedBuffer);
  await worker.terminate();

  const lines = ret.data.text.split('\n').map(l => l.trim()).filter(Boolean);
  const matchedLine = lines.find(l => cleanText(l).includes('thanh') && cleanText(l).includes('huong'));

  console.log("Matched Line:", matchedLine);
  if (matchedLine) {
    const shifts = parseScheduleLine(matchedLine, "Thanh Hương");
    console.log("\nPARSED SHIFTS RESULT:");
    shifts.forEach(s => {
      console.log(`${s.dayOfWeek}: ${s.isOff ? 'OFF' : `${s.shiftCode} (${s.startTime}-${s.endTime})`}`);
    });
  }
}

debugOcr().catch(console.error);
