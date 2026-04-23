# INSTRUCTIONS.md — MATH-EVELYN-MULT-001

## מטא-דאטה של משימה
- task_id: MATH-EVELYN-MULT-001
- title: לוח הכפל — המיומנות הבאה של אוולין אחרי add_sub_100
- owner: Marina
- priority: P1
- target_branch: feat/math-evelyn-mult-001
- references:
  - `MyLevel.docx §3.1` — אוולין: "חיבור וחיסור עד 100, לאט מתקדמים לכפל"
  - `tasks/MATH-BAT9-002/INSTRUCTIONS.md` — תבנית סלייס-מקבילה (מיומנות חדשה + ניתוב)
  - `tasks/MATH-GRADUATION-001/INSTRUCTIONS.md` — קריטריון שפותח את זה
  - `src/lib/explain.ts` — יעד חשיפה מבוססת-שיטה להרחבה

## מטרה

לשלח את המיומנות השנייה של אוולין: **לוח כפל 2–10**. כאשר אוולין
עוברת graduation ב-`add_sub_100` (קריטריון MATH-GRADUATION-001), הסשן מנתב
אותה ל-`multiplication`. חשיפות מבוססות-שיטה משתמשות במסגור CPA (קבוצות,
ספירה-בדילוגים, עוגנים: ×2 = הכפלה, ×10 = עשרות, ×5 = חצי מ-×10).

## בטווח

### תוכן
- `src/content/math/multiplication.json` — **מינימום 30 פריטים** על פני 5 דרגות:
  - **דרגה 1 (עוגנים):** ×2, ×5, ×10 לוחות. למשל, `3 × 2`, `4 × 5`, `7 × 10`.
  - **דרגה 2:** ×3, ×4 לוחות. למשל, `6 × 3`, `8 × 4`.
  - **דרגה 3:** לוח ×6 + ×9 (שימוש בטריק "×10 פחות אחד").
  - **דרגה 4:** לוחות ×7, ×8 (הקשים ביותר לגיל הזה).
  - **דרגה 5:** מעורב / commuted (למשל, `7 × 8`, `8 × 7`, `9 × 6`).
- איזון: סה"כ 30 (≥ 6 לכל דרגה).
- כל ה-operands `[1..10]`. תשובות ∈ [0, 100].

### שינויי קוד
- `src/lib/types.ts`:
  - `Skill` union → הוספת `"multiplication"`.
  - טיפוס `MultItem` חדש (מבנית כמו `AddSubItem`, אבל `op: "*"` ו-
    `skill: "multiplication"`).
  - `Item` union → הוספת `MultItem`.
- `src/lib/items.ts`:
  - `isArithmeticItem` → כולל `MultItem` (הרחבת טיפוס החזרה).
- `src/lib/explain.ts`:
  - הרחבת signature ל-`AddSubItem | MultItem`.
  - ענף חדש: `explainMultiplication(a, b)` עם נימוק בסגנון CPA —
    קבוצות, ספירה-בדילוגים, עוגן ×10 לטריקים של ×5/×9.
- `src/lib/profiles.ts`:
  - `allowedSkillsForAge(7..8)` → `["add_sub_100", "multiplication"]` (מסודר).
- `src/app/session/page.tsx`:
  - הוספת `MULTIPLICATION_BANK`, הרחבת switch של `bankForSkill`.
  - ללא לוגיקת ניתוב חדשה — `pickActiveSkill` כבר מטפל ב"ראשון שלא עבר graduation."
  - `ItemPrompt` / `ItemInput` — כבר משתמשים ב-`isArithmeticItem`; MultItem זורם
    דרכם ללא ענפים נוספים.

### טסטים
- `tests/unit/multiplication.test.ts` — שלמות מאגר במראה של
  `ops-1000.test.ts` (גודל, התפלגות דרגות, עקביות תשובה מחושבת,
  טווח, regex של שאלה).
- `tests/unit/profiles.test.ts` — גיל-7/8 מחזיר כעת `["add_sub_100", "multiplication"]`.
- `tests/unit/items.test.ts` — `isArithmeticItem` + `isItemCorrect` +
  `canonicalAnswer` + `itemSkill` מכסים `multiplication`.
- `tests/unit/explain.test.ts` — מקרים חדשים ל-`explainMultiplication`
  המכסים ×2 (הכפלה), ×5, ×10, טריק ×9, מקרה default של skip-count.

### מסמכים
- `docs/parent-guide.md §4` — הזכרת כפל כיעד שאחרי graduation
  לאוולין.
