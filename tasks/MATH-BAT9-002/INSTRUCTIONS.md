# INSTRUCTIONS.md — MATH-BAT9-002

## Task Metadata
- task_id: MATH-BAT9-002
- title: Operations up to 1000 — Emilia slice 2 (add/sub extension)
- owner: Marina
- priority: P1
- target_branch: feat/math-bat9-002
- references:
  - `MyLevel.docx §3.1` — Emilia: "פעולות עד 1000, חלוקה ארוכה"
  - `tasks/MATH-BAT9-001/INSTRUCTIONS.md` — slice 1 pattern
  - `tasks/MATH-GRADUATION-001/INSTRUCTIONS.md` — criterion that unlocks this
  - `src/content/math/add-sub-100.json` — item shape to extend

## Objective

Ship the second skill on Emilia's track: **add/sub operations with numbers up
to 1000** (3-digit arithmetic). When Emilia graduates `fractions_intro`
(MATH-GRADUATION-001 criterion), the session automatically routes her to
`ops_1000` on her next session. No UI change needed beyond the new item
bank — the flow uses the same numeric-input pattern as `add_sub_100`.

Multiplication is deliberately **out of scope** of this slice — it's a
separate skill that requires its own pedagogical framing (Singapore CPA for
multiplication, Bar Models for word problems). Scope stays: add + sub up to 1000.

## In Scope

### Content
- `src/content/math/ops-1000.json` — **minimum 30 items** across 5 difficulty tiers:
  - **Tier 1:** 3-digit + 1-digit, no carry. E.g., `134 + 5`, `237 - 4`.
  - **Tier 2:** 3-digit + 2-digit, no carry. E.g., `145 + 23`, `278 - 35`.
  - **Tier 3:** 3-digit + 1/2-digit with single carry/borrow. E.g., `158 + 7`, `234 - 56`.
  - **Tier 4:** 3-digit + 2-digit with multiple carries. E.g., `167 + 48`, `412 - 189`.
  - **Tier 5:** 3-digit + 3-digit. E.g., `347 + 256`, `734 - 458`.
- Each tier: **≥ 5 items**, balanced add/sub (e.g. 3 add + 2 sub per tier, or
  similar). Total ≥ 30.
- All answers integer ∈ [0, 999] (no negative results, no overflow above 999
  in this slice — save that for later if needed).

### Code changes
- `src/lib/types.ts`:
  - `Skill` union → add `"ops_1000"`.
  - `AddSubItem.skill` → widen to `"add_sub_100" | "ops_1000"`.
- `src/lib/profiles.ts`:
  - `allowedSkillsForAge(9..10)` → `["fractions_intro", "ops_1000"]` (ordered).
- `src/app/session/page.tsx`:
  - Pick active skill via "first non-graduated skill in `allowedSkills`."
    Fallback: if all graduated, stay on the last (child can keep practicing).
  - Add `OPS_1000_BANK` alongside `ADD_SUB_BANK` + `FRACTIONS_BANK`; extend
    `bankForSkill(skill)`.
  - Update `ItemPrompt` / `ItemInput` / `needsTextInput` branches:
    `item.skill === "add_sub_100"` → treat `ops_1000` identically (same numeric
    input, same prompt layout). Simplest: rename the check to a helper
    `isArithmeticItem(item)` or add `||` clauses.
- `src/lib/explain.ts`:
  - Already accepts any `AddSubItem` — no change needed. Verify it produces
    acceptable Hebrew method-based reveals for 3-digit cases (spot-check
    `347 + 256`, `734 - 458`).

### Tests
- `tests/unit/ops-1000.test.ts`:
  - Bank has ≥ 30 items.
  - All 5 difficulty tiers have ≥ 5 items each.
  - Add/sub balance roughly 50/50.
  - All answers within [0, 999].
  - All `operands` + `op` arithmetic matches `answer` (computed check).
  - All IDs unique and skill is `"ops_1000"`.
- `tests/unit/profiles.test.ts`: extend — `allowedSkillsForAge(9)` returns
  `["fractions_intro", "ops_1000"]` in that order.
