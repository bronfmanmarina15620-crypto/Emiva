# evals/

סוויטות הערכה — שונות מ-`tests/` (בדיקות תוכנה דטרמיניסטיות).

## מבנה

- `backlog/` — **evals-as-backlog**. כל קובץ הוא בדיקה ש**נכשלת כשטריגר
  של פריט BACKLOG שנדחה יורה**. הדפוס ממיר זיכרון אנושי
  לאכיפת CI: טריגר backlog שקשה לזכור הופך
  לבדיקה שקשה להתעלם ממנה.
- `content/` — (עתידי) evals לאיכות תוכן — כיול קושי פריט,
  תקינות תשובות, דקדוק עברי.
- `progression/` — (עתידי) evals להתקדמות פדגוגית — האם
  ה-loop של adaptive באמת מסתגל? האם שליטה חוזה retention?

## איך להריץ

```bash
npm run eval:backlog   # מריץ רק evals/backlog/*.eval.ts
```

Backlog evals **אינם** חלק מ-`npm test` — הם gate נפרד כדי
שכשל בדיקת יחידה רגילה לא יסתיר טריגר של backlog, ולהפך.

## דפוס: evals-as-backlog

1. פיסת עבודה שנדחתה חיה ב-`tasks/BACKLOG.md` עם טריגר
   (למשל "pool וריאציות < 2× חשיפות יומיות").
2. הטריגר הזה מקודד כתנאי-כשל בקובץ `.eval.ts`.
3. CI / `npm run eval:backlog` מריצים אותם בקביעות. כשל = "הטריגר
   ירה, הגיע הזמן לקחת את פריט ה-BACKLOG הזה".
4. כשהפריט מיושם (ה-pool הורחב), הסף מתעדכן
   או ה-eval נמחק + פריט ה-BACKLOG עובר ל"סגור".

הפניה: הנחיות Anthropic/OpenAI agent-dev — evals כמנגנון regression
עמיד (ראי `claude_md_instructions_recommendation.docx` §איכות).
