# 🧭 מדריך חיבור אתר ה־React לשרת

המסמך מסביר איך אתר ה־React שלך מדבר עם השרת: לאילו כתובות לפנות, מה לשלוח, ומה חוזר.
**אין כאן קוד React** - את הקוד את כותבת בעצמך. יש כאן רק את "החוזה" בין האתר לשרת.

> 💡 כל מה שכתוב כאן אפשר לנסות בפועל ב־Swagger (`/api-docs`) לפני שכותבים קוד.

---

## 1. כתובת השרת (Base URL)

| סביבה | Base URL |
|---|---|
| פיתוח (השרת רץ אצלך במחשב) | `http://localhost:3000` |
| ענן (Render) | `https://semachot-api.onrender.com` (או הכתובת שקיבלת) |

כל הכתובות במסמך מתחילות ב־`/api`. לדוגמה, רשימת הקבוצות בענן:
`https://semachot-api.onrender.com/api/groups`

**טיפ:** שמרי את ה־Base URL במשתנה סביבה של פרויקט ה־React (למשל בקובץ `.env` של Vite: `VITE_API_URL=...`), כדי שיהיה קל לעבור בין פיתוח לענן.

**שימי לב:** השרת החינמי "נרדם" אחרי 15 דקות בלי פניות, והפנייה הראשונה אחרי זה לוקחת כדקה. כדאי להציג למשתמש מצב טעינה.

---

## 2. איך עובדת ההתחברות (Authentication)

1. המשתמש נרשם (`POST /api/auth/register`) או מתחבר (`POST /api/auth/login`).
2. השרת מחזיר **token** (מחרוזת ארוכה שמתחילה ב־`eyJ`) ואת פרטי המשתמש.
3. האתר שומר את ה־token (למשל ב־localStorage).
4. **בכל בקשה לכתובת מוגנת** שולחים את ה־token בכותרת (Header):
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   (המילה `Bearer`, רווח, ואז ה־token.)
5. תוקף ה־token הוא **יום אחד**. אחרי זה השרת מחזיר `401` עם הקוד `TOKEN_EXPIRED`, וצריך להעביר את המשתמש למסך ההתחברות.
6. **התנתקות** = פשוט למחוק את ה־token מהאתר. אין כתובת התנתקות בשרת.

כשהאתר נטען מחדש ויש token שמור - אפשר לקרוא ל־`GET /api/auth/me` כדי לוודא שהוא עדיין בתוקף ולקבל את פרטי המשתמש.

**כתובות פתוחות (בלי token):** `register`, `login`, `health`, `celebration-types`, כל כתובות `hebrew-calendar`, וכתובות התמונות `/api/images/...`. כל השאר דורשות token.

---

## 3. מבני הנתונים

### User - משתמש
```json
{
  "id": 1,
  "fullName": "רחל כהן",
  "email": "rachel@example.com",
  "emailReminders": true,
  "createdAt": "2026-10-23T08:00:00.000Z"
}
```

### Group - קבוצה
```json
{
  "id": 3,
  "name": "משפחת כהן",
  "myRole": "MANAGER",
  "memberCount": 12,
  "createdAt": "2026-10-23T08:00:00.000Z",
  "joinCode": "K7M2QX9P"
}
```
- `myRole` - התפקיד **שלך** בקבוצה: `MANAGER` (מנהל/ת) או `MEMBER` (חבר/ה).
- `joinCode` - מופיע **רק** כש־`myRole` הוא `MANAGER`.

### Member - חבר בקבוצה
```json
{ "userId": 1, "fullName": "רחל כהן", "email": "rachel@example.com", "role": "MANAGER", "joinedAt": "2026-10-23T08:00:00.000Z" }
```

