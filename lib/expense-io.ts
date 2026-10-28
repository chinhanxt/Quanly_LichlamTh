import { ExpenseItem } from '@/types/schedule';

export type ExpenseType = 'Thu' | 'Chi';

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

export const GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (chuẩn)' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (nhanh)' },
];

export const EXPENSE_CATEGORIES: Record<ExpenseType, string[]> = {
  Chi: ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn', 'Giải trí', 'Khác'],
  Thu: ['Lương/Thưởng', 'Đầu tư', 'Khác'],
};

export interface ExpenseDraft {
  date: string;
  type: ExpenseType;
  category: string;
  amount: number;
  description: string;
}

/**
 * "45" (autoK) → 45000, "45k" → 45000, "1.5tr" / "1tr5" → 1500000, "2 củ" → 2000000,
 * "120.000" / "120,000" → 120000. Trả về 0 nếu không đọc được.
 */
export function parseAmount(input: string, autoK = true): number {
  const raw = String(input || '').trim().toLowerCase().replace(/\s+/g, '').replace(/đ|vnd|vnđ/g, '');
  if (!raw) return 0;

  const million = raw.match(/^(\d+(?:[.,]\d+)?)(tr|triệu|trieu|củ|cu|m)(\d+)?$/);
  if (million) {
    const base = parseFloat(million[1].replace(',', '.'));
    const tail = million[3] ? parseFloat(`0.${million[3]}`) : 0;
    return Math.round((base + tail) * 1_000_000);
  }

  const thousand = raw.match(/^(\d+(?:[.,]\d+)?)(k|nghìn|nghin|ngàn|ngan|cành|canh|lít|lit)$/);
  if (thousand) {
    return Math.round(parseFloat(thousand[1].replace(',', '.')) * 1000);
  }

  // Số có dấu phân cách hàng nghìn: 120.000 / 1,250,000
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
    return parseInt(raw.replace(/[.,]/g, ''), 10);
  }

  if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
    const n = parseFloat(raw.replace(',', '.'));
    return Math.round(autoK && n < 1000 ? n * 1000 : n);
  }

  return 0;
}

export function formatVnd(n: number): string {
  return `${Math.round(n).toLocaleString('vi-VN')}đ`;
}

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV UTF-8 có BOM để Excel mở đúng tiếng Việt. */
export function toCsv(items: Pick<ExpenseItem, 'date' | 'type' | 'category' | 'amount' | 'description'>[]): string {
  const header = ['Ngày', 'Loại', 'Danh mục', 'Số tiền', 'Mô tả'];
  const rows = items.map((i) => [i.date, i.type, i.category, Math.round(i.amount), i.description].map(csvCell).join(','));
  return '﻿' + [header.join(','), ...rows].join('\r\n');
}

function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function normalizeDate(value: string, fallback: string): string {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) {
    const year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : fallback.slice(0, 4);
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return fallback;
}

function normalizeType(value: string): ExpenseType | null {
  const v = value.trim().toLowerCase();
  if (['thu', 'income', 'in', '+'].includes(v)) return 'Thu';
  if (['chi', 'expense', 'out', '-'].includes(v)) return 'Chi';
  return null;
}

const HEADER_ALIASES: Record<keyof ExpenseDraft, string[]> = {
  date: ['ngày', 'ngay', 'date'],
  type: ['loại', 'loai', 'type', 'thu/chi'],
  category: ['danh mục', 'danh muc', 'category', 'nhóm', 'nhom'],
  amount: ['số tiền', 'so tien', 'amount', 'tiền', 'tien'],
  description: ['mô tả', 'mo ta', 'description', 'nội dung', 'noi dung', 'ghi chú', 'ghi chu'],
};

/**
 * Đọc CSV (file xuất từ app / Excel / Google Sheet) hoặc bảng dán trực tiếp từ Excel (tab).
 * Có dòng tiêu đề thì map theo tên cột, không có thì theo thứ tự: Ngày, Loại, Danh mục, Số tiền, Mô tả.
 */
export function parseExpenseTable(text: string, today: string): ExpenseDraft[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const first = lines[0];
  const delimiter = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');

  const order: (keyof ExpenseDraft)[] = ['date', 'type', 'category', 'amount', 'description'];
  let columns: Record<keyof ExpenseDraft, number> = { date: 0, type: 1, category: 2, amount: 3, description: 4 };

  const headerCells = splitRow(first, delimiter).map((c) => c.toLowerCase());
  const hasHeader = headerCells.some((c) => Object.values(HEADER_ALIASES).some((aliases) => aliases.includes(c)));
  if (hasHeader) {
    const mapped = {} as Record<keyof ExpenseDraft, number>;
    for (const key of order) mapped[key] = headerCells.findIndex((c) => HEADER_ALIASES[key].includes(c));
    columns = mapped;
  }

  const drafts: ExpenseDraft[] = [];
  for (const line of hasHeader ? lines.slice(1) : lines) {
    const cells = splitRow(line, delimiter);
    const get = (key: keyof ExpenseDraft) => (columns[key] >= 0 ? cells[columns[key]] || '' : '');

    const rawAmount = get('amount').trim();
    const amount = parseAmount(rawAmount.replace(/^[-+]/, ''), false);
    if (!amount) continue;

    // Không có cột Loại: số dương có dấu + là Thu, còn lại là Chi
    const type = normalizeType(get('type')) || (rawAmount.startsWith('+') ? 'Thu' : 'Chi');
    const category = get('category') || 'Khác';
    drafts.push({
      date: normalizeDate(get('date'), today),
      type,
      category,
      amount,
      description: get('description'),
    });
  }
  return drafts;
}
