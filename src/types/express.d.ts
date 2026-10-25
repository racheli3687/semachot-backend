import type { AuthUser } from '../auth/auth-user';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** המשתמש המחובר - נקבע לפי ה-Token בלבד (ראו middleware/authenticate.ts) */
      user?: AuthUser;
    }
  }
}

export {};
