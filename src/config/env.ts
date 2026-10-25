import 'dotenv/config';
import { z } from 'zod';

/**
 * קריאה ובדיקה של משתני הסביבה.
 * אם משתנה חובה חסר או שגוי - השרת לא יעלה, ותודפס הודעה ברורה.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL חסר - כתובת החיבור למסד הנתונים'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET חייב להכיל לפחות 32 תווים'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // רשימת כתובות מופרדות בפסיק, למשל: http://localhost:5173,https://my-app.onrender.com
  // הערך * מתיר כל כתובת (מתאים רק לפיתוח).
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // כתובת ציבורית של השרת (לא חובה). משמשת לבניית קישורים מלאים לתמונות.
  PUBLIC_BASE_URL: z
    .string()
    .url('PUBLIC_BASE_URL חייב להיות כתובת מלאה, למשל https://my-api.onrender.com')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  // סוד לשעון המעורר של התזכורות (לא חובה - בלעדיו התזכורות כבויות)
  CRON_SECRET: z.string().optional().or(z.literal('').transform(() => undefined)),

  // שירות שליחת מיילים Brevo (לא חובה - בלעדיו לא נשלחים מיילים)
  BREVO_API_KEY: z.string().optional().or(z.literal('').transform(() => undefined)),
  EMAIL_FROM_ADDRESS: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  EMAIL_FROM_NAME: z.string().default('לוח שמחות'),

  // כתובת אתר ה-React, לקישור בתוך המייל (לא חובה)
  FRONTEND_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n❌ משתני סביבה חסרים או שגויים:\n${problems}\n`);
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const isEmailConfigured = Boolean(env.BREVO_API_KEY && env.EMAIL_FROM_ADDRESS);
