import { z } from 'zod';
import { CELEBRATION_TYPES } from '../../constants/celebration-types';
import { HEBREW_MONTHS, isValidIsoDate } from '../../lib/hebrew-calendar';
import { idParam } from '../../validation/zod-setup';

/** טקסט אופציונלי: מחרוזת ריקה או null נשמרים כ-null */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} יכול/ה להכיל עד ${max} תווים`)
    .nullish()
    .transform((value) => (value ? value : null));

export const isoDateSchema = z
  .string()
  .refine(isValidIsoDate, 'תאריך לא תקין. הפורמט הנדרש: YYYY-MM-DD, למשל 2026-12-15');

export const hebrewMonthSchema = z.enum(HEBREW_MONTHS, {
  error: `חודש לא תקין. ערכים אפשריים: ${HEBREW_MONTHS.join(', ')}`,
});

export const hebrewDateInputSchema = z
  .object({
    day: z.coerce.number().int('היום חייב להיות מספר שלם').min(1, 'יום לא תקין').max(30, 'יום לא תקין'),
    month: hebrewMonthSchema,
    year: z.coerce.number().int('השנה חייבת להיות מספר שלם'),
  })
  .strict();

export const celebrationTypeSchema = z.enum(CELEBRATION_TYPES, {
  error: 'סוג שמחה לא תקין. את הרשימה המלאה אפשר לקבל ב-GET /api/celebration-types',
});

/** גוף הבקשה להוספה ולעריכה של שמחה. יש לשלוח date או hebrewDate - אחד מהם בלבד */
export const celebrationInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'הכותרת חייבת להכיל לפחות 2 תווים')
      .max(100, 'הכותרת יכולה להכיל עד 100 תווים'),
    type: celebrationTypeSchema,
    date: isoDateSchema.optional(),
    hebrewDate: hebrewDateInputSchema.optional(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה לא תקינה. הפורמט הנדרש: HH:MM, למשל 19:30'),
    venueName: z
      .string()
      .trim()
      .min(2, 'שם המקום חייב להכיל לפחות 2 תווים')
      .max(100, 'שם המקום יכול להכיל עד 100 תווים'),
    address: optionalText(200, 'הכתובת'),
    description: optionalText(1000, 'התיאור'),
    groupIds: z
      .array(idParam, { error: 'groupIds חייב להיות מערך של מזהי קבוצות' })
      .min(1, 'יש לבחור לפחות קבוצה אחת')
      .max(20, 'אפשר לבחור עד 20 קבוצות')
      .transform((ids) => [...new Set(ids)]),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.date === undefined && data.hebrewDate === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'יש לבחור תאריך - עברי (hebrewDate) או לועזי (date)',
      });
    }
    if (data.date !== undefined && data.hebrewDate !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'יש לשלוח תאריך עברי או לועזי - לא את שניהם',
      });
    }
  });

export type CelebrationInput = z.infer<typeof celebrationInputSchema>;

const SORT_OPTIONS = ['date_asc', 'date_desc', 'created_desc'] as const;

export const listQuerySchema = z
  .object({
    groupId: idParam.optional(),
    type: celebrationTypeSchema.optional(),
    when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
    hebrewYear: z.coerce.number().int().min(5700).max(5900).optional(),
    hebrewMonth: hebrewMonthSchema.optional(),
    search: z.string().trim().max(100).optional(),
    mine: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    sort: z.enum(SORT_OPTIONS).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .superRefine((data, ctx) => {
    if (data.hebrewMonth && data.hebrewYear === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['hebrewYear'],
        message: 'כדי לסנן לפי חודש עברי יש לשלוח גם hebrewYear',
      });
    }
  });

export type ListQuery = z.infer<typeof listQuerySchema>;

export const celebrationParamsSchema = z.object({ id: idParam });

export const imageKeyParamsSchema = z.object({
  imageKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, 'מזהה תמונה לא תקין'),
});
