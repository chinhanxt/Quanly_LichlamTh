export function format24hTime(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim().toUpperCase();
  if (trimmed.endsWith('AM') || trimmed.endsWith('PM')) {
    const isPM = trimmed.endsWith('PM');
    const cleanStr = trimmed.replace(/(AM|PM)/, '').trim();
    let [hStr, mStr] = cleanStr.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) h = 0;
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${(mStr || '00').padStart(2, '0')}`;
  }
  const parts = trimmed.split(':');
  if (parts.length === 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  } else if (parts.length === 1) {
    const h = parseInt(parts[0], 10);
    if (!isNaN(h)) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }
  return timeStr;
}

export function format24hRange(startTime: string, endTime: string): string {
  if (!startTime && !endTime) return '';
  const start = format24hTime(startTime);
  const end = format24hTime(endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end;
}
