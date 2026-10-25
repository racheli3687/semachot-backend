/** אזור הזמן של המערכת. "היום" ו"שמחות קרובות" מחושבים תמיד לפי שעון ישראל */
export const APP_TIME_ZONE = 'Asia/Jerusalem';

const isoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** התאריך של היום בישראל, בפורמט YYYY-MM-DD */
export function todayInIsrael(now: Date = new Date()): string {
  return isoFormatter.format(now);
}

/** מחרוזת YYYY-MM-DD → אובייקט Date בחצות UTC (כך Prisma שומר עמודת DATE) */
export function isoToDbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** אובייקט Date מעמודת DATE → מחרוזת YYYY-MM-DD */
export function dbDateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** הוספת ימים לתאריך בפורמט YYYY-MM-DD */
export function addDaysIso(iso: string, days: number): string {
  const d = isoToDbDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dbDateToIso(d);
}
