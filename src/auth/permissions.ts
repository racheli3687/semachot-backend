import type { GroupMember, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { forbidden, notFound } from '../lib/errors';

/**
 * בדיקות הרשאה (Authorization) - כולן מתבצעות בצד השרת.
 *
 * עיקרון חשוב: מי שאינו חבר בקבוצה מקבל 404 ולא 403,
 * כדי שלא יוכל לגלות אפילו שהקבוצה קיימת.
 */

const GROUP_NOT_FOUND = 'הקבוצה לא נמצאה, או שאינך חבר/ה בה';

/** מחזיר את החברות של המשתמש בקבוצה, או זורק 404 אם אינו חבר */
export async function requireMembership(userId: number, groupId: number): Promise<GroupMember> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) throw notFound(GROUP_NOT_FOUND);
  return membership;
}

/** מוודא שהמשתמש הוא מנהל הקבוצה: לא חבר → 404, חבר רגיל → 403 */
export async function requireManager(userId: number, groupId: number): Promise<GroupMember> {
  const membership = await requireMembership(userId, groupId);
  if (membership.role !== 'MANAGER') {
    throw forbidden('רק מנהל/ת הקבוצה יכול/ה לבצע פעולה זו');
  }
  return membership;
}

/** מוודא שהמשתמש חבר בכל הקבוצות ברשימה (לשיתוף שמחה) */
export async function requireMemberOfAll(userId: number, groupIds: number[]): Promise<void> {
  const unique = [...new Set(groupIds)];
  const count = await prisma.groupMember.count({
    where: { userId, groupId: { in: unique } },
  });
  if (count !== unique.length) {
    throw forbidden('אפשר לשתף שמחה רק בקבוצות שאת/ה חבר/ה בהן');
  }
}

/**
 * תנאי לשאילתה: שמחות שהמשתמש רשאי לראות -
 * שמחות שהוא העלה, או שמחות ששותפו בקבוצה שהוא חבר בה.
 */
export function visibleCelebrationsWhere(userId: number): Prisma.CelebrationWhereInput {
  return {
    OR: [{ ownerId: userId }, { groups: { some: { group: { members: { some: { userId } } } } } }],
  };
}
