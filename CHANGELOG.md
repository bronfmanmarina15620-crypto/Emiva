# Changelog — Emiva

כל השינויים המשמעותיים ב-Emiva. מבוסס על [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
תאריכים בפורמט `YYYY-MM-DD`.

## [Unreleased]

### Added — תשתית בדיקות UI + כיסוי
- **תשתית Vitest + jsdom + @testing-library** נוספה.
  `vitest.config.ts` משתמש ב-`environmentMatchGlobs` כדי להריץ `tests/ui/**.tsx`
  תחת jsdom תוך שמירה על כל בדיקות ה-Node-env הקיימות ללא שינוי.
  `tests/ui-setup.ts` מחבר את matchers של `jest-dom` + ניקוי לכל בדיקה.
  ESBuild JSX הוגדר ל-`automatic` כך שבדיקות לא צריכות `import React`.
- **`FeelingPrompt` חולץ** ל-`src/components/FeelingPrompt.tsx`
  כדי שאפשר יהיה לבדוק אותו במבודד. דף הסשן מייבא אותו.
- **בדיקות UI:**
  - `tests/ui/feeling-prompt.test.tsx` (5 מקרים): מרנדר 3 כפתורים
    מתויגים, כל אמוג'י מפעיל את ה-`onRate(...)` הנכון, מצב post-rating
    מסתיר כפתורים ומראה הודעת תודה.
  - `tests/ui/parent-page.test.tsx` (10 מקרים): setup דוחה אישור לא
    תואם, דוחה PIN קצר מדי, PIN תקין שומר hash + מנווט; login עם PIN
    נכון מנווט, שגוי מראה ניסיונות שנותרו, 3 שגויים מפעילים math-gate;
    תשובה נכונה ל-math-gate מוחקת PIN, שגויה נועלת.
  - `tests/ui/parent-dashboard-page.test.tsx` (9 מקרים): route guard
    מנווט ל-`/parent` כשאין PIN, מצב ללא-פרופילים מרנדר רמז, כרטיסי
    בנות מרנדרים עם מספר אריחי-מיומנות נכון לגיל (2 ל-7–8, 4 ל-9–10),
    שליחת פתק אמונה מחליפה לתצוגת השוואה, בורר kind מוגדר כברירת
    מחדל ל-`performance` ומחליף, השוואת feeling-kind מראה פעילות
    בלי אחוז דיוק.
  - `tests/ui/home-reminder.test.tsx` (4 מקרים): קישור *"הורים"*
    קיים, בלי נקודה אם אין אירועים, בלי נקודה לפתיחות קרובות, נקודה
    מרונדרת אם הפתיחה האחרונה לפני > 14 יום.
- **מספר הבדיקות:** 259 → **287 עוברות** (+28). Build, typecheck, lint
  כולם נקיים.

### Added — שכלולי דשבורד הורה V1.1
- **תגית kind לפתק אמונה.** טופס הפתק עכשיו שואל אם הפתק הוא על
  *ביצועים* / *רגש* / *אחר*. ה-storage שומר את ה-kind; תצוגת ההשוואה
  מסתגלת — לפתקי `feeling`, הדשבורד מראה פעילות (סשנים + דקות)
  במקום אחוז דיוק (כי "היא עצובה" + "55% נכון" = תפוחים מול תפוזים).
  פתקי legacy ללא kind מתנרמלים ל-`"other"`.
- **אזהרת מדגם קטן.** השוואת אמונה מסמנת `lowSample: true` כש-
  פחות מ-10 ניסיונות הצטברו מאז הפתק. ה-UI מוסיף *"(מעט נתונים עדיין)"*
  כדי לצמצם קריאת-יתר של אחוזים רועשים.
- **הדגשת נתונים חלשים.** כשיש ≥ 10 ניסיונות ו-< 50% נכון-בראשון
  מאז הפתק, ההשוואה מרונדרת על רקע mustard-soft —
  אות "המספרים לא מסכימים עם מה שכתבת; שווה מבט".
- **פרומפט רגש בסוף סשן.** דף הסיכום מראה כפתורי 😊 / 😐 / 😟
  ("כיף / בסדר / קשה") שמתעדים אירוע telemetry חדש `session_feeling`.
  הדייג'סט של דשבורד ההורה מצבר ספירות לכל שבוע לכל בת.
- **מטריקת דקות שבועיות.** `computeWeeklyMinutes` מצמיד `session_start`
  ל-`session_end` (מוגבל ל-30 דקות לסשן), מציג סה"כ לכל
  בת בדייג'סט השבועי. מכסה את יעד הזמן של CLAUDE.md §5 (10–15 דק'/יום).
