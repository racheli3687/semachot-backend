import { CELEBRATION_TYPE_LABELS, CELEBRATION_TYPES } from '../constants/celebration-types';
import { HEBREW_MONTHS } from '../lib/hebrew-calendar';

/**
 * תיעוד ה-API בפורמט OpenAPI 3.0.
 * מוצג ב-Swagger UI בכתובת /api-docs, וזמין כקובץ JSON בכתובת /api-docs/openapi.json.
 * (עותק סטטי נשמר גם ב-docs/openapi.json - נוצר בפקודה npm run openapi:export)
 */

type Json = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: Json, example?: unknown) => ({
  'application/json': { schema, ...(example !== undefined ? { example } : {}) },
});

const errorExample = (code: string, message: string, details?: { field: string; message: string }[]) => ({
  error: { code, message, ...(details ? { details } : {}) },
});

const err = (description: string, code: string, message: string) => ({
  description,
  content: json(ref('Error'), errorExample(code, message)),
});

const E400 = {
  description: 'הנתונים שנשלחו אינם תקינים',
  content: json(
    ref('Error'),
    errorExample('VALIDATION_ERROR', 'חלק מהנתונים שנשלחו אינם תקינים', [
      { field: 'title', message: 'הכותרת חייבת להכיל לפחות 2 תווים' },
    ]),
  ),
};
const E401 = err('לא נשלח Token, או שה-Token לא תקין / פג תוקפו', 'UNAUTHORIZED', 'נדרשת התחברות. יש לשלוח Token בכותרת Authorization');
const E403 = err('אין הרשאה לבצע את הפעולה', 'FORBIDDEN', 'רק מנהל/ת הקבוצה יכול/ה לבצע פעולה זו');
const E404 = err('לא נמצא, או שאין לך גישה אליו', 'NOT_FOUND', 'הפריט המבוקש לא נמצא');
const E204 = { description: 'הפעולה הצליחה (אין תוכן בתשובה)' };

const secured = [{ bearerAuth: [] }];

const idPath = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
});

// ---------- דוגמאות ----------

const userExample = {
  id: 1,
  fullName: 'רחל כהן',
  email: 'rachel@example.com',
  emailReminders: true,
  createdAt: '2026-10-23T08:00:00.000Z',
};

const celebrationExample = {
  id: 14,
  title: 'בר המצווה של יוסי',
  type: 'BAR_MITZVAH',
  typeLabel: 'בר מצווה',
  date: '2026-10-26',
  time: '19:30',
  hebrewDate: { day: 15, month: 'CHESHVAN', year: 5787, text: 'ט״ו בחשוון תשפ״ז' },
  venueName: 'אולמי הדר',
  address: 'רחוב הרב קוק 10, בני ברק',
  description: 'נשמח לראותכם',
  imageUrl: 'https://my-api.onrender.com/api/images/q3ZbK1x8vYw0n7Lr5TfGh2Pc9AeJ4mUd',
  owner: { id: 2, fullName: 'שרה לוי' },
  groups: [{ id: 3, name: 'משפחת כהן' }],
  isToday: false,
  permissions: { canEdit: false, canRemoveFromGroupIds: [3] },
  createdAt: '2026-10-23T08:00:00.000Z',
  updatedAt: '2026-10-23T08:00:00.000Z',
};

const celebrationInputExample = {
  title: 'בר המצווה של יוסי',
  type: 'BAR_MITZVAH',
  hebrewDate: { day: 15, month: 'CHESHVAN', year: 5787 },
  time: '19:30',
  venueName: 'אולמי הדר',
  address: 'רחוב הרב קוק 10, בני ברק',
  description: 'נשמח לראותכם',
  groupIds: [1],
};

const groupExample = {
  id: 3,
  name: 'משפחת כהן',
  myRole: 'MANAGER',
  memberCount: 12,
  createdAt: '2026-10-23T08:00:00.000Z',
  joinCode: 'K7M2QX9P',
};

// ---------- סכמות ----------

