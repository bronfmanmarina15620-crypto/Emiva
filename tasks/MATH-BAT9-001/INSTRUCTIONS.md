# INSTRUCTIONS.md — MATH-BAT9-001

## Task Metadata
- task_id: MATH-BAT9-001
- title: Fractions introductory — Emiva Math for Emilia (bat 9), slice 1
- owner: Marina
- priority: P1
- target_branch: feat/math-bat9-001
- references:
  - `CLAUDE.md` — engineering + response format + Exercise UX rule + Tone rule
  - `MyLevel.docx §3.1` — Emilia curriculum: fractions, ops-1000, long-division; CPA (Singapore)
  - `MyLevel.docx §11.3` — quarterly external test (Khan Grade Level)
  - `tasks/MATH-MVP-001/INSTRUCTIONS.md` — pattern to follow
  - `plans/MATH-MVP-001.md` — architecture baseline (Leitner, mastery, adaptive)

## Objective

Open Emilia's math track with the **smallest pedagogically-meaningful slice**:
introductory fractions. Item bank + session flow + CPA pictorial component.
End state: Emilia (age 9) opens the app, gets fractions content instead of
the current "coming soon" card, runs one 10-item session end-to-end with
mastery tracking identical to Evelyn's loop.

This is **slice 1 of 3** under `MATH-BAT9-001` scope per `ROADMAP.md` (fractions
/ ops-1000 / long-division). Bar Models live in `MATH-EMILIA-BARMODELS-001`.

## In Scope

### Content — introductory fractions only
Five item types, deliberately narrow:

1. **זיהוי חזותי** — shape divided into N equal parts, K shaded. Prompt:
   "איזה חלק צבוע?" Answer: `K/N` from multiple choice (e.g. 1/4, 1/2, 1/3, 2/3).
2. **שם → חזות** — prompt: "איפה רואים **1/3**?" Multiple-choice of 3–4
   visual options.
3. **חצי/רבע של מספר** — prompt: "**חצי** מ-12 הוא?" Answer: numeric input.
   Connects fractions to division via intuitive language.
4. **השוואה** — prompt: "מה גדול יותר: 1/2 או 1/4?" Multiple choice.
5. **שווי-ערך בסיסי** — prompt: "2/4 זה אותו דבר כמו?" Choices: 1/2, 1/3, 1/4.

### Code
- Extend `Skill` type with `fractions_intro`.
- Extend `allowedSkillsForAge` — `fractions_intro` allowed for ages 8–10.
- `src/content/math/fractions-intro.json` — **minimum 25 items**, difficulty 1–5,
  spread across all five types (≥ 4 per type).
- `src/lib/fractions.ts` — Item type + answer validation (multiple choice +
  numeric). Reuse `mastery`, `adaptive`, `srs` from MVP — **do not fork**.
- `src/components/FractionViz.tsx` — SVG pictorial: horizontal bar split into
  N equal parts, K filled with sage, rest cream. Size: 200×60px. Accessible
  labels.
- Session page: when `activeProfile.allowedSkills` includes `fractions_intro`,
  render fractions items instead of (or before) add/sub. For this slice,
  Emilia sees **only fractions** (ops-1000 and long-division come in later slices).
- Hebrew RTL throughout. Same 3-attempt loop. Same growth-mindset tone.
- **Method-based reveal** per CLAUDE.md §Exercise UX rule — on attempt 3,
  show the filled bar + one-line explanation: "בחצי יש חלק אחד מתוך שניים שווים".
  Short, pictorial-first.

### Tests
Per `CLAUDE.md §Engineering standards` — tests alongside code:
- `tests/unit/fractions.test.ts` — answer validation (multiple choice + numeric +
  equivalence handling, e.g. `2/4` answer accepts `1/2`).
- `tests/unit/fractions-items.test.ts` — bank integrity (≥ 25 items, 5
  difficulty tiers, all 5 item types present).

## Out of Scope

- **Operations up to 1000** (add/sub/mul/div beyond 100) → later slice of
  MATH-BAT9-001.
