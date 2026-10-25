/**
 * נתוני הדגמה (Seed).
 *
 * פיתוח:   npm run db:seed   (סיסמת ברירת מחדל לכל המשתמשים: Demo1234)
 * ענן:     רץ רק אם SEED_DEMO_DATA=true ו-SEED_DEMO_PASSWORD מוגדר (סיסמה שרק את יודעת).
 *
 * ההרצה בטוחה לחזרה: אם נתוני ההדגמה כבר קיימים - לא נוצר דבר נוסף.
 */
import 'dotenv/config';
import type { CelebrationType, GroupRole } from '@prisma/client';
import { hashPassword } from '../auth/passwords';
import { prisma } from '../db/prisma';
import { addDaysIso, isoToDbDate, todayInIsrael } from '../lib/dates';
import { gregorianToHebrew } from '../lib/hebrew-calendar';
import { generateJoinCode } from '../lib/random';

const DEV_PASSWORD = 'Demo1234';

function resolvePassword(): string | null {
  const isProduction = process.env.NODE_ENV === 'production';
  const password = process.env.SEED_DEMO_PASSWORD?.trim();

  if (isProduction) {
    if (process.env.SEED_DEMO_DATA !== 'true') {
      console.log('ℹ️  Seed skipped (set SEED_DEMO_DATA=true to create demo data).');
      return null;
    }
    if (!password) {
      console.log('⚠️  Seed skipped: SEED_DEMO_PASSWORD is required in production.');
      return null;
    }
  }

  const chosen = password || DEV_PASSWORD;
  if (chosen.length < 8 || !/\d/.test(chosen) || !/[A-Za-z]/.test(chosen)) {
    console.log('⚠️  Seed skipped: SEED_DEMO_PASSWORD must have 8+ characters, a letter and a digit.');
    return null;
  }
  return chosen;
}

interface DemoCelebration {
  owner: 'manager' | 'member' | 'outsider';
  title: string;
  type: CelebrationType;
  daysFromToday: number;
  time: string;
  venueName: string;
  address?: string;
  description?: string;
  groups: ('family' | 'friends' | 'neighbors')[];
}

const celebrations: DemoCelebration[] = [
  {
    owner: 'manager',
    title: 'חתונת אחי משה',
    type: 'WEDDING',
    daysFromToday: 0,
    time: '19:00',
    venueName: 'אולמי הדר',
    address: 'רחוב הרב קוק 10, בני ברק',
    description: 'בשמחה ובהודיה נשמח לראותכם בשמחתנו',
    groups: ['family'],
  },
  {
    owner: 'member',
    title: 'בר המצווה של יוסי',
    type: 'BAR_MITZVAH',
    daysFromToday: 3,
    time: '20:00',
    venueName: 'אולם בית שמש',
    address: 'רחוב נהר הירדן 5, בית שמש',
    groups: ['family', 'friends'],
  },
  {
    owner: 'manager',
    title: 'ברית מילה לנכד',
    type: 'BRIT_MILAH',
    daysFromToday: 10,
    time: '08:30',
    venueName: 'בית הכנסת הגדול',
    groups: ['family'],
  },
  {
    owner: 'member',
    title: 'שבע ברכות לאחותי',
    type: 'SHEVA_BRACHOT',
    daysFromToday: 20,
    time: '20:30',
    venueName: 'אצל משפחת לוי',
    address: 'רחוב חזון איש 22, בני ברק',
    groups: ['friends'],
  },
  {
    owner: 'member',
    title: 'סיום מסכת ברכות',
    type: 'SIYUM',
    daysFromToday: 45,
    time: '21:00',
    venueName: 'היכל התורה',
    groups: ['friends'],
  },
  {
    owner: 'manager',
    title: 'חנוכת בית בירושלים',
    type: 'CHANUKAT_BAYIT',
    daysFromToday: 70,
    time: '19:30',
    venueName: 'הבית החדש',
    address: 'רחוב פנים מאירות 3, ירושלים',
    groups: ['family'],
  },
  {
    owner: 'manager',
    title: 'ווארט של הבן',
    type: 'ENGAGEMENT',
    daysFromToday: -15,
    time: '20:00',
    venueName: 'אולם קטן בשכונה',
    groups: ['family'],
  },
  {
    owner: 'outsider',
    title: 'קידוש לבת',
    type: 'KIDDUSH',
    daysFromToday: 5,
    time: '11:30',
    venueName: 'בית הכנסת השכונתי',
    groups: ['neighbors'],
  },
];

async function main() {
  const password = resolvePassword();
  if (!password) return;

  const existing = await prisma.user.findUnique({ where: { email: 'manager@example.com' } });
  if (existing) {
    console.log('ℹ️  Demo data already exists - nothing to do.');
    return;
  }

  const passwordHash = await hashPassword(password);
  const [manager, member, outsider] = await Promise.all(
    [
      { fullName: 'רחל כהן', email: 'manager@example.com' },
      { fullName: 'שרה לוי', email: 'member@example.com' },
      { fullName: 'מרים פרידמן', email: 'outsider@example.com' },
    ].map((u) => prisma.user.create({ data: { ...u, passwordHash } })),
  );
  if (!manager || !member || !outsider) throw new Error('Failed to create users');
  const users = { manager, member, outsider };

  const createGroup = (name: string, members: [number, GroupRole][]) =>
    prisma.group.create({
      data: {
        name,
        joinCode: generateJoinCode(),
        createdById: members[0]![0],
        members: { create: members.map(([userId, role]) => ({ userId, role })) },
      },
    });

  // רחל מנהלת את קבוצת המשפחה, וחברה רגילה בקבוצת החברות (ששרה מנהלת)
  const family = await createGroup('משפחת כהן', [
    [manager.id, 'MANAGER'],
    [member.id, 'MEMBER'],
  ]);
  const friends = await createGroup('חברות מהסמינר', [
    [member.id, 'MANAGER'],
    [manager.id, 'MEMBER'],
  ]);
  // קבוצה שרחל ושרה לא חברות בה - לבדיקת חסימת גישה
  const neighbors = await createGroup('שכנים ברחוב הרימון', [[outsider.id, 'MANAGER']]);
  const groups = { family, friends, neighbors };

  const today = todayInIsrael();
  for (const c of celebrations) {
    const iso = addDaysIso(today, c.daysFromToday);
    const hebrew = gregorianToHebrew(iso);
    await prisma.celebration.create({
      data: {
        title: c.title,
        type: c.type,
        eventDate: isoToDbDate(iso),
        eventTime: c.time,
        hebrewDay: hebrew.day,
        hebrewMonth: hebrew.month,
        hebrewYear: hebrew.year,
        venueName: c.venueName,
        address: c.address ?? null,
        description: c.description ?? null,
        ownerId: users[c.owner].id,
        groups: { create: c.groups.map((g) => ({ groupId: groups[g].id })) },
      },
    });
  }

  console.log('✅ Demo data created:');
  console.log('   manager@example.com  - מנהלת "משפחת כהן", חברה ב"חברות מהסמינר"');
  console.log('   member@example.com   - מנהלת "חברות מהסמינר", חברה ב"משפחת כהן"');
  console.log('   outsider@example.com - מנהלת "שכנים ברחוב הרימון" בלבד');
  console.log(`   Join codes: family=${family.joinCode}, friends=${friends.joinCode}, neighbors=${neighbors.joinCode}`);
  console.log(`   ${celebrations.length} celebrations created.`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
