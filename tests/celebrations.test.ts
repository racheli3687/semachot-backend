import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { gregorianToHebrew } from '../src/lib/hebrew-calendar';
import {
  api,
  celebrationBody,
  createCelebration,
  createGroup,
  inDays,
  joinGroup,
  registerUser,
  resetDb,
  TINY_PNG,
  today,
} from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/** מנהלת וחברה בקבוצת "משפחה", ומשתמשת זרה בקבוצה אחרת */
async function setup() {
  const manager = await registerUser('רחל כהן');
  const member = await registerUser('שרה לוי');
  const outsider = await registerUser('מרים פרידמן');
  const family = await createGroup(manager, 'משפחה');
  await joinGroup(member, family.joinCode);
  const other = await createGroup(outsider, 'שכנים');
  return { manager, member, outsider, family, other };
}

describe('הוספת שמחה', () => {
  it('עם תאריך עברי - השרת מחשב את התאריך הלועזי', async () => {
    const { manager, family } = await setup();
    const res = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(
        celebrationBody([family.id], {
          date: undefined,
          hebrewDate: { day: 1, month: 'TISHREI', year: 5800 },
        }),
      );
    // א' תשרי ת"ת חל ב-2039-09-19
    expect(res.status).toBe(400); // יותר מ-5 שנים קדימה
    expect(res.body.error.details[0].field).toBe('hebrewDate');

    const target = gregorianToHebrew(inDays(30));
    const ok = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([family.id], { date: undefined, hebrewDate: target }));
    expect(ok.status).toBe(201);
    expect(ok.body.date).toBe(inDays(30));
    expect(ok.body.hebrewDate).toMatchObject(target);
    expect(ok.body.hebrewDate.text).toEqual(expect.any(String));
  });

  it('עם תאריך לועזי - השרת מחשב את התאריך העברי', async () => {
    const { manager, family } = await setup();
    const res = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([family.id], { date: '2027-04-22' }));
    expect(res.status).toBe(201);
    // ט"ו בניסן תשפ"ז
    expect(res.body.hebrewDate).toEqual({ day: 15, month: 'NISAN', year: 5787, text: 'ט״ו בניסן תשפ״ז' });
    expect(res.body).toMatchObject({
      title: 'חתונה בדיקה',
      type: 'WEDDING',
      typeLabel: 'חתונה',
      time: '19:30',
      owner: { id: manager.id, fullName: 'רחל כהן' },
      groups: [{ id: family.id, name: 'משפחה' }],
      imageUrl: null,
      permissions: { canEdit: true, canRemoveFromGroupIds: [family.id] },
    });
  });

  it('תאריך עברי שלא קיים → 400 עם הסבר', async () => {
    const { manager, family } = await setup();
    // תשפ"ז היא שנה מעוברת - אין "אדר" סתם
    const adar = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([family.id], { date: undefined, hebrewDate: { day: 1, month: 'ADAR', year: 5787 } }));
    expect(adar.status).toBe(400);
    expect(adar.body.error.message).toContain('מעוברת');

    // באייר יש תמיד 29 ימים
    const iyar30 = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([family.id], { date: undefined, hebrewDate: { day: 30, month: 'IYAR', year: 5787 } }));
    expect(iyar30.status).toBe(400);
  });

  it('גם תאריך עברי וגם לועזי, או אף אחד מהם → 400', async () => {
    const { manager, family } = await setup();
    const both = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([family.id], { hebrewDate: { day: 1, month: 'NISAN', year: 5787 } }));
    expect(both.status).toBe(400);
    const none = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([family.id], { date: undefined }));
    expect(none.status).toBe(400);
  });

  it('ולידציה: כותרת קצרה, שעה לא תקינה, סוג לא קיים, בלי קבוצות', async () => {
    const { manager, family } = await setup();
    const res = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([], { title: 'א', time: '25:00', type: 'PARTY' }));
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'time', 'type', 'groupIds']));
    void family;
  });

  it('אי אפשר לשתף בקבוצה שאינך חבר בה → 403', async () => {
    const { manager, family, other } = await setup();
    const res = await api()
      .post('/api/celebrations')
      .set(manager.auth)
      .send(celebrationBody([family.id, other.id]));
    expect(res.status).toBe(403);
  });

  it('שיתוף בכמה קבוצות בבת אחת', async () => {
    const { manager, member, family } = await setup();
    const friends = await createGroup(member, 'חברות');
    await joinGroup(manager, friends.joinCode);
    const c = await createCelebration(manager, [family.id, friends.id]);
    expect((c.groups as { id: number }[]).map((g) => g.id).sort()).toEqual([family.id, friends.id].sort());
  });

  it('בלי Token → 401', async () => {
    const res = await api().post('/api/celebrations').send(celebrationBody([1]));
    expect(res.status).toBe(401);
  });
});

