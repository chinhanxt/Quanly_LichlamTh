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
  isHoliday?: boolean;       // Ca làm ngày lễ
  salaryMultiplier?: number; // Hệ số nhân lương (vd: 3 cho ngày lễ, hoặc 2, 1.5)
}

export interface ExpenseItem {
  id: string;
  date: string;       // "YYYY-MM-DD"
  type: 'Thu' | 'Chi';
  category: string;   // "Ăn uống", "Di chuyển", "Mua sắm", "Hóa đơn", "Giải trí", "Lương/Thưởng", "Đầu tư", "Khác"
  amount: number;     // e.g. 45000
  description: string;
  rawText?: string;
  createdAt?: string;
  username?: string;
}

export interface ScheduleSettings {
  username?: string;
  employeeName?: string;     // Tên nhân viên trên lịch
  geminiApiKey?: string;     // Google Gemini API Key cho AI OCR
  groqApiKey?: string;       // Groq API Key cho AI Thu chi
  groqModel?: string;        // Model Groq (default: llama-3.3-70b-versatile)
  hourlyRate?: number;       // Thanh Hương: lương/giờ — Chí Nhân: đơn giá/buổi
  googleSheetUrl?: string;   // Link Google Sheet đồng bộ lịch (cho CTV/Chí Nhân)
}
