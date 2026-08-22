# INSTRUCTIONS.md — MEASUREMENT-EXTERNAL-TEST-001

## מטא-דאטה של משימה
- task_id: MEASUREMENT-EXTERNAL-TEST-001
- title: מבחן חיצוני אוטומטי באפליקציה — אימות שליטה אמיתית
- owner: Marina
- priority: P0 (חוסם — מעוגן ב-CLAUDE.md §כלל מדידה)
- target_branch: feat/measurement-external-test-001
- references:
  - **CLAUDE.md §כלל מדידה** — "כל החלטת מוצר חייבת להיות מדידה
    בשני מימדים: (א) proxy פנימי (ב) מבחן חיצוני תקופתי — פריט שלא
    נראה בזמן האימון. החלטות בלי שניהם לא עולות."
  - **docs/parent-guide.md §6** — קצב (כל 6–8 שבועות), ספים
    (≥80% עבר, 60–80% פער, <60% false mastery), מקורות.
  - **MyLevel.docx §3 + §11.3** — בסיס פדגוגי.
  - **ROADMAP.md §v3** — `MEASUREMENT-EXTERNAL-TEST-001`. הועלה ל-🟢 עכשיו
    כי החוב גדל עם כל מיומנות חדשה שנוספת.

## מטרה

לסגור את הפער המבני בין proxy פנימי (אחוז שליטה ב-window) לבין
**שליטה אמיתית** (יכולת להעביר מיומנות לפריט חדש לחלוטין). כיום
כל graduation במערכת היא טענה לא־מאומתת. ככל שנוסיף מיומנויות
ומסלולים, הפער מצטבר ופחות הפיך.

המשימה מספקת מנגנון אוטומטי שההורה מפעילה כל 6–8 שבועות, מקבלת
אחוז על 10 פריטים שלא נראו, ומקבלת פירוש חד־משמעי (עבר / פער /
false mastery) — בלי לצאת מהאפליקציה ובלי לכפות עליה לאלתר מבחן ידנית.

## בטווח (סליס 1)

### החלטות PM שנקבעו ב-auto-mode (סמני אם משהו לא בכיוון לפני קוד)

| החלטה | ערך | נימוק |
|---|---|---|
| קצב | פעם ב-6–8 שבועות | parent-guide §6 (לא "שבועי" כפי שצוין ב-ROADMAP בעבר). שבועי = רעש, 6–8 שבועות = consolidation אמיתי. |
| גודל מבחן | 10 פריטים | parent-guide §6: "10 פריטים על הנושא הנוכחי". מספיק לסיגנל, קצר מספיק לבת 7. |
| סקופ סליס 1 | רק 2 מיומנויות: `add_sub_100` (אוולין) + `fractions_intro` (אמיליה) | אלה המיומנויות הראשונות במחיקה לכל ילדה. אם false mastery בהן — כל מה שמעליהן מתערער. הרחבה לשאר המיומנויות תהיה סליס נפרד. |
| יזימה | ההורה בלבד, מתוך הדשבורד | הילדה לא יוזמת, לא מקבלת התראה. ההורה מחליטה מתי הזמן נכון (תואם §guardrails שדורש שהאזור סגור בנוכחות הילדה). |
| גישה לסשן | PIN של ההורה (כמו /parent), ואז בחירת ילדה + מיומנות | מונע כניסה אקראית של הילדה דרך הניווט. |
| מסגור לילדה | "סיבוב מהיר" / "תרגול בלי עזרות" — **לא** "מבחן" | growth-mindset (CLAUDE.md §טון). המילה "מבחן" מטריגרת חרדת מתמטיקה בבנות 7–9 (Boaler, Beilock & Ramirez). |
| מבנה סשן | 10 פריטים, ניסיון יחיד לכל פריט, בלי adaptive, בלי הסברי CPA תוך כדי, בלי retry | חייב להיות נקי כדי לקבל סיגנל transfer. הסברים מטים את התוצאה הבאה. |
| תגובה לפריט | ✓/✗ דיסקרטי בלבד (בלי "נכון!" מתפרץ, בלי "לא נכון") | growth-mindset + נטרליות מדידה. |
| סיכום בסוף | אחוז + פירוש לפי הסף (עבר/פער/false) | parent-guide §6. הילדה רואה את האחוז (לא מסתירים), אבל בטון מזמין. |
| Holdout pool | קבצי JSON חדשים תחת `src/content/measurement/` | פריטים נפרדים שלעולם לא נכנסים ל-`bankForSkill`. בדיקה אוטומטית בטסטים שאין חפיפת `id`. |
| מספר פריטי holdout | 30 לכל מיומנות (3 סטים של 10) | מאפשר 3 מבחנים שונים לפני שצריך להרחיב. |
| דיוג בדשבורד | סעיף חדש "מדידה חיצונית" בכל כרטיס ילדה: תוצאה אחרונה + תאריך + badge "כדאי מבחן" אם > 6 שבועות מאז האחרון או אין | אחיד עם שאר ה-verdicts בדשבורד. |
| Telemetry | אירוע חדש `external_test_completed` עם `{skill, score, total, verdict}` | משמש לדשבורד + טריאז' עתידי. |