### Celebration - שמחה
```json
{
  "id": 14,
  "title": "בר המצווה של יוסי",
  "type": "BAR_MITZVAH",
  "typeLabel": "בר מצווה",
  "date": "2026-10-26",
  "time": "19:30",
  "hebrewDate": { "day": 15, "month": "CHESHVAN", "year": 5787, "text": "ט״ו בחשוון תשפ״ז" },
  "venueName": "אולמי הדר",
  "address": "רחוב הרב קוק 10, בני ברק",
  "description": "נשמח לראותכם",
  "imageUrl": "https://semachot-api.onrender.com/api/images/q3ZbK1x8vYw0n7Lr5TfGh2Pc9AeJ4mUd",
  "owner": { "id": 2, "fullName": "שרה לוי" },
  "groups": [{ "id": 3, "name": "משפחת כהן" }],
  "isToday": false,
  "permissions": { "canEdit": false, "canRemoveFromGroupIds": [3] },
  "createdAt": "2026-10-23T08:00:00.000Z",
  "updatedAt": "2026-10-23T08:00:00.000Z"
}
```
| שדה | הסבר |
|---|---|
| `typeLabel` | השם בעברית - מוכן להצגה |
| `date` | תאריך לועזי בפורמט `YYYY-MM-DD` |
| `hebrewDate.text` | התאריך העברי מוכן להצגה |
| `address`, `description` | יכולים להיות `null` |
| `imageUrl` | כתובת מלאה לתמונה - אפשר לשים ישירות ב־`src` של תגית `img`. ‏`null` אם אין תמונה |
| `groups` | רק הקבוצות שגם **את** חברה בהן |
| `isToday` | `true` אם השמחה היום (לפי שעון ישראל) |
| `permissions.canEdit` | `true` רק לבעל/ת השמחה - להצגת כפתורי עריכה, מחיקה ותמונה |
| `permissions.canRemoveFromGroupIds` | מאילו קבוצות מותר לך להסיר את השמחה (למנהל/ת קבוצה או לבעל/ת השמחה) |

> השרת בודק הרשאות בכל מקרה. `permissions` רק עוזר לך להחליט אילו כפתורים להציג.

### סוגי שמחה (`type`)
| ערך | תווית |
|---|---|
| `ENGAGEMENT` | אירוסין / ווארט |
| `WEDDING` | חתונה |
| `SHEVA_BRACHOT` | שבע ברכות |
| `BRIT_MILAH` | ברית מילה |
| `PIDYON_HABEN` | פדיון הבן |
| `KIDDUSH` | קידוש / שמחת בת |
| `UPSHERIN` | חלאקה / תספורת |
| `BAR_MITZVAH` | בר מצווה |
| `BAT_MITZVAH` | בת מצווה |
| `SIYUM` | סיום מסכת |
| `CHANUKAT_BAYIT` | חנוכת בית |
| `OTHER` | אחר |

את הרשימה הזו אפשר לקבל גם מהשרת: `GET /api/celebration-types` (מתאים לבניית רשימה נפתחת).

### חודשים עבריים (`month`)
`TISHREI` תשרי · `CHESHVAN` חשוון · `KISLEV` כסלו · `TEVET` טבת · `SHEVAT` שבט · `ADAR` אדר (בשנה רגילה) · `ADAR_I` אדר א׳ ו־`ADAR_II` אדר ב׳ (בשנה מעוברת) · `NISAN` ניסן · `IYAR` אייר · `SIVAN` סיוון · `TAMMUZ` תמוז · `AV` אב · `ELUL` אלול

---

## 4. שגיאות

