# Plan — MATH-MVP-001

## מטרה
Scaffold + לולאת Model A (Mastery Gating + Adaptive Difficulty + SRS)
לבת 7, חיבור/חיסור עד 100, עברית RTL, localStorage.

## החלטות ארכיטקטורה

### 1. Test runner: **Vitest**
- Vite-native, TS ללא config נוסף, מהיר.
- Jest דורש `ts-jest` או Babel — overhead.
- חלופה: Node `--test` (built-in, אפס deps) — נדחה כי ESM + TS שברירי.

### 2. SRS algorithm: **Leitner 5-box**
- פשוט: item עולה box בתשובה נכונה, חוזר ל-box 1 בטעות.
- Intervals: 1, 2, 4, 8, 16 סשנים.
- SM-2 עדיף ל-long-term retention, אבל overkill ל-MVP + גיל 7.
- Trade-off: Leitner לא תלוי זמן רציף — בנוי סביב "סשנים", מתאים לסשן יומי.

### 3. State: **useReducer + localStorage**
- אין Redux/Zustand (constraint ב-INSTRUCTIONS).
- `useReducer` לסשן הפעיל, `localStorage` ל-`mastery_state_v1`.
- טעינה ב-`useEffect` כדי להימנע מ-SSR mismatch.

### 4. Item representation
```ts
type Item = {
  id: string;           // "add-2d-1d-001"
  skill: "add_sub_100";
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;       // "37 + 28 = ?"
  answer: number;
  operands: [number, number];
  op: "+" | "-";
};
```
Difficulty קבוע ב-bank (לא מחושב דינמית). 5 רמות × ≥6 items = ≥30.

### 5. Mastery score
- Running average על 10 attempts אחרונים (window).
- `mastery ∈ [0, 1]`. יעד: ≥ 0.8 לפני "מעבר" (UI hint בלבד ב-MVP).
- `selectNextItem`: difficulty מוצע = `round(mastery * 5) + jitter(±1)`, clamp ל-[1,5].

### 6. Session flow
- 10 items/session (קבוע ב-MVP; דינמי בטאסק עתידי).
- פידבק מיידי: ✓/✗ + התשובה הנכונה.
- Summary בסוף: accuracy %, mastery delta, הצעת סשן הבא.

## סדר מימוש
1. Config files (package.json, tsconfig, tailwind, next.config, postcss).
2. `src/lib/mastery.ts` + test.
3. `src/lib/srs.ts` + test.
4. `src/lib/adaptive.ts` + test (תלוי ב-mastery + srs).
5. `src/content/math/add-sub-100.json` (30+ items).
6. `src/app/layout.tsx` (RTL baseline).
7. `src/app/session/page.tsx` (UI + reducer + localStorage).
8. Update `CLAUDE.md` Commands.
9. Validation (דורש Node — יבוצע אחרי התקנה).

## Validation (אחרי npm install)
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- Manual: `npm run dev` → `localhost:3000/session` → 10 items כבת 7 →
  רענון → סשן 2 עם items שונים.

## סיכונים ומיטיגציה
| סיכון | מיטיגציה |
|-------|----------|
| Node לא מותקן | סימון מפורש למשתמשת; scaffold קבצים ידני; validation מחכה |
| RTL viewport (פס לבן) | `dir="rtl"` על `<html>` כברירת מחדל; בדיקה ידנית; fallback ל-container |
| SSR/localStorage mismatch | `useEffect` לטעינה, fallback למצב ריק ב-render ראשוני |
| Item bank מונוטוני | ≥ 6 items לכל רמת קושי, אופרציות חיבור וחיסור מעורבבות |

## Definition of Done (לפי INSTRUCTIONS)
ראה `tasks/MATH-MVP-001/INSTRUCTIONS.md` §Definition of Done.
