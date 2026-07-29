import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import { cleanText, getNameWords, parseScheduleLine } from './lib/ocr-parser';

export function matchEmployeeLineFixed(lines: string[], employeeName: string): string | null {
  const cleanTarget = cleanText(employeeName);
  const nameWords = getNameWords(employeeName);

  // 1. Exact clean substring match
  const exact = lines.find((line) => cleanText(line).includes(cleanTarget));
  if (exact) return exact;

  // 2. Score all lines by number of name words matched
  let bestLine: string | null = null;
  let maxMatchedWords = 0;

  for (const line of lines) {
    const cleanLine = cleanText(line);
    const count = nameWords.reduce((acc, word) => acc + (cleanLine.includes(word) ? 1 : 0), 0);

    if (count > maxMatchedWords) {
      maxMatchedWords = count;
      bestLine = line;
    }
  }

  // Require matching ALL name words if multiple words present, or at least maxMatchedWords >= nameWords.length
  if (bestLine && maxMatchedWords >= nameWords.length) {
    return bestLine;
  }

  // Fallback if maxMatchedWords > 0
  if (bestLine && maxMatchedWords > 0) {
    return bestLine;
  }

  return null;
}

async function testMatcher() {
  const imagePath = '/home/chinhan/Downloads/download.jpeg';
  const inputBuffer = fs.readFileSync(imagePath);

  const processedBuffer = await sharp(inputBuffer).resize({ width: 1800 }).grayscale().normalize().toBuffer();
  const worker = await createWorker('vie+eng');
  const ret = await worker.recognize(processedBuffer);
  await worker.terminate();

  const lines = ret.data.text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const matched = matchEmployeeLineFixed(lines, "Thanh Hương");
  console.log("MATCHED LINE FOR 'Thanh Hương':", matched);

  if (matched) {
    const shifts = parseScheduleLine(matched, "Thanh Hương");
    console.log("\nPARSED SHIFTS:");
    shifts.forEach(s => {
      console.log(`${s.dayOfWeek}: ${s.isOff ? 'OFF' : `${s.shiftCode} (${s.startTime}-${s.endTime})`}`);
    });
  }
}

testMatcher().catch(console.error);
