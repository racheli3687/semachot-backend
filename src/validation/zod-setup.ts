import { z, ZodError, type ZodType } from 'zod';

/**
 * הודעות שגיאה ברירת מחדל בעברית לכל הסכמות.
 * הודעות ספציפיות מוגדרות בתוך כל סכמה, והן גוברות על אלה.
 */
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.input === undefined) return 'שדה חובה';
        return 'ערך מסוג לא תקין';
      case 'invalid_value':
        return `ערך לא תקין. ערכים אפשריים: ${issue.values.map(String).join(', ')}`;
      case 'unrecognized_keys':
        return `שדות לא מוכרים: ${issue.keys.join(', ')}`;
      case 'invalid_format':
        return 'פורמט לא תקין';
      case 'too_small':
        if (issue.origin === 'string') return `לפחות ${String(issue.minimum)} תווים`;
        if (issue.origin === 'array') return `יש לבחור לפחות ${String(issue.minimum)}`;
        return `הערך המינימלי הוא ${String(issue.minimum)}`;
      case 'too_big':
        if (issue.origin === 'string') return `לכל היותר ${String(issue.maximum)} תווים`;
        if (issue.origin === 'array') return `לכל היותר ${String(issue.maximum)} פריטים`;
        return `הערך המקסימלי הוא ${String(issue.maximum)}`;
      default:
        return undefined; // הודעת ברירת המחדל של Zod
    }
  },
});

/** בדיקת קלט מול סכמה. אם הקלט לא תקין נזרקת ZodError, והשרת מחזיר 400 עם פירוט לפי שדות */
export function parse<T extends ZodType>(schema: T, input: unknown): z.output<T> {
  return schema.parse(input);
}

export function zodErrorToDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.map(String).join('.') || '(body)',
    message: issue.message,
  }));
}

/** מספר מזהה בכתובת (למשל /groups/5) */
export const idParam = z.coerce
  .number({ error: 'מזהה לא תקין' })
  .int('מזהה לא תקין')
  .positive('מזהה לא תקין');
