# Changelog — Emiva

All notable changes to Emiva. Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates are `YYYY-MM-DD`.

## [Unreleased]

### Added — Parent dashboard V1.1 refinements
- **Belief-note kind tag.** Belief form now asks whether the note is about
  *ביצועים* / *רגש* / *אחר*. Storage stores the kind; comparison display
  adapts — for `feeling` notes, dashboard shows activity (sessions +
  minutes) instead of an accuracy % (because "she was sad" + "55% correct"
  is apples-to-oranges). Legacy notes without a kind normalize to `"other"`.
- **Small-sample warning.** Belief comparison flags `lowSample: true` when
  < 10 attempts accrued since the note. UI appends *"(מעט נתונים עדיין)"*
  to dampen over-reading of noisy %s.
- **Weak-data highlight.** When ≥ 10 attempts AND < 50% first-try correct
  since the note, the comparison renders on a mustard-soft background —
  signalling "the numbers disagree with what you wrote; worth a look."
- **End-of-session feeling prompt.** Summary page shows 😊 / 😐 / 😟
  buttons ("כיף / בסדר / קשה") that log a new `session_feeling` telemetry
  event. Parent dashboard digest aggregates counts per week per daughter.
- **Weekly minutes metric.** `computeWeeklyMinutes` pairs `session_start`
  with `session_end` (capped at 30 min per session), surfaces total per
  daughter in the weekly digest. Covers CLAUDE.md §5's time target (10–15 min/day).
- **Trend arrow.** `computeTrend` compares current-7d vs prior-7d first-try
  %; displays ↑/↓/→ on the daughter card header. ±5pp threshold; shows
  nothing when either window has < 10 attempts.
- **Parent reminder dot.** Home-page "הורים" link shows a terracotta dot
  if > 14 days since the last `dashboard_opened` event — addresses the
  pull-vs-push gap in the Bergman mechanism within the no-server constraint.
- **New constants** in `src/lib/types.ts`: `BELIEF_LOW_SAMPLE`,
  `BELIEF_WEAK_PCT`, `TREND_DELTA_PCT`, `REMINDER_DAYS`, `MAX_SESSION_MS`.
- **Tests:** parent-dashboard test file grew from 25 → 40 cases (new groups:
  `computeWeeklyMinutes`, `computeSessionFeelings`, `computeTrend`,
  `computeParentReminderNeeded`, belief-comparison new fields).
  parent-belief gained 2 cases (kind persistence, legacy normalization).
  Total test count: **242 → 259 passing**.

### Added — Parent dashboard MVP (DASHBOARD-PARENT-001)
- **New route `/parent`** — PIN + math-gate entry. First visit: set a
  4–6 digit PIN (stored as SHA-256 hash, never plaintext). Login
  verifies against hash. 3 failed attempts → random 2-digit multiplication
  math-gate; correct answer resets the PIN, wrong answer locks the
  area for 5 minutes.
- **New route `/parent/dashboard`** — per-daughter verdict-based
  dashboard:
  - **Verdict badge** (*"על המסלול" / "כדאי לשים לב" / "בואי נדבר"*),
    computed from inactivity + first-try % + wheel-spinning signals.
    Worst-of rule; no traffic-light on the person itself.
  - **Autonomy-invitational action line** — one Hebrew sentence
    prefixed *"את יכולה להציע / להזמין"*. Priority: wheel-spin →
    inactivity → SRS due → default. Banned-phrase test enforces
    imperatives never appear.
  - **"Possible cause" line** — names the upstream weak skill when
    the verdict is not "on track" (fractions → add/sub, long_division
    → multiplication, etc.). Squirrel AI-inspired.
  - **Skill-tile grid** per daughter (2 tiles for ages 7–8,
    4 tiles for 9–10), colored by mastery state: not-started / in-progress
    / mastered (via `hasGraduatedFlag`).
  - **Wheel-spinning indicator** per skill — fires at ≥ 20 attempts,
    ≥ 3 sessions, ≤ 40% first-try correct over last 20.
  - **Belief-correction form** — one text entry per ISO week,
    juxtaposed with observed metrics since the note. Encodes Bergman
    2021's causal-mechanism evidence.
  - **Weekly digest card** at the top — Bark-anatomy (total attempts ·
    newly mastered · wheel-spin count · one recommendation).
  - **Inactivity timeout (3 minutes)** returns to login — "dashboard
    closed while child present" is a product rule, not a tip.
