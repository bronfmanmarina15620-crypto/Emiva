# תוכנית — MATH-BAT9-001 (סלייס 1: שברים מבואיים)

## מטרה
לפתוח את ה-track של אמיליה (גיל 9) עם שברים בסיסיים: 5 סוגי פריטים, מאגר פריטים
של ≥ 25, רכיב SVG pictorial, אותה לולאת Model A (mastery/adaptive/SRS)
של MVP. אין פיצול של pipeline. אין שינוי למאגר הפריטים של אוולין.

## החלטות פדגוגיות נעולות
1. **חצי/שליש/רבע של מספר** — רק כפולות (חצי מ-12, שליש מ-9, רבע מ-8).
   אין תשובות חלקיות בסלייס הזה.
2. **שווי-ערך** — `2/4`, `1/2` שניהם נכונים כשהפריט שואל "מה החלק".
   פישוט אינו יעד בסלייס 1; המטרה שהילדה תזהה את השוויון, לא תבחר
   צורה "קנונית".
3. **תכולת סשן** — שברים בלבד. לא מערבבים עם add/sub-100 או ops-1000.

## החלטות ארכיטקטורה

### 1. צורת נתוני הפריט
```ts
type FractionItem = {
  id: string;                   // "frac-identify-001"
  skill: "fractions_intro";
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: "identify" | "name_to_visual" | "halving" | "compare" | "equivalent";
  prompt: string;               // Hebrew
  // Visual payload (for renderer)
  viz?: { parts: number; filled: number };
  // Answer — one of the shapes below per type
  answer: Answer;
  explanation: string;          // method-based, Hebrew, paired with pictorial on reveal
  external_test_eligible?: boolean;   // hook for MATH-EXTERNAL-TEST-001
};

type Answer =
  | { kind: "choice"; correct: string; options: string[] }
  | { kind: "numeric"; correct: number }
  | { kind: "fraction"; num: number; den: number };    // accepts equivalents
```

**הנמקה:** discriminated union לפי `type` (ולא פריט אחד גדול) — קריא ב-TS,
קל ל-render-branching. Answer כ-discriminated union מחייב handler ספציפי
שמבטיח ולידציה נכונה לכל סוג.

### 2. ולידציה של תשובות (shared lib)
`src/lib/fractions.ts`:

- `isCorrect(item: FractionItem, user: string): boolean`
  - `choice` → השוואת מחרוזות.
  - `numeric` → parse, integer compare (אחרי החלטה 1, תמיד שלם).
  - `fraction` → parse `"a/b"`, reduce via gcd, compare to reduced
    `{num, den}`. ⇒ גם `"2/4"` וגם `"1/2"` נכונים.
- `formatFraction(n, d)` → "1/2" (אחרי gcd, או non-reduced if provided).

### 3. `FractionViz` — רכיב SVG
- Horizontal bar 200×60. מחולק ל-`parts` סגמנטים שווים. `filled` הראשונים
  בסייג (`#7BA881`), השאר בקרם (`#FAF6EE`). Stroke דק (`#E8E2D4`).
- `role="img"` + `aria-label="{filled} מתוך {parts} חלקים"`.
- **אין תלות חיצונית** — SVG inline.
- Trade-off: horizontal bar עדיף על pie לחיתוך ראשוני — קריא יותר, תואם
  Singapore CPA (Bar Models יבואו אחר כך באותה שפה ויזואלית).

### 4. Session routing
ב-`src/app/session/page.tsx`:
- לקרוא `activeProfile.allowedSkills`.
- אם `fractions_intro ∈ allowedSkills` **ו**-`add_sub_100 ∉ allowedSkills`
  → fractions only (התנהגות לאמיליה).
- אם שניהם → לא רלוונטי בסלייס 1; נשאיר `if` שאומר "לא נתמך עדיין,
  fallback לראשון ברשימה" עם tests שמבטיחים את זה.
