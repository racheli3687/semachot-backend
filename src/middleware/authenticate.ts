import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../auth/tokens';
import { prisma } from '../db/prisma';
import { unauthorized } from '../lib/errors';

/**
 * בדיקת התחברות לכל Endpoint פרטי.
 * דורש כותרת: Authorization: Bearer <token>
 * - אין Token → 401 UNAUTHORIZED
 * - Token שפג תוקפו → 401 TOKEN_EXPIRED
 * - Token לא תקין, או שהמשתמש כבר לא קיים → 401 INVALID_TOKEN
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header) {
    throw unauthorized('נדרשת התחברות. יש לשלוח Token בכותרת Authorization');
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw unauthorized('הכותרת Authorization חייבת להיות בפורמט: Bearer <token>', 'INVALID_TOKEN');
  }

  let userId: number;
  try {
    userId = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw unauthorized('תוקף ההתחברות פג. יש להתחבר מחדש', 'TOKEN_EXPIRED');
    }
    throw unauthorized('Token לא תקין', 'INVALID_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) {
    throw unauthorized('המשתמש לא קיים. יש להתחבר מחדש', 'INVALID_TOKEN');
  }

  req.user = user;
  next();
}
