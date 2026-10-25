import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** הגבלת ניסיונות התחברות והרשמה - מגן מפני ניחוש סיסמאות */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'TOO_MANY_REQUESTS', message: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' },
    });
  },
});
