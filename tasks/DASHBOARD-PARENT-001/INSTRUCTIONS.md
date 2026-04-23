# INSTRUCTIONS.md — DASHBOARD-PARENT-001

## Task Metadata
- task_id: DASHBOARD-PARENT-001
- title: Parent dashboard MVP — verdict-based, evidence-grounded
- owner: Marina
- priority: P0 (jumps ahead of MATH-EVELYN-MONEY-001)
- target_branch: feat/dashboard-parent-001
- references:
  - `tasks/DASHBOARD-PARENT-001/research.md` — four-round research log
  - `CLAUDE.md §Measurement rule` — internal proxy must be visible
  - `CLAUDE.md §Tone` — growth-mindset for any user-facing strings
  - `CLAUDE.md §Research source rule` — (a) cognitive science separated from (b) product practice
  - Lu, Vasilyeva & Laski 2025 — autonomy-protective framing (binding)
  - Bergman 2021 — belief-correction mechanism (binding)
  - Squirrel AI MCM — "tracing the source" (inspiration)

## Objective

Give Marina a private, PIN-protected view of each daughter's current
learning state, designed to prompt *one small action per day* rather
than to summarize progress. The dashboard is the display layer for the
internal proxy required by the Measurement rule, and the visible proof
that the app's pedagogy is working (or not) for Evelyn and Emilia
specifically.

Scope of this task = **MVP only**. No trend graphs, no per-skill drill
pages, no email digest. Everything in those directions is explicitly
deferred to DASHBOARD-PARENT-002 and beyond.

## In Scope

### Access & security

- **Route:** `/parent` (login/setup) → `/parent/dashboard` (protected).
- **Entry from home:** small, discreet "הורים" link in the home-page
  footer. Not a button. Not prominent. (Anti-pattern: visible button
  that children click by curiosity.)
- **First-time setup:** screen prompts for a 4-6 digit PIN. Store only
  a SHA-256 hash (`crypto.subtle.digest`) in
  `emiva.parent_pin_hash.v1`. Never store plaintext.
- **Login:** PIN input → hash → compare. 3 failed attempts → fallback
  math-gate: one random two-digit multiplication problem
  (e.g. `17 × 8`). Correct answer → bypass the PIN once to let Marina
  reset it. Wrong math-gate → lock out for 5 minutes.
- **"Closed while child present" rule:**
  - Top of dashboard displays fixed banner: *"אל תפתחי את הדף הזה
    כשהילדה ליד המסך."*
  - Inactivity timeout: 3 minutes → return to login.
  - Large prominent "יציאה" button in the header.

### Dashboard layout

One page (`/parent/dashboard`) with:

1. **Weekly digest card** (top) — see "Weekly digest" below.
2. **One card per daughter**, stacked vertically. Same data shape;
   each daughter on her own card. **No cross-daughter comparison
   anywhere in the UI.**
3. **Exit button** (bottom and header) — returns to home page, not
   to login (so Marina can hand the device to the daughter
   immediately).

### Per-daughter card — 7 components

In order, top to bottom:

**1. Verdict badge (Nanit-style)**
One of three, computed from card data:
- **"על המסלול"** (on track) — default.
- **"כדאי לשים לב"** (watch) — any of:
  - No session in the last 4–6 days.
  - Any active skill with first-try correct < 50% over the last 20 attempts.
  - First-try % dropped ≥ 10 percentage points vs the prior 7-day window.
