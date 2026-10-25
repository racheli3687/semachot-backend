import type { Request } from 'express';
import { unauthorized } from '../lib/errors';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
}

/** המשתמש המחובר בבקשה הנוכחית. זורק 401 אם אין משתמש מחובר */
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
