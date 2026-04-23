# INSTRUCTIONS.md — MATH-GRADUATION-001

## מטא-דאטה של משימה
- task_id: MATH-GRADUATION-001
- title: קריטריון graduation למיומנות — "סיימת את הנושא"
- owner: Marina
- priority: P1
- target_branch: feat/math-graduation-001
- references:
  - `docs/parent-guide.md §4` — קריטריון מוצע, כעת מיישמים
  - `CLAUDE.md §Exercise UX rule` — קרדיט שליטה רק בניסיון 1
  - `MyLevel.docx §3 Core`, `§11.3` — הקשר Bloom 80% + מבחן חיצוני
  - `src/lib/mastery.ts`, `src/lib/types.ts`, `src/app/session/page.tsx`

## מטרה

כאשר ילדה משלימה מספיק תשובות נכון-בראשון במיומנות, על פני ≥ 2 סשנים
מובחנים עם ≥ 24 שעות ביניהם, האפליקציה צריכה
להכיר שהמיומנות "גמורה". סיכום הסשן מציג חגיגה מיוחדת. Telemetry
רושם את ה-graduation. ללא ניתוב אוטומטי למיומנות הבאה — המיומנות
הבאה עוד לא קיימת לאף אחת מהבנות.

## בטווח

### קריטריון (parent-guide §4, נעול)
- `≥ GRADUATION_MIN_CORRECT` תשובות נכון-בראשון (ברירת מחדל: 20)
- `≥ GRADUATION_MIN_SESSIONS` סשנים מובחנים (ברירת מחדל: 2)
- `≥ GRADUATION_MIN_GAP_MS` בין הסשן הראשון והאחרון (ברירת מחדל: 24h)

כל השלושה חייבים להתקיים. "נכון-בראשון" הוא כבר איך
ש-`attempts[].correct` נרשם היום — ניסיונות 2/3 שומרים `false`, לפי
`session/page.tsx:210`.

### שינויי קוד
- `src/lib/types.ts`:
  - `MasteryState.sessionTimestamps: number[]` (חדש)
  - קבועים חדשים `GRADUATION_MIN_CORRECT`, `GRADUATION_MIN_SESSIONS`, `GRADUATION_MIN_GAP_MS`
- `src/lib/mastery.ts`:
  - `emptyMastery` מחזיר `sessionTimestamps: []`
  - `incrementSession` דוחף timestamp נוכחי
  - `skillGraduated(state, now?): { graduated: boolean; reason: string }`
- `src/lib/storage.ts`:
  - נורמליזציה של state שנטען — ברירת מחדל `sessionTimestamps: []` אם חסר
  - Migration של legacy: saves קיימים ללא השדה עדיין parse.
- `src/app/session/page.tsx`:
  - בשלב `summary`, קריאה ל-`skillGraduated(state)`.
  - אם `graduated && !alreadyCelebrated(profile, skill)` → הצגת בלוק graduation
    (שונה מחגיגת MasteryJar): כותרת חמה, "פרק חדש מגיע בקרוב",
    כפתורי החלפת פרופיל / סשן חדש.
  - רישום אירוע telemetry `skill_graduated` **פעם אחת** לכל פרופיל × מיומנות (מעקב דרך
    דגל localStorage `emiva.graduated.v1.{profileId}.{skill}`).
- `src/lib/telemetry.ts`:
  - הוספת סוג אירוע `skill_graduated`.

### טסטים
- `tests/unit/mastery-graduation.test.ts` המכסה:
  - לא graduated כאשר 0 נכונים בניסיון ראשון.
  - לא graduated כאשר < MIN_CORRECT נכונים בניסיון ראשון.
  - לא graduated כאשר ≥ MIN_CORRECT אבל רק סשן 1.
  - לא graduated כאשר ≥ MIN_CORRECT, 2 סשנים, אבל פער < 24h.
  - Graduated כאשר כל שלושת התנאים מתקיימים.
  - נכון-לא-בניסיון-ראשון (`correct: false` ברשומה) לא נספר לכיוון ה-20.
