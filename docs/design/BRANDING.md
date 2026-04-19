# Branding — Emiva

- **Status:** v1 (2026-04-19)
- **Rename history:** "MyLevel" → "Evami" → **"Emiva" (final)** — same day
- **Owner:** Marina
- **Review cadence:** every 3–6 months; expect redesign after MATH-BAT9 + reading ships.

## Name

**Emiva** — a blend of the two v1 users' names (see `project_mylevel_daughters`
memory). Bonus layer: in Spanish "something precious" — fitting for a
product built around the two children whom the brand is literally named
after.

Pronunciation: Em-ee-vah (3 syllables), identical in Hebrew (אמיווה) and English.

7-point check passed 2026-04-19: no brand collision in ed-tech for
children; trademark signals clean in our category (the only existing
Emiva Inc. is in B2B water/energy treatment and appears dormant);
cross-language clean; rare (<5 SSA entries/year); domains need manual
WHOIS verification.

## Concept

**3 ascending shapes + wordmark.** Direction inspired by
[children-ed-ui-research.md](children-ed-ui-research.md) options B+C:
Jar-as-mark (too skill-specific) fused with Steps-as-mark (cross-subject).

The 3 pills represent **levels** — ascending heights left→right. Palette
uses the sage-family from the Neo-Montessori research:

| Pill | Color | Role |
|---|---|---|
| smallest | `#DCE7DD` (sage-soft) | in-progress |
| middle | `#AECBB3` (mid-sage) | approaching mastery |
| tallest | `#7BA881` (sage) | mastered |

The wordmark echoes the tallest pill: the letter **"i"** in "Em**i**va"
is sage, the rest is warm-dark (`#2B2735`). The "i" is the center of
the word and the bridge where "Emi" passes into "va" (Eva). One colored
letter creates a visual link between mark and wordmark — the core trick
top designers use (see Slack's multicolor hash, Mailchimp's Freddie link).

## Components

- [src/components/Logo.tsx](../../src/components/Logo.tsx) — mark +
  wordmark. Use on home, marketing pages, anywhere > 160px wide.
- [src/components/LogoMark.tsx](../../src/components/LogoMark.tsx) —
  mark only. Use where space is tight: avatar, notification, nav rail.
- [src/app/icon.svg](../../src/app/icon.svg) — favicon; Next.js 15
  picks this up automatically.

## Clearspace + minimum size

- Clearspace around full logo: ≥ height of the tallest pill (~32px in
  the 200×48 viewBox).
- Minimum size: Logo 120px wide; LogoMark 24×22px. Below that the
  smallest pill loses readability.

## What NOT to do

- Do not stretch.
- Do not recolor. The sage trio is the brand.
- Do not remove the sage "i" and recolor the whole wordmark uniformly —
  kills the visual link and removes the bridge symbolism.
- Do not put the logo on red or saturated backgrounds. Cream, white,
  or very light sage only.
- Do not rotate or flip. Ascending direction is semantic (growth).

## Future

Known future tasks (will live in `tasks/BACKLOG.md` when ripe):

- **BRANDING-MASCOT-001** — optional character creature paired with
  logo. Not needed for MVP; research §Kids showed character+wordmark
  is the top-tier pattern.
- **BRANDING-MOTION-001** — animated logo (pills fill sequentially on
  load). Nice-to-have; waits for actual user feedback.
- **BRANDING-HEBREW-LOGO-001** — decide whether to produce "אמיווה"
  Hebrew wordmark as a distinct variant, or keep Latin "Emiva" as a
  brand word (pattern: נייקי / גוגל).
- **BRANDING-DOMAINS-001** — register emiva.com / .co / .app / .co.il
  once manual WHOIS confirms availability.

## Inspiration references (for future revisions)

- Mailchimp (Freddie + wordmark link via color)
- Slack (multicolor hash — accent letter technique)
- Instacart 2022 (rounded, warm geometry)
- Coinbase (monolinear custom type)
- Khan Academy Kids (character+wordmark for children)