- **חץ מגמה.** `computeTrend` משווה first-try % של 7 ימים אחרונים
  מול 7 הקודמים; מציג ↑/↓/→ בכותרת כרטיס הבת. סף ±5pp; לא מראה
  כלום כשלאחד החלונות יש פחות מ-10 ניסיונות.
- **נקודת תזכורת להורה.** קישור "הורים" בדף הבית מציג נקודה
  ב-terracotta אם עברו > 14 יום מאז האירוע `dashboard_opened` האחרון
  — מטפל בפער pull-vs-push במנגנון Bergman תחת אילוץ ה-no-server.
- **קבועים חדשים** ב-`src/lib/types.ts`: `BELIEF_LOW_SAMPLE`,
  `BELIEF_WEAK_PCT`, `TREND_DELTA_PCT`, `REMINDER_DAYS`, `MAX_SESSION_MS`.
- **בדיקות:** קובץ הבדיקות parent-dashboard גדל מ-25 ל-40 מקרים (קבוצות
  חדשות: `computeWeeklyMinutes`, `computeSessionFeelings`, `computeTrend`,
  `computeParentReminderNeeded`, שדות חדשים של belief-comparison).
  parent-belief קיבל 2 מקרים (שמירת kind, נרמול legacy).
  סך הבדיקות: **242 → 259 עוברות**.

### Added — MVP של דשבורד הורה (DASHBOARD-PARENT-001)
- **נתיב חדש `/parent`** — כניסה עם PIN + math-gate. ביקור ראשון: הגדרת
  PIN של 4–6 ספרות (נשמר כ-hash SHA-256, לעולם לא plaintext). Login
  מאמת מול ה-hash. 3 כשלים → math-gate של הכפלת 2 ספרות אקראית;
  תשובה נכונה מאפסת את ה-PIN, תשובה שגויה נועלת את האזור ל-5 דקות.
- **נתיב חדש `/parent/dashboard`** — דשבורד מבוסס-verdict לכל בת:
  - **תגית verdict** (*"על המסלול" / "כדאי לשים לב" / "בואי נדבר"*),
    מחושבת מחוסר-פעילות + first-try % + אותות wheel-spinning.
    כלל "הגרוע מכולם"; בלי traffic-light על האדם עצמו.
  - **שורת פעולה בהזמנה אוטונומית** — משפט עברי אחד
    שמתחיל ב-*"את יכולה להציע / להזמין"*. עדיפות: wheel-spin →
    חוסר-פעילות → SRS due → ברירת מחדל. בדיקה של ביטויים
    אסורים אוכפת שציוויים לעולם לא מופיעים.
  - **שורת "סיבה אפשרית"** — שם את המיומנות החלשה אפסטרים כש-
    ה-verdict אינו "על המסלול" (שברים → חיבור/חיסור, long_division
    → multiplication וכו'). בהשראת Squirrel AI.
  - **רשת אריחי-מיומנות** לכל בת (2 אריחים לגיל 7–8,
    4 לגיל 9–10), צבועים לפי מצב שליטה: לא-התחילה / בתהליך /
    שלטה (דרך `hasGraduatedFlag`).
  - **חיווי תקיעות (wheel-spinning)** לכל מיומנות — נורה ב-≥ 20 ניסיונות,
    ≥ 3 סשנים, ≤ 40% נכון-בראשון ב-20 האחרונים.
  - **טופס תיקון אמונה** — ערך טקסט אחד לכל שבוע ISO,
    מוצג לצד מטריקות שנצפו מאז הפתק. מקודד את הראייה הסיבתית של Bergman 2021.
  - **כרטיס דייג'סט שבועי** בראש — באנטומיית Bark (סה"כ ניסיונות ·
    מיומנויות חדשות שנשלטו · ספירת wheel-spin · המלצה אחת).
  - **Timeout של חוסר-פעילות (3 דקות)** מחזיר ל-login — "הדשבורד
    סגור כשהילדה נוכחת" הוא חוק מוצר, לא טיפ.
