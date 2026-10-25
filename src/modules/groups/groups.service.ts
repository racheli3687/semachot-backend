import { Prisma, type Group, type GroupRole } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireManager, requireMembership } from '../../auth/permissions';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { generateJoinCode } from '../../lib/random';

type GroupWithCount = Group & { _count: { members: number } };

/** מבנה קבוצה שמוחזר ללקוח. קוד ההצטרפות מוחזר רק למנהל */
function toGroupDto(group: GroupWithCount, myRole: GroupRole) {
  return {
    id: group.id,
    name: group.name,
    myRole,
    memberCount: group._count.members,
    createdAt: group.createdAt.toISOString(),
    ...(myRole === 'MANAGER' ? { joinCode: group.joinCode } : {}),
  };
}

const withMemberCount = { _count: { select: { members: true } } } as const;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** מנסה כמה פעמים עד שנוצר קוד ייחודי (סיכוי להתנגשות זעיר מאוד) */
async function withUniqueJoinCode<T>(action: (joinCode: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await action(generateJoinCode());
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error('Could not generate a unique join code');
}

async function loadGroup(groupId: number): Promise<GroupWithCount> {
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: withMemberCount });
  if (!group) throw notFound('הקבוצה לא נמצאה');
  return group;
}

export async function listMyGroups(userId: number) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: { include: withMemberCount } },
    orderBy: { group: { name: 'asc' } },
  });
  return memberships.map((m) => toGroupDto(m.group, m.role));
}

export async function createGroup(userId: number, name: string) {
  const group = await withUniqueJoinCode((joinCode) =>
    prisma.group.create({
      data: {
        name,
        joinCode,
        createdById: userId,
        members: { create: { userId, role: 'MANAGER' } },
      },
      include: withMemberCount,
    }),
  );
  return toGroupDto(group, 'MANAGER');
}

export async function joinGroup(userId: number, joinCode: string) {
  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) throw notFound('קוד ההצטרפות לא נמצא. בדקו שהקוד הוקלד נכון');

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (existing) throw conflict('את/ה כבר חבר/ה בקבוצה הזו');

  await prisma.groupMember.create({ data: { userId, groupId: group.id, role: 'MEMBER' } });
  return toGroupDto(await loadGroup(group.id), 'MEMBER');
}

export async function getGroup(userId: number, groupId: number) {
  const membership = await requireMembership(userId, groupId);
  return toGroupDto(await loadGroup(groupId), membership.role);
}

export async function renameGroup(userId: number, groupId: number, name: string) {
  await requireManager(userId, groupId);
  const group = await prisma.group.update({
    where: { id: groupId },
    data: { name },
    include: withMemberCount,
  });
  return toGroupDto(group, 'MANAGER');
}

export async function regenerateJoinCode(userId: number, groupId: number) {
  await requireManager(userId, groupId);
  const group = await withUniqueJoinCode((joinCode) =>
    prisma.group.update({ where: { id: groupId }, data: { joinCode } }),
  );
  return { joinCode: group.joinCode };
}

export async function deleteGroup(userId: number, groupId: number) {
  await requireManager(userId, groupId);
  // החברויות והשיתופים נמחקים אוטומטית (Cascade). השמחות עצמן נשארות אצל בעליהן.
  await prisma.group.delete({ where: { id: groupId } });
}

export async function listMembers(userId: number, groupId: number) {
  await requireMembership(userId, groupId);
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });
  return members.map((m) => ({
    userId: m.user.id,
    fullName: m.user.fullName,
    email: m.user.email,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
  }));
}

/** הוצאת משתמש מקבוצה, כולל הסרת השמחות שלו מהקבוצה */
async function detachMember(tx: Prisma.TransactionClient, userId: number, groupId: number) {
  await tx.celebrationGroup.deleteMany({ where: { groupId, celebration: { ownerId: userId } } });
  await tx.groupMember.delete({ where: { userId_groupId: { userId, groupId } } });
}

export async function removeMember(managerId: number, groupId: number, targetUserId: number) {
  await requireManager(managerId, groupId);
  if (targetUserId === managerId) {
    throw badRequest('אי אפשר להסיר את עצמך. כדי לצאת מהקבוצה יש להשתמש ביציאה מהקבוצה');
  }
  const target = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
  if (!target) throw notFound('המשתמש אינו חבר בקבוצה');

  await prisma.$transaction((tx) => detachMember(tx, targetUserId, groupId));
}

/**
 * יציאה מקבוצה.
 * אם המנהל היחיד יוצא - החבר הוותיק ביותר הופך למנהל.
 * אם לא נשארו חברים - הקבוצה נמחקת.
 */
export async function leaveGroup(userId: number, groupId: number) {
  const membership = await requireMembership(userId, groupId);

  return prisma.$transaction(async (tx) => {
    await detachMember(tx, userId, groupId);

    let newManagerId: number | null = null;
    let groupDeleted = false;

    if (membership.role === 'MANAGER') {
      const managersLeft = await tx.groupMember.count({ where: { groupId, role: 'MANAGER' } });
      if (managersLeft === 0) {
        const next = await tx.groupMember.findFirst({
          where: { groupId },
          orderBy: { joinedAt: 'asc' },
        });
        if (next) {
          await tx.groupMember.update({
            where: { userId_groupId: { userId: next.userId, groupId } },
            data: { role: 'MANAGER' },
          });
          newManagerId = next.userId;
        } else {
          await tx.group.delete({ where: { id: groupId } });
          groupDeleted = true;
        }
      }
    }

    return { left: true, groupDeleted, newManagerId };
  });
}

/** הסרת שמחה מקבוצה: מותר למנהל הקבוצה או לבעל השמחה */
export async function removeCelebrationFromGroup(userId: number, groupId: number, celebrationId: number) {
  const membership = await requireMembership(userId, groupId);

  const link = await prisma.celebrationGroup.findUnique({
    where: { celebrationId_groupId: { celebrationId, groupId } },
    include: { celebration: { select: { ownerId: true } } },
  });
  if (!link) throw notFound('השמחה לא מופיעה בקבוצה הזו');

  const isOwner = link.celebration.ownerId === userId;
  if (!isOwner && membership.role !== 'MANAGER') {
    throw forbidden('רק מנהל/ת הקבוצה או בעל/ת השמחה יכולים להסיר אותה מהקבוצה');
  }

  await prisma.celebrationGroup.delete({
    where: { celebrationId_groupId: { celebrationId, groupId } },
  });
}
