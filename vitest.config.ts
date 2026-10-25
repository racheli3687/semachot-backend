import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // משתני סביבה ומסד נתונים לבדיקות - לפני שכל קובץ נטען
    setupFiles: ['tests/setup-env.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // כל הבדיקות משתמשות באותו מסד נתונים - מריצים קובץ אחרי קובץ
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