describe('צפייה והרשאות', () => {
  it('מי שאינו בקבוצה לא רואה את השמחה (לא ברשימה ולא לפי מזהה)', async () => {
    const { manager, outsider, family } = await setup();
    const c = await createCelebration(manager, [family.id]);

    expect((await api().get(`/api/celebrations/${c.id}`).set(outsider.auth)).status).toBe(404);
    const list = await api().get('/api/celebrations').set(outsider.auth);
    expect(list.body.items.map((i: { id: number }) => i.id)).not.toContain(c.id);
  });

  it('חבר בקבוצה רואה את השמחה, אבל לא יכול לערוך או למחוק → 403', async () => {
    const { manager, member, family } = await setup();
    const c = await createCelebration(manager, [family.id]);

    const view = await api().get(`/api/celebrations/${c.id}`).set(member.auth);
    expect(view.status).toBe(200);
    expect(view.body.permissions).toEqual({ canEdit: false, canRemoveFromGroupIds: [] });

    expect((await api().put(`/api/celebrations/${c.id}`).set(member.auth).send(celebrationBody([family.id]))).status).toBe(403);
    expect((await api().delete(`/api/celebrations/${c.id}`).set(member.auth)).status).toBe(403);
  });

  it('גם מנהל הקבוצה לא יכול לערוך שמחה של מישהו אחר, אבל יכול להסיר אותה מהקבוצה', async () => {
    const { manager, member, family } = await setup();
    const c = await createCelebration(member, [family.id]);

    const view = await api().get(`/api/celebrations/${c.id}`).set(manager.auth);
    expect(view.body.permissions).toEqual({ canEdit: false, canRemoveFromGroupIds: [family.id] });
    expect((await api().put(`/api/celebrations/${c.id}`).set(manager.auth).send(celebrationBody([family.id]))).status).toBe(403);

    expect((await api().delete(`/api/groups/${family.id}/celebrations/${c.id}`).set(manager.auth)).status).toBe(204);
    expect((await api().get(`/api/celebrations/${c.id}`).set(manager.auth)).status).toBe(404);
  });

  it('חבר רגיל לא יכול להסיר שמחה של אחר מהקבוצה → 403', async () => {
    const { manager, member, family } = await setup();
    const c = await createCelebration(manager, [family.id]);
    expect((await api().delete(`/api/groups/${family.id}/celebrations/${c.id}`).set(member.auth)).status).toBe(403);
  });

  it('רשימת הקבוצות בשמחה מציגה רק קבוצות שגם הצופה חבר בהן', async () => {
    const { manager, member, outsider, family } = await setup();
    const secret = await createGroup(manager, 'קבוצה סודית');
    void outsider;
    const c = await createCelebration(manager, [family.id, secret.id]);
    const view = await api().get(`/api/celebrations/${c.id}`).set(member.auth);
    expect(view.body.groups).toEqual([{ id: family.id, name: 'משפחה' }]);
  });
});

describe('עריכה ומחיקה', () => {
  it('בעל השמחה עורך את כל הפרטים ואת הקבוצות', async () => {
    const { manager, member, family } = await setup();
    const friends = await createGroup(manager, 'חברות');
    const c = await createCelebration(manager, [family.id]);

    const res = await api()
      .put(`/api/celebrations/${c.id}`)
      .set(manager.auth)
      .send(celebrationBody([friends.id], { title: 'כותרת חדשה', type: 'SIYUM', address: '', description: null }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: 'כותרת חדשה',
      type: 'SIYUM',
      address: null,
      description: null,
      groups: [{ id: friends.id, name: 'חברות' }],
    });
    // החברה בקבוצת המשפחה כבר לא רואה את השמחה
    expect((await api().get(`/api/celebrations/${c.id}`).set(member.auth)).status).toBe(404);
  });

  it('שינוי תאריך מאפס את סימון התזכורת', async () => {
    const { manager, family } = await setup();
    const c = await createCelebration(manager, [family.id]);
    await prisma.celebration.update({ where: { id: c.id }, data: { reminderSentAt: new Date() } });

    await api().put(`/api/celebrations/${c.id}`).set(manager.auth).send(celebrationBody([family.id])).expect(200);
    expect((await prisma.celebration.findUniqueOrThrow({ where: { id: c.id } })).reminderSentAt).not.toBeNull();

    await api()
      .put(`/api/celebrations/${c.id}`)
      .set(manager.auth)
      .send(celebrationBody([family.id], { date: inDays(8) }))
      .expect(200);
    expect((await prisma.celebration.findUniqueOrThrow({ where: { id: c.id } })).reminderSentAt).toBeNull();
  });

  it('מחיקה על ידי בעל השמחה', async () => {
    const { manager, family } = await setup();
    const c = await createCelebration(manager, [family.id]);
    expect((await api().delete(`/api/celebrations/${c.id}`).set(manager.auth)).status).toBe(204);
    expect((await api().get(`/api/celebrations/${c.id}`).set(manager.auth)).status).toBe(404);
  });

  it('מזהה לא תקין → 400, מזהה שלא קיים → 404', async () => {
    const { manager } = await setup();
    expect((await api().get('/api/celebrations/abc').set(manager.auth)).status).toBe(400);
    expect((await api().get('/api/celebrations/999999').set(manager.auth)).status).toBe(404);
  });
});

