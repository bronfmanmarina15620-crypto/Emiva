# INSTRUCTIONS.md — MATH-MVP-001

## Task Metadata
- task_id: MATH-MVP-001
- title: Emiva Math MVP — Core loop, bat 7, חיבור/חיסור עד 100
- owner: Marina (PM + CTO)
- priority: P0
- target_branch: feat/math-mvp-001
- due_date: TBD
- references:
  - `CLAUDE.md` (repo contract, stack, response format)
  - `MyLevel.docx` §3.1 (Core math, bat 7), §11 (מדידה והחלטות)
  - `progressive_schools_research.docx` (Model A — לא לדלג)
  - `master_curriculum.docx` (curriculum rationale)
  - `claude_md_instructions_recommendation.docx` (מקור התבנית הזו)

## Objective

לבנות את הלולאה הקטנה ביותר של **Model A** — Mastery Gating + Adaptive
Difficulty + Spaced Repetition — שמאפשרת לבת 7 לבצע סשן יומי אחד של
10–12 דקות על חיבור וחיסור עד 100, בעברית RTL, ולהחזיר מדד שליטה (%)
שמשפיע על הסשן הבא.

זו היחידה המוכיחה שה-Model A פועל בפועל בקוד. בלי היחידה הזו, אין מוצר —
רק תוכנית.

## In Scope

