import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api, createCelebration, createGroup, joinGroup, registerUser, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('יצירה והצטרפות', () => {
  it('מי שפותח קבוצה הופך למנהל ומקבל קוד הצטרפות', async () => {
    const manager = await registerUser();
    const res = await api().post('/api/groups').set(manager.auth).send({ name: 'משפחת כהן' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'משפחת כהן', myRole: 'MANAGER', memberCount: 1 });
    expect(res.body.joinCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('הצטרפות בעזרת קוד (גם באותיות קטנות). חבר רגיל לא רואה את הקוד', async () => {
    const manager = await registerUser();
    const member = await registerUser();
    const group = await createGroup(manager);

    const res = await api()
      .post('/api/groups/join')
      .set(member.auth)
      .send({ joinCode: group.joinCode.toLowerCase() });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: group.id, myRole: 'MEMBER', memberCount: 2 });
    expect(res.body.joinCode).toBeUndefined();

    const list = await api().get('/api/groups').set(member.auth);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].joinCode).toBeUndefined();
  });

  it('הצטרפות כפולה → 409, קוד שגוי → 404, קוד בפורמט שגוי → 400', async () => {
    const manager = await registerUser();
    const member = await registerUser();
    const group = await createGroup(manager);
    await joinGroup(member, group.joinCode);

    expect((await api().post('/api/groups/join').set(member.auth).send({ joinCode: group.joinCode })).status).toBe(409);
    expect((await api().post('/api/groups/join').set(member.auth).send({ joinCode: 'ZZZZZZZZ' })).status).toBe(404);
    expect((await api().post('/api/groups/join').set(member.auth).send({ joinCode: 'abc' })).status).toBe(400);
  });

  it('משתמש יכול להיות מנהל בקבוצה אחת וחבר בקבוצה אחרת', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const groupA = await createGroup(a, 'קבוצה א');
    const groupB = await createGroup(b, 'קבוצה ב');
    await joinGroup(a, groupB.joinCode);

    const list = await api().get('/api/groups').set(a.auth);
    const roles = Object.fromEntries(list.body.map((g: { id: number; myRole: string }) => [g.id, g.myRole]));
    expect(roles).toEqual({ [groupA.id]: 'MANAGER', [groupB.id]: 'MEMBER' });
  });
});