- **ספריות חדשות:** `src/lib/parent-auth.ts` (PIN hash דרך `crypto.subtle`,
  math-gate), `src/lib/parent-belief.ts` (מפתחות שבוע ISO + פתקים
  שבועיים), `src/lib/parent-dashboard.ts` (verdict / שורת-פעולה /
  wheel-spin / אריחים / השוואת-אמונה / דייג'סט שבועי — כולם פונקציות
  טהורות, כולם מקבלים `now?: number`).
- **קבועים חדשים** ב-`src/lib/types.ts`: `WHEEL_SPIN_MIN_ATTEMPTS`,
  `WHEEL_SPIN_MIN_SESSIONS`, `WHEEL_SPIN_THRESHOLD_PCT`,
  `INACTIVITY_DAYS_WATCH`, `INACTIVITY_DAYS_TALK`,
  `WATCH_FIRST_TRY_PCT`, `WATCH_DROP_DELTA_PCT`, `DASHBOARD_TIMEOUT_MS`.
- **אירועי telemetry חדשים:** `dashboard_opened` (תחת מפתח parent-scoped
  `_parent`), `belief_submitted` (לכל בת), `action_line_shown`
  (לכל בת, עם trigger).
- **פוטר דף הבית:** קישור עדין "הורים" ל-`/parent` (לא כפתור, לא
  בולט — דפוס ה"נתיב הנסתר").
- **ADR-003 — עיצוב דשבורד הורה** נועל את העיצוב
  verdict-first / invitation-framed / belief-correction, ודוחה
  במפורש: השוואה בין אחיות, traffic-light על אדם, gamification של
  הורה streak, push של סשן בזמן-אמת, שורת פעולה בציווי.
- **כלל נתיב `.claude/rules/parent-dashboard-guardrails.md`** אוכף
  את ה-ADR ברמת היקף-קובץ + דורש סנכרון parent-guide
  בכל שינוי מטריקות/verdicts/ספים.
- **parent-guide.md §10 "האזור להורים"** — הסבר למשתמשת,
  עם הפניה לפי סוג מקור מחקר (קוגניטיבי / פרקטיקה).
- **Eval של falsifier** `evals/backlog/dashboard-followthrough.eval.ts` —
  נהפך לאדום אחרי 4 שבועות אם Marina שלחה < 2 פתקי אמונה ופתחה את
  הדשבורד < 8 פעמים. התחייבות מראש לכנות אם העיצוב לא מצדיק את מקומו.
- **בדיקות:** `parent-auth.test.ts` (11 מקרים), `parent-belief.test.ts`
  (10 מקרים), `parent-dashboard.test.ts` (17 מקרים: verdict,
  wheel-spin, שורת-פעולה, סיבה-אפשרית, אריחים, דייג'סט, audit
  ביטויים אסורים). ארבעה סבבי מחקר לפני המימוש; ה-log המלא
  ב-[tasks/DASHBOARD-PARENT-001/research.md](tasks/DASHBOARD-PARENT-001/research.md).

### Added — מיומנות bar_models (MATH-EMILIA-BARMODELS-001)
- **מיומנות חדשה `bar_models`** — בעיות מילוליות בסגנון סינגפור עם
  דיאגרמות-bar. נפתחת לגיל 9–10, מסודרת אחרי `long_division`.
- **טיפוס חדש `BarModelItem`** + `BarModelBar` + `BarModelSegment`.
  הפריטים נושאים prompt בעברית, 1–2 bars (כל אחד עם סגמנטים מתויגים
  ותוויות total/row אופציונליות), תשובה מספרית, והסבר CPA בעברית.
- **מאגר פריטים:** 30 פריטים ב-5 דרגות (`src/content/math/bar-models.json`).
  T1: bar בודד part-whole, ספרה בודדת. T2: part-whole של 2 ספרות.
  T3: השוואה של שני bars. T4: דו-שלבי + פירוק ל-חלקים מרובים.
  T5: סגנון יחס ("פי X", קבוצות).
- **רכיב חדש `BarModelViz`** (`src/components/BarModelViz.tsx`):
  מרנדר SVG לא-אינטראקטיבי. רקע cream, מילוי sage לסגמנטים,
  border sage מקווקו לסגמנטים לא-ידועים, תוויות עברית RTL, תוויות
  row אופציונליות ותוויות total תחתיות. רספונסיבי דרך `viewBox`.
