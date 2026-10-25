import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  sub: string;
}

/** יצירת JWT Access Token. המזהה של המשתמש נשמר בשדה sub */
export function signAccessToken(userId: number): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: String(userId) } satisfies TokenPayload, env.JWT_SECRET, options);
}

/** אימות Token. מחזיר את מזהה המשתמש, או זורק שגיאה של jsonwebtoken */
export function verifyAccessToken(token: string): number {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new jwt.JsonWebTokenError('invalid payload');
  }
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new jwt.JsonWebTokenError('invalid subject');
  }
  return userId;
}
