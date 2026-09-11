import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getStudyDataForUser, getClassesForDate, dmyToIso, dayNameToKey } from '../lib/study-hub';
import { GET as studyGet } from '../app/api/study/route';
import { POST as studySyncPost } from '../app/api/study/sync/route';

describe('Study Timetable & API Tests', () => {
  it('should convert DD/MM/YYYY to YYYY-MM-DD correctly', () => {
    assert.strictEqual(dmyToIso('07/09/2026'), '2026-09-07');
    assert.strictEqual(dmyToIso('15/11/2026'), '2026-11-15');
  });

  it('should map Vietnamese day names to day keys', () => {
    assert.strictEqual(dayNameToKey('Thứ Hai'), 'Thu2');
    assert.strictEqual(dayNameToKey('Thứ Ba'), 'Thu3');
    assert.strictEqual(dayNameToKey('Thứ Bảy'), 'Thu7');
    assert.strictEqual(dayNameToKey('Chủ Nhật'), 'CN');
  });

  it('should load study data for thanhhuong with 8 courses and 22 weeks', () => {
    const data = getStudyDataForUser('thanhhuong');
    assert.ok(data);
    assert.strictEqual(data?.student.name, 'Bùi Thanh Hương');
    assert.strictEqual(data?.student.studentId, '050112240582');
    assert.strictEqual(data?.courses.length, 8);
    assert.strictEqual(Object.keys(data?.weeks || {}).length, 22);
  });

  it('should retrieve correct classes for a given date', () => {
    const classes = getClassesForDate('thanhhuong', '2026-09-08');
    assert.ok(classes.length >= 2);
    const courseIds = classes.map((c) => c.courseId);
    assert.ok(courseIds.includes('GYM304'));
    assert.ok(courseIds.includes('FIN719'));
  });

  it('should respond with study schedule via GET /api/study', async () => {
    const req = new Request('http://localhost:3000/api/study?date=2026-09-08', {
      headers: { 'x-username': 'thanhhuong' },
    });
    const res = await studyGet(req as any);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.student.name, 'Bùi Thanh Hương');
    assert.ok(json.classes.length >= 2);
  });

  it('should sync study schedule via POST /api/study/sync', async () => {
    const req = new Request('http://localhost:3000/api/study/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-username': 'thanhhuong',
      },
    });
    const res = await studySyncPost(req as any);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.message.includes('thành công'));
  });
});
