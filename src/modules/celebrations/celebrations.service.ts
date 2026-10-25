import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireMemberOfAll, requireMembership, visibleCelebrationsWhere } from '../../auth/permissions';
import { CELEBRATION_TYPE_LABELS } from '../../constants/celebration-types';
import { addDaysIso, dbDateToIso, isoToDbDate, todayInIsrael } from '../../lib/dates';
import { AppError, badRequest, forbidden, notFound } from '../../lib/errors';
import {
  formatHebrewDate,
  gregorianToHebrew,
  hebrewToGregorian,
  validateHebrewDate,
  type HebrewDate,
} from '../../lib/hebrew-calendar';
import { detectImageType } from '../../lib/image-type';
import { generateImageKey } from '../../lib/random';
import type { CelebrationInput, ListQuery } from './celebrations.schemas';

const MAX_YEARS_AHEAD = 5;

/** מה נטען מהמסד עבור כל שמחה, כדי לבנות את התשובה ללקוח */
function celebrationInclude(viewerId: number) {
  return {
    owner: { select: { id: true, fullName: true } },
    image: { select: { imageKey: true } },
    groups: {
      orderBy: { sharedAt: 'asc' },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            // רק החברות של הצופה - כדי לדעת אילו קבוצות הוא רואה ומה תפקידו בהן
            members: { where: { userId: viewerId }, select: { role: true } },
          },
        },
      },
    },
  } satisfies Prisma.CelebrationInclude;
}

type CelebrationWithRelations = Prisma.CelebrationGetPayload<{
  include: ReturnType<typeof celebrationInclude>;
}>;