### קוד

- **טיפוסים חדשים** ב-`src/lib/types.ts`:
  - `ExternalTestResult = { skill: Skill; score: number; total: number;
    verdict: "passed" | "gap" | "false_mastery"; at: number }`.
  - `MeasurementItem` — סכימה זהה לפריט תרגול הרלוונטי (פריט חיבור-חיסור
    הוא `AddSubItem`; פריט שברים הוא `FractionItem`). אם אפשר, להשתמש
    באותם טיפוסים קיימים כדי לא לכפול לוגיקת `isItemCorrect`.

- **מודול חדש `src/lib/measurement.ts`** (pure):
  - `getHoldoutBank(skill: Skill): readonly Item[]` — טוען מ-`src/content/measurement/`.
  - `pickTestItems(holdout, rand?): readonly Item[]` — בוחר 10 פריטים
    (אם יש 30, מערבב פעם ועוצר ב-10). דטרמיניסטי עם `rand?` להזרקה.
  - `computeVerdict(score: number, total: number): "passed" | "gap" | "false_mastery"` —
    לפי ספים מ-parent-guide §6 (≥80%, 60–80%, <60%).
  - `dueForRetest(lastAt: number | null, now: number): boolean` —
    `now - lastAt > 42 days` (6 שבועות) או `lastAt === null`.
  - `getLastResult(profileId, skill): ExternalTestResult | null`.
  - `saveResult(profileId, skill, result): void` (delegate ל-storage.ts).

- **storage.ts:** מפתחות חדשים `emiva.measurement.v1.{profileId}.{skill}` —
  array של `ExternalTestResult` (היסטוריה, append-only).

- **telemetry.ts:** אירוע חדש בדיסקרימינטור של `TelemetryEvent`.

