import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import {
  formatHebrewDate,
  formatHebrewYear,
  gregorianToHebrew,
  hebrewToGregorian,
  isHebrewLeapYear,
  monthsOfYear,
  toGematriya,
  validateHebrewDate,
  type HebrewDate,
} from '../src/lib/hebrew-calendar';
import { api } from './helpers';

afterAll(() => prisma.$disconnect());

/** תאריכים ידועים (ראש השנה, חגים) */
const KNOWN: [string, HebrewDate][] = [
  ['2023-09-16', { day: 1, month: 'TISHREI', year: 5784 }],
  ['2024-03-24', { day: 14, month: 'ADAR_II', year: 5784 }],
  ['2024-10-03', { day: 1, month: 'TISHREI', year: 5785 }],
  ['2025-09-23', { day: 1, month: 'TISHREI', year: 5786 }],
  ['2025-10-02', { day: 10, month: 'TISHREI', year: 5786 }],
  ['2025-12-15', { day: 25, month: 'KISLEV', year: 5786 }],
  ['2026-03-03', { day: 14, month: 'ADAR', year: 5786 }],
  ['2026-04-02', { day: 15, month: 'NISAN', year: 5786 }],
  ['2026-05-22', { day: 6, month: 'SIVAN', year: 5786 }],
  ['2026-09-12', { day: 1, month: 'TISHREI', year: 5787 }],
  ['2000-01-01', { day: 23, month: 'TEVET', year: 5760 }],
];

describe('לוח עברי - חישובים', () => {
  it.each(KNOWN)('%s ⇄ תאריך עברי', (iso, hebrew) => {
    expect(gregorianToHebrew(iso)).toEqual(hebrew);
    expect(hebrewToGregorian(hebrew)).toBe(iso);
  });

  it('המרה הלוך וחזור עובדת לכל יום ב-35 שנה', () => {
    for (let t = Date.UTC(2000, 0, 1); t < Date.UTC(2035, 0, 1); t += 86_400_000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      expect(hebrewToGregorian(gregorianToHebrew(iso))).toBe(iso);
    }
  });

  it('שנים מעוברות וחודשים', () => {
    expect(isHebrewLeapYear(5784)).toBe(true);
    expect(isHebrewLeapYear(5786)).toBe(false);
    expect(isHebrewLeapYear(5787)).toBe(true);
    expect(monthsOfYear(5787).map((m) => m.month)).toEqual([
      'TISHREI', 'CHESHVAN', 'KISLEV', 'TEVET', 'SHEVAT', 'ADAR_I', 'ADAR_II',
      'NISAN', 'IYAR', 'SIVAN', 'TAMMUZ', 'AV', 'ELUL',
    ]);
    expect(monthsOfYear(5786)).toHaveLength(12);
    expect(monthsOfYear(5786).map((m) => m.month)).toContain('ADAR');
  });

  it('בדיקת תאריכים שלא קיימים', () => {
    expect(validateHebrewDate({ day: 30, month: 'IYAR', year: 5787 })).not.toBeNull();
    expect(validateHebrewDate({ day: 1, month: 'ADAR', year: 5787 })).toContain('מעוברת');
    expect(validateHebrewDate({ day: 1, month: 'ADAR_II', year: 5786 })).toContain('אינה שנה מעוברת');
    expect(validateHebrewDate({ day: 15, month: 'NISAN', year: 5787 })).toBeNull();
  });

  it('כתיב עברי', () => {
    expect(toGematriya(1)).toBe('א׳');
    expect(toGematriya(15)).toBe('ט״ו');
    expect(toGematriya(16)).toBe('ט״ז');
    expect(toGematriya(30)).toBe('ל׳');
    expect(formatHebrewYear(5787)).toBe('תשפ״ז');
    expect(formatHebrewDate({ day: 15, month: 'NISAN', year: 5787 })).toBe('ט״ו בניסן תשפ״ז');
    expect(formatHebrewDate({ day: 14, month: 'ADAR_II', year: 5784 })).toBe('י״ד באדר ב׳ תשפ״ד');
  });
});

describe('לוח עברי - כתובות API', () => {
  it('GET /api/hebrew-calendar/months', async () => {
    const res = await api().get('/api/hebrew-calendar/months?year=5787');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ year: 5787, yearText: 'תשפ״ז', isLeapYear: true });
    expect(res.body.months[0]).toEqual({ month: 'TISHREI', name: 'תשרי', days: 30 });
    expect((await api().get('/api/hebrew-calendar/months')).status).toBe(400);
    expect((await api().get('/api/hebrew-calendar/months?year=abc')).status).toBe(400);
  });

  it('GET /api/hebrew-calendar/convert - בשני הכיוונים', async () => {
    const toHebrew = await api().get('/api/hebrew-calendar/convert?date=2026-04-02');
    expect(toHebrew.status).toBe(200);
    expect(toHebrew.body.hebrewDate).toEqual({ day: 15, month: 'NISAN', year: 5786, text: 'ט״ו בניסן תשפ״ו' });

    const toGregorian = await api().get('/api/hebrew-calendar/convert?day=1&month=TISHREI&year=5787');
    expect(toGregorian.body.date).toBe('2026-09-12');

    expect((await api().get('/api/hebrew-calendar/convert?date=2026-02-30')).status).toBe(400);
    expect((await api().get('/api/hebrew-calendar/convert?day=1&month=ADAR&year=5787')).status).toBe(400);
  });

  it('GET /api/hebrew-calendar/today', async () => {
    const res = await api().get('/api/hebrew-calendar/today');
    expect(res.status).toBe(200);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.hebrewDate.text).toEqual(expect.any(String));
  });

  it('GET /api/celebration-types', async () => {
    const res = await api().get('/api/celebration-types');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(12);
    expect(res.body[1]).toEqual({ value: 'WEDDING', label: 'חתונה' });
  });
});
