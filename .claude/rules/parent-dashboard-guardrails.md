# Parent dashboard guardrails

Applies to: `src/app/parent/**`, `src/lib/parent-*.ts`,
`tests/unit/parent-*.test.ts`, and any future component under the
parent area.

## Hard rules (non-negotiable)

1. **No sibling comparison, ever.** The dashboard never renders one
   daughter's metric next to another daughter's metric. Each daughter
   has her own card; the parent toggles between, never sees them
   side-by-side in a comparison visualization.
   *Why:* Beilock & Ramirez on math anxiety in girls 7–9 + CLAUDE.md
   §Tone (growth-mindset). Comparative framing is cortisol, not
   motivation. Basis for rejection documented in ADR-003.

2. **Action-line strings must be autonomy-invitational.** Every string
   in `computeActionLine` must start with *"את יכולה להציע"* or
   *"את יכולה להזמין"* or *"כדאי להציע"*. No imperatives
   (`עבדי איתה`, `תגרמי`, `דרשי`, `את חייבת`). Enforced by a test in
   `tests/unit/parent-dashboard.test.ts`.
   *Why:* Lu, Vasilyeva & Laski 2025 — informational priming in
   instructional framing caused medium-effect increase in controlling
   parent language and child disengagement. The *only* frame that
   survives the research is invitational.

3. **No real-time push tied to session events.** The dashboard must
   not receive or react to per-session notifications. Maximum
   cadence: weekly digest. Banned pattern: watching `session_start`/
   `attempt` / `reveal` events and surfacing them to the parent
   view in real time.
   *Why:* real-time session push trains the parent to interrupt
   sessions, which in the 7–9 age window undermines autonomy (Lu 2025).

4. **No parent-streak / parent-side gamification.** Do not reward
   Marina for opening the dashboard N days in a row, checking in
   consistently, etc. The parent is not a gamified user of this
   product.
   *Why:* turns the parent into a streak-saving nagger on missed
   days. Anti-pattern from S'moresUp / Habitica Family mode.

5. **Dashboard closed while child is present.** This is a product
   rule, not just UX: inactivity timeout returns to login; prominent
   banner reminds the parent; exit button always visible.
   *Why:* combining Lu 2025 + Boaler math-anxiety research, a child
   who sees the dashboard during her session associates the data
   with surveillance. Explicit rule avoids drift.

## Soft rules (preferences)

- Prefer verdicts (*"על המסלול" / "כדאי לשים לב" / "בואי נדבר"*) over
  raw numbers in primary views. Raw metrics live in tooltips and the
  belief-correction display.
- Prefer Hebrew skill names over code identifiers in all user-facing
  strings. Mapping: `SKILL_HEBREW` in `src/lib/parent-dashboard.ts`.
- Keep aggregation logic pure and injectable (`now?: number`) for
  determinism in tests.

## Sync requirement

Any code change to `parent-*.ts` that alters the metrics, verdicts,
thresholds, or action-line templates requires a parallel update to
`docs/parent-guide.md` section *"האזור להורים"*. Mirrors the
existing `.claude/rules/mastery-docs-sync.md` rule.

## References

- [DASHBOARD-PARENT-001 research log](../../tasks/DASHBOARD-PARENT-001/research.md)
- [ADR-003 — parent dashboard design](../../docs/adr/003-parent-dashboard-design.md)
- [parent-guide.md](../../docs/parent-guide.md) — user-visible doc for these rules
