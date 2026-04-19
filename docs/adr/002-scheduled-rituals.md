# ADR-002: Scheduled Rituals (Weekly Devlog + Monthly Milestone)

- **Date:** 2026-04-19
- **Status:** Accepted
- **Owner:** Marina
- **Supersedes:** —
- **Related:** [ADR-001](001-layered-backlog-system.md) §Risks (ritual adherence)

## Context

`CLAUDE.md §Ritual cadence` requires durable written artifacts:

| Cadence | Artifact | Location |
|---|---|---|
| Weekly | Weeknote | `docs/devlog/YYYY-W##.md` |
| Monthly | Milestone review | `docs/milestones/YYYY-MM.md` |
| Per release | CHANGELOG entry | `CHANGELOG.md` |
| Per decision | ADR | `docs/adr/NNN-title.md` |
| Per incident | Postmortem | `docs/postmortems/YYYY-MM-DD-title.md` |

ADR-001 identified **ritual adherence** as the top open risk of the
4-layer backlog system: "Layers 3–4 require Marina to run scripts
weekly. If she doesn't, they rot."

Same failure mode applies to weeknotes and milestone reviews. A solo
maintainer who relies on memory to keep up with a weekly cadence will
drift within 2–3 weeks. Evidence: Week 1 (this week) nearly missed a
weeknote; only CLAUDE.md §Session-start checklist caught it.

Two unresolved ritual gaps:

1. **Weeknotes** — no trigger exists to start drafting every Friday.
2. **Monthly milestones** — no trigger exists to start drafting on the 1st.

## Decision

Add two scheduled remote agents via Claude Code's `/schedule` skill.
Each agent wakes on its cron, reads the relevant sources, and produces a
**draft** (not a final artifact) in the correct location.

### Schedule 1 — Weekly devlog

- **Cron:** Friday 18:00 Asia/Jerusalem.
- **Goal:** Draft `docs/devlog/YYYY-W##.md` for the current ISO week.
- **Inputs:** `git log` for the week; diff in `tasks/BACKLOG.md` and
  `tasks/FEEDBACK-LOG.md`; new or closed task folders; new ADRs.
- **Template sections:** Shipped · Surprises · Stuck · Next · Metric snapshot.
- **Output contract:** file committed to a branch `devlog/YYYY-W##`
  with a PR open for Marina to edit and merge. **Unedited drafts don't
  ship** — per CLAUDE.md §Weeknote draft flow.

### Schedule 2 — Monthly milestone

- **Cron:** 1st of month, 09:00 Asia/Jerusalem.
- **Goal:** Draft `docs/milestones/YYYY-MM.md` for the previous month.
- **Inputs:** all weeknotes in the month; CHANGELOG diff for the month;
  ADRs authored in the month; BACKLOG items opened vs. closed.
- **Template sections:** Shipped · Evidence (metrics) · Decisions (ADRs)
  · Carry-over · Retrospective lessons.
- **Output contract:** same as weekly — PR with draft; Marina edits.

### Not scheduled

- **ADRs** — written at the moment of decision, not on a cadence.
- **CHANGELOG entries** — written in the ship commit.
- **Postmortems** — written after an incident, within 72 hours.

Cadence automation is reserved for artifacts that (a) recur and (b)
suffer from drift under memory-only enforcement.

## Alternatives Considered

- **Claude Code hooks on `Stop`/`SessionStart` events.** Could prompt
  Marina on Friday. Rejected: requires Marina to open Claude Code on
  Friday — the very memory failure we're trying to remove. Scheduled
  remote agent runs regardless.
- **Calendar reminders (Google Calendar).** Rejected: reminds Marina to
  write the weeknote; doesn't produce a draft. The 80% value is the
  draft, not the nudge.
- **GitHub Actions cron on push.** Rejected: only runs when the repo
  sees a push. Silent weeks = silent cron = no weeknote — worst case.
- **Skip automation; rely on session-start checklist.** Current state.
  Caught Week 17's gap but only because Marina opened Claude Code.
  Doesn't scale past 2–3 weeks of no-activity.
- **Draft the weeknote at session end instead of Friday.** Rejected:
  ties weeknote cadence to work cadence. A week with one session gets
  one weeknote; a week with five gets five. Cadence must be temporal,
  not activity-triggered.

## Consequences

### Opened

- Two artifacts that previously lived in memory now have a machine-enforced trigger.
- Marina's 5-minute weekly ritual = edit the draft, not author from scratch.
- Monthly milestone reviews become plausible for a solo project. Without
  automation, they would have been skipped.
- The pattern generalizes: any future cadence (quarterly retro, annual
  review) is a third `/schedule` entry away.

### Closed

- ADR-001's top risk ("Ritual adherence. Layers 3–4 require Marina to
  run scripts weekly").
- "I forgot it was Friday" as an acceptable excuse.

### Risks / open questions

- **Agent quality drift.** If the draft quality is bad, Marina edits
  heavily → ritual feels like extra work → she stops merging the PR →
  PRs pile up → automation dies from backlog pressure. Mitigation:
  quarterly review of draft quality; tune the prompt; accept that
  week 1–4 drafts will be worse than week 20.
- **Cron blind spots.** Device off, laptop asleep, no network on Friday
  18:00 → missed run. `/schedule` skill's behavior on missed runs must
  be verified; if it doesn't backfill, add a Sunday 09:00 retry.
- **Cost.** Two scheduled agents × 4 weekly + 1 monthly = 5 agent runs
  per month. Acceptable at current usage; revisit if it scales to
  enrichment/ambient content generation.
- **Timezone drift.** Jerusalem DST changes twice a year. `/schedule`
  must respect `Asia/Jerusalem` not UTC. Verify on first DST boundary.

## Activation checklist

- [x] **2026-04-19** — GitHub repo created: `bronfmanmarina15620-crypto/Emiva` (public).
- [x] **2026-04-19** — Weekly devlog trigger created (`trig_012zozdhu8XtiqezdThPeVAn`, cron `0 15 * * 5` UTC = Fri 18:00 IDT).
- [x] **2026-04-19** — Monthly milestone trigger created (`trig_01RGFkCgxFWxajbRv8AM6uui`, cron `0 6 1 * *` UTC = 1st 09:00 IDT).
- [ ] **2026-10-26** (next DST boundary) — verify Jerusalem timezone: IDT → IST shifts local run time from 18:00 → 17:00. If needed, update cron to `0 16 * * 5` (17:00 UTC) and `0 7 1 * *`.
- [ ] **2026-05-01** — first milestone PR merged; review draft quality.
- [ ] **2026-04-24** — first weekly devlog PR merged; review draft quality.

## References

- [CLAUDE.md §Ritual cadence](../../CLAUDE.md) — canonical cadence spec.
- [CLAUDE.md §Session-start checklist](../../CLAUDE.md) — the fallback
  that caught Week 17.
- [ADR-001 §Risks](001-layered-backlog-system.md) — the risk this ADR closes.
- `/schedule` skill (Claude Code) — the execution mechanism.