- **New libs:** `src/lib/parent-auth.ts` (PIN hash via `crypto.subtle`,
  math-gate), `src/lib/parent-belief.ts` (ISO week keys + per-week
  notes), `src/lib/parent-dashboard.ts` (verdict / action-line /
  wheel-spin / tiles / belief-comparison / weekly-digest — all pure,
  all accept `now?: number`).
- **New constants** in `src/lib/types.ts`: `WHEEL_SPIN_MIN_ATTEMPTS`,
  `WHEEL_SPIN_MIN_SESSIONS`, `WHEEL_SPIN_THRESHOLD_PCT`,
  `INACTIVITY_DAYS_WATCH`, `INACTIVITY_DAYS_TALK`,
  `WATCH_FIRST_TRY_PCT`, `WATCH_DROP_DELTA_PCT`, `DASHBOARD_TIMEOUT_MS`.
- **New telemetry events:** `dashboard_opened` (parent-scoped key
  `_parent`), `belief_submitted` (per daughter), `action_line_shown`
  (per daughter, with trigger).
- **Home page footer:** subtle "הורים" link to `/parent` (no button,
  no prominence — the "hidden route" pattern).
- **ADR-003 — Parent Dashboard Design** locks in the
  verdict-first / invitation-framed / belief-correction design, and
  explicitly rejects: sibling comparison, traffic-light-per-person,
  parent streak gamification, real-time session push, imperative
  action phrasing.
- **Path rule `.claude/rules/parent-dashboard-guardrails.md`** enforces
  the ADR at the file-scope level + requires parent-guide sync
  on any metrics/verdicts/thresholds change.
- **parent-guide.md §10 "האזור להורים"** — user-facing explanation,
  cross-referenced by research source type (cognitive / practice).
- **Falsifier eval** `evals/backlog/dashboard-followthrough.eval.ts` —
  goes red at 4 weeks if Marina submitted < 2 belief notes AND opened
  the dashboard < 8 times. Pre-commitment to honesty if the design
  doesn't earn its seat.
- **Tests:** `parent-auth.test.ts` (11 cases), `parent-belief.test.ts`
  (10 cases), `parent-dashboard.test.ts` (17 cases: verdict,
  wheel-spin, action, possible-cause, tiles, digest, banned-phrase
  audit). Four rounds of research ahead of implementation; full log
  in [tasks/DASHBOARD-PARENT-001/research.md](tasks/DASHBOARD-PARENT-001/research.md).

### Added — bar_models skill (MATH-EMILIA-BARMODELS-001)
- **New skill `bar_models`** — Singapore-style word problems with bar
  diagrams. Unlocked for age 9–10, ordered after `long_division`.
- **New `BarModelItem` type** + `BarModelBar` + `BarModelSegment`. Items
  carry Hebrew prompt, 1–2 bars (each with labeled segments and optional
  total/row labels), numeric answer, and Hebrew CPA explanation.
- **Item bank:** 30 items across 5 tiers (`src/content/math/bar-models.json`).
  T1: single-bar part-whole, single-digit. T2: 2-digit part-whole.
  T3: two-bar comparison. T4: two-step + multi-part split.
  T5: ratio-style ("פי X", groups).
- **New component `BarModelViz`** (`src/components/BarModelViz.tsx`):
  non-interactive SVG renderer. Cream background, sage segment fills,
  dashed sage border on unknown segments, RTL Hebrew labels, optional
  row-labels and bottom total-labels. Responsive via `viewBox`.
- **Session page:** `ItemPrompt` renders the word problem + bar diagram;
  `ItemInput` reuses numeric input path; `ItemReveal` re-shows the bar
  with answer + method explanation.
- **`isItemCorrect` / `canonicalAnswer`** extended for `bar_models` (numeric
  integer compare).
