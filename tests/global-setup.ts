import { execSync } from 'node:child_process';

/**
 * רץ פעם אחת לפני כל הבדיקות: מחיל את ה-Migrations על מסד הנתונים של הבדיקות
 * (prisma migrate deploy - פעולה שאינה מוחקת נתונים). כך גם נבדק שה-Migrations תקינים.
 *
 * מסד הבדיקות חייב להיות נפרד ממסד הפיתוח, כי הבדיקות מרוקנות את הטבלאות בין בדיקה לבדיקה.
 */
export default function globalSetup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/semachot_test?schema=public';

  if (!/test/i.test(url)) {
    throw new Error('For safety, the test database name must contain "test" (TEST_DATABASE_URL).');
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