- `ROADMAP.md` — העברת MATH-EVELYN-MULT-001 מ-Now ל-Done.
- `CHANGELOG.md` — רשומת [Unreleased].

## מחוץ לטווח

- **חלוקה.** מגיעה מאוחר יותר (חלוקה-ארוכה של אמיליה = `MATH-BAT9-003`;
  חלוקה של אוולין טרם מוגדרת).
- **כפל מעל ×10.** ×11 ו-×12 נפוצים בתוכניות לימודים דוברות-אנגלית
  אבל לא סטנדרטיים במתמטיקה ישראלית לגיל הזה. שומרים 1..10.
- **בעיות מילוליות הכוללות כפל.** יהיה
  `MATH-EVELYN-WORDPROBLEMS-001` (עתידי).
- **מערכים ויזואליים / manipulatives.** CPA כאן הוא ורבלי (קבוצות,
  ספירה-בדילוגים). רנדר מערכים יכול להגיע מאוחר יותר אם הפדגוגיה דורשת.
- **פדגוגיה של חיבור-חוזר בלבד.** אנו רוצים *התקדמות* CPA —
  שיטות פיקטוריאליות/מופשטות, לא רק "כפל = חיבור חוזר."

## ולידציה נדרשת

- `npm run typecheck` נקי.
- `npm run lint` נקי.
- `npm test` ירוק; טסטי מאגר + explain חדשים עוברים.
- `npm run build` מצליח.
- **ידני — מסלול אוולין:**
  - נקי localStorage. צרי פרופיל גיל 7.
  - סשן ראשון: פריטי `add_sub_100` (ללא שינוי).
  - קבעי graduated flag דרך devtools:
    `localStorage.setItem("emiva.graduated.v1.{profileId}.add_sub_100", "1")`.
  - רעננ/י `/session`. אמור להציג פריטי `multiplication`.
  - בדיקה נקודתית של חשיפות: ×2 (`3 × 2`), ×5 (`6 × 5`), ×9 (`7 × 9`), מעורב (`6 × 8`).
- **ידני — אמיליה ללא שינוי:**
  - גיל 9 → עדיין `fractions_intro` → `ops_1000`.
- **ידני — שפיות overflow:**
  - חד-ספרתי × חד-ספרתי נכנס בקלות ב-`text-7xl`. ללא תיקון פריסה נדרש.

## הגדרת DoD

- [ ] כל שינויי הקוד הוחלו, טיפוסים strict, טסטים ירוקים.
- [ ] ללא רגרסיה: 139 הטסטים הקיימים עדיין עוברים (אחרי שלב 2).
- [ ] פרופילים legacy של אוולין (מלפני MULT-001) עוברים upgrade אוטומטי דרך `loadProfiles` המחשב מחדש `allowedSkillsForAge`.
- [ ] טסטי מאגר כפל אוכפים התפלגות דרגות + נכונות תשובה.
- [ ] ניתוב graduation עובד end-to-end (QA ידני).
- [ ] ROADMAP + CHANGELOG + parent-guide מעודכנים.
- [ ] טון: ללא ביטויים אסורים בשום מחרוזת explain חדשה (עברית, growth-mindset).

## סיכונים ומיטיגציות

| סיכון | מיטיגציה |
|-------|----------|
| Explain מרגיש רובוטי — כל ×5 אומר אותו דבר | variants ב-`explainMultiplication`: anchor-based, skip-count, groups. לא pool מלא בסלייס הזה — מספיק ≥ 1 explanation לכל anchor. |
| Bank לא מאוזן לפי tables | Test שבודק שכל table (×2..×10) מופיע לפחות פעם אחת |
| Evelyn כבר עייפה ממספרים — כפל מרגיש "עוד מאותו דבר" | Copy של graduation banner ב-Phase 1 כבר מכריז "פרק חדש 🎉" — משמש כ-framing. אם Evelyn לא מתלהבת — רישום ב-FEEDBACK-LOG → טריאז'. |
| Bank של 30 פריטים קצר מדי (לוח כפל יש 100 צירופים) | מספיק כ-slice פותח. הרחבה בסלייס הבא אם mastery נתקע. |
| ×1 items feel patronizing — "כל מה שכופלים ב-1 נשאר" | Omit ×1 entirely (the table is trivial pedagogically). |

## Handoff

- **PM → Eng:** verified. ממשיך ישירות.
- **Eng → Review:** PR עם plan + code + tests + manual QA.
- **Review → Done:** merge עם DoD מלא.
