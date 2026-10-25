# אפיון: לוח שמחות קבוצתי

גרסה 1.1 · אושרה

> הפירוט המלא של כל כתובת (בקשות, תשובות, דוגמאות) נמצא ב־[FRONTEND-API-GUIDE.md](../FRONTEND-API-GUIDE.md) וב־Swagger (`/api-docs`).

## א. תיאור הפרויקט

**מטרה:** מקום אחד שבו משפחות וקבוצות חברים משתפות את השמחות שלהן. כל חבר מעלה הזמנה לשמחה, כולם רואים לוח מסודר של השמחות הקרובות, וביום השמחה נשלחת תזכורת במייל לכל חברי הקבוצה.

**קהל יעד:** משפחות מורחבות, קבוצות חברות, שכנים וקהילות קטנות.

**משתמשים:** כל משתמש רשום יכול לפתוח קבוצות ולהצטרף לקבוצות בעזרת קוד. בכל קבוצה שני תפקידים - **מנהל קבוצה** (מי שפתח אותה) ו**חבר קבוצה**. אותו אדם יכול להיות מנהל בקבוצה אחת וחבר בקבוצה אחרת.

## ב. מסכים

| # | מסך | תוכן ופעולות |
|---|---|---|
| 1 | התחברות | מייל וסיסמה |
| 2 | הרשמה | שם מלא, מייל, סיסמה |
| 3 | הלוח שלי | שמחות היום + רשימת השמחות מכל הקבוצות, חיפוש, סינון (קבוצה, סוג, זמן, חודש עברי), מיון |
| 4 | פרטי שמחה | כל הפרטים, תמונה, קבוצות. בעלים: עריכה, מחיקה, תמונה. מנהל: הסרה מהקבוצה שלו |
| 5 | הוספה / עריכה | טופס עם תאריך עברי או לועזי, תמונה ובחירת קבוצות |
| 6 | הקבוצות שלי | רשימה, פתיחת קבוצה, הצטרפות בקוד |
| 7 | דף קבוצה | שמחות, חברים (כולל מייל). מנהל: שם, קוד חדש, הסרת חבר, הסרת שמחה, מחיקה |
| 8 | הגדרות פרופיל | שם, הדלקה / כיבוי של תזכורות |

## ג. הרשאות

| פעולה | חבר קבוצה | מנהל קבוצה |
|---|---|---|
| צפייה בשמחות הקבוצה | ✅ | ✅ |
| צפייה ברשימת החברים (כולל כתובות מייל) | ✅ | ✅ |
| שיתוף שמחה משלו בקבוצה | ✅ | ✅ |
| יציאה מהקבוצה | ✅ | ✅ |
| צפייה בקוד ההצטרפות | ❌ | ✅ |
| שינוי שם הקבוצה / יצירת קוד חדש | ❌ | ✅ |
| הסרת חבר מהקבוצה | ❌ | ✅ |
| הסרת שמחה של אחר מהקבוצה שלו | ❌ | ✅ |
| מחיקת הקבוצה | ❌ | ✅ |

| פעולה על שמחה | בעל השמחה | מנהל קבוצה שבה היא מופיעה | חבר רגיל |
|---|---|---|---|
| צפייה | ✅ | ✅ | ✅ |
| עריכה, בחירת קבוצות, תמונה, מחיקה | ✅ | ❌ | ❌ |
| הסרה מקבוצה מסוימת | ✅ | ✅ (רק מהקבוצה שלו) | ❌ |

**כללים נוספים:**
- משתפים שמחה רק בקבוצות שהמשתמש חבר בהן, ולפחות באחת.
- מי שיוצא מקבוצה (או מוסר ממנה) - השמחות שלו מוסרות ממנה.
- שמחה שלא נשארה באף קבוצה גלויה רק לבעליה.
- אם המנהל היחיד יוצא - החבר הוותיק ביותר הופך למנהל. אם לא נשארו חברים - הקבוצה נמחקת.
- מי שאינו חבר בקבוצה לא רואה דבר עליה (404).
- המשתמש מזוהה תמיד לפי ה־Token.

## ד. מסד הנתונים

```
User ──< GroupMember >── Group
 │                         │
 └──< Celebration >── CelebrationGroup ──┘
          │
          └── CelebrationImage (0 או 1)
```