/** המבנה של שמחה כפי שמוחזר ללקוח */
export function toCelebrationDto(c: CelebrationWithRelations, viewerId: number, baseUrl: string) {
  const isOwner = c.ownerId === viewerId;
  // מציגים רק קבוצות שגם הצופה חבר בהן
  const visibleGroups = c.groups.filter((link) => link.group.members.length > 0);
  const canRemoveFromGroupIds = visibleGroups
    .filter((link) => isOwner || link.group.members[0]?.role === 'MANAGER')
    .map((link) => link.group.id);

  const date = dbDateToIso(c.eventDate);
  const hebrewDate: HebrewDate = { day: c.hebrewDay, month: c.hebrewMonth, year: c.hebrewYear };

  return {
    id: c.id,
    title: c.title,
    type: c.type,
    typeLabel: CELEBRATION_TYPE_LABELS[c.type],
    date,
    time: c.eventTime,
    hebrewDate: { ...hebrewDate, text: formatHebrewDate(hebrewDate) },
    venueName: c.venueName,
    address: c.address,
    description: c.description,
    imageUrl: c.image ? `${baseUrl}/api/images/${c.image.imageKey}` : null,
    owner: c.owner,
    groups: visibleGroups.map((link) => ({ id: link.group.id, name: link.group.name })),
    isToday: date === todayInIsrael(),
    permissions: { canEdit: isOwner, canRemoveFromGroupIds },
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** קביעת התאריך: מקבלים עברי או לועזי, ומחזירים את שניהם */
function resolveDates(input: CelebrationInput): { iso: string; hebrew: HebrewDate } {
  let iso: string;
  let hebrew: HebrewDate;

  if (input.hebrewDate) {
    const problem = validateHebrewDate(input.hebrewDate);
    if (problem) throw badRequest(problem, [{ field: 'hebrewDate', message: problem }]);
    hebrew = input.hebrewDate;
    iso = hebrewToGregorian(hebrew);
  } else {
    iso = input.date as string;
    hebrew = gregorianToHebrew(iso);
  }

  const maxDate = addDaysIso(todayInIsrael(), 365 * MAX_YEARS_AHEAD);
  if (iso > maxDate) {
    const message = `אפשר להוסיף שמחה עד ${MAX_YEARS_AHEAD} שנים קדימה`;
    throw badRequest(message, [{ field: input.hebrewDate ? 'hebrewDate' : 'date', message }]);
  }
  return { iso, hebrew };
}

function toDbFields(input: CelebrationInput) {
  const { iso, hebrew } = resolveDates(input);
  return {
    title: input.title,
    type: input.type,
    eventDate: isoToDbDate(iso),
    eventTime: input.time,
    hebrewDay: hebrew.day,
    hebrewMonth: hebrew.month,
    hebrewYear: hebrew.year,
    venueName: input.venueName,
    address: input.address,
    description: input.description,
  };
}

/** טעינת שמחה שהצופה רשאי לראות, או 404 */
async function loadVisible(viewerId: number, id: number): Promise<CelebrationWithRelations> {
  const celebration = await prisma.celebration.findFirst({
    where: { AND: [{ id }, visibleCelebrationsWhere(viewerId)] },
    include: celebrationInclude(viewerId),
  });
  if (!celebration) throw notFound('השמחה לא נמצאה');
  return celebration;
}

/** טעינת שמחה לצורך שינוי: מי שלא רואה אותה מקבל 404, מי שרואה אבל אינו הבעלים מקבל 403 */
async function loadOwned(viewerId: number, id: number): Promise<CelebrationWithRelations> {
  const celebration = await loadVisible(viewerId, id);
  if (celebration.ownerId !== viewerId) {
    throw forbidden('רק מי שהעלה את השמחה יכול/ה לשנות אותה');
  }
  return celebration;
}

export async function listCelebrations(viewerId: number, query: ListQuery, baseUrl: string) {
  const today = isoToDbDate(todayInIsrael());
  const filters: Prisma.CelebrationWhereInput[] = [visibleCelebrationsWhere(viewerId)];

  if (query.groupId !== undefined) {
    await requireMembership(viewerId, query.groupId);
    filters.push({ groups: { some: { groupId: query.groupId } } });
  }
  if (query.mine) filters.push({ ownerId: viewerId });
  if (query.type) filters.push({ type: query.type });
  if (query.when === 'upcoming') filters.push({ eventDate: { gte: today } });
  if (query.when === 'past') filters.push({ eventDate: { lt: today } });
  if (query.hebrewYear !== undefined) filters.push({ hebrewYear: query.hebrewYear });
  if (query.hebrewMonth) filters.push({ hebrewMonth: query.hebrewMonth });
  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' as const };
    filters.push({
      OR: [{ title: contains }, { venueName: contains }, { owner: { fullName: contains } }],
    });
  }

  const sort = query.sort ?? (query.when === 'past' ? 'date_desc' : 'date_asc');
  const orderBy: Prisma.CelebrationOrderByWithRelationInput[] =
    sort === 'created_desc'
      ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : sort === 'date_desc'
        ? [{ eventDate: 'desc' }, { eventTime: 'desc' }, { id: 'desc' }]
        : [{ eventDate: 'asc' }, { eventTime: 'asc' }, { id: 'asc' }];

  const where: Prisma.CelebrationWhereInput = { AND: filters };
  const [total, items] = await prisma.$transaction([
    prisma.celebration.count({ where }),
    prisma.celebration.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: celebrationInclude(viewerId),
    }),
  ]);

  return {
    items: items.map((c) => toCelebrationDto(c, viewerId, baseUrl)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export async function listToday(viewerId: number, baseUrl: string) {
  const items = await prisma.celebration.findMany({
    where: { AND: [visibleCelebrationsWhere(viewerId), { eventDate: isoToDbDate(todayInIsrael()) }] },
    orderBy: [{ eventTime: 'asc' }, { id: 'asc' }],
    include: celebrationInclude(viewerId),
  });
  return items.map((c) => toCelebrationDto(c, viewerId, baseUrl));
}

export async function getCelebration(viewerId: number, id: number, baseUrl: string) {
  return toCelebrationDto(await loadVisible(viewerId, id), viewerId, baseUrl);
}

export async function createCelebration(viewerId: number, input: CelebrationInput, baseUrl: string) {
  const data = toDbFields(input);
  await requireMemberOfAll(viewerId, input.groupIds);

  const created = await prisma.celebration.create({
    data: {
      ...data,
      ownerId: viewerId,
      groups: { create: input.groupIds.map((groupId) => ({ groupId })) },
    },
    include: celebrationInclude(viewerId),
  });
  return toCelebrationDto(created, viewerId, baseUrl);
}

export async function updateCelebration(
  viewerId: number,
  id: number,
  input: CelebrationInput,
  baseUrl: string,
) {
  const existing = await loadOwned(viewerId, id);
  const data = toDbFields(input);
  await requireMemberOfAll(viewerId, input.groupIds);

  const dateChanged = dbDateToIso(existing.eventDate) !== dbDateToIso(data.eventDate);

  await prisma.$transaction([
    prisma.celebrationGroup.deleteMany({
      where: { celebrationId: id, groupId: { notIn: input.groupIds } },
    }),
    prisma.celebrationGroup.createMany({
      data: input.groupIds.map((groupId) => ({ celebrationId: id, groupId })),
      skipDuplicates: true,
    }),
    prisma.celebration.update({
      where: { id },
      // אם התאריך השתנה - התזכורת תישלח מחדש ביום החדש
      data: { ...data, ...(dateChanged ? { reminderSentAt: null } : {}) },
    }),
  ]);

  return getCelebration(viewerId, id, baseUrl);
}

export async function deleteCelebration(viewerId: number, id: number) {
  await loadOwned(viewerId, id);
  await prisma.celebration.delete({ where: { id } });
}

// ---------- תמונות ----------

export async function setImage(viewerId: number, id: number, file: Express.Multer.File | undefined, baseUrl: string) {
  await loadOwned(viewerId, id);
  if (!file) {
    throw badRequest('יש לצרף קובץ תמונה בשדה image', [{ field: 'image', message: 'שדה חובה' }]);
  }
  const mimeType = detectImageType(file.buffer);
  if (!mimeType) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'אפשר להעלות רק תמונות מסוג JPG, PNG או WEBP');
  }

  const imageKey = generateImageKey();
  const data = { imageKey, mimeType, sizeBytes: file.size, data: new Uint8Array(file.buffer) };
  await prisma.celebrationImage.upsert({
    where: { celebrationId: id },
    create: { celebrationId: id, ...data },
    update: data,
  });
  return { imageUrl: `${baseUrl}/api/images/${imageKey}` };
}

export async function removeImage(viewerId: number, id: number) {
  const celebration = await loadOwned(viewerId, id);
  if (!celebration.image) throw notFound('לשמחה הזו אין תמונה');
  await prisma.celebrationImage.delete({ where: { celebrationId: id } });
}

export async function getImageByKey(imageKey: string) {
  const image = await prisma.celebrationImage.findUnique({
    where: { imageKey },
    select: { data: true, mimeType: true },
  });
  if (!image) throw notFound('התמונה לא נמצאה');
  return image;
}
