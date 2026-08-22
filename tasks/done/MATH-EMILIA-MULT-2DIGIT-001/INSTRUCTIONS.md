# INSTRUCTIONS.md — MATH-EMILIA-MULT-2DIGIT-001

## מטא-דאטה
- task_id: MATH-EMILIA-MULT-2DIGIT-001
- title: כפל דו-ספרתי × דו-ספרתי לאמיליה — אלגוריתם סטנדרטי בעמודות
- owner: Marina
- priority: P1 (פעיל אחרי שסליס 1 של מדידה נסגר ב-2026-05-31)
- target_branch: main (commit ישיר, אין branch נפרד ב-v1)
- references:
  - **ROADMAP §v1 מתמטיקה** — `MATH-EMILIA-MULT-2DIGIT-001` סומן 🔲 לא התחיל;
    החזיר אותו ל-Now אחרי שחבילת AR2 חשפה את הצורך (8 פריטי דמו ב-pack).
  - **MyLevel.docx §3.1** — בת 9 = "פעולות חשבון: חיבור/חיסור עד 1000, כפל
    וחילוק ארוכים".
  - **PR 2213386** — חבילת PACK-EMILIA-AR2 (פריטי `ar2-q5*-mult` בקובץ
    `emilia-assessment-review-2.json`) — 8 פריטים זמניים בסקופ של
    `multiplication`. נשארים כשהם — הם תרגול חבילה, לא בנק עיקרי.

## מטרה

לתת לאמיליה מסלול מובחן לכפל דו-ספרתי × דו-ספרתי. כיום הבנק
היחיד שלה לכפל הוא `multiplication` (לוח כפל עד 10×10) — שהיא כבר
שלטה בו. בעיות AR2 הראו שהפער הבא הוא כפל אנכי בעמודות, וזה לא יושב
טבעי על `multiplication` כי הקושי שונה לחלוטין (אלגוריתם
מרובה-שלבים, לא retrieval).

מסלול חדש = מיומנות חדשה `mult_2digit` עם בנק משלה, הסבר CPA מבוסס
אלגוריתם עמודות (סטנדרטי ישראלי), routing אוטומטי אחרי `bar_models`.

## בטווח (סליס 1)

### החלטות PM שנקבעו ב-auto-mode 2026-05-31

| החלטה | ערך | נימוק |
|---|---|---|
| אלגוריתם | סטנדרטי בעמודות | תשובת Marina (2026-05-31). הילדה כבר נחשפה בבי"ס. CPA scaffold: area-model / פירוק לעשרות+יחידות בדרגות 1-3, אלגוריתם עמודות טהור ב-4-5. |
| מבנה בנק | 30 פריטים, 5 דרגות, 6 לכל דרגה | מקביל ל-`multiplication` / `bar_models` (30 פריטים מינימום, 5 דרגות). |
| מיומנות נפרדת? | כן — `mult_2digit` (לא הרחבה של `multiplication`) | קושי דרמטי שונה. מקובל retrieval (לוח כפל) לעומת אלגוריתם רב-שלבי. גם משמר graduation של `multiplication` כתנאי קדם פדגוגי. |
| Routing | אחרי `bar_models` graduation → `mult_2digit` | אחרון ב-`allowedSkillsForAge(9-10)`. Marina יכולה לעקוף ידנית מהדשבורד. |
| מסלול בנק | קושי עולה: 2-ספרתי × 1-ספרתי (D1) → 2×2 בלי carry (D2) → carry בודד (D3) → carry כפול (D4) → edge cases (D5) | מאפשר שליטה הדרגתית. D1 גם משמש "אישור" שלוח הכפל יציב. |
| הסבר | item-level `explanation` ב-JSON, לא computed | האלגוריתם דורש פירוט שלב-שלב; חישוב דינמי = גנרי מדי. דפוס זהה ל-`bar_models`. |
| Money context | לא | קוריקולום AR2 לא כלל כסף בכפל. אפשר להוסיף בסליס 2. |
| מדידה חיצונית | לא בסליס הזה | נכנס ל-`MEASUREMENT-EXTERNAL-TEST-002` (סליס 2). |
| Telemetry חדש | אין — `attempt` הקיים מספיק | אין דפוס חדש שצריך אירוע נפרד. |

### קוד