- `tests/unit/storage.test.ts`:
  - שליטה legacy ללא `sessionTimestamps` נטענת עם מערך ריק.

### מסמכים
- `docs/parent-guide.md §4` — שכתוב מ-"מוצע" ל-"מיושם" + ציטוט
  הקבועים בטבלת מקור-האמת ב-§10.
- `ROADMAP.md` — סימון `MATH-GRADUATION-001` כ-Done, הסרה מעבודה עתידית משתמעת.
- `CHANGELOG.md` — רשומת [Unreleased] תחת Added.

## מחוץ לטווח

- **ניתוב למיומנות הבאה.** אין מיומנות הבאה. כאשר `ops_1000` או
  `multiplication` ישלחו (MATH-BAT9-002, MATH-EVELYN-MULT-001), הניתוב יתווסף
  במשימות ההן.
- **שינוי חלון השליטה (`WINDOW_SIZE`, `MASTERY_TARGET`).** קריטריון
  graduation חי *לצד* קריטריון הקושי-האדפטיבי,
  לא מחליף אותו.
- **פירוק ניסיונות לכל סשן.** אנו דורשים סה"כ ≥ 20 ופער ≥ 24h;
  אנו לא אוכפים מינימום-נכונים-לסשן. פשוט יותר, מספיק טוב
  ל-v1.
- **UI ל"ביטול graduation" / reset.** אם הילדה מתחילה מחדש, מסלול ה-reset
  legacy עדיין עובד למצב השליטה; דגל graduation חד-פעמי
  נשאר בכוונה, כדי שלא נחגוג שוב.

## ולידציה נדרשת

- `npm run typecheck` נקי.
- `npm run lint` נקי.
- `npm test` ירוק; טסטי graduation חדשים מכסים את כל 6 המקרים לעיל.
- `npm run build` מצליח.
- **ידני:**
  - נקי localStorage. צרי פרופיל אוולין (7). קבעי `GRADUATION_MIN_CORRECT`
    זמנית ל-3 דרך override קוד ל-QA מהיר יותר (החזירי לפני commit).
  - שחקי 3 פריטים נכונים בסשן 1, סיים. המתיני — הגדילי timestamp ידנית
    ב-devtools או הריצי סשן 2 אחרי עיכוב מדומה.
  - סשן 2: עני ≥ 1 נכון. סיימי סשן. סיכום צריך להראות את
    בלוק ה-graduation.
  - לוודא ש-telemetry exports אירוע `skill_graduated` פעם אחת, לא פעמיים.

## הגדרת DoD

- [ ] כל שינויי הקוד הוחלו, טיפוסים strict, טסטים ירוקים.
- [ ] שליטה legacy ב-localStorage עדיין נטענת (ללא reset לאוולין/אמיליה).
- [ ] parent-guide.md §4 מעודכן (לא עוד "מוצע").
- [ ] ROADMAP + CHANGELOG מעודכנים.
- [ ] QA ידני: בלוק graduation מופיע פעם אחת, telemetry `skill_graduated`
  נפלט בדיוק פעם אחת לכל פרופיל × מיומנות.
- [ ] בדיקת טון: כל מחרוזת פונה-למשתמש בבלוק graduation היא
  growth-mindset (CLAUDE.md §Tone), ללא ביטויים אסורים.

## סיכונים ומיטיגציות

| סיכון | מיטיגציה |
|-------|----------|
| קריטריון יורה על סמך זיכרון קצר-טווח (20 נכונים בסשן אחד מרוכז) | דרישת 2 סשנים + 24h עוצרת זאת |
| Child graduates with no next content → anti-climactic | UI מפורש: "פרק חדש מגיע" + הורה מקבלת signal ב-telemetry |
| Legacy mastery ללא `sessionTimestamps` נשבר | נורמליזציה ב-`storage.ts`, test ייעודי |
| חגיגה חוזרת בכל סשן אחרי graduation | דגל one-shot ב-localStorage + telemetry חד-פעמי |
| הסתמכות על `Date.now()` מקשה על טסטים | כל הפונקציות הציבוריות מקבלות `now?: number` להזרקה |