- **דף סשן:** `ItemPrompt` מרנדר את הבעיה + דיאגרמת-bar;
  `ItemInput` עושה שימוש חוזר במסלול numeric; `ItemReveal` מראה שוב
  את ה-bar עם התשובה + הסבר השיטה.
- **`isItemCorrect` / `canonicalAnswer`** הורחבו ל-`bar_models` (השוואה
  של מספר שלם).
- **בדיקות:** `tests/unit/bar-models.test.ts` (11 מקרים: גודל, פיזור
  דרגות, תשובות שלמות חיוביות, 1–2 bars, ≥1 `?` לפריט, משקלי סגמנט
  חיוביים, סריקת ביטויים אסורים, אינטגרציה).
  `profiles.test.ts` עודכן לגיל 9–10 שמחזיר 4 מיומנויות.
  סה"כ: **196 עוברות** (היה 185).

### Added — מיומנות long_division (MATH-BAT9-003)
- **מיומנות חדשה `long_division`** — חילוק עם מנות שלמות, בלי שאריות.
  נפתחת לגיל 9–10, מסודרת אחרי `ops_1000`.
- **מאגר פריטים:** 60 פריטים ב-5 דרגות (`src/content/math/long-division.json`).
  T1: בסיסי (תשובה ≤ 10). T2: 2 ספרות ÷ ספרה בודדת (תשובה ספרה בודדת).
  T3: 2 ספרות (תשובה 11–20). T4: 3 ספרות (תשובה ≤ 30). T5: 3 ספרות (תשובה 30–72).
  כולם מתחלקים ללא שאריות.
- **טיפוס חדש `DivisionItem`** + הרחבת `isArithmeticItem`. אותו input
  numeric, אותו דפוס reveal. כלל גודל ה-prompt הורחב: חילוק של 3 ספרות
  משתמש ב-`text-5xl`.
- **ענף החילוק ב-`explain.ts`:** מקרים קטנים משתמשים במסגרת ספירה;
  מקרי 3 ספרות מזכירים שלבי חילוק ארוך. כל חשיפה כוללת את בדיקת ההכפלה
  (`B × answer = A`).
- **בדיקות:** `tests/unit/long-division.test.ts` (10 מקרים: גודל מאגר, פיזור
  דרגות, אינווריאנט חילוק-ללא-שארית, טווח מחלק, regex של prompt,
  אינטגרציה). `items.test.ts` +4 (narrowing, correctness, canonical).
  `explain.test.ts` +3 (small, 2-digit, 3-digit). `profiles.test.ts` עודכן.
  סה"כ: **185 עוברות** (היה 168).

### Added — הרחבת מאגרים, ריכוך קושי, הטיה נגד חזרות
- כל ארבעת מאגרי המתמטיקה הורחבו ל-≥60 פריטים: `add_sub_100` (30→60),
  `multiplication` (30→60), `ops_1000` (30→60), `fractions_intro` (26→60).
- `selectNextItem` עכשיו משתמש ב-`DIFFICULTY_TOLERANCE = 1` — ה-pool כולל
  פריטים בטווח ±1 מקושי היעד, כך שכל סשן שואב מבערך פי 3 מה-pool הקודם.
- `MasteryState.itemLastSeen: Record<itemId, sessionCount>` חדש. דף הסשן
  רושם `recordItemShown` על כל פריט first/next. שוויון בתוך סבולת
  נפתר עכשיו לפי טריות — הכי רחוק נבחר.
- כל ה-saves הקיימים מנרמלים `itemLastSeen` חסר ל-`{}`; בלי migration.

### Added — מחיקת פרופיל + בדיקת טווח גיל
- דף הבית: כל שורת פרופיל עם כפתור `×`. `deleteProfile(id)`
  מוחקת את הפרופיל ומנקה mastery, דגלי graduation, timestamp של
  סשן אחרון, ו-telemetry לכל הפרופיל. הפרופיל הפעיל נמחק אם נמחק.
- `purgeProfileStorage` ב-`storage.ts` סורק את כל המפתחות תחת `emiva.*.{profileId}`.
- `/profiles/new` הידק input גיל ל-7–10 (היה 3–18); מצב `submitting`
  מונע submit כפול. פרופילים עם גיל מחוץ לטווח בדף הבית
  מציגים "אין תוכן" ב-terracotta.