- **Tests:** `tests/unit/bar-models.test.ts` (11 cases: size, tier
  distribution, positive-integer answers, 1–2 bars, ≥1 `?` per item,
  positive segment weights, banned-phrase scan, integration).
  `profiles.test.ts` updated for age 9–10 now returning 4 skills.
  Total: **196 passing** (was 185).

### Added — long_division skill (MATH-BAT9-003)
- **New skill `long_division`** — division with integer quotients, no remainders.
  Unlocked for age 9–10, ordered after `ops_1000`.
- **Item bank:** 60 items across 5 tiers (`src/content/math/long-division.json`).
  T1: basic (answer ≤ 10). T2: 2-digit ÷ single-digit (answer single-digit).
  T3: 2-digit (answer 11–20). T4: 3-digit (answer ≤ 30). T5: 3-digit (answer 30–72).
  All divide evenly.
- **New `DivisionItem` type** + widened `isArithmeticItem`. Same numeric input,
  same reveal pattern. Prompt-size rule extended: 3-digit divisions use `text-5xl`.
- **`explain.ts` division branch:** small cases use counting framing; 3-digit
  cases mention long-division steps. Every reveal includes the multiplication
  check (`B × answer = A`).
- **Tests:** `tests/unit/long-division.test.ts` (10 cases: bank size, tier
  distribution, even-division invariant, divisor range, prompt regex,
  integration). `items.test.ts` +4 (narrowing, correctness, canonical).
  `explain.test.ts` +3 (small, 2-digit, 3-digit). `profiles.test.ts` updated.
  Total: **185 passing** (was 168).

### Added — Bank expansion, softened difficulty, anti-repeat bias
- All four math banks expanded to ≥60 items: `add_sub_100` (30→60),
  `multiplication` (30→60), `ops_1000` (30→60), `fractions_intro` (26→60).
- `selectNextItem` now uses `DIFFICULTY_TOLERANCE = 1` — pool includes items
  within ±1 of the target difficulty, so each session draws from roughly 3×
  the previous pool.
- New `MasteryState.itemLastSeen: Record<itemId, sessionCount>`. Session page
  records `recordItemShown` on every first/next item. Ties within tolerance
  now resolved by staleness — least-recently-seen wins.
- All existing saves normalize missing `itemLastSeen` to `{}`; no migration.

### Added — Delete profile + age-range validation
- Home screen: each profile row has an `×` button. `deleteProfile(id)`
  removes the profile and purges per-profile mastery, graduation flags,
  last-session timestamp, and telemetry. Active profile is cleared if deleted.
- `purgeProfileStorage` in `storage.ts` sweeps all keys under `emiva.*.{profileId}`.
- `/profiles/new` age input tightened to 7–10 (was 3–18); `submitting` state
  prevents double-submit. Profiles with out-of-range age on the home screen
  show "אין תוכן" in terracotta.
- Tests: `profiles.test.ts` +4 deletion cases. `storage.test.ts` extended with
  pre-graduation-schema normalization check.

### Added — multiplication skill (MATH-EVELYN-MULT-001)
- **New skill `multiplication`** — multiplication tables 2–10. Unlocked for
  age 7–8 profiles, ordered after `add_sub_100`.
- **New `MultItem` type** — structurally like `AddSubItem` but `op: "*"`.
  `Item` union widened; `isArithmeticItem` type-guard now narrows to
  `AddSubItem | MultItem`, so existing session UI flows through unchanged.
- **Item bank:** `src/content/math/multiplication.json` — 30 items across 5
  tiers. Covers every table 2–10. Tiers: T1 (×2/×5/×10 anchors) →
  T2 (×3/×4) → T3 (×6/×9) → T4 (×7/×8) → T5 (mixed / commuted hardest).
- **Method-based reveals in `src/lib/explain.ts`:**
  - ×2 → doubling (`4 × 2 = 4 + 4 = 8`)
  - ×10 → add a zero
  - ×5 → "half of ×10" anchor (`4 × 5 = half of 4 × 10 = 20`)
  - ×9 → "×10 minus one" trick (`7 × 9 = 70 − 7 = 63`)
  - default → skip counting groups (`3 × 7 = 3 קבוצות של 7: 7, 14, 21`)
  - long skip-count lists truncate to 4 stops + `...`
  - anchor detection is commute-agnostic (`2 × 7` and `7 × 2` both framed as ×2)