const schemas: Json = {
  Error: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'חלק מהנתונים שנשלחו אינם תקינים' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      fullName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      emailReminders: { type: 'boolean', description: 'האם לשלוח תזכורות במייל' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    example: userExample,
  },
  AuthResponse: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'JWT - יש לשלוח בכותרת Authorization: Bearer <token>' },
      expiresIn: { type: 'string', example: '1d' },
      user: ref('User'),
    },
  },
  RegisterInput: {
    type: 'object',
    required: ['fullName', 'email', 'password'],
    properties: {
      fullName: { type: 'string', minLength: 2, maxLength: 60 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8, maxLength: 72, description: 'לפחות 8 תווים, אות אחת וספרה אחת' },
    },
    example: { fullName: 'רחל כהן', email: 'rachel@example.com', password: 'Aa123456' },
  },
  LoginInput: {
    type: 'object',
    required: ['email', 'password'],
    properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
    example: { email: 'manager@example.com', password: 'Demo1234' },
  },
  UpdateMeInput: {
    type: 'object',
    description: 'כל השדות אופציונליים, אבל יש לשלוח לפחות אחד',
    properties: {
      fullName: { type: 'string', minLength: 2, maxLength: 60 },
      emailReminders: { type: 'boolean' },
    },
    example: { fullName: 'רחל לוי', emailReminders: false },
  },
  GroupRole: { type: 'string', enum: ['MANAGER', 'MEMBER'] },
  Group: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      myRole: ref('GroupRole'),
      memberCount: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
      joinCode: { type: 'string', description: 'מוחזר רק למנהל/ת הקבוצה', example: 'K7M2QX9P' },
    },
    example: groupExample,
  },
  GroupNameInput: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string', minLength: 2, maxLength: 50 } },
    example: { name: 'משפחת כהן' },
  },
  JoinGroupInput: {
    type: 'object',
    required: ['joinCode'],
    properties: { joinCode: { type: 'string', pattern: '^[A-Za-z0-9]{8}$', description: 'לא משנה אם באותיות גדולות או קטנות' } },
    example: { joinCode: 'K7M2QX9P' },
  },
  Member: {
    type: 'object',
    properties: {
      userId: { type: 'integer' },
      fullName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: ref('GroupRole'),
      joinedAt: { type: 'string', format: 'date-time' },
    },
    example: { userId: 1, fullName: 'רחל כהן', email: 'rachel@example.com', role: 'MANAGER', joinedAt: '2026-10-23T08:00:00.000Z' },
  },
  LeaveResult: {
    type: 'object',
    properties: {
      left: { type: 'boolean' },
      groupDeleted: { type: 'boolean', description: 'true אם לא נשארו חברים והקבוצה נמחקה' },
      newManagerId: { type: 'integer', nullable: true, description: 'אם המנהל היחיד יצא - מי הפך למנהל' },
    },
    example: { left: true, groupDeleted: false, newManagerId: 7 },
  },
  CelebrationType: {
    type: 'string',
    enum: CELEBRATION_TYPES,
    description: Object.entries(CELEBRATION_TYPE_LABELS)
      .map(([value, label]) => `${value} = ${label}`)
      .join(' · '),
  },
  HebrewMonth: {
    type: 'string',
    enum: [...HEBREW_MONTHS],
    description: 'ADAR בשנה רגילה. ADAR_I ו-ADAR_II בשנה מעוברת',
  },
  HebrewDateInput: {
    type: 'object',
    required: ['day', 'month', 'year'],
    properties: {
      day: { type: 'integer', minimum: 1, maximum: 30 },
      month: ref('HebrewMonth'),
      year: { type: 'integer', example: 5787 },
    },
    example: { day: 15, month: 'CHESHVAN', year: 5787 },
  },
  HebrewDate: {
    type: 'object',
    properties: {
      day: { type: 'integer' },
      month: ref('HebrewMonth'),
      year: { type: 'integer' },
      text: { type: 'string', example: 'ט״ו בחשוון תשפ״ז' },
    },
  },
  Celebration: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      type: ref('CelebrationType'),
      typeLabel: { type: 'string', description: 'שם הסוג בעברית' },
      date: { type: 'string', format: 'date', description: 'תאריך לועזי YYYY-MM-DD' },
      time: { type: 'string', example: '19:30' },
      hebrewDate: ref('HebrewDate'),
      venueName: { type: 'string' },
      address: { type: 'string', nullable: true },
      description: { type: 'string', nullable: true },
      imageUrl: { type: 'string', nullable: true, description: 'כתובת מלאה לתמונה, או null' },
      owner: { type: 'object', properties: { id: { type: 'integer' }, fullName: { type: 'string' } } },
      groups: {
        type: 'array',
        description: 'הקבוצות שבהן השמחה מופיעה - רק כאלה שגם הצופה חבר בהן',
        items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
      },
      isToday: { type: 'boolean' },
      permissions: {
        type: 'object',
        description: 'עוזר להחליט אילו כפתורים להציג. השרת בודק הרשאות בכל מקרה',
        properties: {
          canEdit: { type: 'boolean', description: 'עריכה, מחיקה ותמונה - רק לבעל/ת השמחה' },
          canRemoveFromGroupIds: { type: 'array', items: { type: 'integer' } },
        },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    example: celebrationExample,
  },
  CelebrationInput: {
    type: 'object',
    description: 'יש לשלוח date (לועזי) או hebrewDate (עברי) - אחד מהם בלבד',
    required: ['title', 'type', 'time', 'venueName', 'groupIds'],
    properties: {
      title: { type: 'string', minLength: 2, maxLength: 100 },
      type: ref('CelebrationType'),
      date: { type: 'string', format: 'date', example: '2026-10-26' },
      hebrewDate: ref('HebrewDateInput'),
      time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '19:30' },
      venueName: { type: 'string', minLength: 2, maxLength: 100 },
      address: { type: 'string', maxLength: 200, nullable: true },
      description: { type: 'string', maxLength: 1000, nullable: true },
      groupIds: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'integer' }, description: 'רק קבוצות שאת/ה חבר/ה בהן' },
    },
    example: celebrationInputExample,
  },
  CelebrationList: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('Celebration') },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
    },
  },
  ConvertResult: {
    type: 'object',
    properties: { date: { type: 'string', format: 'date' }, hebrewDate: ref('HebrewDate') },
    example: { date: '2026-10-26', hebrewDate: { day: 15, month: 'CHESHVAN', year: 5787, text: 'ט״ו בחשוון תשפ״ז' } },
  },
  MonthsResult: {
    type: 'object',
    properties: {
      year: { type: 'integer' },
      yearText: { type: 'string' },
      isLeapYear: { type: 'boolean' },
      months: {
        type: 'array',
        items: {
          type: 'object',
          properties: { month: ref('HebrewMonth'), name: { type: 'string' }, days: { type: 'integer' } },
        },
      },
    },
    example: {
      year: 5787,
      yearText: 'תשפ״ז',
      isLeapYear: true,
      months: [
        { month: 'TISHREI', name: 'תשרי', days: 30 },
        { month: 'CHESHVAN', name: 'חשוון', days: 30 },
      ],
    },
  },
  ReminderRunResult: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date' },
      celebrations: { type: 'integer', description: 'שמחות של היום שעוד לא קיבלו תזכורת' },
      emailsSent: { type: 'integer' },
      emailsFailed: { type: 'integer' },
      emailEnabled: { type: 'boolean', description: 'false אם שירות המייל לא הוגדר' },
    },
    example: { date: '2026-10-26', celebrations: 2, emailsSent: 31, emailsFailed: 0, emailEnabled: true },
  },
};

