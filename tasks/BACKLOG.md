# BACKLOG — Emiva

רישום של "לא היום" — פריטים שהושהו בכוונה. כל פריט חייב **trigger**
(מה יגרום לנו לחזור אליו) ו-**owner**. בלי trigger — לא נכנס כאן.

## איך להשתמש

- לפני סגירת כל טאסק: אם נאמר "לא היום / בטאסק נפרד / להרחיב אחר כך" →
  חייב להיכנס לכאן.
- לפני פתיחת כל טאסק חדש: 2 דקות סקירה של הרשימה. אם trigger נדלק — הוא
  קופץ ראשון בתור.
- כשאפשר: להפוך פריט ל-**eval שנכשל** תחת `evals/backlog/` במקום
  להישאר כאן. eval שנכשל = הזיכרון עבר ל-CI.
- שיטות trigger ב-Emiva (מ-CLAUDE.md §Backlog triggers):
  - **מדידה אובייקטיבית** — `telemetry` (sessions, repetition rate, mastery).
  - **משוב אנושי** — הערה ב-[FEEDBACK-LOG.md](FEEDBACK-LOG.md).
  - **eval נכשל** — אוטומטי ב-CI / `npm run eval:backlog`.
  - **קצב סקירה קבוע** — כל יום ראשון, 2 דקות.

## פריטים פעילים

### BL-001 — הרחבת וריאציות feedback-messages

- **Owner:** Marina (PM)
- **Nominated:** 2026-04-19
- **Trigger (אחד מהם מספיק):**
  - אחת הבנות אומרת שהמשפטים חוזרים (משוב אנושי).
  - eval `evals/backlog/feedback-variety.eval.ts` נכשל (pool < REQUIRED_MIN
    floor — כרגע 3, יעלה ל-5 אחרי חודש של שימוש, ל-8 אחרי 3 חודשים).
  - `npm run telemetry:check` מצא repetition_rate > 0.5 בסשן בודד.
- **Where it lives next:** `src/lib/feedback-messages.ts` — להרחיב כל pool
  ל-≥ 8 וריאציות, לשקול split לפי מצב רוח / זמן יום.
- **Why deferred:** כרגע 3-4 וריאציות בכל pool. שימוש יומי של 2 בנות × 2
  סשנים × ~10 items = ~40 חשיפות ליום. עם 4 וריאציות, חזרה כל 10 דק'.
  ירגיש רובוטי תוך שבוע-שבועיים של שימוש אמיתי. אבל כרגע אין שימוש
  אמיתי — ההרחבה לפני נתונים = over-engineering.

## פריטים סגורים

*(ריק)*
