# Changelog — Emiva

All notable changes to Emiva. Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates are `YYYY-MM-DD`.

## [0.2.0] — 2026-04-19

Second slice: Emilia's math track opens — introductory fractions.

### Added — Fractions introductory (MATH-BAT9-001 slice 1)
- New skill `fractions_intro`, gated for ages 9–10.
- Item bank: 26 items, 5 difficulty tiers, 5 item types (identify, name_to_visual, halving, compare, equivalent).
- `src/lib/fractions.ts` — gcd, reduce, parse, equivalence, validation. Accepts any equivalent form for identify items (`2/4` and `1/2` both correct).
- `src/components/FractionViz.tsx` — horizontal bar SVG with sage-filled parts over cream ground (Singapore CPA pictorial).
- Method-based reveal: fraction viz + one-line explanation per item, matching `CLAUDE.md §Exercise UX rule`.
- Session page branches by profile skill: age 7–8 → `add_sub_100`, age 9–10 → `fractions_intro`.

### Changed — Per-skill mastery storage
- `emiva.mastery.v1.{profileId}` → `emiva.mastery.v1.{profileId}.{skill}`.
- Automatic one-shot migration on first load of legacy key; corrupt legacy values are dropped without crashing.
- Per-skill mastery isolation: Evelyn's add/sub progress and Emilia's fractions progress are independent.

### Added — Engineering
- `src/lib/items.ts` — skill-agnostic adapter (`isItemCorrect`, `canonicalAnswer`).
- 45 new tests across 4 files: fractions validation (15), bank integrity (8), storage migration (7), items adapter (14), profiles re-derive (1). Total tests: **107 passing** (was 61).

### Fixed — Stale `allowedSkills` on existing profiles
- `loadProfiles` now re-derives `allowedSkills` from age on every read. Previously, a profile created before a curriculum update kept its stale `allowedSkills: []`, causing the "בקרוב" screen to appear for Emilia even after the curriculum was extended. Now curriculum changes propagate to existing profiles automatically.

### Changed — CLAUDE.md governance
- `§Response format` restructured: added **Micro tier** (ack / error / small explanation), `IMPORTANT` tokens on two critical rules, formatting rule (prose unless list ≥ 3 items), "no 'צודקת'" norm, scaffold explicitly marked "when applicable".
- Clarified that `MyLevel.docx` = `master_curriculum.docx` (same file, legacy filename).
- `§Ritual cadence` now references [ADR-002](docs/adr/002-scheduled-rituals.md) instead of `ADR-0xx` placeholder.

### Added — Infrastructure (ADR-002)
- GitHub repo (public): `bronfmanmarina15620-crypto/Emiva`.
- Two `/schedule` remote triggers: weekly devlog (Fri 18:00 IDT) + monthly milestone (1st 09:00 IDT).
- [ADR-002 — Scheduled Rituals](docs/adr/002-scheduled-rituals.md) codifies the ritual-adherence risk fix identified in ADR-001.

### Known-open
- `MATH-BAT9-002` (ops up to 1000) and `MATH-BAT9-003` (long division) not yet started.
- `MATH-EMILIA-BARMODELS-001` — Bar Models for word problems — not yet started.
- Full manual QA of Emilia fractions session not completed (stale-profile bug interrupted the first attempt; fix verified via unit test, not via a full session in browser).

## [0.1.0] — 2026-04-19

First day: pre-scaffold → working MVP with brand + per-profile isolation.

### Added — Math MVP (MATH-MVP-001)
- Next.js 15 App Router + TypeScript strict + React 19 + Tailwind scaffold.
- Model A loop: Mastery Gating + Adaptive Difficulty + Spaced Repetition (Leitner 5-box).
- Item bank: 30 items, difficulty 1–5, addition/subtraction up to 100.
- Session flow: 10 items (configurable via `NEXT_PUBLIC_ITEMS_PER_SESSION`), mastery % running over last 10 attempts, 80% target.
- Hebrew RTL baseline.
- 35 unit tests (mastery, SRS, adaptive, explain, feedback, greetings, profiles).

### Added — Pedagogy (retry + explanation)
- Up to 3 attempts per item. Answer reveal paired with method-based explanation (CPA — make-10, decomposition).
- Mastery credit only on attempt 1.

### Added — Tone (growth-mindset)
- Banned fixed-mindset phrases ("לא נכון", "טעית", "שגוי").
- Required framing: Dweck's "עוד לא", effort acknowledgement, collaborative reveal.
- Variant pools for retry / correct / reveal messages.

### Added — UI (Neo-Montessori)
- Warm palette: cream bg, terracotta CTA, sage success, mustard retry, warm-indigo reveal.
- Typography: Heebo 800 (headings) + Rubik 400/500/600 (body) via `next/font/google`.
- `MasteryJar` SVG component with dual-text clip paths (readable regardless of fill level).
- `canvas-confetti` celebration, fires once per crossing of 80% threshold, respects `prefers-reduced-motion`.

### Added — Welcome + greetings (UI-WELCOME-GREETINGS-001)
- `welcome` phase before session.
- Time-aware + continuity-aware greetings in Hebrew (morning / afternoon / evening / returning-same-day / after-break / new-week).
- Name-prefixed variant when an active profile exists.

### Added — Backlog system (4 layers)
- `tasks/BACKLOG.md` — register with triggers + owners.
- `evals/backlog/*.eval.ts` + `npm run eval:backlog` — auto-fail when a trigger fires.
- `src/lib/telemetry.ts` + `npm run telemetry:check` — local event log, parent exports JSON.
- `tasks/FEEDBACK-LOG.md` + `npm run feedback:scan` — human feedback → BACKLOG suggestions.
- CLAUDE.md §Backlog — layers + pickup discipline + ripeness criteria.

### Added — Per-profile isolation (MATH-PROFILES-001)
- Profile picker on `/`, profile creation at `/profiles/new`.
- All storage scoped by `profileId`: mastery, last-session, telemetry.
- Age-based content gating (`allowedSkillsForAge`) — skill offered only if age range matches.
- Security: names live in `localStorage` only; never in repo, code, or telemetry.

### Added — Brand (UI-NEO-MONTESSORI-001 + BRAND-001)
- `Logo` + `LogoMark` components. 3 ascending sage pills + wordmark with one-letter sage accent.
- Favicon (`src/app/icon.svg`) — mark-only, Next.js auto-detection.
- [docs/design/BRANDING.md](docs/design/BRANDING.md) — design rules, do/don'ts, future tasks.
- [docs/design/children-ed-ui-research.md](docs/design/children-ed-ui-research.md) — research reference.

### Added — Docs structure
- `docs/README.md`, `docs/design/`, `docs/devlog/`, `docs/adr/`, `docs/milestones/`, `docs/postmortems/`.
- ADR-001: Layered Backlog System.

### Changed — Product name
- MyLevel → Evami → **Emiva** (final).
- Storage key prefix migrated: `mylevel.*` → `evami.*` → `emiva.*` (pre-production; no data migration).
- Logo wordmark accent letter: `L` → `a` → `i`.
- Folder `C:\Users\User\MyLevel` → `C:\Users\User\Emiva`.

### Deferred (in `tasks/BACKLOG.md`)
- BL-001 — expand feedback variant pools (trigger: eval floor raised after real usage).

### Known-open (not yet backlog entries)
- Domain registration (emiva.com / .co / .app / .co.il) — pending manual WHOIS.
- MATH-BAT9-001 — Emilia's content (fractions, long division). Placeholder "coming soon" card shown now.
