# INSTRUCTIONS.md — MATH-GRADUATION-001

## Task Metadata
- task_id: MATH-GRADUATION-001
- title: Skill graduation criterion — "סיימת את הנושא"
- owner: Marina
- priority: P1
- target_branch: feat/math-graduation-001
- references:
  - `docs/parent-guide.md §4` — proposed criterion, now implementing
  - `CLAUDE.md §Exercise UX rule` — mastery credit only on attempt 1
  - `MyLevel.docx §3 Core`, `§11.3` — Bloom 80% + external test context
  - `src/lib/mastery.ts`, `src/lib/types.ts`, `src/app/session/page.tsx`

## Objective

When a child completes enough first-attempt-correct answers in a skill,
across ≥ 2 distinct sessions with ≥ 24 hours between them, the app should
recognize that the skill is "done." The session summary shows a special
celebration. Telemetry logs the graduation. No automatic routing to a
next skill — the next skill does not yet exist for either child.

## In Scope

### Criterion (parent-guide §4, locked)
- `≥ GRADUATION_MIN_CORRECT` first-attempt-correct answers (default: 20)
- `≥ GRADUATION_MIN_SESSIONS` distinct sessions (default: 2)
- `≥ GRADUATION_MIN_GAP_MS` between first and latest session (default: 24h)

All three must hold. "First-attempt correct" is already how
`attempts[].correct` is recorded today — attempts 2/3 store `false`, per
`session/page.tsx:210`.

### Code changes
- `src/lib/types.ts`:
  - `MasteryState.sessionTimestamps: number[]` (new)
  - New constants `GRADUATION_MIN_CORRECT`, `GRADUATION_MIN_SESSIONS`, `GRADUATION_MIN_GAP_MS`
- `src/lib/mastery.ts`:
  - `emptyMastery` returns `sessionTimestamps: []`
  - `incrementSession` pushes current timestamp
  - `skillGraduated(state, now?): { graduated: boolean; reason: string }`
- `src/lib/storage.ts`:
  - Normalize loaded state — default `sessionTimestamps: []` if missing
  - Legacy migration: existing saves without the field still parse.
- `src/app/session/page.tsx`:
  - In `summary` phase, call `skillGraduated(state)`.
  - If `graduated && !alreadyCelebrated(profile, skill)` → show graduation block
    (distinct from the MasteryJar celebration): warm headline, "פרק חדש מגיע בקרוב",
    switch-profile / new-session buttons.
  - Log `skill_graduated` telemetry event **once** per profile × skill (track via
    a localStorage flag `emiva.graduated.v1.{profileId}.{skill}`).
- `src/lib/telemetry.ts`:
  - Add `skill_graduated` event type.

### Tests
- `tests/unit/mastery-graduation.test.ts` covering:
  - Not graduated when 0 first-attempt corrects.
  - Not graduated when < MIN_CORRECT first-attempt corrects.
  - Not graduated when ≥ MIN_CORRECT but only 1 session.
  - Not graduated when ≥ MIN_CORRECT, 2 sessions, but gap < 24h.
  - Graduated when all three conditions hold.
  - Non-first-attempt correct (`correct: false` in record) does not count toward the 20.
- `tests/unit/storage.test.ts`:
  - Legacy mastery without `sessionTimestamps` loads with empty array.

### Docs
- `docs/parent-guide.md §4` — rewrite from "proposed" to "implemented" + cite the
  constants in §10 source-of-truth table.
- `ROADMAP.md` — mark `MATH-GRADUATION-001` Done, remove from implied future work.
- `CHANGELOG.md` — [Unreleased] entry under Added.

## Out of Scope

- **Routing to the next skill.** No next skill exists. When `ops_1000` or
  `multiplication` ship (MATH-BAT9-002, MATH-EVELYN-MULT-001), routing gets
  added in those tasks.
- **Changing the mastery window (`WINDOW_SIZE`, `MASTERY_TARGET`).** The
  graduation criterion lives *alongside* the adaptive-difficulty criterion,
  not replacing it.
- **Per-session attempt breakdown.** We require total ≥ 20 and gap ≥ 24h;
  we do not enforce a minimum-corrects-per-session. Simpler, good enough
  for v1.
- **UI for "undo graduation" / reset.** If the child restarts, the legacy
  "reset" path still works for the mastery state; the one-shot graduation
  flag persists intentionally, so we don't re-celebrate.

## Validation Required

- `npm run typecheck` clean.
- `npm run lint` clean.
- `npm test` green; new graduation tests cover all 6 cases above.
- `npm run build` succeeds.
- **Manual:**
  - Clear localStorage. Create profile Evelyn (7). Set `GRADUATION_MIN_CORRECT`
    temporarily to 3 via code override for faster QA (revert before commit).
  - Play 3 correct items in session 1, end. Wait — manually bump timestamp in
    devtools or run session 2 after a fake delay.
  - Session 2: answer ≥ 1 correct. End session. Summary should show the
    graduation block.
  - Verify telemetry exports `skill_graduated` event once, not twice.

## Definition of Done

- [ ] All code changes applied, types strict, tests green.
- [ ] Legacy mastery in localStorage still loads (no reset for Evelyn/Emilia).
- [ ] parent-guide.md §4 updated (no longer "proposed").
- [ ] ROADMAP + CHANGELOG updated.
- [ ] Manual QA: graduation block appears once, `skill_graduated` telemetry
  emitted exactly once per profile × skill.
- [ ] Tone check: every user-facing string in the graduation block is
  growth-mindset (CLAUDE.md §Tone), no banned phrases.

## Risks & Mitigations

| סיכון | מיטיגציה |
|-------|----------|
| קריטריון יורה על סמך זיכרון קצר-טווח (20 נכונים בסשן אחד מרוכז) | דרישת 2 סשנים + 24h עוצרת זאת |
| Child graduates with no next content → anti-climactic | UI מפורש: "פרק חדש מגיע" + הורה מקבלת signal ב-telemetry |
| Legacy mastery ללא `sessionTimestamps` נשבר | נורמליזציה ב-`storage.ts`, test ייעודי |
| חגיגה חוזרת בכל סשן אחרי graduation | דגל one-shot ב-localStorage + telemetry חד-פעמי |
| הסתמכות על `Date.now()` מקשה על טסטים | כל הפונקציות הציבוריות מקבלות `now?: number` להזרקה |