- `selectNextItem` צריך לקבל `skill` + `bank-of-that-skill` — אם כרגע
  חתום על `ItemBank` מסוג אחד, הקל ביותר: לעבור ל-`Record<Skill, Item[]>`
  ולבחור את ה-bank לפי `activeSkill`. **trade-off מול שני `bank` נפרדים**:
  map יותר גמיש לעתיד (ops-1000 slice), שני vars יותר explicit. בוחר map.

### 5. Age gating + storage keys
- `allowedSkillsForAge(age)`:
  - 7–8 → `["add_sub_100"]`
  - 8–10 → `["fractions_intro"]` (חופף ב-8; גיל 8 יפתח fractions אחרי שיסיים add-sub — מחוץ לסלייס, לא מטפלים עכשיו).
- Storage: `emiva.mastery.v1.{profileId}` כבר per-profile. צריך per-skill
  בתוך זה — `{profileId: {skill: {window, value, ...}}}`. **Migration**: אם
  localStorage קיים עם `{profileId: {window, value}}` ישן — לזהות ולהעטיף
  ב-`{add_sub_100: ...}`. לכתוב test ל-migration.

### 6. זרימת סשן לשברים
- 10 פריטים, מיקס של 5 הסוגים בהתאם לקושי הנוכחי.
- 3-attempt loop זהה.
- חשיפה בניסיון 3: `FractionViz` + `explanation` (משפט אחד, CPA-first).
- דוגמה להסבר טוב: "רואה? הסרגל מחולק ל-4 חלקים שווים, חלק אחד
  צבוע. זה בדיוק 1/4."
- Tone: אותן וריאציות של `feedback-messages.ts`. **אין** pool חדש בסלייס 1.

## סדר מימוש
1. `src/lib/types.ts` + `profiles.ts` — הרחבת Skill + allowedSkillsForAge.
2. `src/lib/fractions.ts` + test (ולידציה + equivalence + format).
3. `src/content/math/fractions-intro.json` — ≥ 25 פריטים, ≥ 4 per type,
   5 רמות קושי. כתיבה ידנית, לא generator, כדי לשמור על איכות ניסוח.
4. `src/components/FractionViz.tsx` + בדיקת שפיות ויזואלית ב-`npm run dev`.
5. עדכון `mastery`/adaptive storage ל-per-skill + test migration.
6. `src/app/session/page.tsx` — routing לפי skill. רכיב חדש
   `FractionItem` שמבצע render לפי `type`.
7. Tests: `fractions.test.ts`, `fractions-items.test.ts`, עדכון
   `profiles.test.ts` ו-`mastery.test.ts` בהתאם.
8. ולידציה מלאה: typecheck / lint / test / build / manual 2 personas.
9. `CHANGELOG.md` + `ROADMAP.md` עדכון.

## ולידציה
ראה `tasks/MATH-BAT9-001/INSTRUCTIONS.md §ולידציה נדרשת`.

## סיכונים ומיטיגציה
| סיכון | מיטיגציה |
|-------|----------|
| Migration של mastery שבורה → אוולין מאבדת היסטוריה | Test של migration חובה לפני PR; backup ידני דרך DevTools תועד ב-PR |
| אמיליה אומרת "משעמם" אחרי 3 פריטים — גישה לא מתאימה | סיכום סשן מציג תיעוד "מצאת X מתוך 10"; ניסוח warm; לרשום ל-FEEDBACK-LOG; אם חוזר — לפתוח slice חלופי |
| ה-pictorial לא מספיק ברור בגיל 9 | QA ידני עם שברים 1/2, 1/3, 1/6, 3/4 — 6 מקרים. אם לא קריא → להגדיל ל-240×72 |
| מאגר פריטים לא מאוזן (הרבה identify, מעט compare) | בדיקה בטסט: ≥ 4 per type |
| Tone-drift ב-explanations (15+ מחרוזות חדשות) | חובה banned-phrase scan לפני commit; כל explanation עובר סריקה |

## הגדרת DoD
ראה `tasks/MATH-BAT9-001/INSTRUCTIONS.md §הגדרת DoD`.
