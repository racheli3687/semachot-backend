import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// במקום לשלוח מיילים אמיתיים - "שירות מייל" מדומה שרק סופר
const { sent } = vi.hoisted(() => ({ sent: [] as { to: string; subject: string }[] }));
vi.mock('../src/services/email', () => ({
  emailEnabled: () => true,
  sendEmail: vi.fn(async (message: { to: { email: string }; subject: string }) => {
    sent.push({ to: message.to.email, subject: message.subject });
  }),
}));

import { prisma } from '../src/db/prisma';
import { api, createCelebration, createGroup, inDays, joinGroup, registerUser, resetDb, today } from './helpers';

const SECRET = { 'X-Cron-Secret': 'test-cron-secret' };

beforeEach(async () => {
  await resetDb();
  sent.length = 0;
});
afterAll(() => prisma.$disconnect());

describe('תזכורות במייל', () => {
  it('בלי קוד סודי, או עם קוד שגוי → 401', async () => {
    expect((await api().post('/api/reminders/run')).status).toBe(401);
    expect((await api().post('/api/reminders/run').set('X-Cron-Secret', 'wrong')).status).toBe(401);
  });

  it('שולחת מייל אחד לכל חבר שהתזכורות שלו דולקות - ולא שולחת פעמיים', async () => {
    const manager = await registerUser('מנהלת');
    const member = await registerUser('חברה');
    const quiet = await registerUser('בלי תזכורות');
    const outsider = await registerUser('זרה');
    const family = await createGroup(manager);
    const friends = await createGroup(member);
    await joinGroup(member, family.joinCode);
    await joinGroup(quiet, family.joinCode);
    await joinGroup(manager, friends.joinCode);
    await api().patch('/api/auth/me').set(quiet.auth).send({ emailReminders: false }).expect(200);
    void outsider;

    // שמחה של היום, ששותפה בשתי קבוצות. חברה שנמצאת בשתיהן תקבל מייל אחד בלבד
    await createCelebration(member, [family.id, friends.id], { title: 'שמחה היום', date: today() });
    // שמחה של מחר - לא אמורה לקבל תזכורת היום
    await createCelebration(member, [family.id], { title: 'שמחה מחר', date: inDays(1) });

    const first = await api().post('/api/reminders/run').set(SECRET);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ date: today(), celebrations: 1, emailsSent: 2, emailsFailed: 0, emailEnabled: true });
    expect(sent.map((s) => s.to).sort()).toEqual([manager.email, member.email].sort());
    expect(sent[0]?.subject).toContain('שמחה היום');

    const second = await api().post('/api/reminders/run').set(SECRET);
    expect(second.body).toMatchObject({ celebrations: 0, emailsSent: 0 });
    expect(sent).toHaveLength(2);
  });

  it('שמחה שאינה משותפת באף קבוצה לא מקבלת תזכורת', async () => {
    const manager = await registerUser();
    const group = await createGroup(manager);
    const c = await createCelebration(manager, [group.id], { date: today() });
    await api().delete(`/api/groups/${group.id}/celebrations/${c.id}`).set(manager.auth).expect(204);

    const res = await api().post('/api/reminders/run').set(SECRET);
    expect(res.body.celebrations).toBe(0);
    expect(sent).toHaveLength(0);
  });
});
