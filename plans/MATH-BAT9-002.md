# Plan — MATH-BAT9-002 (ops_1000, Emilia slice 2)

## מטרה
להוסיף לאמיליה skill שני (חיבור/חיסור עד 1000) עם routing אוטומטי אחרי
graduation מ-`fractions_intro`. reuse מלא של לולאת Model A, של ItemInput,
ושל `explain.ts`. בלי כפל. בלי חילוק ארוך.

## החלטות פדגוגיות נעולות

1. **רק חיבור וחיסור.** כפל וחילוק בסלייסים נפרדים. מניעת scope creep.
2. **Range:** תוצאות ב-[0, 999]. בלי תוצאות שליליות (לא נפוץ בגיל 9 בלי
   שלב הקדמה), בלי overflow מעל 1000.
3. **Tiers (5):**
   - T1: 3-digit + 1-digit, ללא carry (`134 + 5`, `237 - 4`).
   - T2: 3-digit + 2-digit, ללא carry (`145 + 23`, `278 - 35`).
   - T3: carry יחיד (`158 + 7`, `234 - 56`).
   - T4: carry מרובה (`167 + 48`, `412 - 189`).
   - T5: 3-digit + 3-digit (`347 + 256`, `734 - 458`).
4. **Explain** — הקיים מספיק. פירוק ל-tens + ones כבר מחזיק; פירוק ל-hundreds
   לא קריטי בגיל 9 כשהכמות קטנה ומזוהה. אם Emilia מתקשה בהסברים — backlog.

## החלטות ארכיטקטורה

### 1. Skill union
```ts
export type Skill = "add_sub_100" | "fractions_intro" | "ops_1000";
```

### 2. AddSubItem הרחבה
הצורה זהה, רק הגבולות השתנו. **שימור שם AddSubItem** כי זה עדיין
add/sub — לא מצדיק rename.

```ts
export type AddSubItem = {
  id: string;
  skill: "add_sub_100" | "ops_1000";
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  operands: [number, number];
  op: "+" | "-";
};
```

### 3. Profiles: סדר matters
```ts
export function allowedSkillsForAge(age: number): Skill[] {
  if (age >= 7 && age <= 8) return ["add_sub_100"];
  if (age >= 9 && age <= 10) return ["fractions_intro", "ops_1000"];
  return [];
}
```

**סדר מכוון:** fractions ראשון כי הוא הסלייס הפדגוגי הראשון של Emilia
(בדיוק כפי שב-slice 1 קבענו). ops_1000 כ-"הבא בתור" אחרי graduation.

### 4. Session routing — "first non-graduated"
```ts
function pickActiveSkill(allowed: Skill[], profileId: string): Skill | null {
  for (const s of allowed) {
    if (!hasGraduatedFlag(profileId, s)) return s;
  }
  return allowed[allowed.length - 1] ?? null;   // all graduated → stay on last
}
```

כרגע אין `ops_1000` ב-allowedSkills של גיל 7–8, אז אוולין לא תיפגע.
לאמיליה: לפני graduation → fractions. אחרי → ops_1000.

**למה לא routing לפי "completed next skill"?** Graduation = "אחד סיים, הבא פתוח"
כבר נחתם ב-Phase 1. כאן רק מממשים את הצד השני (לאן "זז").

### 5. Item rendering — helper קטן
כדי להימנע מ-duplication של `item.skill === "add_sub_100" || item.skill === "ops_1000"`,
אני מוסיף helper קטן:

```ts
// types.ts או items.ts
export function isArithmeticItem(item: Item): item is AddSubItem {
  return item.skill === "add_sub_100" || item.skill === "ops_1000";
}
```

ב-`session/page.tsx`: `needsTextInput`, `ItemPrompt`, `ItemInput` — כל הבדיקות
שהיו `item.skill === "add_sub_100"` → `isArithmeticItem(item)`.

### 6. Bank — ≥30 items, ~50/50 add/sub
קובץ JSON בסגנון של `add-sub-100.json`. IDs בפורמט `ops1k-001..030`. ידני-לא-generator
כדי להימנע מ-edge cases (כגון 500 - 500 = 0 שפחות מעניין, או 999 + 1 = 1000 שמחוץ לטווח).

### 7. isItemCorrect + explain
`isItemCorrect` ב-`items.ts` כרגע `if (item.skill === "add_sub_100")`. משנים ל-
`if (isArithmeticItem(item))` — אותה לוגיקה (parse int, compare).

`explain` כבר אוניברסלי ל-`AddSubItem`. מעבירים items של ops_1000 — עובד.

## סדר מימוש
1. `src/lib/types.ts` — Skill union + AddSubItem widen.
2. `src/lib/items.ts` — הוספת `isArithmeticItem` + עדכון `isItemCorrect` / `canonicalAnswer`.
3. `src/lib/profiles.ts` — `allowedSkillsForAge(9..10)` → `["fractions_intro", "ops_1000"]`.
4. `src/content/math/ops-1000.json` — 30 פריטים ידניים.
5. `src/app/session/page.tsx` — `pickActiveSkill` + bank routing + rendering branches דרך ה-helper.
6. Tests: `ops-1000.test.ts` (חדש), עדכון `profiles.test.ts`, `items.test.ts`.
7. Docs: ROADMAP (Done), CHANGELOG (Unreleased), parent-guide §4 (routing target).
8. Validation.

## סיכונים ומיטיגציה

| סיכון | מיטיגציה |
|-------|----------|
| `isArithmeticItem` helper שבור טייפס-narrowing של union | בדיקה: `item.answer` (number) נגיש רק אחרי `isArithmeticItem(item)` — tested ב-items.test |
| Emilia לא מבינה למה פתאום מספרים גדולים | Graduation banner שהופיע בסיום fractions אומר "פרק חדש בדרך" — משמש כ-onboarding implicit |
| Item bank מתקלקל אחרי copy-paste (answer ≠ operands) | Test computed: לכל פריט, `answer === operands[0] op operands[1]` |
| gaps בין tiers — למשל T3 וגם T4 עם carry יחיד | Criterion מפורש: T3=single carry, T4=multiple. Test מוודא. |
| Active skill selection שבורה ל-profile ישן (בלי ops_1000 ב-allowedSkills) | `loadProfiles` re-derives `allowedSkillsForAge` בכל טעינה — אוטומטי |

## Definition of Done
ראה `tasks/MATH-BAT9-002/INSTRUCTIONS.md §Definition of Done`.
