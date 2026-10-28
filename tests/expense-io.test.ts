import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseAmount, toCsv, parseExpenseTable } from '../lib/expense-io';

describe('parseAmount', () => {
  it('reads VN money shorthand', () => {
    assert.strictEqual(parseAmount('45'), 45000);
    assert.strictEqual(parseAmount('45', false), 45);
    assert.strictEqual(parseAmount('45k'), 45000);
    assert.strictEqual(parseAmount('1.5tr'), 1500000);
    assert.strictEqual(parseAmount('1tr5'), 1500000);
    assert.strictEqual(parseAmount('2 củ'), 2000000);
    assert.strictEqual(parseAmount('120.000'), 120000);
    assert.strictEqual(parseAmount('1,250,000'), 1250000);
    assert.strictEqual(parseAmount('35000'), 35000);
    assert.strictEqual(parseAmount('abc'), 0);
  });
});

describe('CSV round trip', () => {
  it('exports and re-imports the same rows', () => {
    const items = [
      { date: '2026-10-01', type: 'Chi' as const, category: 'Ăn uống', amount: 45000, description: 'Phở, "đặc biệt"' },
      { date: '2026-10-02', type: 'Thu' as const, category: 'Lương/Thưởng', amount: 3000000, description: 'Lương' },
    ];
    const back = parseExpenseTable(toCsv(items), '2026-10-28');
    assert.deepStrictEqual(back, items);
  });

  it('reads tab-separated paste from Excel without header, dd/mm dates', () => {
    const rows = parseExpenseTable('05/10/2026\tChi\tDi chuyển\t50.000\tĐổ xăng\n06/10\tThu\tKhác\t200000\tBán đồ', '2026-10-28');
    assert.deepStrictEqual(rows, [
      { date: '2026-10-05', type: 'Chi', category: 'Di chuyển', amount: 50000, description: 'Đổ xăng' },
      { date: '2026-10-06', type: 'Thu', category: 'Khác', amount: 200000, description: 'Bán đồ' },
    ]);
  });

  it('maps columns by header name in any order', () => {
    const rows = parseExpenseTable('Số tiền;Mô tả;Ngày\n30000;Cafe;2026-10-03', '2026-10-28');
    assert.deepStrictEqual(rows, [{ date: '2026-10-03', type: 'Chi', category: 'Khác', amount: 30000, description: 'Cafe' }]);
  });
});
