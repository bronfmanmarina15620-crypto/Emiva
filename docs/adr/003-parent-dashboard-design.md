# ADR-003: Parent Dashboard Design — Verdict-Based, Evidence-Grounded

- **Date:** 2026-04-22
- **Status:** Accepted
- **Owner:** Marina
- **Supersedes:** —
- **Related:** [CLAUDE.md §Measurement rule](../../CLAUDE.md), [tasks/DASHBOARD-PARENT-001/research.md](../../tasks/DASHBOARD-PARENT-001/research.md)

## Context

Four sessions in, Evelyn and Emilia have generated meaningful mastery
and telemetry data — but Marina has no way to see what they did. She
is the sole parent, sole product manager, and one of two end-users'
guardians. Without visibility into the internal proxy required by the
Measurement rule, every next product decision is flying blind.

Naming it "parent dashboard" implies a well-understood pattern. Four
rounds of research (documented in `tasks/DASHBOARD-PARENT-001/research.md`)
showed the pattern is not well-understood — most parent dashboards in
edtech demonstrably don't move learning outcomes (Kaliisa et al. 2024
LAK review), and a small but growing empirical literature shows some
designs *hurt* outcomes by inducing controlling parent behavior
(Lu, Vasilyeva & Laski 2025 in Child Development, n=122 dyads age 5).

The decision before us is not *whether* to build but *what to build*
such that the known failure modes are foreclosed in code rather than
left to discipline.

## Decision

Build the MVP specified in [tasks/DASHBOARD-PARENT-001/INSTRUCTIONS.md](../../tasks/DASHBOARD-PARENT-001/INSTRUCTIONS.md)
with the following design principles codified as constraints:

### Locked-in patterns

1. **Verdict-first, numbers-second.** Each daughter shows a verdict
   badge (*"על המסלול" / "כדאי לשים לב" / "בואי נדבר"*) as the
   primary signal. Raw metrics appear in tooltips and belief-correction
   displays only. Basis: Nanit; Stephen Few; Kaushik Action Dashboard.
2. **Autonomy-invitational action line.** Exactly one "what to do
   today" sentence per daughter, phrased as an invitation
   (*"את יכולה להציע / להזמין"*), never as an instruction. Basis:
   Lu, Vasilyeva & Laski 2025.
3. **"Tracing the source" cause line.** When the verdict is not
   *"על המסלול"*, the card names the upstream weak skill likely
   responsible. Basis: Squirrel AI MCM.
4. **Skill-tile grid, not a 3-bucket pipeline bar.** One tile per
   allowed skill, colored by mastery state (not-started / in-progress /
   mastered). Basis: ALEKS, Beast Academy, Squirrel AI, DreamBox.
5. **Weekly belief-correction note + reality comparison.** Marina
   writes a sentence per week; the dashboard juxtaposes with observed
   numbers since the note. Basis: Bergman 2021 JPE — belief correction
   was the 49%-mediating mechanism of the *only* parent-info
   intervention with credible causal effect on learning.
6. **Wheel-spinning indicator.** Per skill, triggered at ≥ 20 attempts,
   ≥ 3 sessions, ≤ 40% first-try correct in last 20. Basis: Beck & Gong
   2013, Botelho et al. 2019.
7. **"Closed while child present" as a product rule.** Inactivity
   timeout + prominent banner + visible exit button. Basis: Lu 2025 +
   Boaler math-anxiety research.

### Rejected patterns (locked in `.claude/rules/parent-dashboard-guardrails.md`)

- **Single traffic-light per daughter.** The weakest signal in the
  Western edtech sample; criticized by Stacey Barr (arbitrary cutoffs,
  demotivating, accessibility).
- **Sibling comparison in any form.** Real pattern in Zhixuewang
  (China), rejected here on CLAUDE.md §Tone + Beilock/Ramirez grounds.
- **Parent streak / gamification of parent engagement.** Real pattern
  in S'moresUp / Habitica Family; turns the parent into a nagger on
  streak-save days.
- **Real-time push per session event.** Greenlight-style per-event
  pings work for discrete financial transactions; for learning, they
  train the parent to interrupt sessions.
- **Informational priming in instructional voice.** Directly implicated
  in Lu 2025's controlling-behavior finding.

### Scope constraints

- **MVP is local-only.** localStorage, single device, no server.
  Acceptable because Marina and the daughters share a device today.
  Server follow-on is a separate task.
- **PIN + math-gate is an accidental-access deterrent, not security.**
  A 9-year-old who watches Marina type can bypass the PIN. The
  math-gate fallback handles the realistic-not-adversarial case.