- **Auto-routing:** when Evelyn graduates `add_sub_100`, the session picks
  `multiplication` via existing `pickActiveSkill`. No new routing code.
- **Tests:** `tests/unit/multiplication.test.ts` (12 cases: size, tier
  distribution, op consistency, full 2–10 table coverage, prompt regex,
  integration). `tests/unit/items.test.ts` +4. `tests/unit/explain.test.ts`
  +7 (each anchor + default + truncation). `tests/unit/profiles.test.ts`
  updated for new 7–8 age mapping. Total tests: **162 passing** (was 139).

### Added — ops_1000 skill (MATH-BAT9-002)
- **New skill `ops_1000`** — add/sub operations with numbers up to 999. Unlocked
  for age 9–10 profiles, ordered after `fractions_intro`.
- **Item bank:** `src/content/math/ops-1000.json` — 30 items across 5 tiers
  (3-digit + 1-digit → 3-digit + 3-digit with multi-carry). 15 add + 15 sub.
  All answers validated at test-time against `operands + op` (computed check).
- **Auto-routing after graduation:** `pickActiveSkill(allowed, profileId)` in
  `src/app/session/page.tsx` picks the first non-graduated skill from
  `allowedSkills`. When Emilia graduates `fractions_intro`, the next session
  automatically routes to `ops_1000`. No explicit parent action needed.
- **Type widening:** `AddSubItem.skill` now accepts `"add_sub_100" | "ops_1000"`.
  Same numeric shape, same `isItemCorrect` logic, same `explain.ts` method-based
  reveals. Added `isArithmeticItem(item)` type-guard helper to
  `src/lib/items.ts` to avoid scattered `skill === "..."` checks.
- **Prompt sizing:** `ops_1000` items render at `text-5xl` (down from `text-7xl`)
  so 3-digit + 3-digit prompts like `347 + 256 = ?` don't overflow on tablets.
- **Tests:** `tests/unit/ops-1000.test.ts` (13 cases: bank size, tier distribution,
  add/sub balance, computed-answer consistency, range, tier-1/tier-5 structure,
  prompt regex, integration with `isItemCorrect`).
  `tests/unit/items.test.ts` extended (+8 cases: `isArithmeticItem` narrowing,
  `isItemCorrect` + `canonicalAnswer` + `itemSkill` for `ops_1000`).
  `tests/unit/profiles.test.ts` updated for new age→skill mapping.
  Total tests: **139 passing** (was 118).

### Added — Skill graduation (MATH-GRADUATION-001)
- **Criterion in code:** `skillGraduated(state)` in `src/lib/mastery.ts`. Three
  conditions, all required: ≥ 20 first-attempt-correct answers, ≥ 2 distinct
  sessions, ≥ 24h between first and latest session. Constants in `types.ts`
  (`GRADUATION_MIN_CORRECT`, `GRADUATION_MIN_SESSIONS`, `GRADUATION_MIN_GAP_MS`).
- **Session-timestamp tracking:** `MasteryState.sessionTimestamps: number[]`
  pushed on every `incrementSession(...)`. Legacy saves without the field
  normalize to `[]` via `normalizeMastery` in `storage.ts` — no migration step,
  no regression for Evelyn/Emilia's existing progress.
- **Graduation UI:** session-summary page shows a dedicated sage-bordered banner
  when graduated ("סיימת את הנושא! 🎉"). Confetti intensity ramps up
  (`fireGraduation`). Reduced-motion honored.
- **One-shot telemetry:** `skill_graduated` event logged exactly once per
  `profileId × skill` via localStorage flag `emiva.graduated.v1.{profileId}.{skill}`
  (`hasGraduatedFlag` / `markGraduated` in `storage.ts`).
- **Tests:** `tests/unit/mastery-graduation.test.ts` (7 cases: empty, under-correct,
  1-session, <24h, all-three-hold, first-attempt-only, monotonicity).
  `tests/unit/storage.test.ts` extended (+4 cases: pre-graduation schema normalizes,
  flag absence/set/profile-scoping). Total tests: **118 passing** (was 107).

