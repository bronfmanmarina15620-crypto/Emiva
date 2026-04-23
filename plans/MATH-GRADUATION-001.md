# תוכנית — MATH-GRADUATION-001

## מטרה
קריטריון פדגוגי ל"סיימת את הנושא" — 20 נכון-בניסיון-1, על פני ≥2 סשנים, במרווח ≥24h.
חגיגה מיוחדת בסוף סשן, telemetry חד-פעמי. בלי routing לנושא הבא (לא קיים).

## החלטות נעולות

### 1. מודל נתונים
הוספת שדה יחיד ל-`MasteryState`:
```ts
type MasteryState = {
  skill: Skill;
  attempts: Attempt[];
  srs: Record<string, ItemSrsState>;
  sessionCount: number;
  sessionTimestamps: number[];   // חדש — timestamps של תחילות סשנים
};
```

**למה array מלא ולא רק first+last?** עלות זניחה (מספר לכל סשן), מאפשר
ניפוי באגים ועתידית לוגיקה מורכבת יותר (למשל "≥3 סשנים בחודש"). אם
ממשיכים בגודל לאורך שנים — 365 numbers = ~3KB. לא בעיה.

### 2. First-attempt correct
כבר היום `session/page.tsx:210` כותב `finishItem(attempts === 0)` —
ה-boolean ב-`Attempt.correct` הוא כבר "נכון-בניסיון-1." לכן:
```ts
firstAttemptCorrect = state.attempts.filter(a => a.correct).length;
```
אין שינוי ל-flow של recording. רק קריאה חדשה בגרדואציה.

### 3. הקריטריון
```ts
const GRADUATION_MIN_CORRECT = 20;
const GRADUATION_MIN_SESSIONS = 2;
const GRADUATION_MIN_GAP_MS = 24 * 60 * 60 * 1000;

export function skillGraduated(
  state: MasteryState,
  now: number = Date.now(),
): { graduated: boolean; reason: string } {
  const correct = state.attempts.filter(a => a.correct).length;
  const sessions = state.sessionTimestamps.length;
  const span = sessions >= 1
    ? now - state.sessionTimestamps[0]
    : 0;
  // gap מחושב כמרווח בין הסשן הראשון לנוכחי. אם state אחרי session_end,
  // "עכשיו" ≈ סוף הסשן האחרון, שזה מה שאנחנו רוצים.

  if (correct < GRADUATION_MIN_CORRECT) {
    return { graduated: false, reason: `need_more_correct: ${correct}/${GRADUATION_MIN_CORRECT}` };
  }
  if (sessions < GRADUATION_MIN_SESSIONS) {
    return { graduated: false, reason: `need_more_sessions: ${sessions}/${GRADUATION_MIN_SESSIONS}` };
  }
  if (span < GRADUATION_MIN_GAP_MS) {
    return { graduated: false, reason: `need_more_time: ${Math.round(span/3600000)}h` };
  }
  return { graduated: true, reason: "ok" };
}
```

### 4. Migration של localStorage
`storage.ts` — `loadMastery` היום עושה `JSON.parse` ואם `skill` לא תואם,
מחזיר `emptyMastery`. נוסיף נורמליזציה שמגנה על שדות חסרים:

```ts
function normalize(raw: unknown, skill: Skill): MasteryState {
  if (!raw || typeof raw !== "object") return emptyMastery(skill);
  const r = raw as Partial<MasteryState>;
  if (r.skill !== skill) return emptyMastery(skill);
  return {
    skill,
    attempts: Array.isArray(r.attempts) ? r.attempts : [],
    srs: (r.srs && typeof r.srs === "object") ? r.srs : {},
    sessionCount: typeof r.sessionCount === "number" ? r.sessionCount : 0,
    sessionTimestamps: Array.isArray(r.sessionTimestamps) ? r.sessionTimestamps : [],
  };
}
```

**אין** bump של מפתח localStorage — שדה חסר = array ריק. רגרסיה-חופשי.