// ---------- נתיבים ----------

const listParams = [
  { name: 'groupId', in: 'query', schema: { type: 'integer' }, description: 'רק שמחות של קבוצה מסוימת (חייבת להיות שלך)' },
  { name: 'type', in: 'query', schema: ref('CelebrationType'), description: 'סוג שמחה' },
  { name: 'when', in: 'query', schema: { type: 'string', enum: ['upcoming', 'past', 'all'], default: 'upcoming' }, description: 'upcoming = מהיום והלאה' },
  { name: 'hebrewYear', in: 'query', schema: { type: 'integer', example: 5787 }, description: 'שנה עברית' },
  { name: 'hebrewMonth', in: 'query', schema: ref('HebrewMonth'), description: 'חודש עברי (דורש גם hebrewYear)' },
  { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'חיפוש בכותרת, במקום ובשם מי שהעלה' },
  { name: 'mine', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'true = רק שמחות שאני העליתי' },
  { name: 'sort', in: 'query', schema: { type: 'string', enum: ['date_asc', 'date_desc', 'created_desc'] }, description: 'ברירת מחדל: date_asc (וב-past: date_desc)' },
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
];

const paths: Json = {
  '/api/health': {
    get: {
      tags: ['כללי'],
      summary: 'בדיקת בריאות השרת ומסד הנתונים',
      responses: {
        200: { description: 'השרת ומסד הנתונים פעילים', content: json({ type: 'object' }, { status: 'ok', database: 'ok', time: '2026-10-23T08:00:00.000Z' }) },
        503: { description: 'אין חיבור למסד הנתונים', content: json({ type: 'object' }, { status: 'degraded', database: 'error', time: '2026-10-23T08:00:00.000Z' }) },
      },
    },
  },
  '/api/celebration-types': {
    get: {
      tags: ['כללי'],
      summary: 'רשימת סוגי השמחות עם השם בעברית',
      responses: {
        200: {
          description: 'רשימת הסוגים לפי סדר ההצגה',
          content: json(
            { type: 'array', items: { type: 'object', properties: { value: ref('CelebrationType'), label: { type: 'string' } } } },
            Object.entries(CELEBRATION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
          ),
        },
      },
    },
  },

  // ----- אימות -----
  '/api/auth/register': {
    post: {
      tags: ['התחברות'],
      summary: 'הרשמה - יוצרת חשבון ומחזירה Token (נכנסים מיד)',
      requestBody: { required: true, content: json(ref('RegisterInput')) },
      responses: {
        201: { description: 'החשבון נוצר', content: json(ref('AuthResponse')) },
        400: E400,
        409: err('כתובת המייל כבר רשומה', 'CONFLICT', 'כתובת המייל כבר רשומה במערכת'),
        429: err('יותר מדי ניסיונות', 'TOO_MANY_REQUESTS', 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות'),
      },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['התחברות'],
      summary: 'התחברות - מחזירה JWT',
      description:
        'אחרי ההתחברות: העתיקו את ה-token מהתשובה, לחצו על הכפתור Authorize למעלה, הדביקו אותו ולחצו Authorize. מעכשיו כל הקריאות יישלחו עם ה-Token.',
      requestBody: { required: true, content: json(ref('LoginInput')) },
      responses: {
        200: { description: 'התחברות הצליחה', content: json(ref('AuthResponse')) },
        400: E400,
        401: err('מייל או סיסמה שגויים', 'INVALID_CREDENTIALS', 'המייל או הסיסמה שגויים'),
        429: err('יותר מדי ניסיונות', 'TOO_MANY_REQUESTS', 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות'),
      },
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['התחברות'],
      summary: 'פרטי המשתמש המחובר',
      security: secured,
      responses: { 200: { description: 'פרטי המשתמש', content: json(ref('User')) }, 401: E401 },
    },
    patch: {
      tags: ['התחברות'],
      summary: 'עדכון שם ומצב התזכורות',
      security: secured,
      requestBody: { required: true, content: json(ref('UpdateMeInput')) },
      responses: { 200: { description: 'הפרטים עודכנו', content: json(ref('User')) }, 400: E400, 401: E401 },
    },
  },

  // ----- קבוצות -----
  '/api/groups': {
    get: {
      tags: ['קבוצות'],
      summary: 'הקבוצות שלי',
      security: secured,
      responses: { 200: { description: 'רשימת הקבוצות', content: json({ type: 'array', items: ref('Group') }) }, 401: E401 },
    },
    post: {
      tags: ['קבוצות'],
      summary: 'פתיחת קבוצה חדשה (הפותח/ת הופך/ת למנהל/ת)',
      security: secured,
      requestBody: { required: true, content: json(ref('GroupNameInput')) },
      responses: { 201: { description: 'הקבוצה נוצרה, כולל קוד הצטרפות', content: json(ref('Group')) }, 400: E400, 401: E401 },
    },
  },
  '/api/groups/join': {
    post: {
      tags: ['קבוצות'],
      summary: 'הצטרפות לקבוצה בעזרת קוד',
      security: secured,
      requestBody: { required: true, content: json(ref('JoinGroupInput')) },
      responses: {
        200: { description: 'הצטרפת לקבוצה', content: json(ref('Group')) },
        400: E400,
        401: E401,
        404: err('הקוד לא נמצא', 'NOT_FOUND', 'קוד ההצטרפות לא נמצא. בדקו שהקוד הוקלד נכון'),
        409: err('כבר חבר/ה בקבוצה', 'CONFLICT', 'את/ה כבר חבר/ה בקבוצה הזו'),
      },
    },
  },
  '/api/groups/{groupId}': {
    parameters: [idPath('groupId', 'מזהה הקבוצה')],
    get: {
      tags: ['קבוצות'],
      summary: 'פרטי קבוצה (לחברי הקבוצה בלבד)',
      security: secured,
      responses: { 200: { description: 'פרטי הקבוצה', content: json(ref('Group')) }, 401: E401, 404: E404 },
    },
    patch: {
      tags: ['קבוצות'],
      summary: 'שינוי שם הקבוצה (מנהל/ת בלבד)',
      security: secured,
      requestBody: { required: true, content: json(ref('GroupNameInput')) },
      responses: { 200: { description: 'השם עודכן', content: json(ref('Group')) }, 400: E400, 401: E401, 403: E403, 404: E404 },
    },
    delete: {
      tags: ['קבוצות'],
      summary: 'מחיקת הקבוצה (מנהל/ת בלבד). השמחות עצמן נשארות אצל בעליהן',
      security: secured,
      responses: { 204: E204, 401: E401, 403: E403, 404: E404 },
    },
  },
  '/api/groups/{groupId}/join-code': {
    parameters: [idPath('groupId', 'מזהה הקבוצה')],
    post: {
      tags: ['קבוצות'],
      summary: 'יצירת קוד הצטרפות חדש - הקוד הישן מפסיק לעבוד (מנהל/ת בלבד)',
      security: secured,
      responses: {
        200: { description: 'הקוד החדש', content: json({ type: 'object', properties: { joinCode: { type: 'string' } } }, { joinCode: 'P4WN8R2T' }) },
        401: E401,
        403: E403,
        404: E404,
      },
    },
  },
  '/api/groups/{groupId}/leave': {
    parameters: [idPath('groupId', 'מזהה הקבוצה')],
    post: {
      tags: ['קבוצות'],
      summary: 'יציאה מהקבוצה. השמחות שלך מוסרות ממנה',
      description: 'אם המנהל/ת היחיד/ה יוצא/ת - החבר/ה הוותיק/ה ביותר הופך/ת למנהל/ת. אם לא נשארו חברים - הקבוצה נמחקת.',
      security: secured,
      responses: { 200: { description: 'יצאת מהקבוצה', content: json(ref('LeaveResult')) }, 401: E401, 404: E404 },
    },
  },
  '/api/groups/{groupId}/members': {
    parameters: [idPath('groupId', 'מזהה הקבוצה')],
    get: {
      tags: ['קבוצות'],
      summary: 'רשימת חברי הקבוצה (כולל מייל) - לחברי הקבוצה בלבד',
      security: secured,
      responses: { 200: { description: 'רשימת החברים', content: json({ type: 'array', items: ref('Member') }) }, 401: E401, 404: E404 },
    },
  },
  '/api/groups/{groupId}/members/{userId}': {
    parameters: [idPath('groupId', 'מזהה הקבוצה'), idPath('userId', 'מזהה החבר/ה להסרה')],
    delete: {
      tags: ['קבוצות'],
      summary: 'הסרת חבר/ה מהקבוצה (מנהל/ת בלבד). השמחות שלו/ה מוסרות מהקבוצה',
      security: secured,
      responses: { 204: E204, 400: E400, 401: E401, 403: E403, 404: E404 },
    },
  },
  '/api/groups/{groupId}/celebrations/{celebrationId}': {
    parameters: [idPath('groupId', 'מזהה הקבוצה'), idPath('celebrationId', 'מזהה השמחה')],
    delete: {
      tags: ['קבוצות'],
      summary: 'הסרת שמחה מהקבוצה (מנהל/ת הקבוצה או בעל/ת השמחה). השמחה עצמה לא נמחקת',
      security: secured,
      responses: { 204: E204, 401: E401, 403: E403, 404: E404 },
    },
  },

  // ----- שמחות -----
  '/api/celebrations': {
    get: {
      tags: ['שמחות'],
      summary: 'רשימת שמחות - חיפוש, סינון, מיון ועמודים',
      description: 'מחזירה רק שמחות שמותר לך לראות: שמחות שהעלית, ושמחות מהקבוצות שאת/ה חבר/ה בהן.',
      security: secured,
      parameters: listParams,
      responses: { 200: { description: 'עמוד של שמחות', content: json(ref('CelebrationList')) }, 400: E400, 401: E401, 404: E404 },
    },
    post: {
      tags: ['שמחות'],
      summary: 'הוספת שמחה',
      security: secured,
      requestBody: { required: true, content: json(ref('CelebrationInput')) },
      responses: { 201: { description: 'השמחה נוספה', content: json(ref('Celebration')) }, 400: E400, 401: E401, 403: E403 },
    },
  },
  '/api/celebrations/today': {
    get: {
      tags: ['שמחות'],
      summary: 'השמחות של היום (לפי שעון ישראל) מכל הקבוצות שלי',
      security: secured,
      responses: { 200: { description: 'רשימת השמחות של היום', content: json({ type: 'array', items: ref('Celebration') }) }, 401: E401 },
    },
  },
  '/api/celebrations/{id}': {
    parameters: [idPath('id', 'מזהה השמחה')],
    get: {
      tags: ['שמחות'],
      summary: 'פרטי שמחה',
      security: secured,
      responses: { 200: { description: 'פרטי השמחה', content: json(ref('Celebration')) }, 401: E401, 404: E404 },
    },
    put: {
      tags: ['שמחות'],
      summary: 'עריכת שמחה, כולל בחירת הקבוצות (בעל/ת השמחה בלבד)',
      security: secured,
      requestBody: { required: true, content: json(ref('CelebrationInput')) },
      responses: { 200: { description: 'השמחה עודכנה', content: json(ref('Celebration')) }, 400: E400, 401: E401, 403: E403, 404: E404 },
    },
    delete: {
      tags: ['שמחות'],
      summary: 'מחיקת שמחה (בעל/ת השמחה בלבד)',
      security: secured,
      responses: { 204: E204, 401: E401, 403: E403, 404: E404 },
    },
  },
  '/api/celebrations/{id}/image': {
    parameters: [idPath('id', 'מזהה השמחה')],
    put: {
      tags: ['שמחות'],
      summary: 'העלאה או החלפה של תמונת ההזמנה (בעל/ת השמחה בלבד)',
      description: 'JPG, PNG או WEBP, עד 2MB. נשלח כ-multipart/form-data בשדה בשם image.',
      security: secured,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { type: 'object', required: ['image'], properties: { image: { type: 'string', format: 'binary' } } },
          },
        },
      },
      responses: {
        200: { description: 'התמונה נשמרה', content: json({ type: 'object', properties: { imageUrl: { type: 'string' } } }, { imageUrl: 'https://my-api.onrender.com/api/images/q3ZbK1x8vYw0n7Lr5TfGh2Pc9AeJ4mUd' }) },
        400: E400,
        401: E401,
        403: E403,
        404: E404,
        413: err('הקובץ גדול מדי', 'FILE_TOO_LARGE', 'הקובץ גדול מדי. הגודל המקסימלי הוא 2MB'),
        415: err('סוג קובץ לא נתמך', 'UNSUPPORTED_MEDIA_TYPE', 'אפשר להעלות רק תמונות מסוג JPG, PNG או WEBP'),
      },
    },
    delete: {
      tags: ['שמחות'],
      summary: 'הסרת התמונה (בעל/ת השמחה בלבד)',
      security: secured,
      responses: { 204: E204, 401: E401, 403: E403, 404: E404 },
    },
  },
  '/api/images/{imageKey}': {
    get: {
      tags: ['שמחות'],
      summary: 'הצגת תמונה לפי המזהה האקראי שלה (ללא Token - לשימוש בתגית img)',
      parameters: [{ name: 'imageKey', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'קובץ התמונה',
          content: {
            'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            'image/png': { schema: { type: 'string', format: 'binary' } },
            'image/webp': { schema: { type: 'string', format: 'binary' } },
          },
        },
        404: E404,
      },
    },
  },

  // ----- לוח עברי -----
  '/api/hebrew-calendar/today': {
    get: {
      tags: ['לוח עברי'],
      summary: 'התאריך של היום - עברי ולועזי',
      responses: {
        200: {
          description: 'התאריך של היום',
          content: json({ type: 'object' }, { date: '2026-10-23', hebrewDate: { day: 12, month: 'CHESHVAN', year: 5787, text: 'י״ב בחשוון תשפ״ז' }, yearText: 'תשפ״ז' }),
        },
      },
    },
  },
  '/api/hebrew-calendar/months': {
    get: {
      tags: ['לוח עברי'],
      summary: 'החודשים של שנה עברית ומספר הימים בכל חודש',
      parameters: [{ name: 'year', in: 'query', required: true, schema: { type: 'integer', example: 5787 } }],
      responses: { 200: { description: 'חודשי השנה', content: json(ref('MonthsResult')) }, 400: E400 },
    },
  },
  '/api/hebrew-calendar/convert': {
    get: {
      tags: ['לוח עברי'],
      summary: 'המרת תאריך: לועזי → עברי (date), או עברי → לועזי (day + month + year)',
      parameters: [
        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'לועזי, למשל 2026-10-26' },
        { name: 'day', in: 'query', schema: { type: 'integer' }, description: 'יום עברי, למשל 15' },
        { name: 'month', in: 'query', schema: ref('HebrewMonth') },
        { name: 'year', in: 'query', schema: { type: 'integer' }, description: 'שנה עברית, למשל 5787' },
      ],
      responses: { 200: { description: 'התאריך בשני הלוחות', content: json(ref('ConvertResult')) }, 400: E400 },
    },
  },

  // ----- תזכורות -----
  '/api/reminders/run': {
    post: {
      tags: ['תזכורות'],
      summary: 'שליחת תזכורות במייל לשמחות של היום (מופעל על ידי שעון מעורר חיצוני)',
      description: 'מוגן בכותרת X-Cron-Secret ולא ב-Token של משתמש. הפעלה כפולה באותו יום לא שולחת פעמיים.',
      security: [{ cronSecret: [] }],
      responses: {
        200: { description: 'סיכום השליחה', content: json(ref('ReminderRunResult')) },
        401: err('קוד סודי שגוי', 'INVALID_CRON_SECRET', 'קוד סודי שגוי בכותרת X-Cron-Secret'),
        503: err('התזכורות כבויות', 'REMINDERS_DISABLED', 'התזכורות כבויות: המשתנה CRON_SECRET לא הוגדר בשרת'),
      },
    },
  },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'לוח שמחות - API',
    version: '1.0.0',
    description: [
      'ה-API של לוח השמחות הקבוצתי.',
      '',
      '**איך בודקים כתובות מוגנות (🔒):**',
      '1. פתחו את `POST /api/auth/login`, לחצו **Try it out** ואז **Execute**.',
      '2. העתיקו את הערך של `token` מהתשובה.',
      '3. לחצו על הכפתור **Authorize** למעלה, הדביקו את ה-Token (בלי המילה Bearer) ולחצו **Authorize**.',
      '',
      'משתמשי הדגמה (אחרי הרצת Seed בסביבת פיתוח): `manager@example.com` / `member@example.com` / `outsider@example.com`, סיסמה: `Demo1234`.',
      '',
      'שגיאות מוחזרות תמיד במבנה `{ "error": { "code", "message", "details" } }`.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'השרת הנוכחי' }],
  tags: [
    { name: 'כללי' },
    { name: 'התחברות' },
    { name: 'קבוצות' },
    { name: 'שמחות' },
    { name: 'לוח עברי' },
    { name: 'תזכורות' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'הדביקו את ה-Token שהתקבל בהתחברות' },
      cronSecret: { type: 'apiKey', in: 'header', name: 'X-Cron-Secret', description: 'הקוד הסודי של השעון המעורר' },
    },
    schemas,
  },
  paths,
};
