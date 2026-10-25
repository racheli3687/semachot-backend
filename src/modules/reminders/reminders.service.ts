import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { CELEBRATION_TYPE_LABELS } from '../../constants/celebration-types';
import { isoToDbDate, todayInIsrael } from '../../lib/dates';
import { formatHebrewDate } from '../../lib/hebrew-calendar';
import * as email from '../../services/email';
import { buildReminderEmail } from './reminder-email';

export interface ReminderRunResult {
  date: string;
  celebrations: number;
  emailsSent: number;
  emailsFailed: number;
  emailEnabled: boolean;
}

/**
 * שליחת תזכורות לשמחות של היום (לפי שעון ישראל).
 * - כל שמחה מקבלת תזכורת פעם אחת בלבד, גם אם מפעילים את הפעולה כמה פעמים.
 * - כל אדם מקבל מייל אחד לשמחה, גם אם הוא חבר בכמה מהקבוצות שלה.
 * - רק משתמשים שהתזכורות שלהם דולקות.
 */
export async function runReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const date = todayInIsrael(now);
  const dbDate = isoToDbDate(date);

  const pending = await prisma.celebration.findMany({
    where: { eventDate: dbDate, reminderSentAt: null, groups: { some: {} } },
    include: {
      owner: { select: { fullName: true } },
      groups: { select: { groupId: true } },
    },
    orderBy: { id: 'asc' },
  });

  const result: ReminderRunResult = {
    date,
    celebrations: pending.length,
    emailsSent: 0,
    emailsFailed: 0,
    emailEnabled: email.emailEnabled(),
  };
  if (!result.emailEnabled) return result;

  for (const celebration of pending) {
    // "תופסים" את השמחה לפני השליחה - כך שתי הפעלות במקביל לא ישלחו פעמיים
    const claimed = await prisma.celebration.updateMany({
      where: { id: celebration.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;

    const recipients = await prisma.user.findMany({
      where: {
        emailReminders: true,
        memberships: { some: { groupId: { in: celebration.groups.map((g) => g.groupId) } } },
      },
      select: { email: true, fullName: true },
    });

    const details = {
      celebrationId: celebration.id,
      title: celebration.title,
      typeLabel: CELEBRATION_TYPE_LABELS[celebration.type],
      hebrewDateText: formatHebrewDate({
        day: celebration.hebrewDay,
        month: celebration.hebrewMonth,
        year: celebration.hebrewYear,
      }),
      date,
      time: celebration.eventTime,
      venueName: celebration.venueName,
      address: celebration.address,
      ownerName: celebration.owner.fullName,
    };

    for (const recipient of recipients) {
      try {
        await email.sendEmail(
          buildReminderEmail({ email: recipient.email, name: recipient.fullName }, details, env.FRONTEND_URL),
        );
        result.emailsSent++;
      } catch (error) {
        result.emailsFailed++;
        // eslint-disable-next-line no-console
        console.error(`Reminder email failed (celebration ${celebration.id}):`, error);
      }
    }
  }

  return result;
}
