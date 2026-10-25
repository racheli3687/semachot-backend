import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { todayInIsrael } from '../../lib/dates';
import { badRequest } from '../../lib/errors';
import {
  formatHebrewDate,
  formatHebrewYear,
  gregorianToHebrew,
  hebrewToGregorian,
  isHebrewLeapYear,
  MAX_HEBREW_YEAR,
  MIN_HEBREW_YEAR,
  monthsOfYear,
  validateHebrewDate,
  type HebrewDate,
} from '../../lib/hebrew-calendar';
import { parse } from '../../validation/zod-setup';
import { hebrewDateInputSchema, isoDateSchema } from '../celebrations/celebrations.schemas';

/**
 * כתובות עזר ללוח העברי - פתוחות לכולם, משמשות את טופס הוספת השמחה.
 */
export const calendarRouter = Router();

function describe(iso: string, hebrew: HebrewDate) {
  return {
    date: iso,
    hebrewDate: { ...hebrew, text: formatHebrewDate(hebrew) },
  };
}

calendarRouter.get('/today', (_req: Request, res: Response) => {
  const iso = todayInIsrael();
  const hebrew = gregorianToHebrew(iso);
  res.json({ ...describe(iso, hebrew), yearText: formatHebrewYear(hebrew.year) });
});

const monthsQuerySchema = z.object({
  year: z.coerce
    .number({ error: 'יש לשלוח שנה עברית במספרים, למשל 5787' })
    .int()
    .min(MIN_HEBREW_YEAR)
    .max(MAX_HEBREW_YEAR),
});

calendarRouter.get('/months', (req: Request, res: Response) => {
  const { year } = parse(monthsQuerySchema, req.query);
  res.json({
    year,
    yearText: formatHebrewYear(year),
    isLeapYear: isHebrewLeapYear(year),
    months: monthsOfYear(year),
  });
});

const gregorianQuerySchema = z.object({ date: isoDateSchema }).strict();

/** ?date=2026-10-26 → המרה ללוח עברי. ?day=15&month=CHESHVAN&year=5787 → המרה ללועזי */
calendarRouter.get('/convert', (req: Request, res: Response) => {
  if (req.query.date !== undefined) {
    const { date } = parse(gregorianQuerySchema, req.query);
    const hebrew = gregorianToHebrew(date);
    if (hebrew.year < MIN_HEBREW_YEAR || hebrew.year > MAX_HEBREW_YEAR) {
      throw badRequest('התאריך מחוץ לטווח הנתמך');
    }
    res.json(describe(date, hebrew));
    return;
  }

  const input = parse(hebrewDateInputSchema, req.query);
  const problem = validateHebrewDate(input);
  if (problem) throw badRequest(problem, [{ field: 'hebrewDate', message: problem }]);
  res.json(describe(hebrewToGregorian(input), input));
});
