import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api, registerUser, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('הרשמה', () => {
  it('יוצרת משתמש ומחזירה Token, בלי לחשוף את הסיסמה', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'רחל כהן', email: 'Rachel@Example.com', password: 'Passw0rd' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ fullName: 'רחל כהן', email: 'rachel@example.com', emailReminders: true });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Passw0rd/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'rachel@example.com' } });
    expect(stored.passwordHash).not.toBe('Passw0rd');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // Hash של bcrypt
  });

  it('מחזירה 409 כשהמייל כבר רשום', async () => {
    const body = { fullName: 'רחל כהן', email: 'rachel@example.com', password: 'Passw0rd' };
    await api().post('/api/auth/register').send(body).expect(201);
    const res = await api().post('/api/auth/register').send({ ...body, email: 'RACHEL@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('מחזירה 400 עם פירוט לפי שדות כשהנתונים לא תקינים', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'ר', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'password']));
  });

  it('דוחה סיסמה בלי ספרה', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'רחל כהן', email: 'r@example.com', password: 'onlyletters' });
    expect(res.status).toBe(400);
  });

  it('מחזירה 400 על JSON שבור', async () => {
    const res = await api()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"fullName": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('התחברות', () => {
  it('Login תקין מחזיר Token שעובד', async () => {
    const user = await registerUser('שרה לוי');
    const res = await api().post('/api/auth/login').send({ email: user.email, password: 'Passw0rd' });
    expect(res.status).toBe(200);
    expect(res.body.expiresIn).toBe('1h');

    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: user.id, email: user.email, fullName: 'שרה לוי' });
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('Login עם סיסמה שגויה מחזיר 401', async () => {
    const user = await registerUser();
    const res = await api().post('/api/auth/login').send({ email: user.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('Login עם מייל שלא קיים מחזיר את אותה הודעה (בלי לגלות שהמייל לא קיים)', async () => {
    const user = await registerUser();
    const wrongPassword = await api().post('/api/auth/login').send({ email: user.email, password: 'WrongPass1' });
    const noSuchUser = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'WrongPass1' });
    expect(noSuchUser.status).toBe(401);
    expect(noSuchUser.body).toEqual(wrongPassword.body);
  });
});

describe('הגנה על כתובות פרטיות', () => {
  it('בלי Token → 401', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Token לא תקין → 401', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('כותרת בלי המילה Bearer → 401', async () => {
    const user = await registerUser();
    const res = await api().get('/api/auth/me').set('Authorization', user.token);
    expect(res.status).toBe(401);
  });

  it('Token חתום במפתח אחר → 401', async () => {
    const user = await registerUser();
    const forged = jwt.sign({ sub: String(user.id) }, 'some-other-secret-that-is-also-long-enough');
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('Token שפג תוקפו → 401 TOKEN_EXPIRED', async () => {
    const user = await registerUser();
    const expired = jwt.sign(
      { sub: String(user.id), exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET as string,
    );
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('Token של משתמש שנמחק → 401', async () => {
    const user = await registerUser();
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api().get('/api/auth/me').set(user.auth);
    expect(res.status).toBe(401);
  });
});

describe('עדכון פרופיל', () => {
  it('מעדכן שם ומצב תזכורות', async () => {
    const user = await registerUser();
    const res = await api().patch('/api/auth/me').set(user.auth).send({ fullName: 'שם חדש', emailReminders: false });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fullName: 'שם חדש', emailReminders: false });
  });

  it('לא מאפשר לשנות מייל או שדות לא מוכרים', async () => {
    const user = await registerUser();
    const res = await api().patch('/api/auth/me').set(user.auth).send({ email: 'hacker@example.com' });
    expect(res.status).toBe(400);
  });

  it('גוף ריק → 400', async () => {
    const user = await registerUser();
    const res = await api().patch('/api/auth/me').set(user.auth).send({});
    expect(res.status).toBe(400);
  });
});