- **`src/lib/types.ts`:**
  - `Skill` union += `"mult_2digit"`.
  - `MultItem.skill` יורחב ל-`"multiplication" | "mult_2digit"`. שאר השדות זהים.
- **`src/content/math/mult-2digit.json`** (חדש) — 30 פריטים `MultItem` עם
  `explanation` מפורש לכל פריט.
- **`src/app/session/page.tsx`:**
  - import של הבנק החדש.
  - `bankForSkill` case חדש.
  - `ItemReveal` — לפריטי `mult_2digit` להשתמש ב-`item.explanation` (לא בחישוב גנרי).
  - תיקון קטן ב-`isMoneyItem`-pattern: אם פריט אריתמטי כולל `explanation`, להעדיף אותו על `explain(item)`.
- **`src/lib/items.ts`** — `isArithmeticItem` כבר מתחבר נכון דרך
  ה-discriminator המורחב. שום שינוי לוגי.
- **`src/lib/profiles.ts`** — `allowedSkillsForAge(9-10)` += `"mult_2digit"`
  אחרון. `clearTelemetry` לא צריך שינוי.
- **`src/lib/parent-focus.ts`** — `ALL_SKILLS` += `"mult_2digit"`;
  `SKILL_SUBJECT["mult_2digit"] = "math"`.
- **`src/lib/parent-dashboard.ts`** — `SKILL_HEBREW["mult_2digit"] = "כפל דו־ספרתי"`;
  `POSSIBLE_CAUSE_HEBREW["mult_2digit"] = "לוח הכפל שלא התייצב"`.
- **`src/app/parent/measurement/page.tsx` SKILL_HEBREW** — להוסיף ערך
  (מסך מדידה משתמש ברשומה מלאה של Skill).

### תוכן

מבנה הקובץ `mult-2digit.json`:

```json
[
  { "id": "m2d-001", "skill": "mult_2digit", "difficulty": 1,
    "prompt": "23 × 4 = ?", "answer": 92, "operands": [23, 4], "op": "*",
    "explanation": "..." },
  ...
]
```

חלוקת קושי:
- **D1 (6 פריטים)** — 2-ספרתי × 1-ספרתי. אין carry בעשרות. דוגמאות:
  23×4, 36×3, 47×2, 52×4, 64×3, 31×5.
- **D2 (6 פריטים)** — 2×2 בלי carry בשני המכפלים החלקיים. דוגמאות:
  12×13, 21×14, 23×12, 14×12, 32×13, 13×22.
- **D3 (6 פריטים)** — 2×2 עם carry בודד. דוגמאות: 24×17, 35×26, 18×42,
  27×36, 19×31, 25×38.
- **D4 (6 פריטים)** — 2×2 עם carry כפול. דוגמאות: 47×56, 68×79, 53×84,
  67×48, 89×35, 76×54.
- **D5 (6 פריטים)** — edge: עשרות עגולות, ספרות כפולות, קרוב ל-100.
  דוגמאות: 50×85, 99×11, 99×99, 75×80, 63×97, 25×40.

פורמט הסבר (CPA):
- **D1-D3** (area-model scaffold): "פירוק לעשרות ויחידות: [a]=[at]+[au],
  [b]=[bt]+[bu]. ... מכפלים חלקיים + סכום."
- **D4-D5** (column-pure): "בעמודות: [au]×[b]=[X], אחר כך [at]×[b]
  עם הזזה שמאלה=[Y]0. חיבור: [X]+[Y0]=[answer]."

### תיעוד

- **CHANGELOG.md** — Added entry תחת [Unreleased].
- **ROADMAP.md** — `MATH-EMILIA-MULT-2DIGIT-001` מסומן ✅ עם תקציר.
- אין שינוי ב-`parent-guide.md` כי לא משנים lab של mastery/SRS/attempt-credit.
- אין `ADR` חדש (החלטה תיעודית-פדגוגית בלבד, לא טכנולוגית).

### טסטים

- **`tests/unit/mult-2digit.test.ts`** (חדש):
  - גודל ≥ 30 פריטים.
  - 5 דרגות עם ≥ 6 פריטים בכל אחת.
  - כל פריט: `skill==="mult_2digit"`, `op==="*"`, `operands[0]*operands[1]===answer`.
  - כל פריט: `explanation` קיים ולא ריק.
  - מזהים ייחודיים, prefix `m2d-`.
  - D1: max(operands) ≥ 10 & min(operands) ≤ 9 (כלל "2×1").
  - D2-D5: שני operands ≥ 10.