describe('חיפוש, סינון ומיון', () => {
  async function seedList() {
    const ctx = await setup();
    const { manager, member, family } = ctx;
    const friends = await createGroup(member, 'חברות');
    const wedding = await createCelebration(manager, [family.id], { title: 'חתונת משה', type: 'WEDDING', date: inDays(10) });
    const bar = await createCelebration(member, [family.id, friends.id], {
      title: 'בר מצווה של יוסי',
      type: 'BAR_MITZVAH',
      date: inDays(3),
      venueName: 'אולם בית שמש',
    });
    const past = await createCelebration(manager, [family.id], { title: 'ווארט', type: 'ENGAGEMENT', date: inDays(-5) });
    const friendsOnly = await createCelebration(member, [friends.id], { title: 'סיום מסכת', type: 'SIYUM', date: inDays(20) });
    return { ...ctx, friends, wedding, bar, past, friendsOnly };
  }

  const ids = (body: { items: { id: number }[] }) => body.items.map((i) => i.id);

  it('ברירת מחדל: שמחות קרובות, מהקרובה לרחוקה', async () => {
    const { manager, wedding, bar } = await seedList();
    const res = await api().get('/api/celebrations').set(manager.auth);
    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([bar.id, wedding.id]);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
  });

  it('when=past מחזיר שמחות שעברו, when=all מחזיר הכל', async () => {
    const { manager, past } = await seedList();
    const pastRes = await api().get('/api/celebrations?when=past').set(manager.auth);
    expect(ids(pastRes.body)).toEqual([past.id]);
    const all = await api().get('/api/celebrations?when=all').set(manager.auth);
    expect(all.body.total).toBe(3);
  });

  it('סינון לפי סוג', async () => {
    const { manager, wedding } = await seedList();
    const res = await api().get('/api/celebrations?type=WEDDING').set(manager.auth);
    expect(ids(res.body)).toEqual([wedding.id]);
  });

  it('סינון לפי קבוצה - רק קבוצה שאני חבר בה', async () => {
    const { member, outsider, friends, bar, friendsOnly } = await seedList();
    const res = await api().get(`/api/celebrations?groupId=${friends.id}`).set(member.auth);
    expect(ids(res.body)).toEqual([bar.id, friendsOnly.id]);
    expect((await api().get(`/api/celebrations?groupId=${friends.id}`).set(outsider.auth)).status).toBe(404);
  });

  it('חיפוש חופשי בכותרת, במקום ובשם מי שהעלה', async () => {
    const { manager, wedding, bar } = await seedList();
    expect(ids((await api().get('/api/celebrations').query({ search: 'משה' }).set(manager.auth)).body)).toEqual([wedding.id]);
    expect(ids((await api().get('/api/celebrations').query({ search: 'בית שמש' }).set(manager.auth)).body)).toEqual([bar.id]);
    expect(ids((await api().get('/api/celebrations').query({ search: 'שרה' }).set(manager.auth)).body)).toEqual([bar.id]);
  });

  it('mine=true - רק השמחות שלי', async () => {
    const { manager, wedding } = await seedList();
    const res = await api().get('/api/celebrations?mine=true').set(manager.auth);
    expect(ids(res.body)).toEqual([wedding.id]);
  });

  it('סינון לפי חודש עברי', async () => {
    const { manager, bar } = await seedList();
    const h = gregorianToHebrew(bar.date);
    const res = await api()
      .get(`/api/celebrations?when=all&hebrewYear=${h.year}&hebrewMonth=${h.month}`)
      .set(manager.auth);
    expect(ids(res.body)).toContain(bar.id);
    for (const item of res.body.items) {
      expect(item.hebrewDate).toMatchObject({ year: h.year, month: h.month });
    }
    expect((await api().get(`/api/celebrations?hebrewMonth=${h.month}`).set(manager.auth)).status).toBe(400);
  });

  it('מיון ועמודים', async () => {
    const { manager, wedding, bar, past } = await seedList();
    const desc = await api().get('/api/celebrations?when=all&sort=date_desc').set(manager.auth);
    expect(ids(desc.body)).toEqual([wedding.id, bar.id, past.id]);

    const page2 = await api().get('/api/celebrations?when=all&sort=date_asc&pageSize=2&page=2').set(manager.auth);
    expect(ids(page2.body)).toEqual([wedding.id]);
    expect(page2.body).toMatchObject({ total: 3, totalPages: 2, page: 2 });

    expect((await api().get('/api/celebrations?sort=random').set(manager.auth)).status).toBe(400);
    expect((await api().get('/api/celebrations?pageSize=500').set(manager.auth)).status).toBe(400);
  });

  it('שמחות היום', async () => {
    const { manager, family } = await seedList();
    const todays = await createCelebration(manager, [family.id], { title: 'שמחה של היום', date: today() });
    const res = await api().get('/api/celebrations/today').set(manager.auth);
    expect(res.status).toBe(200);
    expect(res.body.map((c: { id: number }) => c.id)).toEqual([todays.id]);
    expect(res.body[0].isToday).toBe(true);
  });
});

