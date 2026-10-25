import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api } from './helpers';

afterAll(() => prisma.$disconnect());

/** כל הכתובות שהשרת מממש - כל אחת חייבת להופיע בתיעוד */
const IMPLEMENTED: [string, string][] = [
  ['get', '/api/health'],
  ['get', '/api/celebration-types'],
  ['post', '/api/auth/register'],
  ['post', '/api/auth/login'],
  ['get', '/api/auth/me'],
  ['patch', '/api/auth/me'],
  ['get', '/api/groups'],
  ['post', '/api/groups'],
  ['post', '/api/groups/join'],
  ['get', '/api/groups/{groupId}'],
  ['patch', '/api/groups/{groupId}'],
  ['delete', '/api/groups/{groupId}'],
  ['post', '/api/groups/{groupId}/join-code'],
  ['post', '/api/groups/{groupId}/leave'],
  ['get', '/api/groups/{groupId}/members'],
  ['delete', '/api/groups/{groupId}/members/{userId}'],
  ['delete', '/api/groups/{groupId}/celebrations/{celebrationId}'],
  ['get', '/api/celebrations'],
  ['post', '/api/celebrations'],
  ['get', '/api/celebrations/today'],
  ['get', '/api/celebrations/{id}'],
  ['put', '/api/celebrations/{id}'],
  ['delete', '/api/celebrations/{id}'],
  ['put', '/api/celebrations/{id}/image'],
  ['delete', '/api/celebrations/{id}/image'],
  ['get', '/api/images/{imageKey}'],
  ['get', '/api/hebrew-calendar/today'],
  ['get', '/api/hebrew-calendar/months'],
  ['get', '/api/hebrew-calendar/convert'],
  ['post', '/api/reminders/run'],
];

describe('Swagger / OpenAPI', () => {
  it('קובץ OpenAPI 3 תקין עם Bearer JWT', async () => {
    const res = await api().get('/api-docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.components.securitySchemes.bearerAuth).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }),
    );
  });

  it.each(IMPLEMENTED)('%s %s מתועד', async (method, path) => {
    const res = await api().get('/api-docs/openapi.json');
    const operation = res.body.paths[path]?.[method];
    expect(operation, `${method.toUpperCase()} ${path} missing from OpenAPI`).toBeDefined();
    expect(operation.summary).toEqual(expect.any(String));
    expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
  });

  it('כל כתובת פרטית מסומנת כדורשת Token', async () => {
    const res = await api().get('/api-docs/openapi.json');
    const publicPaths = ['/api/health', '/api/celebration-types', '/api/auth/register', '/api/auth/login', '/api/images/{imageKey}', '/api/reminders/run'];
    for (const [path, item] of Object.entries(res.body.paths as Record<string, Record<string, { security?: unknown[] }>>)) {
      if (publicPaths.includes(path) || path.startsWith('/api/hebrew-calendar')) continue;
      for (const [method, op] of Object.entries(item)) {
        if (method === 'parameters') continue;
        expect(op.security, `${method} ${path}`).toEqual([{ bearerAuth: [] }]);
      }
    }
  });

  it('כל הפניה ($ref) מצביעה לסכמה שקיימת', async () => {
    const res = await api().get('/api-docs/openapi.json');
    const refs = JSON.stringify(res.body).match(/#\/components\/schemas\/[A-Za-z]+/g) ?? [];
    for (const ref of new Set(refs)) {
      const name = ref.split('/').pop() as string;
      expect(res.body.components.schemas[name], ref).toBeDefined();
    }
  });

  it('מסך Swagger UI נטען בכתובת /api-docs', async () => {
    const res = await api().get('/api-docs/').redirects(1);
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('GET /api/health מחזיר ok כשמסד הנתונים זמין', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('כתובת שלא קיימת → 404 במבנה השגיאה הקבוע', async () => {
    const res = await api().get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