- בדיקות: `profiles.test.ts` +4 מקרי מחיקה. `storage.test.ts` הורחב עם
  בדיקת נרמול pre-graduation schema.

### Added — מיומנות multiplication (MATH-EVELYN-MULT-001)
- **מיומנות חדשה `multiplication`** — לוחות הכפל 2–10. נפתחת
  לפרופילי גיל 7–8, מסודרת אחרי `add_sub_100`.
- **טיפוס חדש `MultItem`** — מבנית דומה ל-`AddSubItem` אבל `op: "*"`.
  union של `Item` הורחב; guard של `isArithmeticItem` עכשיו מצר ל-
  `AddSubItem | MultItem`, כך ש-UI קיים של סשן זורם דרך בלי שינוי.
- **מאגר פריטים:** `src/content/math/multiplication.json` — 30 פריטים ב-5
  דרגות. מכסה כל לוח 2–10. דרגות: T1 (עוגני ×2/×5/×10) →
  T2 (×3/×4) → T3 (×6/×9) → T4 (×7/×8) → T5 (מעורב / קומוטציה קשה).
- **חשיפות מבוססות-שיטה ב-`src/lib/explain.ts`:**
  - ×2 → הכפלה (`4 × 2 = 4 + 4 = 8`)
  - ×10 → להוסיף אפס
  - ×5 → עוגן "חצי של ×10" (`4 × 5 = חצי של 4 × 10 = 20`)
  - ×9 → טריק "×10 פחות אחד" (`7 × 9 = 70 − 7 = 63`)
  - ברירת מחדל → ספירה בדילוגים של קבוצות (`3 × 7 = 3 קבוצות של 7: 7, 14, 21`)
  - רשימות skip-count ארוכות מקוצרות ל-4 תחנות + `...`
  - זיהוי עוגן agnostic לקומוטציה (`2 × 7` ו-`7 × 2` שניהם ממוסגרים כ-×2)
- **Routing אוטומטי:** כשאוולין מסיימת graduation של `add_sub_100`, הסשן
  בוחר `multiplication` דרך `pickActiveSkill` קיים. בלי קוד routing חדש.
- **בדיקות:** `tests/unit/multiplication.test.ts` (12 מקרים: גודל, פיזור
  דרגות, עקביות op, כיסוי מלא של לוחות 2–10, regex של prompt,
  אינטגרציה). `tests/unit/items.test.ts` +4. `tests/unit/explain.test.ts`
  +7 (כל עוגן + ברירת מחדל + קיצור). `tests/unit/profiles.test.ts`
  עודכן למיפוי גיל 7–8 חדש. סה"כ בדיקות: **162 עוברות** (היה 139).

### Added — מיומנות ops_1000 (MATH-BAT9-002)
- **מיומנות חדשה `ops_1000`** — פעולות חיבור/חיסור עם מספרים עד 999. נפתחת
  לפרופילי גיל 9–10, מסודרת אחרי `fractions_intro`.
- **מאגר פריטים:** `src/content/math/ops-1000.json` — 30 פריטים ב-5 דרגות
  (3 ספרות + 1 ספרה → 3 ספרות + 3 ספרות עם multi-carry). 15 חיבור + 15 חיסור.
  כל התשובות מוודאות בזמן-בדיקה מול `operands + op` (בדיקה מחושבת).
- **Routing אוטומטי אחרי graduation:** `pickActiveSkill(allowed, profileId)` ב-
  `src/app/session/page.tsx` בוחר את המיומנות הראשונה שלא עשתה graduation מתוך
  `allowedSkills`. כשאמיליה מסיימת graduation של `fractions_intro`, הסשן הבא
  מופנה אוטומטית ל-`ops_1000`. בלי פעולת הורה מפורשת.
- **הרחבת טיפוס:** `AddSubItem.skill` עכשיו מקבל `"add_sub_100" | "ops_1000"`.
  אותה צורה numeric, אותה לוגיקת `isItemCorrect`, אותם חשיפות `explain.ts`
  מבוססות-שיטה. הוסף עוזר type-guard `isArithmeticItem(item)` ל-
  `src/lib/items.ts` כדי למנוע בדיקות `skill === "..."` מפוזרות.
- **גודל prompt:** פריטי `ops_1000` מרונדרים ב-`text-5xl` (ירידה מ-`text-7xl`)
  כך ש-prompts של 3 ספרות + 3 ספרות כמו `347 + 256 = ?` לא גולשים בטאבלטים.