describe('תמונות', () => {
  it('העלאה, הצגה ללא Token, החלפה ומחיקה', async () => {
    const { manager, family } = await setup();
    const c = await createCelebration(manager, [family.id]);

    const upload = await api()
      .put(`/api/celebrations/${c.id}/image`)
      .set(manager.auth)
      .attach('image', TINY_PNG, { filename: 'invite.png', contentType: 'image/png' });
    expect(upload.status).toBe(200);
    expect(upload.body.imageUrl).toMatch(/^http:\/\/api\.test\/api\/images\/[A-Za-z0-9_-]{32}$/);

    const path = new URL(upload.body.imageUrl).pathname;
    const image = await api().get(path);
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toBe('image/png');
    expect(image.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.compare(image.body as Buffer, TINY_PNG)).toBe(0);

    const view = await api().get(`/api/celebrations/${c.id}`).set(manager.auth);
    expect(view.body.imageUrl).toBe(upload.body.imageUrl);

    // החלפה יוצרת כתובת חדשה, והישנה מפסיקה לעבוד
    const replace = await api()
      .put(`/api/celebrations/${c.id}/image`)
      .set(manager.auth)
      .attach('image', TINY_PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(replace.body.imageUrl).not.toBe(upload.body.imageUrl);
    expect((await api().get(path)).status).toBe(404);

    expect((await api().delete(`/api/celebrations/${c.id}/image`).set(manager.auth)).status).toBe(204);
    expect((await api().get(`/api/celebrations/${c.id}`).set(manager.auth)).body.imageUrl).toBeNull();
    expect((await api().delete(`/api/celebrations/${c.id}/image`).set(manager.auth)).status).toBe(404);
  });

  it('רק בעל השמחה יכול להעלות תמונה → 403', async () => {
    const { manager, member, family } = await setup();
    const c = await createCelebration(manager, [family.id]);
    const res = await api()
      .put(`/api/celebrations/${c.id}/image`)
      .set(member.auth)
      .attach('image', TINY_PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('קובץ שאינו תמונה → 415, גם אם הוא מתחזה ל-PNG', async () => {
    const { manager, family } = await setup();
    const c = await createCelebration(manager, [family.id]);
    const res = await api()
      .put(`/api/celebrations/${c.id}/image`)
      .set(manager.auth)
      .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
  });

  it('קובץ גדול מ-2MB → 413, בלי קובץ → 400', async () => {
    const { manager, family } = await setup();
    const c = await createCelebration(manager, [family.id]);
    const big = Buffer.concat([TINY_PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const tooBig = await api()
      .put(`/api/celebrations/${c.id}/image`)
      .set(manager.auth)
      .attach('image', big, { filename: 'big.png', contentType: 'image/png' });
    expect(tooBig.status).toBe(413);

    const missing = await api().put(`/api/celebrations/${c.id}/image`).set(manager.auth);
    expect(missing.status).toBe(400);
  });
});
