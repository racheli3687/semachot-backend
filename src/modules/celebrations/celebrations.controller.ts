import type { Request, Response } from 'express';
import { getAuthUser } from '../../auth/auth-user';
import { env } from '../../config/env';
import { parse } from '../../validation/zod-setup';
import {
  celebrationInputSchema,
  celebrationParamsSchema,
  imageKeyParamsSchema,
  listQuerySchema,
} from './celebrations.schemas';
import * as service from './celebrations.service';

/** הכתובת הבסיסית של השרת - לבניית קישורים מלאים לתמונות */
function baseUrl(req: Request): string {
  return env.PUBLIC_BASE_URL?.replace(/\/$/, '') ?? `${req.protocol}://${req.get('host') ?? 'localhost'}`;
}

export async function list(req: Request, res: Response) {
  const query = parse(listQuerySchema, req.query);
  res.json(await service.listCelebrations(getAuthUser(req).id, query, baseUrl(req)));
}

export async function listToday(req: Request, res: Response) {
  res.json(await service.listToday(getAuthUser(req).id, baseUrl(req)));
}

export async function getOne(req: Request, res: Response) {
  const { id } = parse(celebrationParamsSchema, req.params);
  res.json(await service.getCelebration(getAuthUser(req).id, id, baseUrl(req)));
}

export async function create(req: Request, res: Response) {
  const input = parse(celebrationInputSchema, req.body);
  res.status(201).json(await service.createCelebration(getAuthUser(req).id, input, baseUrl(req)));
}

export async function update(req: Request, res: Response) {
  const { id } = parse(celebrationParamsSchema, req.params);
  const input = parse(celebrationInputSchema, req.body);
  res.json(await service.updateCelebration(getAuthUser(req).id, id, input, baseUrl(req)));
}

export async function remove(req: Request, res: Response) {
  const { id } = parse(celebrationParamsSchema, req.params);
  await service.deleteCelebration(getAuthUser(req).id, id);
  res.status(204).end();
}

export async function setImage(req: Request, res: Response) {
  const { id } = parse(celebrationParamsSchema, req.params);
  res.json(await service.setImage(getAuthUser(req).id, id, req.file, baseUrl(req)));
}

export async function removeImage(req: Request, res: Response) {
  const { id } = parse(celebrationParamsSchema, req.params);
  await service.removeImage(getAuthUser(req).id, id);
  res.status(204).end();
}

/** הצגת תמונה לפי המזהה האקראי שלה - בלי Token, כדי שאפשר יהיה להציג אותה בתגית img */
export async function getImage(req: Request, res: Response) {
  const { imageKey } = parse(imageKeyParamsSchema, req.params);
  const image = await service.getImageByKey(imageKey);
  res.setHeader('Content-Type', image.mimeType);
  // התמונה לא משתנה לעולם תחת אותו מזהה (בהחלפה נוצר מזהה חדש) - אפשר לשמור במטמון
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  // מאפשר להציג את התמונה באתר ה-React גם כשהוא בכתובת אחרת
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send(Buffer.from(image.data));
}
