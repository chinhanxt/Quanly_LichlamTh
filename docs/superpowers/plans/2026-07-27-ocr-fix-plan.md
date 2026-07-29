# OCR Fix & Precision Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the "Failed to fetch" error during schedule image import and enhance OCR accuracy for employee schedule parsing.

**Architecture:** Route all OCR processing 100% through the server API endpoint (`/api/ocr`) using Sharp for image preprocessing and Tesseract.js in Node.js with local `.traineddata.gz` files. Remove client-side Tesseract fallback to eliminate external CDN network calls. Enhance shift token parsing logic with fuzzy shift code dictionaries and name matching.

**Tech Stack:** Next.js 14 App Router, TypeScript, Sharp, Tesseract.js (v7), Node.js `zlib`.

## Global Constraints

- Server-only OCR via `/api/ocr` API route.
- Zero external CDN requests from browser for Tesseract assets.
- Offline Tesseract configuration with `gzip: true` and local `langPath`.
- Preserved existing component interfaces and API contracts.

---

### Task 1: Prepare Offline Traineddata Assets & Update Server API Route (`/api/ocr`)

**Files:**
- Create: `eng.traineddata.gz` (compressed from `eng.traineddata`)
- Create: `vie.traineddata.gz` (compressed from `vie.traineddata`)
- Modify: `app/api/ocr/route.ts`

**Interfaces:**
- Consumes: Image file FormData sent via POST request to `/api/ocr`
- Produces: JSON response `{ success: true, data: ParsedShiftResult[] }` or `{ success: false, error: string }`

- [ ] **Step 1: Gzip the traineddata files in project root**

Run: `gzip -c eng.traineddata > eng.traineddata.gz && gzip -c vie.traineddata > vie.traineddata.gz`
Expected: `eng.traineddata.gz` and `vie.traineddata.gz` created in project root.

- [ ] **Step 2: Verify gzipped traineddata files exist**

Run: `ls -la *.traineddata.gz`
Expected: Both `eng.traineddata.gz` and `vie.traineddata.gz` listed with non-zero size.

- [ ] **Step 3: Update `app/api/ocr/route.ts` to use Sharp preprocessing and offline Tesseract worker**

Modify `app/api/ocr/route.ts` with the following content:

```typescript
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { matchEmployeeLine, parseScheduleLine } from '@/lib/ocr-parser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeName = (formData.get('employeeName') as string) || 'Thanh Hương';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy file ảnh' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Enhanced Sharp image preprocessing: resize 1800px max, grayscale, normalize contrast, sharpen text edges
    const processedBuffer = await sharp(inputBuffer)
      .resize({ width: 1800, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.5 })
      .toBuffer();

    const workerPath = path.resolve(process.cwd(), 'node_modules/tesseract.js/src/worker/node/index.js');
    const corePath = path.resolve(process.cwd(), 'node_modules/tesseract.js-core/tesseract-core.wasm.js');

    const worker = await createWorker('vie+eng', 1, {
      workerPath,
      corePath,
      langPath: process.cwd(),
      cachePath: process.cwd(),
      gzip: true,
    });

    const ret = await worker.recognize(processedBuffer);
    await worker.terminate();

    const text = ret.data.text;
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const matchedLine = matchEmployeeLine(lines, employeeName);

    if (!matchedLine) {
      return NextResponse.json({
        success: false,
        error: `Không tìm thấy hàng tên "${employeeName}" trong ảnh lịch. Vui lòng kiểm tra lại tên trong trang Cấu hình.`
      });
    }

    const results = parseScheduleLine(matchedLine, employeeName);
    return NextResponse.json({ success: true, data: results });
  } catch (err: any) {
    console.error('Server OCR error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi quét ảnh OCR trên server: ' + (err.message || String(err)) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit Task 1**

```bash
git add eng.traineddata.gz vie.traineddata.gz app/api/ocr/route.ts
git commit -m "feat(ocr): configure offline tesseract traineddata and sharp image preprocessing"
```

---

### Task 2: Refactor `lib/ocr-parser.ts` to Eliminate Client Fallback & Improve Shift Token Recognition

**Files:**
- Modify: `lib/ocr-parser.ts`

**Interfaces:**
- Consumes: `imageFile: File`, `employeeName: string`
- Produces: `parseScheduleImage`, `parseScheduleLine`, `matchEmployeeLine`, `getCleanShiftCodeName`, `parseShiftCode`

- [ ] **Step 1: Write test script for OCR parsing logic**

Create a temporary scratch script `scratch/test-parser.ts` to test `parseShiftCode` and `parseScheduleLine`:

```typescript
import { parseShiftCode, parseScheduleLine, matchEmployeeLine } from '../lib/ocr-parser';

// Test shift code parsing
console.assert(parseShiftCode('B18').shiftCode === 'B18', 'B18 should be B18');
console.assert(parseShiftCode('BIS').shiftCode === 'B18', 'BIS should map to B18');
console.assert(parseShiftCode('B16').shiftCode === 'B16', 'B16 should be B16');
console.assert(parseShiftCode('MIE').shiftCode === 'B16', 'MIE should map to B16');
console.assert(parseShiftCode('A11').shiftCode === 'A11', 'A11 should be A11');
console.assert(parseShiftCode('OFF').isOff === true, 'OFF should be off');
console.assert(parseShiftCode('11-18H').shiftCode === '11-18H', '11-18H should be range');

