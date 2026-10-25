/** פרט שגיאה בשדה מסוים (לטפסים) */
export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * שגיאה "מתוכננת" שהשרת מחזיר ללקוח עם קוד HTTP מתאים.
 * כל שגיאה אחרת נחשבת לשגיאת שרת (500).
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthorized = (message = 'נדרשת התחברות', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);

export const forbidden = (message = 'אין לך הרשאה לבצע פעולה זו') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'הפריט המבוקש לא נמצא') => new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
