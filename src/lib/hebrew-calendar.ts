/**
 * לוח השנה העברי - המרה בין תאריך עברי לתאריך לועזי.
 *
 * המימוש מבוסס על החישוב המקובל של הלוח העברי הקבוע
 * (מולד תשרי, דחיות ראש השנה, שנים מעוברות במחזור של 19 שנה),
 * כפי שמתואר בספר Calendrical Calculations (Reingold & Dershowitz).
 * אין צורך בספרייה חיצונית או בשירות מקוון.
 *
 * "יום קבוע" (fixed / RD) = מספר הימים מאז 1 בינואר שנה 1 לפי הלוח הגרגוריאני.
 */

export const HEBREW_MONTHS = [
  'TISHREI',
  'CHESHVAN',
  'KISLEV',
  'TEVET',
  'SHEVAT',
  'ADAR',
  'ADAR_I',
  'ADAR_II',
  'NISAN',
  'IYAR',
  'SIVAN',
  'TAMMUZ',
  'AV',
  'ELUL',
] as const;

export type HebrewMonthCode = (typeof HEBREW_MONTHS)[number];

export const HEBREW_MONTH_NAMES: Record<HebrewMonthCode, string> = {
  TISHREI: 'תשרי',
  CHESHVAN: 'חשוון',
  KISLEV: 'כסלו',
  TEVET: 'טבת',
  SHEVAT: 'שבט',
  ADAR: 'אדר',
  ADAR_I: 'אדר א׳',
  ADAR_II: 'אדר ב׳',
  NISAN: 'ניסן',
  IYAR: 'אייר',
  SIVAN: 'סיוון',
  TAMMUZ: 'תמוז',
  AV: 'אב',
  ELUL: 'אלול',
};

export interface HebrewDate {
  day: number;
  month: HebrewMonthCode;
  year: number;
}

/** טווח השנים שהמערכת תומכת בהן (שנים עבריות) */
export const MIN_HEBREW_YEAR = 5700;
export const MAX_HEBREW_YEAR = 5900;

const HEBREW_EPOCH = -1373427; // יום קבוע של א' תשרי שנה 1
const UNIX_EPOCH_FIXED = 719163; // יום קבוע של 1.1.1970
const MS_PER_DAY = 86_400_000;

// ---- מספור פנימי: 1=ניסן ... 6=אלול, 7=תשרי ... 12=אדר (או אדר א'), 13=אדר ב' ----
const NISAN = 1;
const TISHREI = 7;

export function isHebrewLeapYear(year: number): boolean {
  return (7 * year + 1) % 19 < 7;
}