כל שגיאה חוזרת באותו מבנה:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "חלק מהנתונים שנשלחו אינם תקינים",
    "details": [
      { "field": "title", "message": "הכותרת חייבת להכיל לפחות 2 תווים" },
      { "field": "hebrewDate", "message": "בחודש אייר תשפ״ז יש 29 ימים" }
    ]
  }
}
```
- `message` - הודעה בעברית שאפשר להציג למשתמש.
- `details` - (רק בשגיאות ולידציה) הודעה לכל שדה בטופס. `field` הוא שם השדה ששלחת, כך שאפשר להציג את ההודעה מתחת לשדה המתאים.

| קוד HTTP | `code` | מתי | מה לעשות באתר |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` / `INVALID_JSON` | נתונים לא תקינים | להציג את ההודעות ליד השדות |
| 401 | `UNAUTHORIZED` | לא נשלח token | להעביר למסך התחברות |
| 401 | `INVALID_TOKEN` / `TOKEN_EXPIRED` | token לא תקין או פג תוקפו | למחוק את ה־token ולהעביר להתחברות |
| 401 | `INVALID_CREDENTIALS` | מייל או סיסמה שגויים בהתחברות | להציג את ההודעה בטופס ההתחברות |
| 403 | `FORBIDDEN` | אין הרשאה לפעולה | להציג הודעה (ולא להציג את הכפתור מלכתחילה) |
| 404 | `NOT_FOUND` | לא קיים, או שאין לך גישה אליו | להציג "לא נמצא" |
| 409 | `CONFLICT` | מייל כבר רשום / כבר חבר בקבוצה | להציג את ההודעה |
| 413 | `FILE_TOO_LARGE` | תמונה מעל 2MB | להציג את ההודעה |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | קובץ שאינו JPG/PNG/WEBP | להציג את ההודעה |
| 429 | `TOO_MANY_REQUESTS` | יותר מדי ניסיונות התחברות | לבקש לנסות שוב בעוד כמה דקות |
| 500 | `INTERNAL_ERROR` | תקלה בשרת | הודעה כללית |

**הצלחה בלי תוכן:** פעולות מחיקה והסרה מחזירות `204` בלי גוף תשובה. אל תנסי לקרוא ממנה JSON.

---

## 5. מסך אחר מסך

### מסך 1 - התחברות
**`POST /api/auth/login`** (פתוח)

| שדה בטופס | חובה | כללים |
|---|---|---|
| `email` | ✅ | כתובת מייל תקינה |
| `password` | ✅ | |

בקשה:
```json
{ "email": "manager@example.com", "password": "Demo1234" }
```
תשובה `200`:
```json
{ "token": "eyJhbGciOi...", "expiresIn": "1d", "user": { "id": 1, "fullName": "רחל כהן", "email": "manager@example.com", "emailReminders": true, "createdAt": "..." } }
```
שגיאות: `401 INVALID_CREDENTIALS`, `400`, `429`.

---

### מסך 2 - הרשמה
**`POST /api/auth/register`** (פתוח)

| שדה בטופס | חובה | כללים |
|---|---|---|
| `fullName` | ✅ | 2–60 תווים |
| `email` | ✅ | מייל תקין, לא רשום כבר |
| `password` | ✅ | 8–72 תווים, לפחות אות אחת וספרה אחת |

בקשה:
```json
{ "fullName": "רחל כהן", "email": "rachel@example.com", "password": "Aa123456" }
```
תשובה `201` - **אותו מבנה כמו בהתחברות** (כולל token), כך שאפשר להכניס את המשתמש מיד.
שגיאות: `409` (מייל קיים), `400`.

---

### מסך 3 - הלוח שלי (מסך הבית)

**א. שמחות היום** - `GET /api/celebrations/today` 🔒
תשובה: מערך של Celebration (יכול להיות ריק `[]`).

**ב. רשימת השמחות** - `GET /api/celebrations` 🔒

| פרמטר (Query) | ערכים | ברירת מחדל | שימוש במסך |
|---|---|---|---|
| `groupId` | מזהה קבוצה | כל הקבוצות שלי | סינון לפי קבוצה |
| `type` | אחד מסוגי השמחה | הכל | סינון לפי סוג |
| `when` | `upcoming` / `past` / `all` | `upcoming` | קרובות / שעברו / הכל |
| `hebrewYear` + `hebrewMonth` | למשל `5787` + `KISLEV` | — | סינון לפי חודש עברי (חייבים את שניהם) |
| `search` | טקסט חופשי | — | חיפוש בכותרת, במקום ובשם מי שהעלה |
| `mine` | `true` | — | "השמחות שלי" |
| `sort` | `date_asc` / `date_desc` / `created_desc` | `date_asc` (ב־past: `date_desc`) | מיון |
| `page` | 1, 2, 3... | 1 | עמודים |
| `pageSize` | 1–50 | 20 | כמה בכל עמוד |