- **"בואי נדבר"** (talk) — any of:
  - Wheel-spinning active on any skill (see #6).
  - No session in 7+ days.

Rule: worst-of applies. Calculator: `src/lib/parent-dashboard.ts
:: computeVerdict(profileId)`.

**2. Invitation-framed action line (Lu 2025)**
Single Hebrew sentence, always phrased as an invitation, never as an
instruction. Priority order:

| Trigger | Action text (template) |
|---|---|
| Wheel-spinning skill `s` | `היום את יכולה להציע לה לחזור על {s_hebrew}, ולתת לה לבחור אם זה רגע טוב.` |
| No session 4+ days | `היום את יכולה להזמין אותה לסשן קצר, ולתת לה לבחור נושא.` |
| SRS items due in current skill | `היום כדאי להציע חזרה על {s_hebrew} — כמה פריטים מחכים.` |
| Else | `היום את יכולה לתת לה לבחור — כל כיוון בסדר.` |

**Banned phrasings (hard rule):** `עבדי איתה`, `תגרמי לה`, `חייבת`,
`דרשי`, any imperative form that bypasses child autonomy. Use only
*"את יכולה להציע / להזמין"*.

Calculator: `computeActionLine(profileId)`.

**3. Possible-cause line (Squirrel "tracing the source")**
Shows only when verdict ≠ "על המסלול". Names the upstream weak skill
most likely causing the current difficulty. Predecessor table:

| Current skill | Likely upstream cause (Hebrew) |
|---|---|
| `fractions_intro` | `חיבור/חיסור עד 100 שלא התייצב` |
| `multiplication` | `חיבור/חיסור עד 100 שלא התייצב` |
| `ops_1000` | `חיבור/חיסור עד 100 שלא התייצב` |
| `long_division` | `כפל שלא התייצב` |
| `bar_models` | `חיבור/חיסור או כפל בסיסיים` |
| `add_sub_100` | *(no predecessor shown)* |

Format: `אם היא מתקשה, סביר שהסיבה היא {cause}.`

Calculator: `computePossibleCause(profileId)`.

**4. Skill-tile grid (Squirrel / ALEKS replacement for pipeline bar)**
Horizontal row of tiles, one per allowed skill for the daughter's age.
- Evelyn (7-8): 2 tiles (`add_sub_100`, `multiplication`).
- Emilia (9-10): 4 tiles (`fractions_intro`, `ops_1000`, `long_division`, `bar_models`).

Each tile shows the Hebrew skill name and is colored:
- **Gray** — not started (`attempts.length === 0`).
- **Yellow** — in progress (`attempts.length > 0 && !hasGraduatedFlag(profileId, skill)`).
- **Green** — mastered (`hasGraduatedFlag(profileId, skill) === true`).

Tiles are non-interactive in MVP (no drill-down). Optional hover
tooltip: `{skill_hebrew} · {sessionCount} סשנים · {firstTryPct}% נכון-בראשון`.

**5. Belief-correction line (Bergman mechanism)**
Small form at the bottom of the card:
- **Input (shown if no belief note for current ISO week):**
  text area *"השבוע הרגשתי ש-[שם הבת] ..."*, submit button.
- **Display (shown if belief note exists for current or prior week):**
  `לפני {N} ימים כתבת: "{text}". מאז: {totalAttempts} תרגילים, {firstTryPct}% נכון-בראשון, {sessionCount} סשנים.`

Storage key: `emiva.parent_belief.v1.{profileId}.{isoWeek}` →
`{ text: string, at: number }`. Only the most recent note is shown;
older ones persist for Stage 2 drill-down.

Calculator: `computeBeliefComparison(profileId)`.

**6. Wheel-spinning indicator (ASSISTments)**
Shown only when triggered. Per skill:
- Requires `attempts.length >= 20` **and** `sessionCount >= 3`.
- Looks at last 20 attempts for that skill; if first-try-correct rate
  ≤ 40% → flag.

Display: `חיווי תקיעות ב-{skill_hebrew}` — in warm neutral color
(not red, not alarm styling — growth-mindset tone).

Calculator: `computeWheelSpin(profileId)`.

**7. Last session date** — small text at the bottom:
`סשן אחרון: לפני {N} ימים / היום / אתמול.`

### Weekly digest card (Bark anatomy)

Shown at the top of `/parent/dashboard`, above the daughter cards.
Covers the current ISO week (Sun–Sat). For each daughter:

```
השבוע — {daughter_name}:
  {totalAttempts} תרגילים · {newlyMastered} מיומנויות חדשות נשלטו
  · {wheelSpinCount} חיוויי תקיעות
  המלצה: {top_action_line}
```

Where `top_action_line` is the same string as the daughter card's
action line. In MVP the digest is recomputed on each dashboard open
(no separate cron/email). Future: email when server exists.

### Code changes

- **New route:** `src/app/parent/page.tsx` (login/setup).
- **New route:** `src/app/parent/dashboard/page.tsx` (dashboard).
- **New:** `src/lib/parent-auth.ts`:
  - `hashPin(pin: string): Promise<string>` (SHA-256 via `crypto.subtle`)
  - `hasPinSet(): boolean`
  - `setPin(pin: string): Promise<void>`
  - `verifyPin(pin: string): Promise<boolean>`
  - `clearPin(): void` (only callable after math-gate success)
- **New:** `src/lib/parent-belief.ts`:
  - `isoWeekKey(date?: Date): string`
  - `saveBelief(profileId: string, text: string, at?: number): void`
  - `loadBelief(profileId: string, isoWeek: string): { text: string; at: number } | null`
  - `latestBelief(profileId: string): { text: string; at: number; weekKey: string } | null`
- **New:** `src/lib/parent-dashboard.ts`:
  - `computeVerdict(profileId): "on_track" | "watch" | "talk"`
  - `computeActionLine(profileId): string`
  - `computePossibleCause(profileId): string | null`
  - `computeSkillTiles(profileId): Array<{ skill, state, sessionCount, firstTryPct }>`
  - `computeWheelSpin(profileId): Array<{ skill }>`
  - `computeBeliefComparison(profileId): { text, daysAgo, attemptsSince, firstTryPctSince, sessionsSince } | null`
  - `computeWeeklyDigest(profileId): { totalAttempts, newlyMastered, wheelSpinCount, topAction }`
  - All pure functions; accept `now?: number` for test injection.
- **New:** `src/lib/telemetry.ts` — add events:
  - `{ t: "dashboard_opened"; at: number }`
  - `{ t: "belief_submitted"; at: number; profileId: string }`
  - `{ t: "action_line_shown"; at: number; profileId: string; trigger: string }`
- **New constants** in `src/lib/types.ts`:
  - `WHEEL_SPIN_MIN_ATTEMPTS = 20`
  - `WHEEL_SPIN_MIN_SESSIONS = 3`
  - `WHEEL_SPIN_THRESHOLD_PCT = 40`
  - `INACTIVITY_DAYS_WATCH = 4`
  - `INACTIVITY_DAYS_TALK = 7`
  - `DASHBOARD_TIMEOUT_MS = 3 * 60 * 1000`

### Tests (Vitest)

- `tests/unit/parent-auth.test.ts`
  - `hashPin` produces deterministic 64-char hex.
  - `verifyPin` matches set pin, rejects wrong pin.
  - `clearPin` removes stored hash.
- `tests/unit/parent-belief.test.ts`
  - `isoWeekKey` — known dates map to known keys; Sunday/Monday
    boundary handled.
  - `saveBelief` + `loadBelief` round-trip.
  - `latestBelief` returns most recent across weeks.
- `tests/unit/parent-dashboard-verdict.test.ts`
  - On-track default, no activity for 5 days → watch, 8 days → talk.
  - Wheel-spin skill → talk dominates inactivity-watch.
  - First-try % dropped 15pp → watch.
- `tests/unit/parent-dashboard-action.test.ts`
  - Priority order: wheel-spin > inactivity > SRS > default.
  - Template interpolation for each trigger.
  - **Banned-phrase lint:** every output passes the `growth-mindset`
    banned-phrase checker from CLAUDE.md §Tone.
- `tests/unit/parent-dashboard-wheel-spin.test.ts`
  - < 20 attempts → no flag.
  - ≥ 20 attempts + ≥ 3 sessions + ≤ 40% → flag.
  - > 40% → no flag.
- `tests/unit/parent-dashboard-digest.test.ts`
  - Counts total attempts in current ISO week only.
  - `newlyMastered` counts graduation flag flips in the week.

### Docs

- `docs/adr/003-parent-dashboard-design.md` — new ADR. Locks in the
  rejected patterns (sibling comparison, parent-streak gamification,
  real-time push, instructional framing) and the research that binds
  them.
- `docs/parent-guide.md` — new section *"האזור להורים"* explaining
  what the dashboard shows, how verdicts are computed, and the
  "closed while child present" rule. Cross-references the research
  sources by type.
- `ROADMAP.md` — move `DASHBOARD-PARENT-001` from 📕 v3 to 🟢 Now;
  move `MATH-EVELYN-MONEY-001` from 🟡 Next to second position
  (below Hebrew reading planning, if Marina confirms).
- `CHANGELOG.md` — [Unreleased] entries.
- `.claude/rules/parent-dashboard-guardrails.md` — path rule for
  `src/app/parent/**` + `src/lib/parent-*.ts`: any new user-facing
  string passes the banned-phrase lint; no sibling comparison code
  paths.

### Falsifier (Layer 2 eval, honest-about-not-working)

- `evals/backlog/dashboard-followthrough.eval.ts` — runs against the
  last 4 weeks of telemetry. Passes if:
  - ≥ 2 `belief_submitted` events in the trailing 4 weeks
    (one per every 2 weeks minimum).
  - OR ≥ 8 `dashboard_opened` events in the trailing 4 weeks
    (at least twice per week).
- Eval **red** → stop new dashboard work, re-evaluate the design.
  Listed in `tasks/BACKLOG.md` with this trigger.
- Rationale: per Kaliisa 2024 review, most learning-analytics
  dashboards show negligible effect. This eval is the pre-commitment
  to admit the same if it happens here.

## Out of Scope

- **Trend graphs / sparklines** — deferred to DASHBOARD-PARENT-002.
  MVP answers "what is true now?"; Stage 2 answers "how has it
  changed?".
- **Per-skill drill-down pages** — Stage 2.
- **Email digest** — requires server; deferred.
- **Sibling comparison in any form** — banned by ADR, not just
  deferred.
- **Parent streak / gamification of parent engagement** — banned.
- **Real-time push on session events** — banned (would train Marina
  to interrupt sessions).
- **Sharing / export beyond current `exportTelemetry`** — unchanged.
- **Age-gate or child bypass of `/parent` route** — the hidden route
  + PIN + math-gate is the MVP's privacy model; not adding FaceID
  / OS-level gates (would need native app).

## Validation Required

- `npm run typecheck` clean.
- `npm run lint` clean.
- `npm test` green — all new test files passing.
- `npm run build` succeeds.
- `npm run eval:backlog` — the new falsifier eval exists and is
  currently *green* (insufficient data ⇒ skip, not fail) at ship.

### Manual QA checklist

1. Fresh browser / incognito. Navigate to `/parent`. Set a 4-digit PIN.
2. Reload. Enter correct PIN → land on dashboard.
3. Enter wrong PIN 3 times → math-gate appears. Solve it → land back
   on PIN reset.
4. On dashboard: weekly digest card renders without errors even with
   no data (new profile case).
5. Evelyn card: exactly 2 skill tiles; Emilia card: exactly 4.
6. Tiles colored correctly per profile state (verify by creating a
   skill with graduation flag → green; recent attempts no grad → yellow;
   no attempts → gray).
7. With a skill showing < 40% first-try in last 20 attempts and ≥ 3
   sessions → wheel-spin indicator appears + verdict = "בואי נדבר".
8. Leave dashboard open 3 minutes → auto-return to login.
9. Submit a belief note → reload → comparison display replaces form.
10. Home page: confirm footer "הורים" link is subtle (secondary color,
    small font), not a prominent button.
11. **Tone audit:** no banned phrase from CLAUDE.md §Tone appears on
    the dashboard (manual scan of all rendered strings).
12. **Autonomy audit:** every action-line output starts with *"את
    יכולה..."* or equivalent invitation form; no imperatives.

## Definition of Done

- [ ] All code changes in, strict TypeScript, lint clean, tests green.
- [ ] Seven per-daughter components render correctly for both profiles.
- [ ] Verdict logic matches spec; wheel-spin detection matches spec.
- [ ] Belief-correction form submits and displays comparison.
- [ ] Weekly digest computes current-week values correctly.
- [ ] PIN + math-gate flows work end-to-end.
- [ ] Inactivity timeout returns to login.
- [ ] Banned-phrase lint covers all dashboard strings (no exceptions).
- [ ] ADR-003 written and committed.
- [ ] `parent-guide.md` updated with "האזור להורים" section.
- [ ] ROADMAP moved; CHANGELOG entry added.
- [ ] Falsifier eval file exists under `evals/backlog/`.
- [ ] Manual QA checklist passed, including tone + autonomy audits.

## Risks & Mitigations

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