### Added — Parent-facing docs
- [docs/parent-guide.md](docs/parent-guide.md) — מדריך הורה בעברית, 10 סעיפים: מנגנון המוצר (3-ניסיונות, level-up, SRS-Leitner, graduation) + ההקשר הפדגוגי מ-MyLevel (זמן סשן מומלץ, מבחן חיצוני רבעוני, טבלת החלטה להורה, בדיקת תשתית שינה/קריאה/זמן-ריק/אווירה). §4 עודכן מ-proposed ל-implemented בעקבות MATH-GRADUATION-001. Source-of-truth pointers למקומות בקוד שמקודדים את הכללים.

## [0.2.0] — 2026-04-19

Second slice: Emilia's math track opens — introductory fractions.

### Added — Fractions introductory (MATH-BAT9-001 slice 1)
- New skill `fractions_intro`, gated for ages 9–10.
- Item bank: 26 items, 5 difficulty tiers, 5 item types (identify, name_to_visual, halving, compare, equivalent).
- `src/lib/fractions.ts` — gcd, reduce, parse, equivalence, validation. Accepts any equivalent form for identify items (`2/4` and `1/2` both correct).
- `src/components/FractionViz.tsx` — horizontal bar SVG with sage-filled parts over cream ground (Singapore CPA pictorial).
- Method-based reveal: fraction viz + one-line explanation per item, matching `CLAUDE.md §Exercise UX rule`.
- Session page branches by profile skill: age 7–8 → `add_sub_100`, age 9–10 → `fractions_intro`.

### Changed — Per-skill mastery storage
- `emiva.mastery.v1.{profileId}` → `emiva.mastery.v1.{profileId}.{skill}`.
- Automatic one-shot migration on first load of legacy key; corrupt legacy values are dropped without crashing.
- Per-skill mastery isolation: Evelyn's add/sub progress and Emilia's fractions progress are independent.

### Added — Engineering
- `src/lib/items.ts` — skill-agnostic adapter (`isItemCorrect`, `canonicalAnswer`).
- 45 new tests across 4 files: fractions validation (15), bank integrity (8), storage migration (7), items adapter (14), profiles re-derive (1). Total tests: **107 passing** (was 61).

### Fixed — Stale `allowedSkills` on existing profiles
- `loadProfiles` now re-derives `allowedSkills` from age on every read. Previously, a profile created before a curriculum update kept its stale `allowedSkills: []`, causing the "בקרוב" screen to appear for Emilia even after the curriculum was extended. Now curriculum changes propagate to existing profiles automatically.

### Changed — CLAUDE.md governance
- `§Response format` restructured: added **Micro tier** (ack / error / small explanation), `IMPORTANT` tokens on two critical rules, formatting rule (prose unless list ≥ 3 items), "no 'צודקת'" norm, scaffold explicitly marked "when applicable".
- Clarified that `MyLevel.docx` = `master_curriculum.docx` (same file, legacy filename).
- `§Ritual cadence` now references [ADR-002](docs/adr/002-scheduled-rituals.md) instead of `ADR-0xx` placeholder.

### Added — Infrastructure (ADR-002)
- GitHub repo (public): `bronfmanmarina15620-crypto/Emiva`.
- Two `/schedule` remote triggers: weekly devlog (Fri 18:00 IDT) + monthly milestone (1st 09:00 IDT).
- [ADR-002 — Scheduled Rituals](docs/adr/002-scheduled-rituals.md) codifies the ritual-adherence risk fix identified in ADR-001.

### Known-open
- `MATH-BAT9-002` (ops up to 1000) and `MATH-BAT9-003` (long division) not yet started.
- `MATH-EMILIA-BARMODELS-001` — Bar Models for word problems — not yet started.
- Full manual QA of Emilia fractions session not completed (stale-profile bug interrupted the first attempt; fix verified via unit test, not via a full session in browser).

## [0.1.0] — 2026-04-19

First day: pre-scaffold → working MVP with brand + per-profile isolation.