### 5. חותמת-זמן איפה?
`incrementSession` רץ ב-`session/page.tsx:125` בטעינת סשן חדש. שם יתווסף
`sessionTimestamps.push(now)`:

```ts
export function incrementSession(
  state: MasteryState,
  now: number = Date.now(),
): MasteryState {
  return {
    ...state,
    sessionCount: state.sessionCount + 1,
    sessionTimestamps: [...state.sessionTimestamps, now],
  };
}
```

### 6. UI החגיגה — איפה
ב-`summary` phase ב-`session/page.tsx`. לפני MasteryJar (כלומר, מעל), אם
`skillGraduated(state).graduated === true` **ו**-הדגל one-shot לא הופעל —
בלוק נפרד עם כותרת, הודעה ו-CTA משוב.

**Copy (growth-mindset, CLAUDE.md §טון):**
- כותרת: "סיימת את הנושא! 🎉"
- גוף: "עבדת קשה ולמדת המון. פרק חדש מחכה לך בקרוב."
- מישני: "ההורה שלך תקבל התראה שהגיע הזמן לקוריקולום הבא."

אין כפתור "לנושא הבא" — אין נושא הבא. יש "סשן חדש" (לשמור על התרגול)
ו-"החלפת משתמשת."

### 7. Telemetry חד-פעמי
דגל localStorage: `emiva.graduated.v1.{profileId}.{skill}` = `"1"`.
- אם `graduated === true` ו-הדגל ריק → log `skill_graduated` + set flag.
- פעם הבאה — הדגל קיים, לא עושים כלום.

חדש ב-`telemetry.ts`:
```ts
| { t: "skill_graduated"; at: number; skill: string; firstAttemptCorrect: number; sessionCount: number; gapMs: number }
```

### 8. Celebration (UI motion)
להשתמש ב-`fireCelebration` הקיים — אותם צבעים, אולי יותר חלקיקים (120
במקום 80) כדי להבחין. לא קוד חדש גדול; פונקציית wrapper `fireGraduation()`
שקוראת ל-confetti עם פרמטרים גדולים יותר. אם `prefersReducedMotion` — דילוג.

## סדר מימוש

1. `src/lib/types.ts` — הוספת `sessionTimestamps: number[]` ו-constants.
2. `src/lib/mastery.ts` — עדכון `emptyMastery`, `incrementSession`, הוספת `skillGraduated`.
3. `src/lib/storage.ts` — נורמליזציה על loadMastery.
4. `tests/unit/mastery-graduation.test.ts` (חדש) + `tests/unit/storage.test.ts` (הרחבה).
5. `src/lib/telemetry.ts` — הוספת `skill_graduated` event.
6. `src/app/session/page.tsx` — חגיגה ב-summary + דגל one-shot + telemetry.
7. עדכון `docs/parent-guide.md §4` ו-§10.
8. עדכון `ROADMAP.md` (Done) + `CHANGELOG.md` (Unreleased).
9. ולידציה: typecheck / lint / test / build / manual.

## סיכונים ומיטיגציות

| סיכון | מיטיגציה |
|-------|----------|
| דגל one-shot נמחק → חגיגה כפולה | מוסיף comment שה-flag מכוון — אם המשתמש מאפסת localStorage, מקבלים שוב. מקובל. |
| ילדה "צוברת" 20 corrects בסשן אחד ובסשן שני אחרי 24h עם 0 corrects → עדיין graduation | מקובל ב-v1 — הדרישה "20 corrects + 2 sessions + 24h" כפי שמוצע ב-parent-guide. אם יתברר כבעיה — מחמירים. |
| TypeScript strict יתלונן על partial raw ב-normalize | שימוש ב-`Partial<MasteryState>` cast + בדיקות runtime |
| Constants hard-coded → קשה לכוון בהמשך | exported מ-`types.ts`, אפשר override ב-tests |
| חותמת זמן מ-`Date.now()` קשה לטסט | כל הפונקציות מקבלות `now?: number` parameter |
