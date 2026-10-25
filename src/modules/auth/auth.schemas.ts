import { z } from 'zod';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('כתובת מייל לא תקינה')
  .max(254, 'כתובת המייל ארוכה מדי');

const fullName = z
  .string()
  .trim()
  .min(2, 'השם חייב להכיל לפחות 2 תווים')
  .max(60, 'השם יכול להכיל עד 60 תווים');

export const registerSchema = z
  .object({
    fullName,
    email,
    password: z
      .string()
      .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
      .max(72, 'הסיסמה יכולה להכיל עד 72 תווים')
      .regex(/[A-Za-z֐-׿]/, 'הסיסמה חייבת להכיל לפחות אות אחת')
      .regex(/\d/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'יש להזין סיסמה').max(200),
  })
  .strict();

export const updateMeSchema = z
  .object({
    fullName: fullName.optional(),
    emailReminders: z.boolean({ error: 'הערך חייב להיות true או false' }).optional(),
  })
  .strict()
  .refine((data) => data.fullName !== undefined || data.emailReminders !== undefined, {
    message: 'יש לשלוח לפחות שדה אחד לעדכון',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