- **Long division** → later slice.
- **Bar Models for word problems** → `MATH-EMILIA-BARMODELS-001`.
- **Mixed numbers** (e.g. 1½).
- **Fraction addition/subtraction** (same denominator or different).
- **Decimals, percentages** — future tasks.
- **Multi-step word problems** in fractions.
- **Pie-chart visualization** — horizontal bar only for this slice; pie
  can arrive when we have ≥ 2 concrete reasons (CLAUDE.md §Engineering).

## Required Inputs

### Code paths (new):
- `src/content/math/fractions-intro.json`
- `src/lib/fractions.ts`
- `src/components/FractionViz.tsx`
- `tests/unit/fractions.test.ts`
- `tests/unit/fractions-items.test.ts`

### Code paths (edit):
- `src/lib/types.ts` — add `fractions_intro` to skill union.
- `src/lib/profiles.ts` — extend `allowedSkillsForAge` (ages 8–10).
- `src/app/session/page.tsx` — branch on skill: render `FractionItem` when
  `fractions_intro`, else existing add/sub.
- `src/lib/feedback-messages.ts` — verify no new variant pool needed; reuse
  existing (growth-mindset retry / correct / reveal). If a fractions-specific
  reveal line is required, add a variant with `skill` context (not a new pool).

### Docs:
- `MyLevel.docx §3.1` (already read).
- `CLAUDE.md §Exercise UX rule` — 3-attempt loop, method-based reveal.
- `CLAUDE.md §Tone — growth-mindset only` — banned phrases, required framing.

### Dependencies:
- No new npm deps. SVG inline, no chart library.

## Constraints

- **Do not fork** `mastery.ts`, `adaptive.ts`, `srs.ts` — extend via item
  type, not parallel pipeline.
- **Do not touch** Evelyn's content — `add-sub-100.json` stays.
- **No breaking changes** to existing `localStorage` keys. If a migration is
  unavoidable, stop and ask.
- **Reuse growth-mindset copy.** No new "ניסיון אחרון" variants unless a
  fractions-specific situation requires it — and if so, approve with Marina
  before adding.
- **Pictorial is mandatory** on reveal. This is not optional polish — it's
  the CPA principle from `MyLevel.docx §3.1` ("Concrete → Pictorial → Abstract").
- Age gating: `fractions_intro` opens for **ages 8–10**. Evelyn (7) should
  not see these items (still sees `add_sub_100`).

## Deliverables

1. `fractions-intro.json` with ≥ 25 items across 5 types, 5 difficulty tiers.
2. `FractionViz` component rendering correctly for fractions 1/2, 1/3, 1/4,
   2/3, 3/4, 2/4, 2/6, etc.
3. Session loop works end-to-end for Emilia: profile → session → 10 fractions
   items → mastery % updates → saved to `emiva.mastery.v1.{profileId}`.
4. 3-attempt loop: attempt 3 reveal shows the pictorial + one-line method
   explanation in Hebrew.
5. Tone audit: no banned phrases anywhere in new strings (run
   `feedback:scan` style check mentally, or enumerate strings in PR).
6. Unit tests green: `fractions.test.ts` + `fractions-items.test.ts`.
7. All existing tests still green (no regression).
8. `plans/MATH-BAT9-001.md` — plan document with architecture decisions.
9. `ROADMAP.md` — mark this slice done; add follow-on slices
   (`MATH-BAT9-002` ops-1000, `MATH-BAT9-003` long-division) to Next or Later.
10. `CHANGELOG.md` — new entry under [0.2.0] (or next version) with added items.