- **בדיקות:** `tests/unit/ops-1000.test.ts` (13 מקרים: גודל מאגר, פיזור דרגות,
  איזון חיבור/חיסור, עקביות תשובה מחושבת, טווח, מבנה דרגה-1/דרגה-5,
  regex של prompt, אינטגרציה עם `isItemCorrect`).
  `tests/unit/items.test.ts` הורחב (+8 מקרים: `isArithmeticItem` narrowing,
  `isItemCorrect` + `canonicalAnswer` + `itemSkill` ל-`ops_1000`).
  `tests/unit/profiles.test.ts` עודכן למיפוי age→skill חדש.
  סה"כ בדיקות: **139 עוברות** (היה 118).

### Added — Graduation של מיומנויות (MATH-GRADUATION-001)
- **קריטריון בקוד:** `skillGraduated(state)` ב-`src/lib/mastery.ts`. שלושה
  תנאים, כולם נדרשים: ≥ 20 תשובות נכונות בניסיון-1, ≥ 2 סשנים שונים,
  ≥ 24 שעות בין הסשן הראשון לאחרון. קבועים ב-`types.ts`
  (`GRADUATION_MIN_CORRECT`, `GRADUATION_MIN_SESSIONS`, `GRADUATION_MIN_GAP_MS`).
- **מעקב timestamps של סשן:** `MasteryState.sessionTimestamps: number[]`
  נדחף בכל `incrementSession(...)`. Saves מקוריים ללא השדה
  מתנרמלים ל-`[]` דרך `normalizeMastery` ב-`storage.ts` — בלי שלב migration,
  בלי רגרסיה להתקדמות הקיימת של אוולין/אמיליה.
- **UI של graduation:** דף סיכום סשן מראה באנר ייעודי עם מסגרת sage
  כשיש graduation ("סיימת את הנושא! 🎉"). עוצמת הקונפטי עולה
  (`fireGraduation`). מכבד reduced-motion.
- **Telemetry חד-פעמי:** אירוע `skill_graduated` נרשם בדיוק פעם אחת לכל
  `profileId × skill` דרך דגל localStorage `emiva.graduated.v1.{profileId}.{skill}`
  (`hasGraduatedFlag` / `markGraduated` ב-`storage.ts`).
- **בדיקות:** `tests/unit/mastery-graduation.test.ts` (7 מקרים: ריק, מתחת-נכונות,
  סשן-1, <24 שעות, כל שלושה מתקיימים, רק ניסיון-ראשון, מונוטוניות).
  `tests/unit/storage.test.ts` הורחב (+4 מקרים: pre-graduation schema מנרמל,
  היעדר/קיום דגל/בידוד-פרופיל). סה"כ בדיקות: **118 עוברות** (היה 107).

### Added — מסמכים פונים להורה
- [docs/parent-guide.md](docs/parent-guide.md) — מדריך הורה בעברית, 10 סעיפים: מנגנון המוצר (3-ניסיונות, level-up, SRS-Leitner, graduation) + ההקשר הפדגוגי מ-MyLevel (זמן סשן מומלץ, מבחן חיצוני רבעוני, טבלת החלטה להורה, בדיקת תשתית שינה/קריאה/זמן-ריק/אווירה). §4 עודכן מ-proposed ל-implemented בעקבות MATH-GRADUATION-001. Source-of-truth pointers למקומות בקוד שמקודדים את הכללים.

## [0.2.0] — 2026-04-19

פרוסה שנייה: מסלול המתמטיקה של אמיליה נפתח — שברים מבוא.

### Added — שברים מבוא (MATH-BAT9-001 slice 1)
- מיומנות חדשה `fractions_intro`, פתוחה לגילאי 9–10.
- מאגר פריטים: 26 פריטים, 5 דרגות קושי, 5 סוגי פריט (identify, name_to_visual, halving, compare, equivalent).
- `src/lib/fractions.ts` — gcd, reduce, parse, equivalence, validation. מקבל כל צורה שווה-ערך לפריטי identify (`2/4` ו-`1/2` שניהם נכונים).
- `src/components/FractionViz.tsx` — SVG של bar אופקי עם חלקים ממולאי sage על רקע cream (Singapore CPA pictorial).
- חשיפה מבוססת-שיטה: viz של שבר + הסבר משפט אחד לפריט, תואם `CLAUDE.md §כלל UX של תרגול`.
- דף הסשן מתפצל לפי מיומנות פרופיל: גיל 7–8 → `add_sub_100`, גיל 9–10 → `fractions_intro`.

