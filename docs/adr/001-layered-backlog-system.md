# ADR-001: Layered Backlog System

- **Date:** 2026-04-19
- **Status:** Accepted
- **Owner:** Marina

## Context

Solo / 2-user project (Evelyn + Emilia) pre-production. Items get deferred during
a session — "expand feedback variants later", "register domains", "add mascot".
Marina asked the honest question: *"how do we not forget to do these?"*

Without a durable, self-enforcing mechanism, deferrals rot into silent tech debt.
"TODO comments in code" are the canonical failure mode: they exist, nobody reads
them, they outlive the code they annotate.

Constraints specific to this project:
- No team, no standup, no product manager external to Marina.
- No production traffic yet, so no real telemetry data to trigger on.
- Claude Code is the primary collaborator — memory persists across sessions but
  not reliably, and conversational context can't be trusted for long-term state.

## Decision

Four stacked layers, each feeding the one above:

1. **`tasks/BACKLOG.md`** — the register. Every deferred item gets an entry with
   `owner`, `trigger`, `why deferred`, and `where it will live when picked up`.
2. **`evals/backlog/*.eval.ts`** (runner: `npm run eval:backlog`) — convert
   triggers into failing tests. Eval red = ripe.
3. **Telemetry** (`src/lib/telemetry.ts` + `scripts/check-telemetry.mjs`) —
   local event log in localStorage. Parent exports JSON and runs check script;
   threshold crossings become BACKLOG entries.
4. **Feedback loop** (`tasks/FEEDBACK-LOG.md` + `scripts/scan-feedback.mjs`) —
   human observations scanned weekly for trigger phrases.

Pickup discipline (§Backlog in CLAUDE.md): ripe items must enter the *next*
task, not the one after. Maturity triggered by: eval red · ≥ 2 sources fired ·
≥ 2 weeks of a single trigger unresolved · explicit Marina override.

## Alternatives Considered

- **Linear / GitHub Issues.** Best-in-class for teams. Overhead for solo project;
  requires Marina opens the tool deliberately. Rejected for MVP stage; may
  reconsider if the project scales beyond family use.
- **TODO comments in code.** Dies by neglect. Explicitly rejected by CLAUDE.md
  §Engineering standards: "No TODO without owner or follow-up location."
- **Single BACKLOG.md file only, no eval/telemetry/feedback layers.** Rejected
  because it solves *registration* but not *trigger detection*. Humans forget
  to open files; machines don't.
- **Full LaunchDarkly / Statsig flags pipeline.** Correct at scale (Meta,
  Netflix), massive overhead here. Layer 3 (telemetry) captures 10% of the
  value with 1% of the infra.

## Consequences

### Opened
- A way to defer work *safely*: every deferral is traceable and self-surfacing.
- A substrate for future evals-driven development: the eval-as-backlog pattern
  generalizes beyond "variant pool size" to any thresholdable quality metric.
- Explicit pickup discipline = no infinitely growing backlog.

### Closed
- Vague "maybe later" in conversations or code comments. Everything now has a
  trigger and a ripeness test.

### Risks / open questions
- **Ritual adherence.** Layers 3–4 require Marina to run scripts weekly. If she
  doesn't, they rot. ADR-0xx (future) may add scheduled-agent automation.
- **Eval calibration drift.** Thresholds (e.g., `REQUIRED_MIN = 3`) set
  pre-usage; must be bumped after real usage data. Bump cadence not yet
  codified.
- **Layer 2 (evals) currently covers only BL-001.** As more items arrive in
  BACKLOG, converting them to evals is the work. That conversion itself is
  a backlog item — meta.

## References

- [CLAUDE.md §Backlog](../../CLAUDE.md) — the canonical specification.
- [tasks/BACKLOG.md](../../tasks/BACKLOG.md) — live register.
- [evals/README.md](../../evals/README.md) — eval pattern documentation.
- Anthropic / OpenAI agent-dev guidance on evals as durable regression mechanism
  (cited in `claude_md_instructions_recommendation.docx` §quality).
