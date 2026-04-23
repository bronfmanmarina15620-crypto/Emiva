# INSTRUCTIONS.md — DASHBOARD-PARENT-001

## מטא-דאטה של משימה
- task_id: DASHBOARD-PARENT-001
- title: דשבורד הורים MVP — מבוסס verdict, מבוסס-ראיות
- owner: Marina
- priority: P0 (קופץ לפני MATH-EVELYN-MONEY-001)
- target_branch: feat/dashboard-parent-001
- references:
  - `tasks/DASHBOARD-PARENT-001/research.md` — יומן מחקר ארבעה-סיבובים
  - `CLAUDE.md §Measurement rule` — proxy פנימי חייב להיות נראה
  - `CLAUDE.md §Tone` — growth-mindset לכל מחרוזת פונה-למשתמש
  - `CLAUDE.md §Research source rule` — (a) מדע קוגניטיבי מופרד מ-(b) פרקטיקת מוצר
  - Lu, Vasilyeva & Laski 2025 — מסגור מגן-אוטונומיה (מחייב)
  - Bergman 2021 — מנגנון תיקון-אמונה (מחייב)
  - Squirrel AI MCM — "tracing the source" (השראה)

## מטרה

לתת ל-Marina תצוגה פרטית, מוגנת-PIN של מצב הלמידה הנוכחי של כל בת,
מעוצבת לעודד *פעולה קטנה אחת ליום* במקום
לסכם התקדמות. הדשבורד הוא שכבת התצוגה של
ה-proxy הפנימי הנדרש על ידי ה-Measurement rule, וההוכחה הנראית
שהפדגוגיה של האפליקציה עובדת (או לא) לאוולין ואמיליה
באופן ספציפי.

טווח משימה זו = **MVP בלבד**. ללא גרפי טרנדים, ללא דפי drill
לפי מיומנות, ללא תקציר אימייל. כל מה שבכיוונים אלה מושהה במפורש
ל-DASHBOARD-PARENT-002 ומעבר.

## בטווח

### גישה ואבטחה

- **Route:** `/parent` (login/setup) → `/parent/dashboard` (מוגן).
- **כניסה מדף הבית:** קישור "הורים" קטן ודיסקרטי ב-footer של דף הבית.
  לא כפתור. לא בולט. (Anti-pattern: כפתור נראה
  שילדות לוחצות מתוך סקרנות.)
- **Setup בפעם הראשונה:** מסך מבקש PIN של 4-6 ספרות. שמירה רק של
  SHA-256 hash (`crypto.subtle.digest`) ב-
  `emiva.parent_pin_hash.v1`. לעולם לא שמירת plaintext.
- **Login:** קלט PIN → hash → השוואה. 3 ניסיונות כושלים → fallback
  של math-gate: בעיית כפל אקראית של שתי ספרות
  (למשל `17 × 8`). תשובה נכונה → עוקף את ה-PIN פעם אחת כדי לאפשר ל-Marina
  לאפס אותו. math-gate שגוי → נעילה ל-5 דקות.
- **כלל "סגור בזמן שהילדה נוכחת":**
  - ראש הדשבורד מציג באנר קבוע: *"אל תפתחי את הדף הזה
    כשהילדה ליד המסך."*
  - Timeout של חוסר פעילות: 3 דקות → חזרה ל-login.
  - כפתור "יציאה" בולט וגדול ב-header.

### פריסת דשבורד

דף אחד (`/parent/dashboard`) עם:

1. **כרטיס תקציר שבועי** (למעלה) — ראו "תקציר שבועי" למטה.
2. **כרטיס אחד לכל בת**, מוערמים אנכית. אותה צורת נתונים;
   כל בת בכרטיס שלה. **ללא השוואה בין-בנות
   בשום מקום ב-UI.**
3. **כפתור יציאה** (למטה ובראש) — חוזר לדף הבית, לא
   ל-login (כך ש-Marina יכולה למסור את המכשיר לבת
   מיד).

### כרטיס לכל בת — 7 רכיבים

בסדר, מלמעלה למטה:

**1. verdict badge (בסגנון Nanit)**
אחד משלושה, מחושב מנתוני הכרטיס:
- **"על המסלול"** (on track) — ברירת מחדל.
- **"כדאי לשים לב"** (watch) — כל אחד מ:
  - אין סשן ב-4–6 ימים אחרונים.
  - כל מיומנות פעילה עם first-try correct < 50% על פני 20 הניסיונות האחרונים.
  - first-try % ירד ≥ 10 נקודות אחוז לעומת חלון 7-הימים הקודם.