### Changed — שמירת mastery לכל מיומנות
- `emiva.mastery.v1.{profileId}` → `emiva.mastery.v1.{profileId}.{skill}`.
- Migration אוטומטי חד-פעמי בטעינה ראשונה של מפתח legacy; ערכי legacy פגומים נזרקים בלי לקרוס.
- בידוד mastery לכל מיומנות: ההתקדמות של אוולין ב-add/sub וההתקדמות של אמיליה בשברים עצמאיות.

### Added — הנדסה
- `src/lib/items.ts` — מתאם skill-agnostic (`isItemCorrect`, `canonicalAnswer`).
- 45 בדיקות חדשות ב-4 קבצים: אימות שברים (15), שלמות מאגר (8), migration של storage (7), מתאם items (14), גזירה-מחדש של profiles (1). סה"כ בדיקות: **107 עוברות** (היה 61).

### Fixed — `allowedSkills` מיושן בפרופילים קיימים
- `loadProfiles` עכשיו גוזר מחדש את `allowedSkills` מהגיל בכל קריאה. בעבר, פרופיל שנוצר לפני עדכון קוריקולום שמר את ה-`allowedSkills: []` המיושן שלו, וגרם למסך "בקרוב" להופיע לאמיליה גם אחרי הרחבת הקוריקולום. עכשיו שינויים בקוריקולום מתפשטים לפרופילים קיימים אוטומטית.

### Changed — ממשל CLAUDE.md
- `§פורמט תגובה` ארגון מחדש: נוסף **Micro tier** (ack / error / small explanation), tokens של `IMPORTANT` על שני חוקים קריטיים, חוק פורמט (פרוזה אלא אם לרשימה ≥ 3 פריטים), נורמת "בלי 'צודקת'", scaffold מסומן במפורש "כשמתאים".
- הובהר ש-`MyLevel.docx` = `master_curriculum.docx` (אותו קובץ, שם legacy).
- `§קצב טקסים` עכשיו מפנה ל-[ADR-002](docs/adr/002-scheduled-rituals.md) במקום placeholder של `ADR-0xx`.