- **מסך חדש `src/app/parent/measurement/page.tsx`:**
  - כניסה דרך כפתור בדשבורד ההורה.
  - שלב 1: בחירת ילדה (אם > 1) + בחירת מיומנות (רק כאלה שיש להן holdout pool).
  - שלב 2: הצגת 10 פריטים. רנדור עברי, RTL. אין כפתורי retry. ✓/✗ דיסקרטי
    אחרי תשובה, מעבר אוטומטי 800ms.
  - שלב 3: סיכום — אחוז + verdict + פירוש מילולי. כפתור "סיימתי" חוזר לדשבורד.
  - timeout של חוסר־פעילות (3 דק') כמו דשבורד.

- **שינוי בדשבורד ההורה (`src/app/parent/page.tsx` + `parent-dashboard.ts`):**
  - סעיף חדש "מדידה חיצונית" בכל כרטיס ילדה.
  - תצוגה: שורת תוצאה אחרונה (תאריך + אחוז + verdict עברי) או "טרם נמדד".
  - badge "כדאי מבחן" אם `dueForRetest`.
  - כפתור "התחילי מבחן חיצוני" → ניווט ל-`/parent/measurement`.

### תוכן

- **`src/content/measurement/add-sub-100-holdout.json`** — 30 פריטי
  `AddSubItem` בדרגות 1–5 (6 לכל דרגה), קונטקסטים מעורבים (plain + money).
  פריטים שלא נמצאים ב-`add-sub-100.json` (אכיפה בטסט).
- **`src/content/measurement/fractions-intro-holdout.json`** — 30 פריטי
  `FractionItem` בדרגות 1–5. פריטים שלא נמצאים ב-`fractions-intro.json`.

### מסמכים

- **`docs/parent-guide.md §6`** — להחליף את "סטטוס במוצר: לא מיושם אוטומטית"
  בהסבר על השימוש בכפתור בדשבורד.
- **`CHANGELOG.md`** — רשומה תחת [Unreleased] תחת *Added*.
- **`ROADMAP.md`** — להעביר ל-✅ Done אחרי merge; להסיר מ-🟢 עכשיו.
- **כלל חדש `.claude/rules/measurement-holdout-purity.md`** — דורש
  שכל מאגר holdout נשאר נפרד מ-bank תרגול; טסט אוטומטי אוכף.

### טסטים

- **`tests/unit/measurement.test.ts`** (חדש):
  - `pickTestItems` מחזיר בדיוק 10 פריטים, אין כפילויות, דטרמיניסטי
    תחת `rand` קבוע.
  - `computeVerdict`: 8/10 = "passed", 7/10 = "gap", 5/10 = "false_mastery".
  - גבולות מדויקים: 8/10 = passed (לא gap), 6/10 = gap (לא false_mastery).
  - `dueForRetest`: null → true; 1 day ago → false; 50 days ago → true.

- **`tests/unit/measurement-holdout-purity.test.ts`** (חדש):
  - לכל מיומנות עם holdout pool, אין `id` חוזר בין הקובץ holdout
    ל-bank התרגול. רגרסיה.

- **`tests/unit/measurement-bank.test.ts`** (חדש):
  - גודל ≥ 30, ≥ 6 לכל דרגה, גיוון קונטקסטים (לפחות 8 money למשימת
    add_sub_100 שלוקחת קונטקסט).

- **`tests/unit/storage.test.ts`** הרחבה: append + read של תוצאות מדידה,
  בידוד פרופיל × מיומנות.

- **`tests/unit/parent-dashboard.test.ts`** הרחבה: ה-section המדידה
  מוצג עם תוצאה אחרונה / "טרם נמדד"; badge "כדאי מבחן" מופיע נכון.

- **`tests/ui/measurement-page.test.tsx`** (חדש):
  - flow מלא של 10 פריטים: אחרי 10 → מסך סיכום עם האחוז הנכון.
  - אין כפתורי retry בכל שלב.
  - timeout מחזיר ל-login.

## מחוץ לטווח (סליסים עתידיים)

- **הרחבה לשאר המיומנויות** — `multiplication`, `ops_1000`, `long_division`,
  `bar_models`, `hebrew_comprehension`. סליס 2 אחרי שהפורמט אומת על שתי
  המיומנויות הראשונות.
- **טרנד היסטורי** — גרף שמראה את 5 התוצאות האחרונות. תועיל אחרי שצברנו
  3+ תוצאות.
- **התראה בדשבורד** כשמיומנות מקבלת graduation אבל אין מדידה חיצונית
  לפני 2 סשנים — שינוי לוגיקה ב-graduation. סליס נפרד.
- **מבחן רב-מיומנות** (חיבור + כפל באותו מבחן) — אחרי שיש 4+ מיומנויות
  עם holdout.
- **ייצוא PDF של תוצאה** — אם ההורה רוצה לשמור / לשלוח למורה.
- **השוואה לתוצאות הכיתה / נורמטיב** — לא ב-v1, ייתכן אף פעם
  (CLAUDE.md §guardrails — בלי השוואות).

## ולידציה נדרשת

- `npm run typecheck` נקי.
- `npm run lint` נקי.
- `npm test` ירוק; כל הטסטים החדשים עוברים, אין רגרסיה (420 → ~445).
- `npm run build` מצליח.

**ידני — flow מלא:**
1. כניסה ל-/parent עם PIN.
2. ראיית סעיף "מדידה חיצונית" בכרטיס אוולין עם badge "כדאי מבחן" (כי טרם נמדד).
3. לחיצה על "התחילי מבחן חיצוני" → דף בחירה.
4. בחירת `add_sub_100`.
5. סשן של 10 פריטים: אין retry, אין הסברי CPA, ✓/✗ דיסקרטי.
6. מסך סיכום מראה אחוז + verdict + פירוש.
7. חזרה לדשבורד: הסעיף מציג עכשיו את התוצאה האחרונה, ה-badge נעלם.
8. אותו flow עם אמיליה + `fractions_intro`.

**ידני — guardrails:**
- אי אפשר להתחיל מבחן חיצוני בלי PIN.
- timeout של 3 דק' בחוסר פעילות מחזיר ל-login.
- בלי השוואות בין הבנות בכל שלב.
- מחרוזות פירוש בעברית, מזמינות־אוטונומיה (לא "כשלון" / "טעית").

## הגדרת DoD

- [ ] 2 קבצי holdout (60 פריטים סה"כ) עוברים בדיקות גודל, גיוון, וטוהר.
- [ ] `measurement.ts` עם `pickTestItems`, `computeVerdict`, `dueForRetest`,
      `getLastResult`, `saveResult`. pure, ניתן לבדיקה עם `rand?` ו-`now?`.
- [ ] מסך `/parent/measurement` מבצע flow מלא של 10 פריטים בלי בעיות.
- [ ] דשבורד ההורה מציג סעיף מדידה לכל ילדה.
- [ ] טסטי יחידה + UI עוברים ירוק.
- [ ] כלל חדש `.claude/rules/measurement-holdout-purity.md` קיים.
- [ ] `parent-guide.md §6` + ROADMAP + CHANGELOG מעודכנים.
- [ ] QA ידני מלא בשני flow.

## סיכונים ומיטיגציות

| סיכון | מיטיגציה |
|---|---|
| הילדה רואה את האחוז ונדרכת לתוצאה הבאה (חרדת מבצע) | מסגור: "סיבוב מהיר", בלי המילה מבחן. הפירוש המילולי דוחף את הפוקוס מהמספר לכיוון "האם השליטה אמיתית" — תהליך, לא ציון. |
| 10 פריטים זה מעט מדי לסיגנל יציב | parent-guide §6 קובע 10. אם בפועל הסיגנל רועש מדי (תוצאות סותרות בין מבחנים סמוכים) → סליס 2 יגדיל ל-15. |
| holdout pool של 30 ייגמר מהר אם המבחן מתבצע כל 6 שבועות לאורך שנה | 30 / 10 = 3 מבחנים שונים = ~18 שבועות. אחרי זה אפשר לחזור על פריטים (פחות אידיאלי אבל לא קטסטרופלי). הרחבה ל-60 כשהאות מהשטח מצדיק. |
| ההורה לא מבינה את ההבדל בין "פער" ל-"false mastery" | סעיף parent-guide §6 כבר מסביר. הפירוש המילולי במסך הסיכום ישתמש באותה לשון. |
| מיומנות עם holdout pool ריק תקרוס | guard ב-`getHoldoutBank` מחזיר `[]`; דשבורד לא מציג את המיומנות בבחירה. טסט אוכף. |
| הילדה מגלה את הניווט ל-/parent/measurement ופותחת לבד | PIN חסום + לוגיקת timeout. אותו דפוס כמו /parent. |

## Handoff

- **PM → Eng:** מאושר ב-auto-mode 2026-05-26. ההכרעות בטבלת "החלטות PM"
  למעלה ניתנות לבדיקה לפני יציאה לקוד.
- **Eng → Review:** PR יחיד (סליס 1). אם גדל מ-~800 שורות → לפצל
  לתשתית (types + measurement.ts + storage + telemetry + tests) + UI
  (page + dashboard section + ui tests).
- **Review → Done:** merge עם DoD מלא + עדכון ROADMAP מ-Now ל-Done +
  CHANGELOG. ניתוק טריגרים ל-MEASUREMENT-EXTERNAL-TEST-002 (סליס 2)
  כשנדרש.
