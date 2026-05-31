# טוהר מאגרי holdout של מדידה חיצונית

חל על: `src/content/measurement/*.json`, `src/content/math/*.json`,
`src/content/hebrew/**/*.json`, `src/lib/measurement.ts`, וכל קובץ
תוכן עתידי שייכנס לאחד משני התפקידים.

## חוק קשיח

**מאגר holdout לא חופף עם מאגר תרגול. לעולם.** אסור שאותו `id`
יופיע גם ב-`src/content/measurement/{skill}-holdout.json` וגם בקובץ
התרגול של אותה מיומנות. המאגר כולו של holdout חייב להישאר נסתר
מ-`bankForSkill` של דף הסשן.

**למה:** כל המטרה של המבחן החיצוני היא לבדוק transfer — האם הילדה
מצליחה על **פריט שלא ראתה מעולם**. אם פריט holdout דולף לתרגול, גם
בטעות, ה-verdict הופך לחסר משמעות (CLAUDE.md §כלל מדידה). false
mastery לא יזוהה, ו-passed יכול להיות שינון.

## איך זה נאכף

1. **טסט אוטומטי**: `tests/unit/measurement-holdout-purity.test.ts`
   בודק בכל הרצה ש-set ה-ids לא חופף לכל מיומנות שמופיעה ב-
   `MEASURABLE_SKILLS`. ירוק = טוהר נשמר.
2. **קונבנציה של מזהים**: כל holdout id חייב להיות בעל פרפיקס
   `ext-`. ה-prefix לבדו לא מגן (אפשר לטעות) — הטסט הוא ההגנה
   האמיתית. אבל הוא הופך כל הפרה לבולטת בסקירה ידנית.

## כשמוסיפים מיומנות חדשה ל-`MEASURABLE_SKILLS`

חובה לעשות בו-זמנית:
1. ליצור `src/content/measurement/{skill}-holdout.json` עם
   פריטים שלא מופיעים בקובץ התרגול. השתמשי בפרפיקס `ext-`.
2. להוסיף ענף ל-`holdoutForSkill` ב-`src/lib/measurement.ts`.
3. להוסיף את המיומנות ל-`MEASURABLE_SKILLS`.
4. לוודא שהטסט עובר ירוק.

אם רוצים להוסיף עוד פריטים למאגר תרגול קיים, **חובה** להריץ
את הטסטים לפני commit. הטסט יתפוס id ש"מועתק" מהמאגר השני.

## כשמסירים מיומנות

הסירי גם את המאגר גם את הענף ב-`holdoutForSkill` באותו PR. אל
תשאירי "קוד מת" של ענף שלא נקרא.

## הפניות

- [docs/parent-guide.md §6](../../docs/parent-guide.md) — תיאור
  ההורה־המופנה של המבחן.
- [tasks/MEASUREMENT-EXTERNAL-TEST-001/INSTRUCTIONS.md](../../tasks/MEASUREMENT-EXTERNAL-TEST-001/INSTRUCTIONS.md)
- [CLAUDE.md §כלל מדידה](../../CLAUDE.md)