דוגמה - חתונות בכסלו תשפ"ז, מכל הזמנים:
```
GET /api/celebrations?type=WEDDING&when=all&hebrewYear=5787&hebrewMonth=KISLEV
```
דוגמה - חיפוש (כשהטקסט בעברית, הדפדפן מקודד אותו אוטומטית אם משתמשים ב־URLSearchParams):
```
GET /api/celebrations?search=כהן
```
תשובה `200`:
```json
{ "items": [ { "...": "Celebration" } ], "page": 1, "pageSize": 20, "total": 37, "totalPages": 2 }
```

**ג. רשימת הקבוצות לסינון** - `GET /api/groups` 🔒
**ד. רשימת הסוגים לסינון** - `GET /api/celebration-types`
**ה. רשימת החודשים לסינון** - `GET /api/hebrew-calendar/months?year=5787`

---

### מסך 4 - פרטי שמחה
**`GET /api/celebrations/{id}`** 🔒 → Celebration

כפתורים לפי ההרשאות:

| כפתור | מתי להציג | כתובת |
|---|---|---|
| עריכה | `permissions.canEdit` | מעבר למסך 5 |
| מחיקה | `permissions.canEdit` | `DELETE /api/celebrations/{id}` → `204` |
| העלאת / החלפת תמונה | `permissions.canEdit` | `PUT /api/celebrations/{id}/image` (ראו למטה) |
| הסרת תמונה | `permissions.canEdit` וגם `imageUrl` לא null | `DELETE /api/celebrations/{id}/image` → `204` |
| הסרה מקבוצה | לכל קבוצה ב־`permissions.canRemoveFromGroupIds` | `DELETE /api/groups/{groupId}/celebrations/{id}` → `204` |

**העלאת תמונה:**
- Method: `PUT`, כתובת: `/api/celebrations/{id}/image`
- גוף הבקשה: **`multipart/form-data`** (לא JSON), עם שדה אחד בשם **`image`** שמכיל את הקובץ.
  בדפדפן עושים את זה עם אובייקט `FormData`. **אל תגדירי** בעצמך את הכותרת `Content-Type` - הדפדפן מגדיר אותה לבד (כולל ה־boundary).
- כן צריך לשלוח את כותרת ה־`Authorization`.
- מותר: JPG, PNG, WEBP עד 2MB.
- תשובה `200`: `{ "imageUrl": "https://.../api/images/..." }`
- הסדר בהוספת שמחה חדשה: קודם יוצרים את השמחה (`POST /api/celebrations`), מקבלים `id`, ואז מעלים את התמונה.

**הצגת תמונה:** פשוט שמים את `imageUrl` ב־`src` של תגית `img`. לא צריך token.

---

### מסך 5 - הוספה / עריכה של שמחה
- הוספה: **`POST /api/celebrations`** 🔒 → `201` + Celebration
- עריכה: **`PUT /api/celebrations/{id}`** 🔒 → `200` + Celebration (שולחים את **כל** השדות, גם אלה שלא השתנו)

| שדה | חובה | כללים |
|---|---|---|
| `title` | ✅ | 2–100 תווים |
| `type` | ✅ | אחד מסוגי השמחה |
| `hebrewDate` **או** `date` | ✅ (אחד מהם בלבד) | ראו למטה |
| `time` | ✅ | `HH:MM`, למשל `19:30` (שעון 24 שעות) |
| `venueName` | ✅ | 2–100 תווים |
| `address` | | עד 200 תווים. אפשר `null` או מחרוזת ריקה |
| `description` | | עד 1000 תווים. אפשר `null` או מחרוזת ריקה |
| `groupIds` | ✅ | מערך של מזהי קבוצות, לפחות אחת, רק קבוצות שאת חברה בהן |

