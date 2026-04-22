# INSTRUCTIONS.md — MATH-EMILIA-BARMODELS-001

## Task Metadata
- task_id: MATH-EMILIA-BARMODELS-001
- title: Bar Models for word problems — Emilia
- owner: Marina
- priority: P1
- references:
  - `MyLevel.docx §3.1` — Singapore CPA, Bar Models for word problems
  - `tasks/MATH-BAT9-001/INSTRUCTIONS.md` — fractions slice pattern (SVG + new skill)

## Objective
Add a Singapore-style Bar Models skill for Emilia. Each item is a Hebrew
word problem paired with a static bar diagram that visualizes the structure
(part-whole, comparison). The child reads the problem, looks at the diagram,
and types a numeric answer.

## In Scope
- New skill `bar_models`, added to age-9–10 list (at the end of the chain).
- New `BarModelItem` type: Hebrew prompt + one or two horizontal bars + numeric answer + Hebrew explanation.
- New component `BarModelViz` (SVG, non-interactive). Renders 1–2 bars with
  labeled segments; labels can be numbers or `?`. Handles RTL text.
- 30-item bank covering 5 tiers:
  - T1 (6): single-bar part-whole with single-digit numbers.
  - T2 (6): part-whole with 2-digit numbers.
  - T3 (6): two-bar comparison ("בכמה יותר").
  - T4 (6): two-step (subtract after multiplying, split across groups).
  - T5 (6): ratio-style (double / triple / fractional share).
- Session page routing: `bankForSkill("bar_models")` returns the new bank.
  `ItemPrompt` renders the Hebrew prompt + `BarModelViz`. `ItemInput` uses
  the arithmetic numeric-input path. `ItemReveal` shows the bar again +
  the method explanation.
- `isItemCorrect` branch for `bar_models` = numeric compare (same as arithmetic).
- `canonicalAnswer` returns stringified integer.

## Out of Scope
- **Interactive bar manipulation** (dragging segments, filling in ?). Static
  SVG only in this slice. Backlog item if pedagogy requires it.
- **Multiple unknowns per problem.** Each item has exactly one `?`.
- **Non-integer answers.** All answers are whole numbers.
- **Cross-skill review** (using bars to re-explain fractions). Possible
  future slice.

## Validation
- Typecheck / lint / tests / build clean.
- New bank tests: ≥ 30 items, ≥ 6 per tier, every answer is a positive integer,
  every item has `bars.length` ∈ {1, 2}, every bar has ≥ 2 segments, and every
  item contains exactly one `?` across its segments.
- Manual QA: Emilia profile → graduate `long_division` via devtools → session
  shows bar-model problems with rendered diagrams.

## Risks
- **Word-problem Hebrew is a different beast than arithmetic.** Banned-phrase
  scan applies. Each prompt and explanation must pass tone check (already
  enforced by growth-mindset CLAUDE.md rule).
- **Bar rendering on narrow tablets.** Mitigation: responsive SVG with viewBox,
  max-width container, font sizes scale.
- **Emilia confused by static bars.** Mitigation: each reveal re-shows the
  bar with the answer filled in, paired with a one-line method hint.