- **No trend graphs in MVP.** Sparklines, week-over-week charts,
  per-skill drill-down — all deferred to DASHBOARD-PARENT-002.

### Falsifier (pre-commitment)

An eval in `evals/backlog/dashboard-followthrough.eval.ts` goes red
if 4 weeks post-ship Marina has:
- fewer than 2 `belief_submitted` events AND
- fewer than 8 `dashboard_opened` events.

Red → stop all dashboard work, re-evaluate the design. This is the
pre-commitment that admits in code what Kaliisa 2024 says is the
default outcome for learning-analytics dashboards (negligible effect).

## Alternatives considered

- **Ship the dashboard Marina originally sketched (6 metrics + single
  traffic-light).** Rejected: post-Round-1 research, the single
  traffic-light was the weakest Western-edtech pattern; post-Round-2,
  the plan had no belief correction (the only causal mechanism) and
  no autonomy-protective framing (the documented harm vector).
- **Skip the dashboard entirely and rely on CLI telemetry
  (`npm run telemetry:check`).** Rejected: Kaliisa's review doesn't
  say "don't build"; it says "most built ones don't move outcomes".
  With Bergman's belief-correction mechanism + Lu's autonomy
  constraint, we have a specific design not yet tested in the
  literature — worth running an n=1 experiment.
- **Build the per-skill drill-down in Stage 1.** Rejected: adds
  complexity without evidence of necessity. Drill-down is Stage 2;
  the Stage 1 falsifier determines whether Stage 2 ever happens.
- **Build the email digest in Stage 1.** Rejected: requires a server.
  In-app weekly digest card approximates the Bark anatomy until the
  server lands.

## Consequences

### Opened

- Internal proxy (CLAUDE.md §Measurement rule) has a display layer
  for the first time.
- Belief-correction mechanism is encoded in the product, not left
  to memory. If it works, it's replicable; if it doesn't, the
  falsifier catches it.
- All anti-patterns are closed by code + tests + path rule, not by
  discipline. A future contributor cannot accidentally reintroduce
  sibling comparison without breaking the guardrail rule.
- Parent dashboard becomes a Research-Source-Rule exemplar: the
  patterns are each traceable to (a) cognitive science, (b) practice,
  or (c) international/scale evidence.

### Closed

- "Marina has no idea what her daughters are doing in Emiva."
- The ambiguous v3 DASHBOARD-PARENT-001 placeholder — it's now an
  active MVP with a specified scope.

### Risks / open questions

- **Lu 2025 effect may manifest anyway.** Even with autonomy framing,
  the *existence* of a dashboard may shift Marina's behavior toward
  monitoring. Mitigation: the falsifier tracks Marina's actions, not
  just the daughters' metrics. If her interaction pattern with the
  daughters changes unfavorably, that's outside what the eval measures;
  we flag this as an open monitoring concern for Marina to self-report
  in [FEEDBACK-LOG](../../tasks/FEEDBACK-LOG.md).
- **Belief-correction form may be ignored.** If Marina never writes
  the weekly sentence, the Bergman mechanism isn't active. The
  falsifier catches this at 4 weeks.
- **localStorage per-device limit.** Once another device enters the
  picture (school laptop, tablet), the dashboard goes stale. Server
  task is the fix.
- **Research cited is Western + Chinese + Japanese.** Hebrew-language
  parent-facing design research is essentially absent from what we
  found. Cultural assumptions may transfer imperfectly; flag for
  revisit once Marina has real usage data.

## References

- [tasks/DASHBOARD-PARENT-001/research.md](../../tasks/DASHBOARD-PARENT-001/research.md) — full four-round log
- [tasks/DASHBOARD-PARENT-001/INSTRUCTIONS.md](../../tasks/DASHBOARD-PARENT-001/INSTRUCTIONS.md) — implementation spec
- [.claude/rules/parent-dashboard-guardrails.md](../../.claude/rules/parent-dashboard-guardrails.md) — code-level enforcement
- [CLAUDE.md §Measurement rule](../../CLAUDE.md)
- [CLAUDE.md §Tone](../../CLAUDE.md)
- [CLAUDE.md §Research source rule](../../CLAUDE.md)
- Lu, Vasilyeva & Laski 2025 — Child Development — https://onlinelibrary.wiley.com/doi/10.1111/cdev.70031
- Bergman 2021 JPE — https://www.journals.uchicago.edu/doi/10.1086/711410
- Kaliisa et al. 2024 LAK — https://arxiv.org/pdf/2312.15042
- Beck & Gong 2013 / Botelho et al. 2019 — wheel-spinning