// Test employee line matching
const lines = [
  'STT | NV | Ten | T2 | T3 | T4 | T5 | T6 | T7 | CN',
  '1 | Barista | Thanh Huong | B18 | OFF | B16 | A11 | OFF | B18 | OFF | 28h'
];
const matched = matchEmployeeLine(lines, 'Thanh Hương');
console.assert(matched !== null, 'Should match Thanh Hương line');

if (matched) {
  const result = parseScheduleLine(matched, 'Thanh Hương');
  console.assert(result.length === 7, 'Should produce 7 days schedule');
  console.assert(result[0].shiftCode === 'B18', 'Day 1 should be B18');
  console.assert(result[1].isOff === true, 'Day 2 should be OFF');
}

console.log('Parser unit tests passed!');
```

- [ ] **Step 2: Update `lib/ocr-parser.ts` to remove client-side Tesseract worker and enhance parsing logic**

Update `lib/ocr-parser.ts`:

```typescript
import { format24hTime } from './time-formatter';

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

export function matchEmployeeLine(lines: string[], employeeName: string): string | null {
  const cleanTarget = cleanText(employeeName);
  const nameWords = getNameWords(employeeName);

  // 1. Exact clean substring match (e.g. "thanhhuong")
  const exact = lines.find((line) => cleanText(line).includes(cleanTarget));
  if (exact) return exact;

  // 2. Score all lines by number of target name words matched (e.g. 'thanh' + 'huong')
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

  if (bestLine && maxMatchedWords >= nameWords.length) {
    return bestLine;
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
  if (['A11', 'ALL', 'A1'].includes(clean)) return 'Ca A11';
  if (['B', '5', 'S'].includes(clean)) return 'Ca B';
  if (['A'].includes(clean)) return 'Ca A';

  const rangeMatch = rawClean.match(/^(\d{1,2})[-:](\d{1,2})H?$/i);
  if (rangeMatch) {
    return `Ca ${rangeMatch[1]}h-${rangeMatch[2]}h`;
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
    ['OFF', 'OF', 'OM', 'OK', '0H', 'OH', 'NGHI', 'N', 'OFFOFF', 'OP', 'TOM'].includes(clean) ||
    clean === '-' ||
    clean === 'X' ||
    clean === '0'
  ) {
    return { startTime: '', endTime: '', isOff: true, shiftCode: 'OFF' };
  }

  // Predefined fuzzy B16 shift codes
  if (['B16', 'B6', 'BIE', 'MIE', 'B1E', 'M1E', 'BI6', 'MI6', 'BE', 'ME', 'B16H'].includes(clean)) {
    return { startTime: '16:00', endTime: '22:00', isOff: false, shiftCode: 'B16' };
  }

  // Predefined fuzzy B18 shift codes
  if (['B18', 'BIS', 'BIG', 'MIS', 'BH', 'BI', 'B1', '818', 'BS', 'B1S', 'BI8', 'B1B', 'B1O', 'B19'].includes(clean)) {
    return { startTime: '18:00', endTime: '22:00', isOff: false, shiftCode: 'B18' };
  }

  // Predefined fuzzy B17 shift codes
  if (['B17', 'B7'].includes(clean)) {
    return { startTime: '17:00', endTime: '22:00', isOff: false, shiftCode: 'B17' };
  }

  // Predefined fuzzy A11 shift codes
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

  // Explicit hour ranges e.g. "11-18H", "14-18H", "10-14H", "8-16H"
  const rangeMatch = rawClean.match(/^(\d{1,2})[-:](\d{1,2})H?$/i);
  if (rangeMatch) {
    const startH = rangeMatch[1].padStart(2, '0');
    const endH = rangeMatch[2].padStart(2, '0');
    return { startTime: `${startH}:00`, endTime: `${endH}:00`, isOff: false, shiftCode: `${rangeMatch[1]}-${rangeMatch[2]}H` };
  }

  // 4-digit numbers: e.g. 1418H, 1115H
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

  // Remove trailing total hours column if present (e.g., "28h", "30", "tong")
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
      subject: `Highlands Coffee (${parsed.shiftCode || code})`,
    };
  });
}

export async function parseScheduleImage(
  imageFile: File,
  employeeName: string
): Promise<{ success: boolean; data?: ParsedShiftResult[]; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('employeeName', employeeName);

    const res = await fetch('/api/ocr', { method: 'POST', body: formData });
    const json = await res.json();

    if (res.ok && json.success && json.data) {
      return { success: true, data: json.data };
    }

    return {
      success: false,
      error: json.error || 'Không thể quét được lịch từ ảnh (Lỗi API Server).'
    };
  } catch (apiErr: any) {
    console.error('OCR Request Error:', apiErr);
    return {
      success: false,
      error: 'Không thể kết nối đến máy chủ OCR: ' + (apiErr.message || String(apiErr))
    };
  }
}
```

- [ ] **Step 3: Run scratch test script using npx tsx**

Run: `npx tsx scratch/test-parser.ts`
Expected: "Parser unit tests passed!"

- [ ] **Step 4: Remove scratch test script**

Run: `rm scratch/test-parser.ts`
Expected: Scratch test file removed.

- [ ] **Step 5: Commit Task 2**

```bash
git add lib/ocr-parser.ts
git commit -m "refactor(ocr): route all OCR calls to server API and improve schedule token parsing"
```

---

### Task 3: Verification & Next.js Build Check

**Files:**
- None (Build validation & verification)

- [ ] **Step 1: Run Next.js build to verify zero compilation or TypeScript errors**

Run: `npm run build`
Expected: Clean build output without TypeScript or compilation errors.

- [ ] **Step 2: Commit any final changes (if any)**

```bash
git status
```
