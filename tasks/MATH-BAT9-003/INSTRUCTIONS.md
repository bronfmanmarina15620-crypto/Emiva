# INSTRUCTIONS.md — MATH-BAT9-003

## Task Metadata
- task_id: MATH-BAT9-003
- title: Long division — Emilia slice 3
- owner: Marina
- priority: P1
- references:
  - `MyLevel.docx §3.1` — Emilia: "חלוקה ארוכה"
  - `tasks/MATH-BAT9-002/INSTRUCTIONS.md` — parallel slice pattern
  - `tasks/MATH-GRADUATION-001/INSTRUCTIONS.md` — graduation gate

## Objective
Third skill on Emilia's track: **long division with quotient-only results (no
remainders)**. Unlocks automatically after she graduates `ops_1000`. Same
loop, same UI pattern, same graduation criterion.

## In Scope
- New skill `long_division` added to the age-9–10 skill list, after `ops_1000`.
- 60-item bank across 5 difficulty tiers (all items divide evenly — no
  remainder handling in this slice).
  - T1: small integer divisions, answer ≤ 10 (6÷2, 12÷3, etc.)
  - T2: 2-digit ÷ 1-digit, answer single-digit
  - T3: 2-digit ÷ 1-digit, answer 10–20
  - T4: 3-digit ÷ 1-digit, answer ≤ 30
  - T5: 3-digit ÷ 1-digit, answer 30–72
- New item type `DivisionItem` (`op: "/"`).
- `isArithmeticItem` widens to include it.
- `explain.ts` gets a division branch: verification via multiplication
  (`A÷B=C → B×C=A`) with a step-by-step hint for 3-digit cases.
- Session page: bank routing for `long_division`.
- Auto-routing: after `ops_1000` graduates, next skill in the list is
  `long_division`.

## Out of Scope
- **Remainders.** Clean quotients only. Remainder-handling is a separate
  slice (or future backlog item).
- **Visual long-division layout** (column-wise arithmetic rendering). The
  reveal is a one-line method explanation, same pattern as add/sub.
- **Division into fractions** — out of scope (tied to fractions track).

## Validation
- Type check / lint / tests / build all clean.
- All existing tests still pass.
- Bank tests: ≥60 items, all tiers ≥10, every answer consistent with operands,
  all answers are positive integers (no remainders).
- Manual QA: Emilia profile → graduate ops_1000 via devtools → session shows
  long_division items.

## Risks
- **Explain feels too abstract for 3-digit cases.** Mitigation: add a
  decomposition hint for T4/T5 ("124÷4: 12÷4=3, 4÷4=1, יחד 31").
- **Children expect remainders when dividing.** All items here divide evenly
  — the prompt format makes that implicit. If confusion arises, add a note
  in parent-guide.