### Added — Math MVP (MATH-MVP-001)
- Next.js 15 App Router + TypeScript strict + React 19 + Tailwind scaffold.
- Model A loop: Mastery Gating + Adaptive Difficulty + Spaced Repetition (Leitner 5-box).
- Item bank: 30 items, difficulty 1–5, addition/subtraction up to 100.
- Session flow: 10 items (configurable via `NEXT_PUBLIC_ITEMS_PER_SESSION`), mastery % running over last 10 attempts, 80% target.
- Hebrew RTL baseline.
- 35 unit tests (mastery, SRS, adaptive, explain, feedback, greetings, profiles).

### Added — Pedagogy (retry + explanation)
- Up to 3 attempts per item. Answer reveal paired with method-based explanation (CPA — make-10, decomposition).
- Mastery credit only on attempt 1.

### Added — Tone (growth-mindset)
- Banned fixed-mindset phrases ("לא נכון", "טעית", "שגוי").
- Required framing: Dweck's "עוד לא", effort acknowledgement, collaborative reveal.
- Variant pools for retry / correct / reveal messages.

### Added — UI (Neo-Montessori)
- Warm palette: cream bg, terracotta CTA, sage success, mustard retry, warm-indigo reveal.
- Typography: Heebo 800 (headings) + Rubik 400/500/600 (body) via `next/font/google`.
- `MasteryJar` SVG component with dual-text clip paths (readable regardless of fill level).
- `canvas-confetti` celebration, fires once per crossing of 80% threshold, respects `prefers-reduced-motion`.

### Added — Welcome + greetings (UI-WELCOME-GREETINGS-001)
- `welcome` phase before session.
- Time-aware + continuity-aware greetings in Hebrew (morning / afternoon / evening / returning-same-day / after-break / new-week).
- Name-prefixed variant when an active profile exists.

### Added — Backlog system (4 layers)
- `tasks/BACKLOG.md` — register with triggers + owners.
- `evals/backlog/*.eval.ts` + `npm run eval:backlog` — auto-fail when a trigger fires.
- `src/lib/telemetry.ts` + `npm run telemetry:check` — local event log, parent exports JSON.
- `tasks/FEEDBACK-LOG.md` + `npm run feedback:scan` — human feedback → BACKLOG suggestions.
- CLAUDE.md §Backlog — layers + pickup discipline + ripeness criteria.

### Added — Per-profile isolation (MATH-PROFILES-001)
- Profile picker on `/`, profile creation at `/profiles/new`.
- All storage scoped by `profileId`: mastery, last-session, telemetry.
- Age-based content gating (`allowedSkillsForAge`) — skill offered only if age range matches.
- Security: names live in `localStorage` only; never in repo, code, or telemetry.

### Added — Brand (UI-NEO-MONTESSORI-001 + BRAND-001)
- `Logo` + `LogoMark` components. 3 ascending sage pills + wordmark with one-letter sage accent.
- Favicon (`src/app/icon.svg`) — mark-only, Next.js auto-detection.
- [docs/design/BRANDING.md](docs/design/BRANDING.md) — design rules, do/don'ts, future tasks.
- [docs/design/children-ed-ui-research.md](docs/design/children-ed-ui-research.md) — research reference.

### Added — Docs structure
- `docs/README.md`, `docs/design/`, `docs/devlog/`, `docs/adr/`, `docs/milestones/`, `docs/postmortems/`.
- ADR-001: Layered Backlog System.

### Changed — Product name
- MyLevel → Evami → **Emiva** (final).
- Storage key prefix migrated: `mylevel.*` → `evami.*` → `emiva.*` (pre-production; no data migration).
- Logo wordmark accent letter: `L` → `a` → `i`.
- Folder `C:\Users\User\MyLevel` → `C:\Users\User\Emiva`.

### Deferred (in `tasks/BACKLOG.md`)
- BL-001 — expand feedback variant pools (trigger: eval floor raised after real usage).

### Known-open (not yet backlog entries)
- Domain registration (emiva.com / .co / .app / .co.il) — pending manual WHOIS.
- MATH-BAT9-001 — Emilia's content (fractions, long division). Placeholder "coming soon" card shown now.
