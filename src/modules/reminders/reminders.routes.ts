import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../../config/env';
import { AppError, unauthorized } from '../../lib/errors';
import { runReminders } from './reminders.service';

export const remindersRouter = Router();

function secretsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * מופעל על ידי "שעון מעורר" חיצוני כל בוקר.
 * מוגן בכותרת X-Cron-Secret (ולא ב-Token של משתמש).
 */
remindersRouter.post('/run', async (req, res) => {
  if (!env.CRON_SECRET) {
    throw new AppError(503, 'REMINDERS_DISABLED', 'התזכורות כבויות: המשתנה CRON_SECRET לא הוגדר בשרת');
  }
  const given = req.get('x-cron-secret');
  if (!given || !secretsMatch(given, env.CRON_SECRET)) {
    throw unauthorized('קוד סודי שגוי בכותרת X-Cron-Secret', 'INVALID_CRON_SECRET');
  }
  res.json(await runReminders());
});