describe('הרשאות מנהל מול חבר', () => {
  async function setup() {
    const manager = await registerUser('מנהלת');
    const member = await registerUser('חברה');
    const outsider = await registerUser('זרה');
    const group = await createGroup(manager, 'משפחה');
    await joinGroup(member, group.joinCode);
    return { manager, member, outsider, group };
  }

  it('רק המנהל יכול לשנות שם. חבר → 403, מי שאינו חבר → 404', async () => {
    const { manager, member, outsider, group } = await setup();
    const url = `/api/groups/${group.id}`;
    expect((await api().patch(url).set(member.auth).send({ name: 'שם חדש' })).status).toBe(403);
    expect((await api().patch(url).set(outsider.auth).send({ name: 'שם חדש' })).status).toBe(404);
    const ok = await api().patch(url).set(manager.auth).send({ name: 'שם חדש' });
    expect(ok.status).toBe(200);
    expect(ok.body.name).toBe('שם חדש');
  });

  it('מי שאינו חבר לא יכול לראות את הקבוצה או את חבריה', async () => {
    const { outsider, group } = await setup();
    expect((await api().get(`/api/groups/${group.id}`).set(outsider.auth)).status).toBe(404);
    expect((await api().get(`/api/groups/${group.id}/members`).set(outsider.auth)).status).toBe(404);
  });

  it('רשימת החברים כוללת מייל ותפקיד, ונראית לכל חברי הקבוצה', async () => {
    const { manager, member, group } = await setup();
    const res = await api().get(`/api/groups/${group.id}/members`).set(member.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ userId: manager.id, email: manager.email, role: 'MANAGER' }),
      expect.objectContaining({ userId: member.id, email: member.email, role: 'MEMBER' }),
    ]);
  });

  it('יצירת קוד חדש מבטלת את הקוד הישן (מנהל בלבד)', async () => {
    const { manager, member, outsider, group } = await setup();
    expect((await api().post(`/api/groups/${group.id}/join-code`).set(member.auth)).status).toBe(403);

    const res = await api().post(`/api/groups/${group.id}/join-code`).set(manager.auth);
    expect(res.status).toBe(200);
    expect(res.body.joinCode).not.toBe(group.joinCode);

    expect((await api().post('/api/groups/join').set(outsider.auth).send({ joinCode: group.joinCode })).status).toBe(404);
    expect((await api().post('/api/groups/join').set(outsider.auth).send({ joinCode: res.body.joinCode })).status).toBe(200);
  });

  it('הסרת חבר: מנהל יכול, חבר לא, ואי אפשר להסיר את עצמך', async () => {
    const { manager, member, outsider, group } = await setup();
    await joinGroup(outsider, group.joinCode);

    expect((await api().delete(`/api/groups/${group.id}/members/${outsider.id}`).set(member.auth)).status).toBe(403);
    expect((await api().delete(`/api/groups/${group.id}/members/${manager.id}`).set(manager.auth)).status).toBe(400);
    expect((await api().delete(`/api/groups/${group.id}/members/99999`).set(manager.auth)).status).toBe(404);
    expect((await api().delete(`/api/groups/${group.id}/members/${outsider.id}`).set(manager.auth)).status).toBe(204);
    expect((await api().get(`/api/groups/${group.id}`).set(outsider.auth)).status).toBe(404);
  });

  it('חבר שהוסר - השמחות שלו מוסרות מהקבוצה', async () => {
    const { manager, member, group } = await setup();
    const celebration = await createCelebration(member, [group.id]);
    await api().delete(`/api/groups/${group.id}/members/${member.id}`).set(manager.auth).expect(204);
    expect((await api().get(`/api/celebrations/${celebration.id}`).set(manager.auth)).status).toBe(404);
    // השמחה עצמה נשארה אצל בעלת השמחה
    expect((await api().get(`/api/celebrations/${celebration.id}`).set(member.auth)).status).toBe(200);
  });

  it('מחיקת קבוצה - מנהל בלבד. השמחות נשארות אצל בעליהן', async () => {
    const { manager, member, group } = await setup();
    const celebration = await createCelebration(member, [group.id]);
    expect((await api().delete(`/api/groups/${group.id}`).set(member.auth)).status).toBe(403);
    expect((await api().delete(`/api/groups/${group.id}`).set(manager.auth)).status).toBe(204);
    expect((await api().get(`/api/groups/${group.id}`).set(manager.auth)).status).toBe(404);
    const own = await api().get(`/api/celebrations/${celebration.id}`).set(member.auth);
    expect(own.status).toBe(200);
    expect(own.body.groups).toEqual([]);
  });
});

describe('יציאה מקבוצה', () => {
  it('כשהמנהל היחיד יוצא - החבר הוותיק ביותר הופך למנהל', async () => {
    const manager = await registerUser();
    const first = await registerUser();
    const second = await registerUser();
    const group = await createGroup(manager);
    await joinGroup(first, group.joinCode);
    await joinGroup(second, group.joinCode);

    const res = await api().post(`/api/groups/${group.id}/leave`).set(manager.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ left: true, groupDeleted: false, newManagerId: first.id });

    const view = await api().get(`/api/groups/${group.id}`).set(first.auth);
    expect(view.body.myRole).toBe('MANAGER');
    expect(view.body.joinCode).toEqual(expect.any(String));
  });

  it('כשהחבר האחרון יוצא - הקבוצה נמחקת', async () => {
    const manager = await registerUser();
    const group = await createGroup(manager);
    const res = await api().post(`/api/groups/${group.id}/leave`).set(manager.auth);
    expect(res.body.groupDeleted).toBe(true);
    expect(await prisma.group.count()).toBe(0);
  });

  it('חבר רגיל שיוצא - השמחות שלו יוצאות מהקבוצה', async () => {
    const manager = await registerUser();
    const member = await registerUser();
    const group = await createGroup(manager);
    await joinGroup(member, group.joinCode);
    const celebration = await createCelebration(member, [group.id]);

    await api().post(`/api/groups/${group.id}/leave`).set(member.auth).expect(200);
    expect((await api().get(`/api/celebrations/${celebration.id}`).set(manager.auth)).status).toBe(404);
  });
});
