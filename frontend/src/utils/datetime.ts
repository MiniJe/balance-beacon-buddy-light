/**
 * Local date/time helpers for Romania locale and timezone.
 */
export function formatLocalDateTime(input: string | number | Date, withSeconds = false): string {
  const d = input instanceof Date ? input : new Date(input);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Bucharest',
  };
  if (withSeconds) options.second = '2-digit';
  return d.toLocaleString('ro-RO', options);
}

export function formatLocalDate(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  return d.toLocaleDateString('ro-RO', { timeZone: 'Europe/Bucharest' });
}

export function toLocalYMD(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse "YYYY-MM-DD HH:mm:ss" (stored as local DB time) into a Date in local timezone.
 * Falls back to native Date parsing for other formats.
 */
export function parseLocalDbTimestamp(input: string | number | Date): Date {
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      const [_, y, mo, d, h, mi, s] = m;
      return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
    }
  }
  return input instanceof Date ? input : new Date(input);
}

/**
 * Format a Date to the DB local timestamp string "YYYY-MM-DD HH:mm:ss" using local time.
 */
export function toLocalDbTimestamp(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}
