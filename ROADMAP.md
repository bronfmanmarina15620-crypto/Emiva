	# Roadmap — Emiva

*Single living view of the full scope. Bridges `MyLevel.docx` (product) with
`CLAUDE.md` (engineering) with `tasks/` (execution).*

*Digital scope only — many items in `MyLevel.docx §5 Ambient` are deliberately
non-app and live in the home environment. This roadmap covers what Emiva
(the app) should build.*

**Last updated:** 2026-04-22

---

## 🟢 Now (active)

1. **DASHBOARD-PARENT-001** — Parent dashboard MVP (verdict-based, evidence-grounded). Promoted from v3 after 4 rounds of research showed parent visibility is a Measurement-rule blocker. See [tasks/DASHBOARD-PARENT-001/INSTRUCTIONS.md](tasks/DASHBOARD-PARENT-001/INSTRUCTIONS.md).

---

## 🟡 Next (within 1–2 weeks)

1. **MATH-EVELYN-MONEY-001** — Money-context word problems for Evelyn.
2. Hebrew reading track (planning conversation pending).
3. English track (after Hebrew).

---

## 📘 v1 — Core tracks (committed per CLAUDE.md)

> "v1 scope: Math first. Hebrew reading and English follow after the math MVP ships."

### Math
| Task | User | Content (per `MyLevel.docx §3.1`) | Status |
|---|---|---|---|
| MATH-MVP-001 | Evelyn (7) | Add/sub up to 100 | ✅ Day 1 |
| **MATH-EVELYN-MULT-001** | Evelyn | Multiplication tables | ✅ Day 4 |
| **MATH-EVELYN-MONEY-001** | Evelyn | Money-context word problems (3/5 of exercises) | 🔲 planned |
| **MATH-BAT9-001** | Emilia (9) | Fractions, ops up to 1000, long division | ✅ all 3 slices shipped (Day 4: fractions, ops-1000, long_division) |
| **MATH-EMILIA-BARMODELS-001** | Emilia | Bar Models for Word Problems (Singapore CPA) | ✅ Day 4 |

### Hebrew reading (`MyLevel.docx §3.2`)
| Task | User | Content | Status |
|---|---|---|---|
| **CORE-HEBREW-EVELYN-001** | Evelyn | Phonics + decoding (Science of Reading) | 🔲 not started |
| **CORE-HEBREW-EVELYN-002** | Evelyn | Reading comprehension: 2 questions per short text | 🔲 not started |
| **CORE-HEBREW-EMILIA-001** | Emilia | Advanced comprehension + challenging text | 🔲 not started |

### English (`MyLevel.docx §3.3`)
| Task | User | Content | Status |
|---|---|---|---|
| **CORE-ENGLISH-EVELYN-001** | Evelyn | Phonics (BOB Books level) + basic vocab | 🔲 not started |
| **CORE-ENGLISH-EMILIA-001** | Emilia | Anki 300–500 most common words + A1–A2 reading | 🔲 not started |

---

## 📗 v2 — Enrichment (post-v1, per `MyLevel.docx §4`)

> Weekly exposure. Only the digitally-leverageable parts below. Much of
> Enrichment happens in real life and doesn't need an app.

| Topic | Task | App scope |
|---|---|---|
| Science | **ENRICH-SCIENCE-001** | Weekly question + curated video + experiment log |
| Geography | **ENRICH-GEO-001** | Interactive map: "pick a country, collect 3 facts" |
| History | **ENRICH-HISTORY-001** | Timeline visualization + figure-of-the-week |
| Logic | **ENRICH-LOGIC-001** | Puzzles + Sudoku + simple chess integration |
| Arabic | **ENRICH-ARABIC-001** | 20–30 words/month with audio + Spaced Repetition |
| Israeli culture | **ENRICH-CULTURE-001** | Weekly parashah card + holiday-specific activities |

---

## 📕 v3 — Flagship + family tooling

| Item | Task | Notes |
|---|---|---|
| Puppy training journal | **FLAGSHIP-PUPPY-001** | Per `MyLevel.docx §6`. Emilia's 12–16 week project. App tracks commands, accuracy, generates the "my guide to training" PDF. |
| Parent dashboard | **DASHBOARD-PARENT-001** | 🟢 MVP now active (promoted from v3). Follow-on work (trend graphs, per-skill drill-down, email digest once server arrives) remains v3. |
| External assessment | **MEASUREMENT-EXTERNAL-TEST-001** | Per `CLAUDE.md §Measurement rule` + `MyLevel.docx §11`. Unseen items, weekly. Primary ground-truth for pedagogy. |
| Weekly plan view | **PLAN-WEEKLY-001** | Renders the schedule from `MyLevel.docx §7` adapted per user. |
| Annual calendar | **PLAN-ANNUAL-001** | 12-month view per `MyLevel.docx §8`. |

---

## 🟣 v4 — Ambient support (optional, low priority)

> Most of Ambient is deliberately non-digital. Below are narrow app supports only.