### מוצר
- ממשק עברית RTL (בת 7, desktop + tablet browser).
- סשן יחיד: `start → 8–12 items → summary → next-session preview`.
- מיומנות יחידה: **חיבור/חיסור עד 100**.
- 80% יעד הצלחה לפני פתיחת מיומנות הבאה (Mastery Gating — יעד המטרה,
  לא שיפצ'ור של גייטינג בין מיומנויות בטאסק הזה).
- **לולאת 3 ניסיונות לכל item** (עדכון 2026-04-19):
  - ניסיון 1 שגוי → "נסי שוב, נשארו 2 ניסיונות".
  - ניסיון 2 שגוי → "נסי שוב, ניסיון אחרון".
  - ניסיון 3 שגוי (או חשיפה) → הצגת התשובה + **הסבר מפורט לפי CPA**
    (פירוק/השלמה לעשרת, לפי סוג הפעולה).
  - **Mastery:** רק ניסיון 1 נכון סופר כ"נכון" לצורך mastery %. ניסיון
    2/3 נכון → הודעת "נכון אחרי התלבטות" אבל לא קרדיט.
  - Why: תרגול רב-ניסיוני תואם Mastery Learning + Singapore CPA; מונע
    תחושת כישלון מיידית, אבל שומר על מדד שליטה אמיתי.

### קוד
- Scaffold: Next.js 15 App Router, TypeScript strict, React 19, Tailwind.
- `<html lang="he" dir="rtl">` baseline — אבל `dir="rtl"` רק על container
  התוכן אם מתגלה בעיית viewport. ברירת מחדל: על `<html>`.
- מבנה:
  - `src/app/` — ראוט יחיד `/session`.
  - `src/lib/mastery.ts` — טיפוס `MasteryState` + `updateMastery()`.
  - `src/lib/adaptive.ts` — `selectNextItem(state, bank)` לפי קושי נוכחי.
  - `src/lib/srs.ts` — scheduler (Leitner 5-box או SM-2 פשוט).
  - `src/content/math/add-sub-100.json` — **מינימום 30 items** מתויגים
    לפי `difficulty: 1..5`.
  - `tests/unit/` — mastery, adaptive, srs.
- Persistence: `localStorage` בלבד. אין backend, אין DB, אין auth.
- עדכון `CLAUDE.md` → סעיף Commands עם `dev / build / test / typecheck / lint`.

## Out of Scope

- בת 9 (שברים, חלוקה ארוכה, Bar Models) → טאסק נפרד.
- קריאה בעברית, אנגלית → לפי CLAUDE.md, אחרי Math MVP.
- Word problems בהקשר כסף → טאסק נפרד (MATH-MONEY-001).
- Visualizations Concrete→Pictorial→Abstract (סינגפור) → טאסק נפרד.
- מבחן חיצוני תקופתי → טאסק נפרד (MATH-EXTERNAL-TEST-001).
- Backend, חשבונות משתמש, multi-device sync.
- Analytics, telemetry, OTEL, logs עם PII.
- Audio / animations / gamification מעבר לפידבק בסיסי.
- Production deploy, domain, CDN.
- תוכן Enrichment/Ambient.

## Required Inputs

### Code paths (pre-scaffold — ייווצרו):
- `src/app/layout.tsx`
- `src/app/session/page.tsx`
- `src/lib/mastery.ts`, `src/lib/adaptive.ts`, `src/lib/srs.ts`
- `src/content/math/add-sub-100.json`
- `tests/unit/{mastery,adaptive,srs}.test.ts`
- `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`

### Docs:
- `CLAUDE.md` (קיים)
- `MyLevel.docx` (קיים — §3.1, §11 רלוונטיים ישירות)

### Dependencies:
- Node ≥ 20, npm
- Next.js 15, React 19, TypeScript 5.x (strict), Tailwind 3.x
- Vitest או Jest לבחירת מפתח (יש לנמק בתוכנית)

## Constraints

- **אל תשנה:** `CLAUDE.md` — רק הוספה לסעיף Commands. `tasks/`, `plans/`
  רק יצירת קבצים חדשים לטאסק הנוכחי.
- **אל תכניס:** backend service, database, ORM, auth lib, analytics
  SDK, state manager חיצוני (Redux/Zustand) — React state + localStorage
  מספיקים ל-MVP.
- **זמן:** scaffold + loop בסשן ממוקד אחד. אם חורג — עצור והסבר.
- **פרטיות:** אין לשמור שם הבת, תמונה, קול, או כל PII. `localStorage`
  בלבד עם `mastery_state_v1`.
- **תאימות:** Chromium/Firefox/Safari עדכני, desktop + tablet. לא mobile
  native.
- **פדגוגיה:** יעד 80% הצלחה. Adaptive Difficulty חייב להיות נצפה
  (בחירת ה-item הבא משתנה לפי מצב).

## Deliverables

1. Scaffold עובד: `npm run dev` פותח `localhost:3000/session` בעברית RTL.
2. לולאת Model A עובדת end-to-end: 10 items, מדידת %, עדכון mastery,
   בחירת items הבאים לפי המצב.
3. Item bank: `add-sub-100.json` ≥ 30 items, מאוזן ב-5 רמות קושי.
4. Unit tests ירוקים:
   - `updateMastery` — שליטה עולה על תשובה נכונה, יורדת על שגויה.
   - `selectNextItem` — כשהשליטה נמוכה → item קל; גבוהה → קשה.
   - `srs` — item שנכשל חוזר מוקדם; item שהצליח נדחה יותר.
5. `CLAUDE.md` מעודכן: Commands section אמיתי.
6. `plans/MATH-MVP-001.md` — תוכנית ביצוע קצרה (מבנה קבצים, סדר מימוש,
   החלטות ארכיטקטורה, טרייד-אופים).
7. PR summary עם: קבצים שהשתנו, תוצאות validation, סיכונים שנותרו.

## Validation Required

לפני הכרזה על סיום:

- `npm run typecheck` — strict mode, ללא שגיאות.
- `npm run lint` — נקי.
- `npm test` — כל הטסטים ירוקים.
- `npm run build` — production build עובר.
- **Manual — golden path:** לפתוח `localhost:3000/session` ב-Chromium,
  לבצע סשן מלא של 10 items כבת 7, לוודא:
  - עברית RTL תקינה, אין פסי לבן בקצוות, מספרים קריאים.
  - mastery % מעודכן אחרי כל תשובה ונשמר ב-localStorage.
  - סשן שני אחרי רענון דף → items הבאים משתנים לפי mastery שנשמר.
- **Manual — edge cases:**
  - תשובה ריקה / לא מספרית → לא קורסת.
  - 10/10 נכון → mastery קרוב ל-100%, הצעת מעבר (UI בלבד, לא לוגיקה).
  - 0/10 → mastery לא יורד מתחת ל-0.

אם check לא רץ → לציין מפורשות ולהסביר.

## Working Instructions

1. לקרוא את `CLAUDE.md` ואז את הקובץ הזה.
2. **לפני קוד** — לכתוב `plans/MATH-MVP-001.md`: מבנה קבצים, סדר מימוש,
   3–5 החלטות ארכיטקטורה עם טרייד-אוף (Vitest vs Jest, Leitner vs SM-2,
   `useState` vs reducer, וכו').
3. להישאר בתוך Scope. לא להוסיף מיומנויות, תוכן, או אנימציות.
4. **שני מקרים קונקרטיים לפני הפשטה** (כלל CLAUDE.md). לא לבנות
   `GenericScheduler<T>` עבור skill אחד.
5. אם מתגלית ארכיטקטורה עדיפה שמשנה scope — **לעצור ולהסביר** לפני
   המשך.
6. בתוצר סופי — הדוח בפורמט CLAUDE.md (החלטה / למה נכון / 3 צעדים /
   סיכון).
7. סדרי עדיפויות בקונפליקט: **hooks > permissions > CI > קובץ זה >
   CLAUDE.md**.
8. כל דרישה שצריכה להיות policy קבועה → הצעה נפרדת לעדכון CLAUDE.md,
   לא הכנסה שקטה.

## Decision Rules

- נגיעה במספר מודולים → שינויים נפרדים וקריאים ל-review.
- פעולה מסוכנת (rm, force push, overwrite state קיים) → עצור, שאל.
- חסר הקשר → הצהר על הפער + הקלט המינימלי הנדרש.
- נחסם → תוצר מקסימלי בטוח חלקי, לא stall.
- חסרת החלטה פדגוגית (למשל: מה הקושי של "37+28"?) → שאלה אחת, לא ניחוש.

## Definition of Done

הטאסק נחשב "done" רק אם כל הבאים מתקיימים:

- [ ] Objective הושג: בת 7 מבצעת סשן 10-item end-to-end בדפדפן.
- [ ] Scope נשמר — לא נוספה מיומנות/שפה/תוכן מחוץ ל-Scope.
- [ ] כל Deliverables הופקו (1–7).
- [ ] כל Validation רץ והתוצאות דווחו.
- [ ] סיכונים שנותרו מתועדים ב-PR description.
- [ ] הדוח הסופי כולל: קבצים שהשתנו, סטטוס validation, פריטים פתוחים.
- [ ] `CLAUDE.md` מעודכן: Commands section משקף scaffold אמיתי.
- [ ] אין TODO ללא בעלים או follow-up location.

## Measurement Hooks (per CLAUDE.md §Measurement rule)

כל החלטה במוצר חייבת מדידה בשני ממדים — (א) proxy פנימי, (ב) מבחן
חיצוני. בטאסק הזה:

- **Proxy פנימי:** `mastery %` לכל item attempt; session summary:
  accuracy, items completed, time.
- **מבחן חיצוני:** מחוץ ל-scope של הטאסק (→ MATH-EXTERNAL-TEST-001).
  אבל הטאסק חייב **להשאיר hook** — פונקציה / קובץ ריק / ממשק —
  שהטאסק הבא יוכל להתחבר אליו. **לא לממש עכשיו. רק לא לחסום.**

## Risks & Mitigations

| סיכון | מיטיגציה |
|-------|----------|
| Item bank קטן מדי → adaptive לא נצפה | ≥ 30 items, 5 רמות קושי, ≥ 5 בכל רמה |
| Leitner מסובך מדי ל-MVP | Leitner 5-box פשוט; SM-2 רק אם נימוק חזק |
| RTL viewport bug (פס לבן) | בדיקה ידנית בכל דפדפן; `direction: rtl` על container אם צריך |
| localStorage quota / SSR mismatch | `useEffect` לטעינה; ללא שימוש ב-storage במהלך render |
| Scope creep לבת 9 / word problems | לסרב בתוך הסשן; לפתוח טאסק חדש |

## Handoff

- **PM → Eng:** אישור Scope + Constraints לפני פתיחת plan.
- **Eng → Review:** PR עם plan + code + tests + manual verification
  screenshots (אופציונלי).
- **Review → Done:** Merge רק אחרי DoD מלא.
