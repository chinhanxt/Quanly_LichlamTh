export interface ScheduleItem {
  id: string;
  dayOfWeek: 'Thu2' | 'Thu3' | 'Thu4' | 'Thu5' | 'Thu6' | 'Thu7' | 'CN';
  date?: string; // "YYYY-MM-DD"
  startTime: string; // "18:00"
  endTime: string;   // "22:00"
  subject: string;   // "Highlands Coffee"
  location: string;  // "Highlands Coffee"
  note: string;      // "B18"
  reminderEnabled: boolean;
  username?: string;
}

export type CustomNotificationTimingMode = 'before_shift' | 'after_shift' | 'fixed_time';

export interface CustomNotificationItem {
  id: string;
  title: string;
  enabled: boolean;
  timingMode?: CustomNotificationTimingMode; // 'before_shift' | 'after_shift' | 'fixed_time'
  leadMinutes?: number; // Cho 'before_shift'
  lagMinutes?: number;  // Cho 'after_shift'
  fixedTime?: string;   // Cho 'fixed_time' (vd: "12:00")
  template: string;
}

export interface UserNote {
  id: string;
  content: string;
  createdAt: string;
  createdFormatted?: string;
  completed: boolean;
  targetDate?: string;
  targetShiftCode?: string;
}

export interface NotificationSettings {
  // 1. Nhắc đi làm (Shift Reminder)
  enableShiftReminder?: boolean;
  shiftReminderLeadMinutes?: number; // Default: 30
  shiftReminderTemplate?: string;

  // 2. Nhắc Check-in vào ca
  enableCheckInReminder?: boolean;
  checkInLeadMinutes?: number;       // Default: 15 (before shift start)
  checkInTemplate?: string;

  // 3. Nhắc Check-out tan ca
  enableCheckOutReminder?: boolean;
  checkOutLagMinutes?: number;       // Default: 10 (after shift end)
  checkOutTemplate?: string;

  // 4. Nhắc Ghi chú ca làm (Notes Memo)
  enableNotesReminder?: boolean;
  notesLeadMinutes?: number;         // Default: 15
  notesTemplate?: string;
  notesTimingMode?: 'before_shift' | 'fixed_time';
  notesFixedTime?: string;
  userNotes?: UserNote[];

  // 5. Nhắc Lịch Buổi Sáng (Morning Summary)
  enableMorningSummary?: boolean;
  morningSummaryTime?: string;       // Default: "07:00"
  morningSummaryTemplate?: string;

  // 6. Danh sách thông báo tùy chỉnh tự thêm
  customNotifications?: CustomNotificationItem[];

  // Log các reminder đã gửi (key: logKey, value: ISO timestamp string)
  sentRemindersLog?: Record<string, string>;
}

export interface ScheduleSettings extends NotificationSettings {
  username?: string;
  morningTime: string;       // "07:00"
  leadTimeMinutes: number;   // 30
  enableMorning: boolean;    // true
  enableLeadTime: boolean;   // true
  telegramBotToken?: string; // Token Bot Telegram
  telegramChatId?: string;   // Chat ID nhận tin nhắn
  employeeName?: string;     // Tên nhân viên trên lịch
  geminiApiKey?: string;     // Google Gemini API Key cho AI OCR
  hourlyRate?: number;       // Lương theo giờ (default 26000 VND)
  customWebhookUrl?: string; // Webhook URL công khai tùy chỉnh
  allowedChatIds?: string[]; // Danh sách Chat ID được phép tương tác
  allowedChatIdsStr?: string; // Chuỗi Chat ID phân cách bằng dấu phẩy
  telegramSessionState?: {
    userState: 'IDLE' | 'AWAITING_NOTE' | 'AWAITING_OCR_CONFIRM';
    pendingScheduleData?: ScheduleItem[];
    pendingId?: string;
  };
}