| טבלה | מטרה | שדות עיקריים | מפתחות ואילוצים |
|---|---|---|---|
| **User** | משתמשים | fullName (2-60), email, passwordHash, emailReminders | PK id · email ייחודי |
| **Group** | קבוצות | name (2-50), joinCode (8 תווים), createdById | PK id · joinCode ייחודי · FK createdById → User |
| **GroupMember** | חברות בקבוצה | role (MANAGER / MEMBER), joinedAt | PK (userId, groupId) · FK → User, Group (Cascade) |
| **Celebration** | שמחות | title, type, eventDate, eventTime, hebrewDay/Month/Year, venueName, address?, description?, reminderSentAt? | PK id · FK ownerId → User · CHECK על השעה והיום העברי · אינדקסים על תאריך, חודש עברי, סוג, בעלים |
| **CelebrationGroup** | שיתוף שמחה בקבוצות | sharedAt | PK (celebrationId, groupId) · FK → Celebration, Group (Cascade) |
| **CelebrationImage** | תמונת ההזמנה | imageKey (אקראי), mimeType, sizeBytes, data | PK + FK celebrationId · imageKey ייחודי · CHECK עד 2MB |

**סוגי שמחה:** ENGAGEMENT, WEDDING, SHEVA_BRACHOT, BRIT_MILAH, PIDYON_HABEN, KIDDUSH, UPSHERIN, BAR_MITZVAH, BAT_MITZVAH, SIYUM, CHANUKAT_BAYIT, OTHER

**חודשים עבריים:** TISHREI, CHESHVAN, KISLEV, TEVET, SHEVAT, ADAR (שנה רגילה), ADAR_I, ADAR_II (שנה מעוברת), NISAN, IYAR, SIVAN, TAMMUZ, AV, ELUL

**אילוצי תקינות:** תאריך עברי קיים בלבד · עד 5 שנים קדימה (מותר תאריך שעבר) · תמונה JPG / PNG / WEBP עד 2MB, לפי תוכן הקובץ.

## ה. Endpoints

| Method | URL | הרשאה |
|---|---|---|
| GET | `/api/health` | פתוח |
| GET | `/api/celebration-types` | פתוח |
| POST | `/api/auth/register` | פתוח |
| POST | `/api/auth/login` | פתוח |
| GET / PATCH | `/api/auth/me` | מחובר |
| GET / POST | `/api/groups` | מחובר |
| POST | `/api/groups/join` | מחובר |
| GET | `/api/groups/{groupId}` | חבר |
| PATCH / DELETE | `/api/groups/{groupId}` | מנהל |
| POST | `/api/groups/{groupId}/join-code` | מנהל |
| POST | `/api/groups/{groupId}/leave` | חבר |
| GET | `/api/groups/{groupId}/members` | חבר |
| DELETE | `/api/groups/{groupId}/members/{userId}` | מנהל |
| DELETE | `/api/groups/{groupId}/celebrations/{celebrationId}` | מנהל או בעל השמחה |
| GET / POST | `/api/celebrations` | מחובר |
| GET | `/api/celebrations/today` | מחובר |
| GET | `/api/celebrations/{id}` | צופה מורשה |
| PUT / DELETE | `/api/celebrations/{id}` | בעל השמחה |
| PUT / DELETE | `/api/celebrations/{id}/image` | בעל השמחה |
| GET | `/api/images/{imageKey}` | פתוח (מזהה אקראי) |
| GET | `/api/hebrew-calendar/today` · `/months` · `/convert` | פתוח |
| POST | `/api/reminders/run` | כותרת X-Cron-Secret |

## ו. התאמה לדרישות החובה

| דרישה | מימוש |
|---|---|
| התחברות | הרשמה, התחברות, `/api/auth/me`, JWT |
| שני סוגי משתמשים | מנהל קבוצה מול חבר קבוצה |
| אובייקט מרכזי עם 5+ שדות | שמחה: כותרת, סוג, תאריך עברי ולועזי, שעה, מקום, כתובת, תיאור, תמונה, קבוצות |
| רשימה, הוספה, עריכה | `GET` / `POST` / `PUT /api/celebrations` |
| שדה בחירה | סוג שמחה (12), תפקיד בקבוצה |
| חיפוש, סינון, מיון | חיפוש חופשי, קבוצה, סוג, זמן, חודש עברי, 3 סוגי מיון |
| מסד נתונים אמיתי | PostgreSQL + Prisma + Migrations + Seed |

## שינויים מהגרסה הראשונה
- כתובות המייל של חברי הקבוצה גלויות לכל חברי הקבוצה.
- תשובת התזכורות כוללת גם `emailsFailed`.