- **"בואי נדבר"** (talk) — כל אחד מ:
  - תקיעות פעילה בכל מיומנות (ראו #6).
  - אין סשן ב-7+ ימים.

כלל: worst-of חל. מחשבון: `src/lib/parent-dashboard.ts
:: computeVerdict(profileId)`.

**2. שורת פעולה ממוסגרת-כהזמנה (Lu 2025)**
משפט אחד בעברית, תמיד מנוסח כהזמנה, לעולם לא כהוראה.
סדר עדיפויות:

| טריגר | טקסט פעולה (תבנית) |
|---|---|
| מיומנות בתקיעות `s` | `היום את יכולה להציע לה לחזור על {s_hebrew}, ולתת לה לבחור אם זה רגע טוב.` |
| אין סשן 4+ ימים | `היום את יכולה להזמין אותה לסשן קצר, ולתת לה לבחור נושא.` |
| פריטי SRS בהמתנה במיומנות הנוכחית | `היום כדאי להציע חזרה על {s_hebrew} — כמה פריטים מחכים.` |
| אחרת | `היום את יכולה לתת לה לבחור — כל כיוון בסדר.` |

**ניסוחים אסורים (כלל נוקשה):** `עבדי איתה`, `תגרמי לה`, `חייבת`,
`דרשי`, כל צורה ציווית שעוקפת אוטונומיית ילד. להשתמש רק ב-
*"את יכולה להציע / להזמין"*.

מחשבון: `computeActionLine(profileId)`.

**3. שורת סיבה-אפשרית (Squirrel "tracing the source")**
מוצגת רק כאשר verdict ≠ "על המסלול". שמה את המיומנות החלשה
במעלה הזרם שסבירה גבוהה כי גורמת לקושי הנוכחי. טבלת predecessor:

| מיומנות נוכחית | סיבה סבירה במעלה הזרם (עברית) |
|---|---|
| `fractions_intro` | `חיבור/חיסור עד 100 שלא התייצב` |
| `multiplication` | `חיבור/חיסור עד 100 שלא התייצב` |
| `ops_1000` | `חיבור/חיסור עד 100 שלא התייצב` |
| `long_division` | `כפל שלא התייצב` |
| `bar_models` | `חיבור/חיסור או כפל בסיסיים` |
| `add_sub_100` | *(ללא predecessor מוצג)* |

פורמט: `אם היא מתקשה, סביר שהסיבה היא {cause}.`

מחשבון: `computePossibleCause(profileId)`.

**4. רשת אריחי-מיומנות (Squirrel / ALEKS תחליף ל-pipeline bar)**
שורה אופקית של אריחים, אחד לכל מיומנות מותרת לגיל הבת.
- אוולין (7-8): 2 אריחים (`add_sub_100`, `multiplication`).
- אמיליה (9-10): 4 אריחים (`fractions_intro`, `ops_1000`, `long_division`, `bar_models`).

כל אריח מציג את שם המיומנות בעברית וצבוע:
- **אפור** — לא התחיל (`attempts.length === 0`).
- **צהוב** — בהתקדמות (`attempts.length > 0 && !hasGraduatedFlag(profileId, skill)`).
- **ירוק** — נשלט (`hasGraduatedFlag(profileId, skill) === true`).

אריחים לא-אינטראקטיביים ב-MVP (ללא drill-down). tooltip ריחוף
אופציונלי: `{skill_hebrew} · {sessionCount} סשנים · {firstTryPct}% נכון-בראשון`.

**5. שורת תיקון-אמונה (מנגנון Bergman)**
טופס קטן בתחתית הכרטיס:
- **קלט (מוצג אם אין הערת אמונה לשבוע ה-ISO הנוכחי):**
  tektz area *"השבוע הרגשתי ש-[שם הבת] ..."*, כפתור submit.
- **תצוגה (מוצגת אם הערת אמונה קיימת לשבוע הנוכחי או קודם):**
  `לפני {N} ימים כתבת: "{text}". מאז: {totalAttempts} תרגילים, {firstTryPct}% נכון-בראשון, {sessionCount} סשנים.`

מפתח storage: `emiva.parent_belief.v1.{profileId}.{isoWeek}` →
`{ text: string, at: number }`. רק ההערה האחרונה מוצגת;
ישנות יותר נשמרות לdrill-down של שלב 2.

מחשבון: `computeBeliefComparison(profileId)`.

**6. חיווי תקיעות (ASSISTments)**
מוצג רק כאשר מופעל. לפי מיומנות:
- דורש `attempts.length >= 20` **וגם** `sessionCount >= 3`.
- מסתכל על 20 הניסיונות האחרונים למיומנות זו; אם שיעור first-try-correct
  ≤ 40% → flag.

תצוגה: `חיווי תקיעות ב-{skill_hebrew}` — בצבע ניטרלי חם
(לא אדום, לא בסגנון alarm — טון growth-mindset).

מחשבון: `computeWheelSpin(profileId)`.

**7. תאריך סשן אחרון** — טקסט קטן בתחתית:
`סשן אחרון: לפני {N} ימים / היום / אתמול.`

### כרטיס תקציר שבועי (אנטומיית Bark)

מוצג בראש `/parent/dashboard`, מעל כרטיסי הבנות.
מכסה את שבוע ה-ISO הנוכחי (א'–ש'). לכל בת:

```
השבוע — {daughter_name}:
  {totalAttempts} תרגילים · {newlyMastered} מיומנויות חדשות נשלטו
  · {wheelSpinCount} חיוויי תקיעות
  המלצה: {top_action_line}
```

כאשר `top_action_line` היא אותה מחרוזת כמו שורת הפעולה של כרטיס הבת.
ב-MVP התקציר מחושב מחדש בכל פתיחת דשבורד
(ללא cron/email נפרד). עתידי: אימייל כאשר קיים server.

### שינויי קוד

- **Route חדש:** `src/app/parent/page.tsx` (login/setup).
- **Route חדש:** `src/app/parent/dashboard/page.tsx` (dashboard).
- **חדש:** `src/lib/parent-auth.ts`:
  - `hashPin(pin: string): Promise<string>` (SHA-256 דרך `crypto.subtle`)
  - `hasPinSet(): boolean`
  - `setPin(pin: string): Promise<void>`
  - `verifyPin(pin: string): Promise<boolean>`
  - `clearPin(): void` (ניתן לקריאה רק אחרי הצלחת math-gate)
- **חדש:** `src/lib/parent-belief.ts`:
  - `isoWeekKey(date?: Date): string`
  - `saveBelief(profileId: string, text: string, at?: number): void`
  - `loadBelief(profileId: string, isoWeek: string): { text: string; at: number } | null`
  - `latestBelief(profileId: string): { text: string; at: number; weekKey: string } | null`
- **חדש:** `src/lib/parent-dashboard.ts`:
  - `computeVerdict(profileId): "on_track" | "watch" | "talk"`
  - `computeActionLine(profileId): string`
  - `computePossibleCause(profileId): string | null`
  - `computeSkillTiles(profileId): Array<{ skill, state, sessionCount, firstTryPct }>`
  - `computeWheelSpin(profileId): Array<{ skill }>`
  - `computeBeliefComparison(profileId): { text, daysAgo, attemptsSince, firstTryPctSince, sessionsSince } | null`
  - `computeWeeklyDigest(profileId): { totalAttempts, newlyMastered, wheelSpinCount, topAction }`
  - כל הפונקציות pure; מקבלות `now?: number` להזרקת טסט.
- **חדש:** `src/lib/telemetry.ts` — הוספת אירועים:
  - `{ t: "dashboard_opened"; at: number }`
  - `{ t: "belief_submitted"; at: number; profileId: string }`
  - `{ t: "action_line_shown"; at: number; profileId: string; trigger: string }`
- **קבועים חדשים** ב-`src/lib/types.ts`:
  - `WHEEL_SPIN_MIN_ATTEMPTS = 20`
  - `WHEEL_SPIN_MIN_SESSIONS = 3`
  - `WHEEL_SPIN_THRESHOLD_PCT = 40`
  - `INACTIVITY_DAYS_WATCH = 4`
  - `INACTIVITY_DAYS_TALK = 7`
  - `DASHBOARD_TIMEOUT_MS = 3 * 60 * 1000`

### טסטים (Vitest)

- `tests/unit/parent-auth.test.ts`
  - `hashPin` מפיק 64-char hex דטרמיניסטי.
  - `verifyPin` תואם ל-pin שהוגדר, דוחה pin שגוי.
  - `clearPin` מסיר את ה-hash השמור.
- `tests/unit/parent-belief.test.ts`
  - `isoWeekKey` — תאריכים ידועים ממופים למפתחות ידועים; גבול
    ראשון/שני מטופל.
  - `saveBelief` + `loadBelief` round-trip.
  - `latestBelief` מחזיר את ההערה האחרונה על פני שבועות.
- `tests/unit/parent-dashboard-verdict.test.ts`
  - On-track כברירת מחדל, ללא פעילות 5 ימים → watch, 8 ימים → talk.
  - מיומנות בתקיעות → talk שולט על inactivity-watch.
  - first-try % ירד 15pp → watch.
- `tests/unit/parent-dashboard-action.test.ts`
  - סדר עדיפויות: תקיעות > חוסר פעילות > SRS > ברירת מחדל.
  - Template interpolation לכל טריגר.
  - **Lint ביטוי-אסור:** כל פלט עובר את בודק ביטויי-אסורים של
    `growth-mindset` מ-CLAUDE.md §Tone.
- `tests/unit/parent-dashboard-wheel-spin.test.ts`
  - < 20 ניסיונות → ללא flag.
  - ≥ 20 ניסיונות + ≥ 3 סשנים + ≤ 40% → flag.
  - > 40% → ללא flag.
- `tests/unit/parent-dashboard-digest.test.ts`
  - סופר סך הניסיונות בשבוע ה-ISO הנוכחי בלבד.
  - `newlyMastered` סופר היפוכים של דגל graduation בשבוע.

### מסמכים

- `docs/adr/003-parent-dashboard-design.md` — ADR חדש. נועל את
  הדפוסים הדחויים (השוואת אחיות, parent-streak gamification,
  real-time push, מסגור הוראתי) ואת המחקר המחייב
  אותם.
- `docs/parent-guide.md` — סעיף חדש *"האזור להורים"* שמסביר
  מה הדשבורד מציג, איך verdicts מחושבים, וכלל
  "סגור בזמן שהילדה נוכחת". הפניות למקורות המחקר
  לפי סוג.
- `ROADMAP.md` — העברת `DASHBOARD-PARENT-001` מ-📕 v3 ל-🟢 Now;
  העברת `MATH-EVELYN-MONEY-001` מ-🟡 Next למיקום שני
  (מתחת לתכנון קריאה בעברית, אם Marina תאשר).
- `CHANGELOG.md` — רשומות [Unreleased].
- `.claude/rules/parent-dashboard-guardrails.md` — כלל path ל-
  `src/app/parent/**` + `src/lib/parent-*.ts`: כל מחרוזת פונה-למשתמש חדשה
  עוברת lint ביטוי-אסור; אין נתיבי קוד להשוואת אחיות.

### Falsifier (Layer 2 eval, honest-about-not-working)

- `evals/backlog/dashboard-followthrough.eval.ts` — רץ מול
  4 השבועות האחרונים של telemetry. עובר אם:
  - ≥ 2 אירועי `belief_submitted` ב-4 השבועות הקרובים
    (אחד לכל שבועיים מינימום).
  - או ≥ 8 אירועי `dashboard_opened` ב-4 השבועות הקרובים
    (לפחות פעמיים בשבוע).
- Eval **אדום** → עצור עבודת דשבורד חדשה, הערך מחדש את העיצוב.
  רשום ב-`tasks/BACKLOG.md` עם טריגר זה.
- רציונל: לפי סקירת Kaliisa 2024, רוב דשבורדי analytics
  למידה מראים השפעה זניחה. ה-eval הזה הוא pre-commitment
  להודות באותו הדבר אם זה יקרה כאן.

## מחוץ לטווח

- **גרפי טרנדים / sparklines** — מושהה ל-DASHBOARD-PARENT-002.
  MVP עונה על "מה נכון עכשיו?"; שלב 2 עונה "איך זה
  השתנה?".
- **דפי drill-down לפי מיומנות** — שלב 2.
- **תקציר אימייל** — דורש server; מושהה.
- **השוואת אחיות בכל צורה** — אסור על ידי ADR, לא רק
  מושהה.
- **Parent streak / gamification של מעורבות הורה** — אסור.
- **Real-time push על אירועי סשן** — אסור (יאמן את Marina
  לקטוע סשנים).
- **שיתוף / export מעבר ל-`exportTelemetry` הנוכחי** — ללא שינוי.
- **הגבלת גיל או עקיפת ילד של route `/parent`** — הנתיב הנסתר
  + PIN + math-gate הם מודל הפרטיות של ה-MVP; לא מוסיפים FaceID
  / OS-level gates (יידרשו אפליקציה native).

## ולידציה נדרשת

- `npm run typecheck` נקי.
- `npm run lint` נקי.
- `npm test` ירוק — כל קבצי הטסט החדשים עוברים.
- `npm run build` מצליח.
- `npm run eval:backlog` — ה-falsifier eval החדש קיים והוא
  כעת *ירוק* (חוסר נתונים ⇒ skip, לא fail) בשילוח.

### רשימת QA ידני

1. דפדפן טרי / incognito. נווטי ל-`/parent`. הגדירי PIN של 4 ספרות.
2. טעני מחדש. הזיני PIN נכון → נחתי על דשבורד.
3. הזיני PIN שגוי 3 פעמים → math-gate מופיע. פתרי → נחתת חזרה
   על reset של PIN.
4. על הדשבורד: כרטיס תקציר שבועי מוצג ללא שגיאות גם עם
   ללא נתונים (מקרה פרופיל חדש).
5. כרטיס אוולין: בדיוק 2 אריחי מיומנות; כרטיס אמיליה: בדיוק 4.
6. אריחים צבועים נכון לפי מצב פרופיל (אמתי על ידי יצירת
   מיומנות עם דגל graduation → ירוק; ניסיונות אחרונים ללא grad → צהוב;
   ללא ניסיונות → אפור).
7. עם מיומנות המציגה < 40% first-try ב-20 הניסיונות האחרונים ו-≥ 3
   סשנים → חיווי תקיעות מופיע + verdict = "בואי נדבר".
8. השאירי דשבורד פתוח 3 דקות → חזרה אוטומטית ל-login.
9. שלחי הערת אמונה → טעני מחדש → תצוגת השוואה מחליפה את הטופס.
10. דף הבית: אמתי שקישור "הורים" ב-footer הוא דיסקרטי (צבע שני,
    פונט קטן), לא כפתור בולט.
11. **ביקורת טון:** שום ביטוי אסור מ-CLAUDE.md §Tone מופיע על
    הדשבורד (סריקה ידנית של כל המחרוזות המרונדרות).
12. **ביקורת אוטונומיה:** כל פלט שורת-פעולה מתחיל ב-*"את
    יכולה..."* או צורת הזמנה שווה; ללא ציוויים.

## הגדרת DoD

- [ ] כל שינויי הקוד הוכנסו, TypeScript strict, lint נקי, טסטים ירוקים.
- [ ] שבעה רכיבים לכל בת מרונדרים נכון לשני הפרופילים.
- [ ] לוגיקת verdict תואמת למפרט; זיהוי תקיעות תואם למפרט.
- [ ] טופס תיקון-אמונה נשלח ומציג השוואה.
- [ ] תקציר שבועי מחשב ערכי שבוע נוכחי נכון.
- [ ] זרימות PIN + math-gate עובדות end-to-end.
- [ ] Timeout של חוסר פעילות חוזר ל-login.
- [ ] Lint של ביטוי-אסור מכסה את כל מחרוזות הדשבורד (ללא חריגים).
- [ ] ADR-003 נכתב ונעשה commit.
- [ ] `parent-guide.md` מעודכן עם סעיף "האזור להורים".
- [ ] ROADMAP הועבר; רשומת CHANGELOG נוספה.
- [ ] קובץ falsifier eval קיים תחת `evals/backlog/`.
- [ ] רשימת QA ידני עברה, כולל ביקורות טון + אוטונומיה.

## סיכונים ומיטיגציות

| סיכון | מיטיגציה |
|-------|----------|
| שפה מצווה מפעילה "הורה שולט" (Lu 2025) | Banned-phrase lint + תבניות הזמנה קשוחות + audit ידני כחלק מ-DoD |
| הורה פותחת דשבורד כשילדה נוכחת | באנר קבוע + timeout 3 דק' + כלל מוצר ב-parent-guide |
| פיצול אחיות לכרטיסים נפרדים לא מספיק — עדיין יש השוואה בראש ההורה | ADR מפורש אוסר השוואה מבנית; דף בודד לכל בת |
| PIN ל-4 ספרות לא מניעת ילדה בת 9 שראתה | math-gate fallback + כתובת נסתרת + timeout |
| הדשבורד "נראה טוב אבל לא פועלים עליו" | Falsifier eval של 4 שבועות; אם red → עצירה |
| "תיקון אמונה" דורש דקה שבועית, מרינה שוכחת | prompt ב-top של card אם אין הערה לשבוע; telemetry `belief_submitted` מזין את ה-eval |
| חיוויי wheel-spin מופיעים מוקדם מדי (רעש) | ספי 20 ניסיונות + 3 סשנים + 40% — גבוהים במתכוון |
| הדוקומנטציה מפגרת מאחורי שינויי מסתמר (קוד) | `.claude/rules/mastery-docs-sync.md` כבר דורש עדכון parent-guide; חל גם כאן דרך rule חדש ייעודי |
