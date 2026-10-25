/**
 * משתני סביבה לבדיקות. נטען לפני כל קובץ בדיקה, ולפני שהשרת נטען.
 * הבדיקות רצות מול מסד נתונים PostgreSQL אמיתי ונפרד (לא מסד הפיתוח!).
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/semachot_test?schema=public';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.PUBLIC_BASE_URL = 'http://api.test';
process.env.BREVO_API_KEY = '';
process.env.EMAIL_FROM_ADDRESS = '';
