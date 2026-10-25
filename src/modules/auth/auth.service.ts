import type { User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { hashPassword, verifyPassword } from '../../auth/passwords';
import { signAccessToken } from '../../auth/tokens';
import { conflict, notFound, unauthorized } from '../../lib/errors';
import type { LoginInput, RegisterInput, UpdateMeInput } from './auth.schemas';

/** המבנה הציבורי של משתמש - בלי Hash של הסיסמה */
export function toUserDto(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    emailReminders: user.emailReminders,
    createdAt: user.createdAt.toISOString(),
  };
}

function authResponse(user: User) {
  return { token: signAccessToken(user.id), expiresIn: env.JWT_EXPIRES_IN, user: toUserDto(user) };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('כתובת המייל כבר רשומה במערכת');

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });
  return authResponse(user);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // אותה הודעה בשני המקרים - לא מגלים אם המייל קיים במערכת
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !valid) {
    throw unauthorized('המייל או הסיסמה שגויים', 'INVALID_CREDENTIALS');
  }
  return authResponse(user);
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('המשתמש לא נמצא');
  return toUserDto(user);
}

export async function updateMe(userId: number, input: UpdateMeInput) {
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return toUserDto(user);
}
