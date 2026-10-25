import { z } from 'zod';
import { idParam } from '../../validation/zod-setup';

const groupName = z
  .string()
  .trim()
  .min(2, 'שם הקבוצה חייב להכיל לפחות 2 תווים')
  .max(50, 'שם הקבוצה יכול להכיל עד 50 תווים');

export const createGroupSchema = z.object({ name: groupName }).strict();

export const renameGroupSchema = z.object({ name: groupName }).strict();

export const joinGroupSchema = z
  .object({
    joinCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{8}$/, 'קוד ההצטרפות מורכב מ-8 אותיות לועזיות וספרות'),
  })
  .strict();

export const groupParamsSchema = z.object({ groupId: idParam });

export const memberParamsSchema = z.object({ groupId: idParam, userId: idParam });

export const groupCelebrationParamsSchema = z.object({ groupId: idParam, celebrationId: idParam });
