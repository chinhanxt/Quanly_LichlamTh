export interface StudyClassItem {
  courseId: string;
  classCode: string;
  name: string;
  credits: number;
  teacher: string;
  color?: string;
  time: string;       // "13:00 - 17:30"
  period?: string;    // "Tiết 6-10"
  room: string;       // "B2.904"
  campus: string;     // "56 Hoàng Diệu 2 - Thủ Đức"
  dateIso?: string;   // "YYYY-MM-DD"
  dayName?: string;   // "Thứ Hai"
  dayKey?: string;    // "Thu2"
}

export interface StudySession {
  day: string;
  dayIndex: number;
  time: string;
  period: string;
  room: string;
  campus: string;
}

export interface StudyCourse {
  id: string;
  classCode: string;
  name: string;
  credits: number;
  teacher: string;
  startDate: string;  // "07/09/2026"
  endDate: string;    // "02/11/2026"
  color: string;
  sessions: StudySession[];
}

export interface StudentProfile {
  name: string;
  studentId: string;
  className: string;
  semester: string;
  totalCredits: number;
  university: string;
  currentWeek?: number;
}

export interface StudyWeekDay {
  dayName: string;
  dayIndex: number;
  date: string;       // "07/09/2026"
  dateShort: string;  // "07/09"
  dateIso?: string;   // "2026-09-07"
  classes: StudyClassItem[];
}

export interface StudyWeekInfo {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: StudyWeekDay[];
}

export interface StudyScheduleData {
  student: StudentProfile;
  courses: StudyCourse[];
  weeks: Record<string, StudyWeekInfo>;
}
