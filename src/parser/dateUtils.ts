/**
 * Date helpers used by the parser and the UI.
 *
 * WhatsApp exports dates as DD/MM/YYYY (most locales) or MM/DD/YYYY
 * (US-locale exports). We normalize everything to an ISO calendar date
 * string (YYYY-MM-DD) and treat it purely as digits — never as a
 * timezone-aware `Date` for storage, so DST or locale of the machine
 * running this code can never shift a message to a different day.
 */

export interface ParsedDateParts {
  iso: string; // YYYY-MM-DD
  day: number;
  month: number; // 1-12
  year: number;
}

/**
 * Parses a WhatsApp-style date string like "10/09/2019" or "10.09.19" or
 * "2019-09-10" into normalized parts. Assumes DD/MM/YYYY ordering, which is
 * what the vast majority of WhatsApp exports use; falls back gracefully if
 * the first segment can't be a valid day (e.g. > 31) by swapping.
 */
export function parseWhatsAppDate(raw: string): ParsedDateParts | null {
  const cleaned = raw.trim();

  // ISO-ish: 2019-09-10
  const isoMatch = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    return buildParts(day, month, year);
  }

  const parts = cleaned.split(/[/.\-]/).map((p) => p.trim());
  if (parts.length !== 3) return null;

  let [a, b, y] = parts;
  let day = parseInt(a, 10);
  let month = parseInt(b, 10);
  let year = parseInt(y, 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  // Two-digit year -> assume 2000s (WhatsApp exports rarely predate 2009).
  if (year < 100) {
    year += 2000;
  }

  // If "day" isn't a valid day-of-month but "month" is, the export is
  // probably US-style MM/DD/YYYY — swap them.
  if (day > 31 || (day > 12 && month > 12)) {
    return null;
  }
  if (month > 12 && day <= 12) {
    const tmp = day;
    day = month;
    month = tmp;
  }

  return buildParts(day, month, year);
}

function buildParts(day: number, month: number, year: number): ParsedDateParts | null {
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1900 ||
    year > 2200
  ) {
    return null;
  }
  const iso = `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return { iso, day, month, year };
}

/**
 * Parses a WhatsApp time string like "16:04", "4:04 PM", or "16:04:32" into
 * a normalized 24h "HH:mm" string.
 */
export function parseWhatsAppTime(raw: string): string | null {
  const cleaned = raw.trim();
  const match = cleaned.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap]\.?[Mm]\.?)?$/
  );
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[4]?.toLowerCase().replace(/\./g, '');

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23) return null;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Converts an ISO date (YYYY-MM-DD) into a UTC-anchored Date for arithmetic
 * only (day-diffing, adding days). Never used for display formatting
 * directly, so timezone never enters the picture. */
export function isoToUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function utcDateToIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function addDaysIso(iso: string, days: number): string {
  const date = isoToUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToIso(date);
}

export function daysBetweenIso(startIso: string, endIso: string): number {
  const start = isoToUtcDate(startIso);
  const end = isoToUtcDate(endIso);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface DateFormatOptions {
  format: 'long' | 'short' | 'numeric';
  useRelativeLabels: boolean;
  /** The most recent date in the whole conversation, used to compute
   * "Today"/"Yesterday" relative to the chat's own timeline rather than
   * the viewer's real-world today, which matches how people expect an
   * exported chat to read. */
  referenceIso?: string;
}

export function formatDateForDisplay(
  iso: string,
  options: DateFormatOptions
): string {
  const parts = parseWhatsAppDate(iso);
  if (!parts) return iso;

  if (options.useRelativeLabels && options.referenceIso) {
    const diff = daysBetweenIso(iso, options.referenceIso);
    if (diff === 0) return 'TODAY';
    if (diff === 1) return 'YESTERDAY';
  }

  if (options.format === 'numeric') {
    return `${parts.day.toString().padStart(2, '0')}/${parts.month
      .toString()
      .padStart(2, '0')}/${parts.year}`;
  }
  if (options.format === 'short') {
    return `${parts.day} ${MONTH_SHORT[parts.month - 1]} ${parts.year}`;
  }
  return `${parts.day} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
}