- `tests/unit/items.test.ts`: extend — `isItemCorrect` handles `ops_1000`
  items (numeric parse, integer compare).

### Docs
- `docs/parent-guide.md §4` — mention ops_1000 as the post-graduation target
  for Emilia.
- `ROADMAP.md` — move MATH-BAT9-002 from Now/Next to Done.
- `CHANGELOG.md` — [Unreleased] entry.

## Out of Scope

- **Multiplication.** Separate skill (Evelyn's MULT-001 + a future Emilia
  mul skill). Do not bundle.
- **Long division.** Slice 3 (MATH-BAT9-003).
- **Bar Models / word problems.** MATH-EMILIA-BARMODELS-001.
- **Enhanced CPA explanations for hundreds.** Current `explain.ts` decomposes
  by tens; extending to hundreds-place decomposition is a pedagogical polish,
  not a blocker. If this proves a pain point → backlog item BL-00X.
- **Decimals / fractions of thousands** — not in this slice.
- **Prompt-size auto-scaling** for 3-digit + 3-digit. Keep the existing
  `text-7xl`; manual QA + visual adjustment only if overflow on mobile
  (tablet is target, so likely fine).

## Validation Required

- `npm run typecheck` clean.
- `npm run lint` clean.
- `npm test` green; new bank-integrity tests pass.
- `npm run build` succeeds.
- **Manual — Emilia path:**
  - Clear localStorage. Create profile age 9.
  - First session: fractions items (unchanged).
  - Set graduated flag for `fractions_intro` via devtools:
    `localStorage.setItem("emiva.graduated.v1.{profileId}.fractions_intro", "1")`.
  - Refresh `/session`. Should now show `ops_1000` items.
  - 3-attempt loop, mastery updates, reveal shows method explanation.
- **Manual — Evelyn unchanged:**
  - age 7 → still only `add_sub_100`.
- **Manual — overflow sanity check:**
  - 734 - 458 item — does the prompt fit on a 768px-wide tablet without wrapping?

## Definition of Done

- [ ] All code changes applied, strict types, tests green.
- [ ] No regression: existing 118 tests still pass.
- [ ] Legacy Emilia profiles (pre-BAT9-002) still work:
      `allowedSkillsForAge` re-derives to include ops_1000 automatically on
      profile load (already the case via `loadProfiles`).
- [ ] Bank tests enforce tier distribution + answer correctness.
- [ ] Graduation-based routing works (manual QA confirmed).
- [ ] ROADMAP + CHANGELOG + parent-guide updated.
- [ ] Tone: no banned phrases in any new strings (prompts are numeric + "?";
      low risk).

## Risks & Mitigations

| סיכון | מיטיגציה |
|-------|----------|
| Routing מפתיע את Emilia — פתאום "מה זה המספרים הגדולים האלה?" | Copy של onboarding / hint ב-welcome של ops_1000? לא בסלייס הזה. במקום — הגרדואציה עצמה אמורה להיות ההתראה ("פרק חדש בדרך"). אם הדבר יפריע — backlog. |
| Explain.ts מפיק הסברים לא-חזקים למאות | Spot-check ב-manual QA. אם לא מתאים — backlog BL-00X. לא חוסם את הסלייס. |
| Bank של 30 פריטים ייגמר במהירות (SRS חוזר לפעמים) | 30 > ITEMS_PER_SESSION × 3 sessions = 30. מספיק. אם לא — להרחיב ל-40 בסלייס הבא. |
| ItemPrompt `text-7xl` גולש במסך צר עבור `734 - 458` | QA ויזואלי ידני. תיקון נקודתי אם צריך. |
| Graduated flag מיישר skill חדש עם mastery ריק — חוויה של "מתחילים מחדש" | זה הצפוי: skill חדש = מצב mastery נפרד (per-skill storage). הסבר ב-parent-guide. |

## Handoff

- **PM → Eng:** verified. ממשיך ישירות.
- **Eng → Review:** PR עם plan + code + tests + QA screenshots של שני המסלולים.
- **Review → Done:** merge עם DoD מלא.
