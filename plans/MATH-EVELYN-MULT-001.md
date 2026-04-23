# תוכנית — MATH-EVELYN-MULT-001

## מטרה
מיומנות שנייה לאוולין: לוחות הכפל 2–10. routing אוטומטי אחרי graduation מ-
`add_sub_100`. חשיפה מבוססת CPA (קבוצות, ספירת-קפיצה, עוגני ×10/×5/×9).

## החלטות פדגוגיות נעולות

1. **טווח:** לוחות 2–10 בלבד. ללא ×1 (טריוויאלי), ללא ×11/×12 (לא סטנדרטי
   בישראל).
2. **שיטת החשיפה לכל לוח:**
   - ×2 → "מכפילים פי 2 = מכפילים = כופלים את עצמו. 4 × 2 = 4 + 4 = 8."
   - ×5 → anchor ל-×10: "4 × 10 = 40. חצי מזה = 4 × 5 = 20."
   - ×10 → "מוסיפים 0. 7 × 10 = 70."
   - ×9 → trick: "7 × 9 = (7 × 10) - 7 = 70 - 7 = 63."
   - default (×3/×4/×6/×7/×8) → "a קבוצות של b. אפשר לספור: b, 2b, 3b, ..., ab."
3. **Commutativity:** דרגה 5 מערבבת (`7 × 8` ו-`8 × 7`) כדי שהילדה תראה את
   החוק — לא לומדים אותו explicitly בסלייס הזה.
4. **ה-Item shape נפרד מ-AddSubItem:** כי `op: "*"` לא שייך ל-"add/sub".
   שימור semantic clarity של ה-types.

## החלטות ארכיטקטורה

### 1. Types
```ts
export type Skill = "add_sub_100" | "fractions_intro" | "ops_1000" | "multiplication";

export type MultItem = {
  id: string;
  skill: "multiplication";
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  operands: [number, number];
  op: "*";
};

export type Item = AddSubItem | FractionItem | MultItem;
```

### 2. `isArithmeticItem` — הרחבת ה-type guard
```ts
export function isArithmeticItem(item: Item): item is AddSubItem | MultItem {
  return item.skill === "add_sub_100"
      || item.skill === "ops_1000"
      || item.skill === "multiplication";
}
```

**ההשלכה:** `ItemPrompt` / `ItemInput` / `needsTextInput` כבר משתמשים ב-guard
הזה, ולכן MultItem זורם בלי שינויים נוספים. רק `canonicalAnswer` ו-
`isItemCorrect` מקבלים אותו אוטומטית דרך אותו ענף.

### 3. `explain.ts` — הרחבה
```ts
export function explain(item: AddSubItem | MultItem): string {
  if (item.op === "*") {
    const [a, b] = item.operands;
    return explainMultiplication(a, b);
  }
  ...
}

function explainMultiplication(a: number, b: number): string {
  const result = a * b;
  // Symmetrize: treat smaller number as "times" and larger as "unit"
  const [times, unit] = a <= b ? [a, b] : [b, a];

  if (times === 2 || unit === 2) {
    const x = times === 2 ? unit : times;
    return `${a} × ${b} = ${result}. מכפילים פי 2 = כופלים את עצמו: ${x} + ${x} = ${result}.`;
  }

  if (times === 10 || unit === 10) {
    const x = times === 10 ? unit : times;
    return `${a} × ${b} = ${result}. פי 10 = מוסיפים 0 ל־${x} ומקבלים ${result}.`;
  }

  if (times === 5 || unit === 5) {
    const x = times === 5 ? unit : times;
    return `${a} × ${b} = ${result}. פי 5 = חצי מפי 10. ${x} × 10 = ${x * 10}, חצי מזה = ${result}.`;
  }

  if (times === 9 || unit === 9) {
    const x = times === 9 ? unit : times;
    return `${a} × ${b} = ${result}. טריק של פי 9: ${x} × 10 - ${x} = ${x * 10} - ${x} = ${result}.`;
  }

  // Default: skip counting / groups
  const counts = Array.from({ length: times }, (_, i) => unit * (i + 1)).join(", ");
  return `${a} × ${b} = ${result}. ${times} קבוצות של ${unit}. סופרים: ${counts}.`;
}
```

### 4. פרופילים
```ts
export function allowedSkillsForAge(age: number): Skill[] {
  if (age >= 7 && age <= 8) return ["add_sub_100", "multiplication"];
  if (age >= 9 && age <= 10) return ["fractions_intro", "ops_1000"];
  return [];
}
```

**שאלה:** האם גיל 9–10 גם יקבל multiplication? לפי MyLevel §3.1, בת 9 עובדת
על שברים, ops 1000, חילוק ארוך. בלי multiplication ככלל מפורש — היא כבר
אמורה לשלוט בו ממילא. לכן לא מוסיפים ל-9–10 בסלייס הזה. אם אמיליה מתקשה
— backlog item.

### 5. מאגר פריטים — 30 פריטים
- T1 (anchors: ×2, ×5, ×10): 6 פריטים (2 מכל לוח)
- T2 (×3, ×4): 6 פריטים (3 מכל לוח)
- T3 (×6, ×9): 6 פריטים (3 מכל לוח)
- T4 (×7, ×8): 6 פריטים (3 מכל לוח)
- T5 (mixed/commuted): 6 פריטים (trending to harder)

IDs: `mult-001..030`.

### 6. אינטגרציה עם הסשן
ב-`session/page.tsx`:
- `import multBank from "@/content/math/multiplication.json";`
- `MULTIPLICATION_BANK`
- `bankForSkill` ← case `"multiplication"`.

### 7. `canonicalAnswer` / `isItemCorrect`
כבר עובדים דרך ה-guard. אין שינוי נוסף ב-items.ts מעבר להרחבת ה-guard.

## סדר מימוש
1. `types.ts` — Skill + MultItem + Item.
2. `items.ts` — `isArithmeticItem` widen.
3. `explain.ts` — `explainMultiplication` + ענף חדש.
4. `profiles.ts` — `allowedSkillsForAge(7..8)`.
5. `src/content/math/multiplication.json` — 30 פריטים ידניים.
6. `session/page.tsx` — import bank + switch case.
7. Tests: `multiplication.test.ts`, עדכון `profiles.test.ts`, `items.test.ts`, `explain.test.ts`.
8. Docs: ROADMAP + CHANGELOG + parent-guide §4.
9. ולידציה מלאה.

## סיכונים ומיטיגציה
| סיכון | מיטיגציה |
|-------|----------|
| Explain branches יוצרים צורה מוזרה של a/b symmetry (`2 × 5` מול `5 × 2`) | symmetrize דרך `times=min, unit=max`. שני המקרים נותנים explanation זהה. Test cover. |
| Default skip-count נהיה ארוך מדי (`7 × 8`: 8,16,24,32,40,48,56) | מקובל בגיל 7–8. אם יותר מדי — לחתוך אחרי 4–5 ערכים ולסיים ב-"..., התוצאה". |
| Skill union צובר type-narrowing complexity | guard `isArithmeticItem` מרכז — כל branch UI עובר דרכו |
| מאגר של 30 פריטים לא מכסה את כל הלוחות | Test מוודא שכל לוח 2..10 מופיע ≥ 1 פעם |
| פרופילים ישנים עם `allowedSkills: ["add_sub_100"]` בלבד | `loadProfiles` מחזיר נגזרת מגיל בכל טעינה — אוטומטי |

## הגדרת DoD
ראה `tasks/MATH-EVELYN-MULT-001/INSTRUCTIONS.md §הגדרת DoD`.
