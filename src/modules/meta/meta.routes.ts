import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { CELEBRATION_TYPE_LABELS } from '../../constants/celebration-types';

export const metaRouter = Router();

/** בדיקת בריאות - האם השרת ומסד הנתונים פעילים */
metaRouter.get('/health', async (_req, res) => {
  let database: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'error';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    database,
    time: new Date().toISOString(),
  });
});

/** רשימת סוגי השמחות, לפי סדר ההצגה */
metaRouter.get('/celebration-types', (_req, res) => {
  res.json(Object.entries(CELEBRATION_TYPE_LABELS).map(([value, label]) => ({ value, label })));
});
