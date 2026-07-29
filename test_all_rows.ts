import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import { cleanText, parseScheduleLine, matchEmployeeLine } from './lib/ocr-parser';

async function testAllRows() {
  const imagePath = '/home/chinhan/Downloads/download.jpeg';
  const inputBuffer = fs.readFileSync(imagePath);

  // Test with different widths (1200, 1500, 1800, 2400, raw)
  const widths = [0, 1200, 1500, 1800, 2400];

  for (const w of widths) {
    let buf = inputBuffer;
    if (w > 0) {
      buf = await sharp(inputBuffer).resize({ width: w }).grayscale().normalize().toBuffer();
    }
    const worker = await createWorker('vie+eng');
    const ret = await worker.recognize(buf);
    await worker.terminate();

    console.log(`\n================ WIDTH ${w || 'RAW'} ================`);
    const lines = ret.data.text.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach((line, idx) => {
      console.log(`\nLine ${idx}: "${line}"`);
      const matched = matchEmployeeLine([line], "Thanh Hương");
      if (matched) {
        console.log(`  -> MATCHED FOR 'Thanh Hương'!`);
      }
      const shifts = parseScheduleLine(line, "Thanh Hương");
      const shiftSummary = shifts.map(s => s.isOff ? 'OFF' : `${s.shiftCode}`).join(', ');
      console.log(`  -> Parsed Shifts: ${shiftSummary}`);
    });
  }
}

testAllRows().catch(console.error);
