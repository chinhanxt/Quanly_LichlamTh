import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculatePayrollBreakdown } from '../lib/salary-calculator';
import { ScheduleItem } from '../types/schedule';

describe('Holiday Salary Multiplier', () => {
  it('should calculate standard salary without multiplier as 1x', () => {
    const items: ScheduleItem[] = [
      {
        id: '1',
        date: '2026-09-01',
        dayOfWeek: 'Thu3',
        startTime: '18:00',
        endTime: '22:00',
        subject: '2len',
        location: '',
        note: '',
        reminderEnabled: true,
      },
    ];

    const result = calculatePayrollBreakdown(items, '2026-09-01', '2026-09-01', 26000);
    assert.strictEqual(result.totalSalary, 104000);
    assert.strictEqual(result.dailyBreakdown[0].shifts[0].earnings, 104000);
  });

  it('should calculate 3x salary when salaryMultiplier is 3 or isHoliday is true', () => {
    const items: ScheduleItem[] = [
      {
        id: '2',
        date: '2026-09-02',
        dayOfWeek: 'Thu4',
        startTime: '18:00',
        endTime: '22:00',
        subject: '2len',
        location: '',
        note: '',
        reminderEnabled: true,
        isHoliday: true,
        salaryMultiplier: 3,
      },
    ];

    const result = calculatePayrollBreakdown(items, '2026-09-02', '2026-09-02', 26000);
    assert.strictEqual(result.totalSalary, 312000);
    assert.strictEqual(result.dailyBreakdown[0].shifts[0].earnings, 312000);
    assert.strictEqual(result.dailyBreakdown[0].shifts[0].multiplier, 3);
  });

  it('should auto-detect "nhân 3" from note as 3x multiplier', () => {
    const items: ScheduleItem[] = [
      {
        id: '3',
        date: '2026-09-03',
        dayOfWeek: 'Thu5',
        startTime: '18:00',
        endTime: '22:00',
        subject: '2len',
        location: '',
        note: 'nhân 3',
        reminderEnabled: true,
      },
    ];

    const result = calculatePayrollBreakdown(items, '2026-09-03', '2026-09-03', 26000);
    assert.strictEqual(result.totalSalary, 312000);
    assert.strictEqual(result.dailyBreakdown[0].shifts[0].multiplier, 3);
  });
});