## Validation Required

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm test` — all pass including new fractions tests.
- `npm run build` — production build succeeds.
- **Manual — golden path (Emilia persona):**
  - Clear localStorage. Create profile "Emilia", age 9.
  - `/session` renders fractions items (not "coming soon").
  - Complete 10 items. Mastery updates. Reveal on attempt 3 shows a sage-filled bar.
  - Session summary shows mastery %, no regression on MasteryJar.
- **Manual — Evelyn still works:**
  - Create profile age 7. `/session` still renders add/sub (not fractions).
  - Previous green path still green.
- **Manual — edge cases:**
  - Numeric input for "חצי מ-7" → 3.5 vs 3 vs 4: decide acceptable rounding in
    the plan. Simplest: only even numbers for halving items to avoid this.
  - Shape with 6 parts, 4 filled → answer `4/6` accepted, `2/3` also accepted
    (equivalence).

## Working Instructions

1. Read `CLAUDE.md`, this file, and `plans/MATH-MVP-001.md` for pattern.
2. **Before code:** write `plans/MATH-BAT9-001.md` covering: 3–5 architecture
   decisions (item data shape, answer validation for equivalence, SVG approach,
   session routing), item bank structure, UI copy, risk list.
3. Stay in slice. Do not bundle ops-1000 or Bar Models.
4. Two concrete cases before abstraction — e.g., don't build a generic
   `PictorialRenderer<any>` when the slice needs one horizontal-bar viz.
5. **Hebrew strings in one place** (`src/lib/fractions-strings.ts` or inline
   in content). Growth-mindset check per string before commit.
6. If a decision feels pedagogical (e.g., "is 2/4 equivalent to 1/2 for a
   first-meeting with fractions?") — stop, ask.

## Decision Rules

- Missing pedagogical info → one question, not a guess.
- Unclear item difficulty tagging → write the heuristic in the plan before
  tagging items.
- Regression risk in MVP loop → run full manual QA before merge.
- Copy that sounds even slightly judgmental → rewrite before commit.

## Definition of Done

- [ ] All deliverables (1–10) shipped.
- [ ] Validation run and reported.
- [ ] `MyLevel.docx §3.1` requirements for fractions-intro met (CPA-based,
      pictorial mandatory on reveal, Hebrew RTL).
- [ ] Tone audit passed — zero banned phrases, growth-mindset framing throughout.
- [ ] `ROADMAP.md` updated with slice done + follow-on slices.
- [ ] `CHANGELOG.md` entry.
- [ ] No TODO without owner or follow-up location (→ `tasks/BACKLOG.md`).

## Measurement Hooks (per CLAUDE.md §Measurement rule)

- **Proxy פנימי:** mastery % per session for `fractions_intro`. Separate from
  `add_sub_100` (per-skill mastery).
- **מבחן חיצוני:** `MyLevel.docx §11.3` specifies quarterly external test.
  This task leaves a hook: `fractions_intro` items tagged with
  `external_test_eligible: true/false` so a future task
  (`MATH-EXTERNAL-TEST-001`) can sample un-drilled items. Do not build the
  test harness now — just leave the flag.

## Risks & Mitigations

| סיכון | מיטיגציה |
|-------|----------|
| Item bank too small → adaptive signal weak | ≥ 25 items, ≥ 4 per type, 5 difficulty tiers |
| Pictorial component drifts from Neo-Montessori palette | Reuse sage tokens from `globals.css`; visual QA against `docs/design/BRANDING.md` |
| Numeric answer ambiguity (half of 7) | Restrict halving items to even numbers in slice 1 |
| Equivalence answers (2/4 = 1/2) not accepted | Validation accepts any equivalent fraction; tests cover this |
| Regression in Evelyn's add/sub flow | Full manual QA with age-7 profile before merge |
| Scope creep into ops-1000 or Bar Models | Explicit Out-of-Scope list; refuse in-task additions |
| Hebrew numeric phrasing edge cases ("חצי מ-12") | Write all prompts in plan, review with Marina before bank generation |

## Handoff

- **PM → Eng:** confirm scope + pedagogical choices before code (halving
  phrasing, equivalence acceptance, item bank phrasing samples).
- **Eng → Review:** PR with plan + code + tests + manual QA screenshots for
  both personas (age-7 unchanged, age-9 new).
- **Review → Done:** merge only after full DoD.
