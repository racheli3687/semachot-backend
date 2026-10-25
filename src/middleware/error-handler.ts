import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError, type ErrorDetail } from '../lib/errors';
import { zodErrorToDetails } from '../validation/zod-setup';

interface ErrorBody {
  error: { code: string; message: string; details?: ErrorDetail[] };
}

function send(res: Response, status: number, code: string, message: string, details?: ErrorDetail[]) {
  const body: ErrorBody = { error: { code, message } };
  if (details && details.length > 0) body.error.details = details;
  res.status(status).json(body);
}

/** כתובת שלא קיימת → 404 */
export function notFoundHandler(req: Request, res: Response): void {
  send(res, 404, 'NOT_FOUND', `הכתובת ${req.method} ${req.path} לא קיימת`);
}

/**
 * טיפול מרכזי בכל השגיאות. כל שגיאה מוחזרת באותו מבנה:
 * { "error": { "code": "...", "message": "...", "details": [...] } }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    send(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    send(res, 400, 'VALIDATION_ERROR', 'חלק מהנתונים שנשלחו אינם תקינים', zodErrorToDetails(err));
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      send(res, 413, 'FILE_TOO_LARGE', 'הקובץ גדול מדי. הגודל המקסימלי הוא 2MB');
      return;
    }
    send(res, 400, 'VALIDATION_ERROR', `בעיה בהעלאת הקובץ: יש לשלוח קובץ אחד בשדה image`);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      send(res, 409, 'CONFLICT', 'הערך כבר קיים במערכת');
      return;
    }
    if (err.code === 'P2025') {
      send(res, 404, 'NOT_FOUND', 'הפריט המבוקש לא נמצא');
      return;
    }
  }

  // שגיאות של קריאת גוף הבקשה (JSON שבור, גוף גדול מדי)
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed') {
      send(res, 400, 'INVALID_JSON', 'גוף הבקשה אינו JSON תקין');
      return;
    }
    if (type === 'entity.too.large') {
      send(res, 413, 'PAYLOAD_TOO_LARGE', 'גוף הבקשה גדול מדי');
      return;
    }
  }

  // eslint-disable-next-line no-console
  console.error('Unexpected error:', err);
  send(res, 500, 'INTERNAL_ERROR', 'אירעה שגיאה בשרת. נסו שוב מאוחר יותר');
}