| Topic | Task | App scope |
|---|---|---|
| Music | **AMBIENT-MUSIC-001** | Curated family playlist metadata (Spotify links). No audio in app. |
| Art | **AMBIENT-ART-001** | Museum-visit log + "artist of the month" card. |
| Animals | **AMBIENT-ANIMALS-001** | Reuses puppy journal + species research cards. |
| Financial | **AMBIENT-FINANCE-001** | Weekly allowance tracker; connects to money-context math. |

---

## ⚪ Later — infrastructure / brand / misc (triggered)

Items live in [tasks/BACKLOG.md](tasks/BACKLOG.md) with explicit triggers.

| Item | Trigger to pick up |
|---|---|
| **BL-001** — expand feedback variant pools | eval red · repetition_rate > 0.5 · child says phrases repeat |
| **BRANDING-MASCOT-001** — character creature beside logo | after first external (non-family) user |
| **BRANDING-MOTION-001** — animated logo | nice-to-have, no trigger |
| **BRANDING-HEBREW-LOGO-001** — Hebrew wordmark variant | marketing to Hebrew-first audience |
| **BRANDING-DOMAINS-001** — register emiva.com/.co/.app/.co.il | before leaving pre-production |

---

## ✅ Done

Authoritative: [CHANGELOG.md](CHANGELOG.md). Narrative: [docs/devlog/](docs/devlog/).

### Day 4 (2026-04-22)

| Task | Outcome |
|---|---|
| [MATH-GRADUATION-001](tasks/MATH-GRADUATION-001/INSTRUCTIONS.md) | Skill graduation criterion: 20 first-attempt-correct × ≥2 sessions × ≥24h gap. UI + one-shot telemetry + parent-guide sync. |
| [MATH-BAT9-002](tasks/MATH-BAT9-002/INSTRUCTIONS.md) | `ops_1000` skill: 30-item bank across 5 tiers (3-digit ± 1/2/3-digit). Auto-routing after `fractions_intro` graduation. |
| [MATH-EVELYN-MULT-001](tasks/MATH-EVELYN-MULT-001/INSTRUCTIONS.md) | `multiplication` skill: 30-item bank, tables 2–10, anchor-based CPA reveals (×2 doubling, ×5 half-of-×10, ×9 trick). Auto-routing after `add_sub_100` graduation. |
| [MATH-BAT9-003](tasks/MATH-BAT9-003/INSTRUCTIONS.md) | `long_division` skill: 60-item bank across 5 tiers, no remainders, CPA explain with multiplication-check verification. Auto-routing after `ops_1000` graduation. |
| [MATH-EMILIA-BARMODELS-001](tasks/MATH-EMILIA-BARMODELS-001/INSTRUCTIONS.md) | `bar_models` skill: 30 Hebrew word problems with Singapore-style bar diagrams (SVG). Part-whole, comparison, two-step, and ratio bars. Auto-routing after `long_division` graduation. |
| **Bank expansion + adaptive softening + anti-repeat** | All 4 banks expanded 30→60 (fractions 26→60). Difficulty matching now ±1 tolerance. Sessions remember item history per skill to avoid recent repeats. |
| **Delete profile** | Home screen × button; purges all mastery/telemetry/graduation state for deleted profile. Age validation tightened to 7–10. |

### Day 1 (2026-04-19)

| Task | Outcome |
|---|---|
| [MATH-MVP-001](tasks/MATH-MVP-001/INSTRUCTIONS.md) | Scaffold + Model A loop for Evelyn, add/sub-100 |
| [UI-NEO-MONTESSORI-001](tasks/UI-NEO-MONTESSORI-001/INSTRUCTIONS.md) | Neo-Montessori palette, Heebo + Rubik, MasteryJar, confetti |
| [MATH-PROFILES-001](tasks/MATH-PROFILES-001/INSTRUCTIONS.md) | Per-profile isolation |
| Pedagogy layer | 3-attempt retry + CPA explanations + growth-mindset tone |
| Welcome + greetings | Time + continuity-aware Hebrew greetings |
| 4-layer backlog system | BACKLOG + evals + telemetry + FEEDBACK-LOG |
| Brand: Emiva | Logo + favicon + BRANDING.md (MyLevel → Evami → Emiva) |
| Devlog infrastructure | CHANGELOG + devlog + ADR-001 + milestones + postmortems |

---

## 🧭 How to use

- **Weekly:** check **Now** and **Next** are current. Move stale items.
- **When a task ships:** Done + CHANGELOG + weeknote.
- **When deferring:** → Later (with trigger) + mirror in `tasks/BACKLOG.md`.
- **When starting next track:** convert 🔲 *planned* to **Now** by creating `tasks/<TASK-ID>/INSTRUCTIONS.md`.
- Items marked 🔲 are scope commitments without specs. They're in the plan but not yet broken down. Specs are written when the task enters **Next**.

*See also: [tasks/BACKLOG.md](tasks/BACKLOG.md) · [CHANGELOG.md](CHANGELOG.md) · [docs/devlog/](docs/devlog/) · [docs/adr/](docs/adr/) · [docs/parent-guide.md](docs/parent-guide.md).*