- **`tests/unit/items.test.ts`** הרחבה: `isArithmeticItem` נכון לפריט
  `mult_2digit`; `isItemCorrect` עובד לפריט `mult_2digit`.
- **`tests/ui/parent-dashboard-page.test.tsx`** עדכון: "renders 4 skill
  tiles for age-9" → 5, עם המיומנות החדשה.
- **`tests/unit/parent-dashboard.test.ts`** — אם יש תלות במספר מיומנויות
  age-9 (לדוגמה במחזור `loadAllMastery`), מתאימים.

## מחוץ לטווח (סליס 2)

- **מדידה חיצונית עבור mult_2digit** — מאגר holdout נפרד, כניסה
  ל-`MEASURABLE_SKILLS`. נכנס ל-`MEASUREMENT-EXTERNAL-TEST-002`.
- **money context** — מצבים של כסף בעיות (340 ₪ × 3) — אם רלוונטי.
- **משבצות mental visualization** — area-model SVG דינמי תוך כדי תרגול
  (לא רק בהסבר). דורש קומפוננטה חדשה.
- **ענישה adaptive ספציפית** — כרגע משתמשים ב-adaptive גנרי. אחרי
  שמצטברים נתונים, אפשר להוסיף סבולת נדיבה יותר ל-mult_2digit
  (האלגוריתם רב-שלבי → טעויות חישוב לא בהכרח מעידות על חוסר שליטה).

## ולידציה נדרשת

- `npm run typecheck` נקי.
- `npm run lint` נקי.
- `npm test` ירוק. סף: **480 → ≥ 495 עוברות.**
- `npm run build` מצליח.

**ידני:**
1. כניסה לפרופיל אמיליה → דשבורד מציג "כפל דו־ספרתי" בכרטיס שלה.
2. לחיצה על "בחרי" ליד "כפל דו־ספרתי" → סשן נטען עם פריט מהבנק החדש.
3. תרגול: ניסיון 1 נכון → קרדיט. ניסיון 1 שגוי → "נסי שוב" (retry של 3).
4. חשיפה (אחרי 3 שגויים): מוצג ההסבר ה-CPA המלא של הפריט.
5. חזרה לדשבורד: סעיף "כיסוי" מציג את המיומנות החדשה ככרטיס "בתהליך".

## DoD

- [x] קובץ INSTRUCTIONS.md זה.
- [ ] `mult-2digit.json` עם 30 פריטים בכל 5 הדרגות.
- [ ] `Skill` + `MultItem` מורחבים.
- [ ] `bankForSkill` + `ItemReveal` מטפלים ב-`mult_2digit`.
- [ ] `profiles.allowedSkillsForAge` כולל את המיומנות.
- [ ] כל ה-Records של `Skill` במערכת מאוכלסים (parent-dashboard,
      parent-focus, measurement-page).
- [ ] טסטי יחידה ירוקים.
- [ ] UI test של age-9 dashboard מעודכן.
- [ ] CHANGELOG + ROADMAP מסונכרנים.

## סיכונים ומיטיגציות

| סיכון | מיטיגציה |
|---|---|
| אמיליה כבר יודעת את הכפל הדו־ספרתי מבי"ס → המסלול ירגיש מיותר | D1-D2 מהירות; D3-D5 מציגים אתגר. אם בפועל היא עוברת מהר → סיגנל חיובי, לא בעיה. |
| ההסבר ה-CPA המבוסס area-model לא תואם את האלגוריתם שלמדה בכיתה | D1-D3 דו-לשוני: גם פירוק area גם עמודות. D4-D5 עמודות בלבד. |
| מתחלפים skills באמצע סשן בגלל בחירת focus | זהה לכל מיומנות אחרת. parent-focus כבר טוב. |
| `explain(item)` ייקרא ל-mult_2digit ויחזיר טקסט שגוי כי המספרים גדולים | פתרון בקוד: אם פריט כולל `explanation`, להשתמש בו. ההגה הזה תופס גם בעיות עתידיות. |

## Handoff

- **PM → Eng:** מאושר ב-auto-mode 2026-05-31.
- **Eng → Review:** PR יחיד, גודל צפוי ~500 שורות (רובן JSON).
- **Review → Done:** merge עם DoD מלא + ROADMAP ✅.