function lastMonthOfYear(year: number): number {
  return isHebrewLeapYear(year) ? 13 : 12;
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/** מספר הימים מתחילת התקופה עד ראש השנה (לפני דחיות "לא אד"ו ראש" ושנים חריגות) */
function elapsedDays(year: number): number {
  const monthsElapsed = Math.floor((235 * year - 234) / 19);
  const partsElapsed = 12084 + 13753 * monthsElapsed;
  const days = 29 * monthsElapsed + Math.floor(partsElapsed / 25920);
  return mod(3 * (days + 1), 7) < 3 ? days + 1 : days;
}

/** תיקון כדי שאורך השנה יהיה חוקי (353-355 או 383-385 ימים) */
function yearLengthCorrection(year: number): number {
  const ny0 = elapsedDays(year - 1);
  const ny1 = elapsedDays(year);
  const ny2 = elapsedDays(year + 1);
  if (ny2 - ny1 === 356) return 2;
  if (ny1 - ny0 === 382) return 1;
  return 0;
}

/** היום הקבוע של א' תשרי בשנה הנתונה */
function newYearFixed(year: number): number {
  return HEBREW_EPOCH + elapsedDays(year) + yearLengthCorrection(year);
}

export function daysInHebrewYear(year: number): number {
  return newYearFixed(year + 1) - newYearFixed(year);
}

function isLongCheshvan(year: number): boolean {
  return daysInHebrewYear(year) % 10 === 5;
}

function isShortKislev(year: number): boolean {
  return daysInHebrewYear(year) % 10 === 3;
}

function daysInInternalMonth(year: number, month: number): number {
  if ([2, 4, 6, 10, 13].includes(month)) return 29; // אייר, תמוז, אלול, טבת, אדר ב'
  if (month === 12 && !isHebrewLeapYear(year)) return 29; // אדר בשנה רגילה
  if (month === 8 && !isLongCheshvan(year)) return 29;
  if (month === 9 && isShortKislev(year)) return 29;
  return 30;
}

function fixedFromInternal(year: number, month: number, day: number): number {
  let total = newYearFixed(year) + day - 1;
  if (month < TISHREI) {
    for (let m = TISHREI; m <= lastMonthOfYear(year); m++) total += daysInInternalMonth(year, m);
    for (let m = NISAN; m < month; m++) total += daysInInternalMonth(year, m);
  } else {
    for (let m = TISHREI; m < month; m++) total += daysInInternalMonth(year, m);
  }
  return total;
}

// ---- המרה בין המספור הפנימי לשמות החודשים ----

function toInternalMonth(code: HebrewMonthCode, year: number): number | null {
  const leap = isHebrewLeapYear(year);
  switch (code) {
    case 'NISAN':
      return 1;
    case 'IYAR':
      return 2;
    case 'SIVAN':
      return 3;
    case 'TAMMUZ':
      return 4;
    case 'AV':
      return 5;
    case 'ELUL':
      return 6;
    case 'TISHREI':
      return 7;
    case 'CHESHVAN':
      return 8;
    case 'KISLEV':
      return 9;
    case 'TEVET':
      return 10;
    case 'SHEVAT':
      return 11;
    case 'ADAR':
      return leap ? null : 12;
    case 'ADAR_I':
      return leap ? 12 : null;
    case 'ADAR_II':
      return leap ? 13 : null;
    default:
      return null;
  }
}

function fromInternalMonth(month: number, year: number): HebrewMonthCode {
  const leap = isHebrewLeapYear(year);
  const map: Record<number, HebrewMonthCode> = {
    1: 'NISAN',
    2: 'IYAR',
    3: 'SIVAN',
    4: 'TAMMUZ',
    5: 'AV',
    6: 'ELUL',
    7: 'TISHREI',
    8: 'CHESHVAN',
    9: 'KISLEV',
    10: 'TEVET',
    11: 'SHEVAT',
    12: leap ? 'ADAR_I' : 'ADAR',
    13: 'ADAR_II',
  };
  const code = map[month];
  if (!code) throw new Error(`Invalid internal month ${month}`);
  return code;
}

// ---- המרה בין יום קבוע לתאריך לועזי (מחרוזת YYYY-MM-DD) ----

function fixedFromIso(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  return Math.floor(ms / MS_PER_DAY) + UNIX_EPOCH_FIXED;
}

function isoFromFixed(fixed: number): string {
  return new Date((fixed - UNIX_EPOCH_FIXED) * MS_PER_DAY).toISOString().slice(0, 10);
}

/** בדיקה שמחרוזת היא תאריך לועזי קיים בפורמט YYYY-MM-DD */
export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

// ---- ממשק ציבורי ----

/** רשימת החודשים של שנה עברית, לפי הסדר מתשרי עד אלול, עם מספר הימים בכל חודש */
export function monthsOfYear(year: number): { month: HebrewMonthCode; name: string; days: number }[] {
  const order = [7, 8, 9, 10, 11, 12, ...(isHebrewLeapYear(year) ? [13] : []), 1, 2, 3, 4, 5, 6];
  return order.map((internal) => {
    const code = fromInternalMonth(internal, year);
    return { month: code, name: HEBREW_MONTH_NAMES[code], days: daysInInternalMonth(year, internal) };
  });
}

export function daysInHebrewMonth(year: number, month: HebrewMonthCode): number | null {
  const internal = toInternalMonth(month, year);
  return internal === null ? null : daysInInternalMonth(year, internal);
}

/** האם התאריך העברי קיים. מחזיר הודעת שגיאה בעברית, או null אם הכל תקין */
export function validateHebrewDate(date: HebrewDate): string | null {
  if (!Number.isInteger(date.year) || date.year < MIN_HEBREW_YEAR || date.year > MAX_HEBREW_YEAR) {
    return `השנה העברית חייבת להיות בין ${MIN_HEBREW_YEAR} ל-${MAX_HEBREW_YEAR}`;
  }
  const internal = toInternalMonth(date.month, date.year);
  if (internal === null) {
    const yearText = formatHebrewYear(date.year);
    return isHebrewLeapYear(date.year)
      ? `שנת ${yearText} היא שנה מעוברת - יש לבחור אדר א׳ או אדר ב׳`
      : `שנת ${yearText} אינה שנה מעוברת - יש לבחור אדר`;
  }
  const maxDay = daysInInternalMonth(date.year, internal);
  if (!Number.isInteger(date.day) || date.day < 1 || date.day > maxDay) {
    return `בחודש ${HEBREW_MONTH_NAMES[date.month]} ${formatHebrewYear(date.year)} יש ${maxDay} ימים`;
  }
  return null;
}

/** המרה מתאריך עברי לתאריך לועזי (YYYY-MM-DD). זורק שגיאה אם התאריך לא קיים */
export function hebrewToGregorian(date: HebrewDate): string {
  const problem = validateHebrewDate(date);
  if (problem) throw new RangeError(problem);
  const internal = toInternalMonth(date.month, date.year) as number;
  return isoFromFixed(fixedFromInternal(date.year, internal, date.day));
}

/** המרה מתאריך לועזי (YYYY-MM-DD) לתאריך עברי */
export function gregorianToHebrew(iso: string): HebrewDate {
  if (!isValidIsoDate(iso)) throw new RangeError(`Invalid date: ${iso}`);
  const fixed = fixedFromIso(iso);
  const approx = Math.floor((fixed - HEBREW_EPOCH) / (35975351 / 98496)) + 1;
  let year = approx - 1;
  while (newYearFixed(year + 1) <= fixed) year++;
  const start = fixed < fixedFromInternal(year, NISAN, 1) ? TISHREI : NISAN;
  let month = start;
  while (fixed > fixedFromInternal(year, month, daysInInternalMonth(year, month))) month++;
  const day = fixed - fixedFromInternal(year, month, 1) + 1;
  return { day, month: fromInternalMonth(month, year), year };
}

// ---- כתיב עברי (גימטריה) ----

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

/** המרת מספר (1-999) לאותיות, עם גרש או גרשיים. 15 = ט״ו, 16 = ט״ז */
export function toGematriya(num: number): string {
  if (!Number.isInteger(num) || num < 1 || num > 999) throw new RangeError(`Cannot convert ${num}`);
  const h = Math.floor(num / 100);
  const rest = num % 100;
  let letters = HUNDREDS[h] ?? '';
  if (rest === 15) letters += 'טו';
  else if (rest === 16) letters += 'טז';
  else letters += (TENS[Math.floor(rest / 10)] ?? '') + (ONES[rest % 10] ?? '');

  if (letters.length === 1) return `${letters}׳`;
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

/** 5787 → תשפ״ז */
export function formatHebrewYear(year: number): string {
  return toGematriya(year % 1000);
}

/** { 15, CHESHVAN, 5787 } → ט״ו בחשוון תשפ״ז */
export function formatHebrewDate(date: HebrewDate): string {
  return `${toGematriya(date.day)} ב${HEBREW_MONTH_NAMES[date.month]} ${formatHebrewYear(date.year)}`;
}
