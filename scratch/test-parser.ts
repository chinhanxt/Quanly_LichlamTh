import { parseShiftCode, getCleanShiftCodeName, parseScheduleLine } from '../lib/ocr-parser';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

// 1. Test B18 variants
const b18Codes = ['B18', 'BIS', 'BIG', 'MIS', 'BH', 'BI', 'B1', '818', 'BS', 'B1S', 'BI8', 'B1B', 'B1O', 'B19'];
for (const code of b18Codes) {
  const parsed = parseShiftCode(code);
  assert(parsed.startTime === '18:00' && parsed.endTime === '22:00' && !parsed.isOff && parsed.shiftCode === 'B18', `B18 variant ${code}`);
  assert(getCleanShiftCodeName(code) === 'Ca B18', `getCleanShiftCodeName B18 ${code}`);
}

// 2. Test B16 variants
const b16Codes = ['B16', 'B6', 'BIE', 'MIE', 'B1E', 'M1E', 'BI6', 'MI6', 'BE', 'ME', 'B16H'];
for (const code of b16Codes) {
  const parsed = parseShiftCode(code);
  assert(parsed.startTime === '16:00' && parsed.endTime === '22:00' && !parsed.isOff && parsed.shiftCode === 'B16', `B16 variant ${code}`);
  assert(getCleanShiftCodeName(code) === 'Ca B16', `getCleanShiftCodeName B16 ${code}`);
}

// 3. Test B17 variants
const b17Codes = ['B17', 'B7'];
for (const code of b17Codes) {
  const parsed = parseShiftCode(code);
  assert(parsed.startTime === '17:00' && parsed.endTime === '22:00' && !parsed.isOff && parsed.shiftCode === 'B17', `B17 variant ${code}`);
  assert(getCleanShiftCodeName(code) === 'Ca B17', `getCleanShiftCodeName B17 ${code}`);
}

// 4. Test A11 variants
const a11Codes = ['A11', 'ALL', 'A11H'];
for (const code of a11Codes) {
  const parsed = parseShiftCode(code);
  assert(parsed.startTime === '07:00' && parsed.endTime === '11:00' && !parsed.isOff && parsed.shiftCode === 'A11', `A11 variant ${code}`);
  assert(getCleanShiftCodeName(code) === 'Ca A11', `getCleanShiftCodeName A11 ${code}`);
}

// 5. Test A variants
const aCodes = ['A', 'A1'];
for (const code of aCodes) {
  const parsed = parseShiftCode(code);
  assert(parsed.startTime === '07:00' && parsed.endTime === '15:00' && !parsed.isOff && parsed.shiftCode === 'A', `A variant ${code}`);
  assert(getCleanShiftCodeName(code) === 'Ca A', `getCleanShiftCodeName A ${code}`);
}

// 6. Test B variants
const bCodes = ['B', '5', 'S'];
for (const code of bCodes) {
  const parsed = parseShiftCode(code);
  assert(parsed.startTime === '15:00' && parsed.endTime === '22:00' && !parsed.isOff && parsed.shiftCode === 'B', `B variant ${code}`);
  assert(getCleanShiftCodeName(code) === 'Ca B', `getCleanShiftCodeName B ${code}`);
}

// 7. Test range match
const rangeParsed = parseShiftCode('11-18H');
assert(rangeParsed.startTime === '11:00' && rangeParsed.endTime === '18:00' && !rangeParsed.isOff, 'Range 11-18H');
assert(getCleanShiftCodeName('11-18H') === 'Ca 11h-18h', 'getCleanShiftCodeName Range 11-18H');

// 8. Test 4-digit hours
const fourDigitParsed = parseShiftCode('1418H');
assert(fourDigitParsed.startTime === '14:00' && fourDigitParsed.endTime === '18:00' && !fourDigitParsed.isOff, '4-digit 1418H');
assert(getCleanShiftCodeName('1418H') === 'Ca 14h-18h', 'getCleanShiftCodeName 4-digit 1418H');

// 9. Test off codes
const offCodes = ['OFF', 'OF', 'OM', 'OK', '0H', 'OH', 'NGHI', 'N', 'OFFOFF', 'OP', 'TOM', '-', 'X', '0'];
for (const code of offCodes) {
  const parsed = parseShiftCode(code);
  assert(parsed.isOff === true && parsed.startTime === '' && parsed.endTime === '', `OFF code ${code}`);
}

// 10. Test parseScheduleLine with > 7 tokens and trailing total hours
const lineWithTotal = '1 | Thanh Hương | Barista | A11 | B16 | OFF | B18 | OFF | B17 | B | 42h';
const parsedLine = parseScheduleLine(lineWithTotal, 'Thanh Hương');
assert(parsedLine.length === 7, 'parseScheduleLine count === 7');
assert(parsedLine[0].shiftCode === 'A11', 'day 1 === A11');
assert(parsedLine[1].shiftCode === 'B16', 'day 2 === B16');
assert(parsedLine[2].isOff === true, 'day 3 === OFF');
assert(parsedLine[3].shiftCode === 'B18', 'day 4 === B18');
assert(parsedLine[4].isOff === true, 'day 5 === OFF');
assert(parsedLine[5].shiftCode === 'B17', 'day 6 === B17');
assert(parsedLine[6].shiftCode === 'B', 'day 7 === B');

console.log('\nALL TESTS PASSED SUCCESSFULLY!');