### Added — תשתית (ADR-002)
- GitHub repo (פומבי): `bronfmanmarina15620-crypto/Emiva`.
- שני טריגרים של `/schedule` מרחוק: devlog שבועי (ו' 18:00 IDT) + אבן-דרך חודשית (ה-1 09:00 IDT).
- [ADR-002 — טקסים מתוזמנים](docs/adr/002-scheduled-rituals.md) מקודד את תיקון סיכון הציות לקצב שזוהה ב-ADR-001.

### פתוח וידוע
- `MATH-BAT9-002` (פעולות עד 1000) ו-`MATH-BAT9-003` (חילוק ארוך) עוד לא התחילו.
- `MATH-EMILIA-BARMODELS-001` — Bar Models לבעיות מילוליות — עוד לא התחיל.
- QA ידני מלא של סשן שברים של אמיליה לא הושלם (באג של פרופיל מיושן קטע ניסיון ראשון; התיקון אומת דרך בדיקת יחידה, לא דרך סשן מלא בדפדפן).

## [0.1.0] — 2026-04-19

יום ראשון: pre-scaffold → MVP פועל עם מותג + בידוד לכל פרופיל.

### Added — MVP של מתמטיקה (MATH-MVP-001)
- Scaffold של Next.js 15 App Router + TypeScript strict + React 19 + Tailwind.
- Loop של Model A: Mastery Gating + Adaptive Difficulty + Spaced Repetition (Leitner 5-box).
- מאגר פריטים: 30 פריטים, קושי 1–5, חיבור/חיסור עד 100.
- זרימת סשן: 10 פריטים (קונפיגורבילי דרך `NEXT_PUBLIC_ITEMS_PER_SESSION`), אחוז שליטה מתגלגל על 10 האחרונים, יעד 80%.
- בסיס עברית RTL.
- 35 בדיקות יחידה (mastery, SRS, adaptive, explain, feedback, greetings, profiles).

### Added — פדגוגיה (retry + הסבר)
- עד 3 ניסיונות לפריט. חשיפת תשובה מלווה בהסבר מבוסס-שיטה (CPA — השלמה-ל-10, פירוק).
- קרדיט שליטה רק על ניסיון 1.

### Added — טון (growth-mindset)
- ביטויי fixed-mindset אסורים ("לא נכון", "טעית", "שגוי").
- ניסוח נדרש: "עוד לא" של Dweck, הכרה במאמץ, חשיפה שיתופית.
- מאגר וריאציות להודעות retry / correct / reveal.

### Added — UI (Neo-Montessori)
- פלטה חמה: רקע cream, CTA terracotta, הצלחה sage, retry mustard, חשיפה warm-indigo.
- טיפוגרפיה: Heebo 800 (כותרות) + Rubik 400/500/600 (גוף) דרך `next/font/google`.
- רכיב SVG של `MasteryJar` עם clip paths של טקסט כפול (קריא ללא תלות במפלס המילוי).
- חגיגת `canvas-confetti`, יורה פעם אחת בכל חציית סף 80%, מכבד `prefers-reduced-motion`.

### Added — ברוכה הבאה + ברכות (UI-WELCOME-GREETINGS-001)
- שלב `welcome` לפני סשן.
- ברכות בעברית מודעות-זמן ורציפות (בוקר / אחר-צהריים / ערב / חזרה-באותו-יום / אחרי-הפסקה / שבוע-חדש).
- וריאציה עם קידומת שם כשיש פרופיל פעיל.

### Added — מערכת Backlog (4 שכבות)
- `tasks/BACKLOG.md` — רישום עם triggers + owners.
- `evals/backlog/*.eval.ts` + `npm run eval:backlog` — כישלון אוטומטי כשטריגר יורה.
- `src/lib/telemetry.ts` + `npm run telemetry:check` — log מקומי של אירועים, ההורה מייצאת JSON.
- `tasks/FEEDBACK-LOG.md` + `npm run feedback:scan` — משוב אנושי → הצעות ל-BACKLOG.
- CLAUDE.md §Backlog — שכבות + משמעת לקיחה + קריטריון בשלות.

### Added — בידוד לכל פרופיל (MATH-PROFILES-001)
- בורר פרופיל ב-`/`, יצירת פרופיל ב-`/profiles/new`.
- כל ה-storage בהיקף `profileId`: mastery, last-session, telemetry.
- Gating תוכן לפי גיל (`allowedSkillsForAge`) — מיומנות מוצעת רק אם טווח הגיל מתאים.
- אבטחה: שמות חיים ב-`localStorage` בלבד; אף פעם ב-repo, בקוד, או ב-telemetry.

### Added — מותג (UI-NEO-MONTESSORI-001 + BRAND-001)
- רכיבי `Logo` + `LogoMark`. 3 pills עולים של sage + wordmark עם אות sage אחת להדגשה.
- Favicon (`src/app/icon.svg`) — mark בלבד, זיהוי אוטומטי של Next.js.
- [docs/design/BRANDING.md](docs/design/BRANDING.md) — כללי עיצוב, do/don'ts, משימות עתידיות.
- [docs/design/children-ed-ui-research.md](docs/design/children-ed-ui-research.md) — הפניית מחקר.

### Added — מבנה מסמכים
- `docs/README.md`, `docs/design/`, `docs/devlog/`, `docs/adr/`, `docs/milestones/`, `docs/postmortems/`.
- ADR-001: מערכת Backlog שכבתית.

### Changed — שם המוצר
- MyLevel → Evami → **Emiva** (סופי).
- Prefix של מפתח storage עבר migration: `mylevel.*` → `evami.*` → `emiva.*` (pre-production; בלי data migration).
- אות ה-wordmark של הלוגו להדגשה: `L` → `a` → `i`.
- תיקייה `C:\Users\User\MyLevel` → `C:\Users\User\Emiva`.

### נדחה (ב-`tasks/BACKLOG.md`)
- BL-001 — הרחבת מאגרי וריאציות פידבק (trigger: סף eval יעלה אחרי שימוש אמיתי).

### פתוח וידוע (עדיין לא ב-backlog)
- רישום דומיינים (emiva.com / .co / .app / .co.il) — ממתין ל-WHOIS ידני.
- MATH-BAT9-001 — תוכן של אמיליה (שברים, חילוק ארוך). כרטיס "בקרוב" מוצג עכשיו.
