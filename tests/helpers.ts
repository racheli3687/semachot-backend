import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { addDaysIso, todayInIsrael } from '../src/lib/dates';

export const app = createApp();
export const api = () => request(app);

/** מחיקת כל הנתונים בין בדיקה לבדיקה */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "CelebrationImage", "CelebrationGroup", "Celebration", "GroupMember", "Group", "User" RESTART IDENTITY CASCADE',
  );
}

export interface TestUser {
  id: number;
  email: string;
  token: string;
  auth: { Authorization: string };
}

let counter = 0;

/** הרשמת משתמש חדש דרך ה-API */
export async function registerUser(fullName = 'משתמשת בדיקה'): Promise<TestUser> {
  counter++;
  const email = `user${counter}_${Date.now()}@example.com`;
  const res = await api().post('/api/auth/register').send({ fullName, email, password: 'Passw0rd' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id, email, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

export async function createGroup(user: TestUser, name = 'קבוצת בדיקה') {
  const res = await api().post('/api/groups').set(user.auth).send({ name });
  if (res.status !== 201) throw new Error(`create group failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: number; joinCode: string; name: string };
}

export async function joinGroup(user: TestUser, joinCode: string) {
  const res = await api().post('/api/groups/join').set(user.auth).send({ joinCode });
  if (res.status !== 200) throw new Error(`join failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export const today = () => todayInIsrael();
export const inDays = (days: number) => addDaysIso(todayInIsrael(), days);

export function celebrationBody(groupIds: number[], overrides: Record<string, unknown> = {}) {
  return {
    title: 'חתונה בדיקה',
    type: 'WEDDING',
    date: inDays(7),
    time: '19:30',
    venueName: 'אולמי הדר',
    address: 'רחוב הרב קוק 10, בני ברק',
    description: 'נשמח לראותכם',
    groupIds,
    ...overrides,
  };
}

export async function createCelebration(user: TestUser, groupIds: number[], overrides: Record<string, unknown> = {}) {
  const res = await api().post('/api/celebrations').set(user.auth).send(celebrationBody(groupIds, overrides));
  if (res.status !== 201) throw new Error(`create celebration failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: number; date: string; [key: string]: unknown };
}

/** תמונת PNG קטנה ותקינה (1x1) */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
