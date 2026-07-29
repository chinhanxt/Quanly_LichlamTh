import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import { parseShiftCode, matchEmployeeLine, parseScheduleLine } from './lib/ocr-parser';

export function parseShiftCodeFixed(code: string): { startTime: string; endTime: string; isOff: boolean; shiftCode?: string } {
  const rawClean = code.trim().toUpperCase();
  const clean = rawClean.replace(/[^A-Z0-9]/g, '');

  if (
    !clean ||
    ['OFF', 'OF', 'OM', 'OK', '0H', 'OH', 'NGHI', 'NGHI', 'N', 'OFFOFF', 'OP', 'TOM'].includes(clean) ||
    clean === '-' ||
    clean === 'X' ||
    clean === '0'
  ) {
    return { startTime: '', endTime: '', isOff: true, shiftCode: 'OFF' };
  }

  // Predefined fuzzy B16 shift codes (OCR misreads of B16: B16, B6, BIE, MIE, B1E, M1E, BI6, MI6, BE, ME)
  if (['B16', 'B6', 'BIE', 'MIE', 'B1E', 'M1E', 'BI6', 'MI6', 'BE', 'ME', 'B16H'].includes(clean)) {
    return { startTime: '16:00', endTime: '22:00', isOff: false, shiftCode: 'B16' };
  }

  // Predefined fuzzy B18 shift codes (OCR misreads of B18: B18, BIS, BIG, MIS, BH, BI, B1, 818, BS, B1S, BI8, B1B, B1O, B19)
  if (['B18', 'BIS', 'BIG', 'MIS', 'BH', 'BI', 'B1', '818', 'BS', 'B1S', 'BI8', 'B1B', 'B1O', 'B19'].includes(clean)) {
    return { startTime: '18:00', endTime: '22:00', isOff: false, shiftCode: 'B18' };
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

async function testFix() {
  const imagePath = '/home/chinhan/Downloads/download.jpeg';
  const fileBuffer = fs.readFileSync(imagePath);

  // Raw buffer OCR
  let worker = await createWorker('vie+eng');
  let ret = await worker.recognize(fileBuffer);
  await worker.terminate();

  let lines = ret.data.text.split('\n').map(l => l.trim()).filter(Boolean);
  let matched = matchEmployeeLine(lines, "Thanh Hương");
  console.log("Matched Line (RAW):", matched);
  if (matched) {
    let cells = matched.split('|').map(c => c.trim()).filter(Boolean);
    let shiftTokens = cells.slice(3);
    let shifts = shiftTokens.map(t => parseShiftCodeFixed(t));
    console.log("Shifts (RAW):", shifts.map(s => s.isOff ? 'OFF' : `${s.shiftCode} (${s.startTime}-${s.endTime})`).join(' | '));
  }

  // Sharp buffer OCR
  const sharpBuf = await sharp(fileBuffer).resize({ width: 1800 }).grayscale().normalize().sharpen().toBuffer();
  worker = await createWorker('vie+eng');
  ret = await worker.recognize(sharpBuf);
  await worker.terminate();

  lines = ret.data.text.split('\n').map(l => l.trim()).filter(Boolean);
  matched = matchEmployeeLine(lines, "Thanh Hương");
  console.log("\nMatched Line (SHARP):", matched);
  if (matched) {
    let cells = matched.split('|').map(c => c.trim()).filter(Boolean);
    let shiftTokens = cells.slice(3);
    let shifts = shiftTokens.map(t => parseShiftCodeFixed(t));
    console.log("Shifts (SHARP):", shifts.map(s => s.isOff ? 'OFF' : `${s.shiftCode} (${s.startTime}-${s.endTime})`).join(' | '));
  }
}

testFix().catch(console.error);