**בחירת תאריך עברי** (מומלץ):
```json
{
  "title": "בר המצווה של יוסי",
  "type": "BAR_MITZVAH",
  "hebrewDate": { "day": 15, "month": "CHESHVAN", "year": 5787 },
  "time": "19:30",
  "venueName": "אולמי הדר",
  "address": "רחוב הרב קוק 10, בני ברק",
  "description": "נשמח לראותכם",
  "groupIds": [3, 5]
}
```
**או בחירת תאריך לועזי:** במקום `hebrewDate` שולחים `"date": "2026-10-26"`.

**איך בונים את בחירת התאריך העברי בטופס:**
1. ערך התחלתי: `GET /api/hebrew-calendar/today` מחזיר את התאריך העברי של היום (יום, חודש, שנה).
2. רשימת השנים: השנה הנוכחית ועוד כמה שנים קדימה (אפשר להוסיף שמחה עד 5 שנים קדימה).
3. רשימת החודשים: כשנבחרת שנה, קוראים ל־`GET /api/hebrew-calendar/months?year=5787`. התשובה מכילה את החודשים **של אותה שנה בלבד** (בשנה מעוברת - אדר א׳ ואדר ב׳), בסדר הנכון, עם השם בעברית:
   ```json
   { "year": 5787, "yearText": "תשפ״ז", "isLeapYear": true,
     "months": [ { "month": "TISHREI", "name": "תשרי", "days": 30 }, { "month": "CHESHVAN", "name": "חשוון", "days": 30 } ] }
   ```
4. רשימת הימים: מ־1 עד `days` של החודש שנבחר.
5. (לא חובה) תצוגה מקדימה של התאריך הלועזי: `GET /api/hebrew-calendar/convert?day=15&month=CHESHVAN&year=5787` מחזיר `{ "date": "2026-10-26", "hebrewDate": { ..., "text": "ט״ו בחשוון תשפ״ז" } }`.

> אם תשני שנה וייבחר חודש שלא קיים בה (למשל "אדר" בשנה מעוברת), השרת יחזיר `400` עם הסבר בשדה `hebrewDate`.

**בחירת קבוצות:** רשימה עם תיבות סימון מתוך `GET /api/groups`.

**בעריכה:** ממלאים את הטופס מתוך `GET /api/celebrations/{id}`: התאריך העברי נמצא ב־`hebrewDate` (day, month, year), והקבוצות ב־`groups` (צריך להמיר למערך של `id`).

שגיאות: `400` (עם `details` לפי שדות), `403` (קבוצה שאינך חברה בה, או עריכה של שמחה של מישהו אחר), `404`.

---

### מסך 6 - הקבוצות שלי

| פעולה | כתובת | גוף הבקשה | תשובה |
|---|---|---|---|
| הצגת הקבוצות | `GET /api/groups` 🔒 | — | `200` מערך Group |
| פתיחת קבוצה | `POST /api/groups` 🔒 | `{ "name": "משפחת כהן" }` (2–50 תווים) | `201` Group (כולל joinCode) |
| הצטרפות בקוד | `POST /api/groups/join` 🔒 | `{ "joinCode": "K7M2QX9P" }` (8 תווים, לא משנה אם גדולות או קטנות) | `200` Group |

שגיאות בהצטרפות: `404` (קוד לא קיים), `409` (כבר חברה), `400` (קוד בפורמט שגוי).

---

### מסך 7 - דף קבוצה

