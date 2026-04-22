# INSTRUCTIONS.md — MATH-EVELYN-MULT-001

## Task Metadata
- task_id: MATH-EVELYN-MULT-001
- title: Multiplication tables — Evelyn's next skill after add_sub_100
- owner: Marina
- priority: P1
- target_branch: feat/math-evelyn-mult-001
- references:
  - `MyLevel.docx §3.1` — Evelyn: "חיבור וחיסור עד 100, לאט מתקדמים לכפל"
  - `tasks/MATH-BAT9-002/INSTRUCTIONS.md` — parallel-slice pattern (new skill + routing)
  - `tasks/MATH-GRADUATION-001/INSTRUCTIONS.md` — criterion that unlocks this
  - `src/lib/explain.ts` — method-based reveal target to extend

## Objective

Ship Evelyn's second skill: **multiplication tables 2–10**. When Evelyn
graduates `add_sub_100` (MATH-GRADUATION-001 criterion), the session routes
her to `multiplication`. Method-based reveals use CPA framing (groups,
skip-counting, anchors: ×2 = doubling, ×10 = tens, ×5 = half of ×10).

## In Scope

### Content
- `src/content/math/multiplication.json` — **minimum 30 items** across 5 tiers:
  - **Tier 1 (anchors):** ×2, ×5, ×10 tables. E.g., `3 × 2`, `4 × 5`, `7 × 10`.
  - **Tier 2:** ×3, ×4 tables. E.g., `6 × 3`, `8 × 4`.
  - **Tier 3:** ×6 table + ×9 (using the "×10 minus one" trick).
  - **Tier 4:** ×7, ×8 tables (hardest for this age).
  - **Tier 5:** mixed / commuted (e.g., `7 × 8`, `8 × 7`, `9 × 6`).
- Balance add up to 30 (≥ 6 per tier).
- All operands `[1..10]`. Answers ∈ [0, 100].

### Code changes
- `src/lib/types.ts`:
  - `Skill` union → add `"multiplication"`.
  - New `MultItem` type (structurally like `AddSubItem`, but `op: "*"` and
    `skill: "multiplication"`).
  - `Item` union → add `MultItem`.
- `src/lib/items.ts`:
  - `isArithmeticItem` → include `MultItem` (widen return type).
- `src/lib/explain.ts`:
  - Extend signature to `AddSubItem | MultItem`.
  - New branch: `explainMultiplication(a, b)` with CPA-style reasoning —
    groups, skip-counting, ×10 anchor for ×5/×9 tricks.
- `src/lib/profiles.ts`:
  - `allowedSkillsForAge(7..8)` → `["add_sub_100", "multiplication"]` (ordered).
- `src/app/session/page.tsx`:
  - Add `MULTIPLICATION_BANK`, extend `bankForSkill` switch.
  - No new routing logic — `pickActiveSkill` already handles "first non-graduated."
  - `ItemPrompt` / `ItemInput` — already use `isArithmeticItem`; MultItem flows
    through without extra branches.

### Tests
- `tests/unit/multiplication.test.ts` — bank integrity mirroring
  `ops-1000.test.ts` (size, tier distribution, computed-answer consistency,
  range, prompt regex).
- `tests/unit/profiles.test.ts` — age-7/8 now returns `["add_sub_100", "multiplication"]`.
- `tests/unit/items.test.ts` — `isArithmeticItem` + `isItemCorrect` +
  `canonicalAnswer` + `itemSkill` cover `multiplication`.
- `tests/unit/explain.test.ts` — new cases for `explainMultiplication`
  covering ×2 (doubling), ×5, ×10, ×9 trick, default skip-count case.

### Docs
- `docs/parent-guide.md §4` — mention multiplication as the post-graduation
  target for Evelyn.
- `ROADMAP.md` — move MATH-EVELYN-MULT-001 from Now to Done.
- `CHANGELOG.md` — [Unreleased] entry.

## Out of Scope

- **Division.** Comes later (Emilia's long-division = `MATH-BAT9-003`;
  Evelyn's division is not yet scoped).
- **Multiplication beyond ×10.** ×11 and ×12 are common in English-speaking
  curricula but not standard in Israeli math for this age. Keep 1..10.
- **Word problems involving multiplication.** Would be
  `MATH-EVELYN-WORDPROBLEMS-001` (future).
- **Visual arrays / manipulatives.** CPA here is verbal (groups,
  skip-counting). Array renderer can come later if pedagogy requires.
- **Repeated-addition pedagogy only.** We want CPA *progression* —
  pictorial/abstract methods, not just "multiplication = repeated addition."

## Validation Required

- `npm run typecheck` clean.
- `npm run lint` clean.
- `npm test` green; new bank + explain tests pass.
- `npm run build` succeeds.
- **Manual — Evelyn path:**
  - Clear localStorage. Create profile age 7.
  - First session: `add_sub_100` items (unchanged).
  - Set graduated flag via devtools:
    `localStorage.setItem("emiva.graduated.v1.{profileId}.add_sub_100", "1")`.
  - Refresh `/session`. Should show `multiplication` items.
  - Spot-check reveals: ×2 (`3 × 2`), ×5 (`6 × 5`), ×9 (`7 × 9`), mixed (`6 × 8`).
- **Manual — Emilia unchanged:**
  - age 9 → still `fractions_intro` → `ops_1000`.
- **Manual — overflow sanity:**
  - Single-digit × single-digit fits easily at `text-7xl`. No layout fix needed.

## Definition of Done

- [ ] All code changes applied, strict types, tests green.
- [ ] No regression: existing 139 tests still pass (after Phase 2).
- [ ] Legacy Evelyn profiles (pre-MULT-001) auto-upgrade via `loadProfiles` re-deriving `allowedSkillsForAge`.
- [ ] Multiplication bank tests enforce tier distribution + answer correctness.
- [ ] Graduation routing works end-to-end (manual QA).
- [ ] ROADMAP + CHANGELOG + parent-guide updated.
- [ ] Tone: no banned phrases in any new explain strings (Hebrew, growth-mindset).

## Risks & Mitigations

| סיכון | מיטיגציה |
|-------|----------|
| Explain מרגיש רובוטי — כל ×5 אומר אותו דבר | variants ב-`explainMultiplication`: anchor-based, skip-count, groups. לא pool מלא בסלייס הזה — מספיק ≥ 1 explanation לכל anchor. |
| Bank לא מאוזן לפי tables | Test שבודק שכל table (×2..×10) מופיע לפחות פעם אחת |
| Evelyn כבר עייפה ממספרים — כפל מרגיש "עוד מאותו דבר" | Copy של graduation banner ב-Phase 1 כבר מכריז "פרק חדש 🎉" — משמש כ-framing. אם Evelyn לא מתלהבת — רישום ב-FEEDBACK-LOG → טריאז'. |
| Bank של 30 פריטים קצר מדי (לוח כפל יש 100 צירופים) | מספיק כ-slice פותח. הרחבה בסלייס הבא אם mastery נתקע. |
| ×1 items feel patronizing — "כל מה שכופלים ב-1 נשאר" | Omit ×1 entirely (the table is trivial pedagogically). |

## Handoff

- **PM → Eng:** verified. ממשיך ישירות.
- **Eng → Review:** PR עם plan + code + tests + manual QA.
- **Review → Done:** merge עם DoD מלא.
