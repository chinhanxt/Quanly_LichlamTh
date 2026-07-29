import {
  calculateShiftHours,
  calculatePayrollBreakdown,
} from '../lib/salary-calculator';
import { ScheduleItem } from '../types/schedule';

// Test 1: calculateShiftHours
console.log('Testing shift hours calculation...');
const h1 = calculateShiftHours('18:00', '22:00'); // 4.0h
const h2 = calculateShiftHours('15:00', '22:00'); // 7.0h
const h3 = calculateShiftHours('11:30', '18:00'); // 6.5h
const h4 = calculateShiftHours('22:00', '02:00'); // 4.0h (midnight)

if (h1 !== 4 || h2 !== 7 || h3 !== 6.5 || h4 !== 4) {
  console.error('FAIL: calculateShiftHours mismatch', { h1, h2, h3, h4 });
  process.exit(1);
}
console.log('SUCCESS: calculateShiftHours tests passed');

// Test 2: calculatePayrollBreakdown for 3 days
const mockItems: ScheduleItem[] = [
  {
    id: '1',
    dayOfWeek: 'Thu2',
    date: '2026-07-01',
    startTime: '15:00',
    endTime: '22:00',
    subject: 'Highlands Coffee',
    note: 'Ca B',
    reminderEnabled: true,
  },
  {
    id: '2',
    dayOfWeek: 'Thu3',
    date: '2026-07-02',
    startTime: '18:00',
    endTime: '22:00',
    subject: 'Highlands Coffee',
    note: 'Ca B18',
    reminderEnabled: true,
  },
];

const summary = calculatePayrollBreakdown(mockItems, '2026-07-01', '2026-07-03', 26000);

if (summary.dailyBreakdown.length !== 3) {
  console.error('FAIL: Expected 3 calendar days breakdown, got', summary.dailyBreakdown.length);
  process.exit(1);
}

// Day 1 (01/07): 7h * 26000 = 182,000
// Day 2 (02/07): 4h * 26000 = 104,000
// Day 3 (03/07): 0h * 26000 = 0 (OFF)
// Total hours = 11h, Total salary = 286,000, Worked = 2, OFF = 1

if (
  summary.totalHours !== 11 ||
  summary.totalSalary !== 286000 ||
  summary.totalWorkedDays !== 2 ||
  summary.totalOffDays !== 1
) {
  console.error('FAIL: Summary totals mismatch', summary);
  process.exit(1);
}

console.log('SUCCESS: calculatePayrollBreakdown tests passed!');