| פעולה | מי | כתובת | תשובה |
|---|---|---|---|
| פרטי הקבוצה | כולם | `GET /api/groups/{groupId}` 🔒 | `200` Group |
| השמחות של הקבוצה | כולם | `GET /api/celebrations?groupId={groupId}` 🔒 | `200` רשימה |
| רשימת חברים | כולם | `GET /api/groups/{groupId}/members` 🔒 | `200` מערך Member |
| יציאה מהקבוצה | כולם | `POST /api/groups/{groupId}/leave` 🔒 | `200` (ראו למטה) |
| שינוי שם | מנהל/ת | `PATCH /api/groups/{groupId}` 🔒 עם `{ "name": "..." }` | `200` Group |
| קוד הצטרפות חדש | מנהל/ת | `POST /api/groups/{groupId}/join-code` 🔒 | `200` `{ "joinCode": "P4WN8R2T" }` |
| הסרת חבר/ה | מנהל/ת | `DELETE /api/groups/{groupId}/members/{userId}` 🔒 | `204` |
| הסרת שמחה מהקבוצה | מנהל/ת (או בעל/ת השמחה) | `DELETE /api/groups/{groupId}/celebrations/{celebrationId}` 🔒 | `204` |
| מחיקת הקבוצה | מנהל/ת | `DELETE /api/groups/{groupId}` 🔒 | `204` |

- כדי לדעת אם להציג את כפתורי המנהל: `myRole === "MANAGER"` בפרטי הקבוצה.
- תשובת היציאה: `{ "left": true, "groupDeleted": false, "newManagerId": 7 }`. אחרי יציאה, העבירי את המשתמש למסך "הקבוצות שלי".
- מנהל/ת לא יכול/ה להסיר את עצמו/ה (יקבל `400`) - לשם כך יש יציאה מהקבוצה.

---

### מסך 8 - הגדרות פרופיל
- הצגה: **`GET /api/auth/me`** 🔒 → User
- עדכון: **`PATCH /api/auth/me`** 🔒 - שולחים רק את מה שמשתנה (לפחות שדה אחד):
  ```json
  { "fullName": "רחל לוי", "emailReminders": false }
  ```
  תשובה `200` - User המעודכן. (את המייל אי אפשר לשנות.)

---

## 6. סיכום הרשאות

| פעולה | לא מחובר | חבר/ה בקבוצה | מנהל/ת הקבוצה | בעל/ת השמחה |
|---|---|---|---|---|
| הרשמה / התחברות | ✅ | | | |
| לוח עברי, סוגי שמחות, תמונות | ✅ | ✅ | ✅ | ✅ |
| צפייה בשמחות ובחברי הקבוצה | ❌ | ✅ | ✅ | ✅ |
| הוספת שמחה (בקבוצות שלי) | ❌ | ✅ | ✅ | ✅ |
| עריכה / מחיקה / תמונה של שמחה | ❌ | ❌ | ❌ | ✅ |
| הסרת שמחה מהקבוצה | ❌ | ❌ | ✅ | ✅ |
| שינוי שם, קוד חדש, הסרת חבר, מחיקת קבוצה | ❌ | ❌ | ✅ | |
| צפייה בקוד ההצטרפות | ❌ | ❌ | ✅ | |

---

## 7. משתמשי הדגמה

| מייל | תפקיד |
|---|---|
| `manager@example.com` | מנהלת "משפחת כהן", חברה רגילה ב"חברות מהסמינר" |
| `member@example.com` | מנהלת "חברות מהסמינר", חברה רגילה ב"משפחת כהן" |
| `outsider@example.com` | מנהלת "שכנים ברחוב הרימון" בלבד - לא רואה את השמחות של השתיים האחרות |

הסיסמה: בפיתוח `Demo1234`. בענן - הסיסמה שהגדרת ב־`SEED_DEMO_PASSWORD`.

---

## 8. בדיקת CORS

הדפדפן מאפשר לאתר לפנות לשרת רק אם הכתובת של האתר מופיעה במשתנה `CORS_ORIGINS` בשרת.
- בפיתוח עם Vite: `http://localhost:5173` (כבר מוגדר).
- אחרי שתעלי את ה־React לאינטרנט: הוסיפי את הכתובת שלו ב־Render, למשל:
  `CORS_ORIGINS=http://localhost:5173,https://my-semachot.netlify.app`
