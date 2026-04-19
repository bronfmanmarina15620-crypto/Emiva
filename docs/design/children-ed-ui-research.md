# Children's Educational UI — Research Reference

- **Status:** active
- **Created:** 2026-04-19
- **Owner:** Marina
- **Scope:** ages 7–9, learning apps, Hebrew RTL primary
- **Used by:** future UI redesign tasks (e.g. `UI-NEO-MONTESSORI-001`)

Distillation of current best practice in children's educational UI.
Citable reference. Not a rule — choices still belong to the designer.

---

## 1. Who's considered "best in class"

Apps that win recurring design awards (Apple Design Awards, D&AD, Webby,
Red Dot, Communication Arts):

| App | Strength | Age band |
|---|---|---|
| Khan Academy Kids (Duck Duck Moose) | Warm, research-backed, character-driven | 4–8 |
| Sago Mini / Toca Boca | Playful illustration, motion, ADA winners | 3–8 |
| Lingokids | Scandinavian-clean, polished language-learning | 3–9 |
| Synthesis (ex-SpaceX school) | Premium, older-kid mature aesthetic | 8–14 |
| Prisma | Minimalist calm, K-12 platform | 6–14 |
| Homer Learning | Warm literary, reading-focused | 2–8 |
| Osmo | Physical-digital, restrained playful | 5–12 |
| Duolingo | Mascot-driven, celebration moments, streaks | 7–adult |

Research institutions on children's UX:
- **Harvard GSE** — EdTech research, age-appropriate design
- **Stanford d.school** — k-12 design thinking
- **MIT Media Lab** — Scratch interface (constructionist design)
- **Sesame Workshop Research** — 50+ years of eye-tracking on children
- **Cooper Hewitt / RISD** — design awards for educational products

---

## 2. Eight principles that repeat across the leaders

1. **Calm over stimulating.** Post-2023 trend: away from saturated
   primaries, toward **Neo-Montessori digital** — pastels, earth tones,
   whitespace. Khan Kids redesign + Prisma exemplify.
2. **Rounded everything.** Corners, icons, buttons, type. Reduces
   perceived pressure (Sesame eye-tracking, ages 6–9).
3. **Dual coding.** Every concept: text + illustration + optional sound
   (Mayer, *Multimedia Learning* research).
4. **Figurative progress, not numeric.** Children 7–9 don't parse "80%"
   emotionally. They parse a filling jar, climbing mountain, growing
   plant. Progress as metaphor beats raw percentages.
5. **Character / mascot reactive.** One creature that reacts. Builds
   emotional attachment. Duo (Duolingo), Kodie (Khan Kids).
6. **Celebration moments — sparingly.** Confetti / bounce / particle
   effects only at meaningful milestones. Overuse = devaluation.
7. **Large tap targets (≥ 60px).** Children's fine-motor control is
   developing. Apple HIG defaults (44px) are adult-calibrated.
8. **Typography: rounded, friendly, screen-optimized.** Never Arial /
   Times / condensed. See §4 for Hebrew-specific picks.

---

## 3. Current trend (2024–2026): Neo-Montessori digital

A convergent aesthetic across premium ed apps:

- **Palette:** warm cream backgrounds, muted earth-tone accents, sage
  greens, terracotta, mustard. No pure saturated RGB primaries.
- **Illustration:** hand-drawn feel, not flat vector. Hints of imperfect
  line, natural textures (paper, wood).
- **Motion:** Lottie / Framer Motion — soft, physics-based, never
  instantaneous. Easing matters more than speed.
- **Duotones** replace gradients. Less rainbow, more restraint.
- **Audio design rising** — sound design treated as first-class, not
  decoration.

Rejection of:
- Hyper-stimulation (dark patterns, streak anxiety, ad-style attention)
- "Candy-crush" gamification as the primary loop
- Adult-clinical minimalism (pure white, sharp corners, system fonts)

---

## 4. Typography for Hebrew + Bilingual

Hebrew-first, with Latin fallback:

| Font | Character | Use |
|---|---|---|
| **Heebo** | Clean, Google-fonts native, wide weights | Headings, UI |
| **Rubik** | Friendly rounded, very popular in Israeli UI | Body, UI |
| **Assistant** | Screen-optimized, warm | Body, long-form |
| **Ploni** | Modern Israeli sans, premium feel | Display, headings |
| **Frank Ruhl Libre** | Serif, dignified | Rare display use only |

Latin pairings (same family or compatible):
- Heebo pairs with **Nunito** or **Nunito Sans**
- Rubik pairs naturally (Rubik has Latin too)
- Avoid **Arial / Helvetica** for children's learning — too neutral,
  reads as "form"

Sizing for ages 7–9:
- Body: 18–20px minimum
- Display numbers (math problems): 56–72px
- Tap targets: ≥ 60×60px

---

## 5. Recommended palette for Emiva

Neo-Montessori for girls 7 + 9, Hebrew RTL, math-first:

```
--bg:         #FAF6EE   /* warm cream */
--surface:    #FFFFFF   /* cards, soft shadow */
--text:       #2B2735   /* warm dark, never pure black */
--text-muted: #6B6578   /* secondary */
--primary:    #E87A5D   /* terracotta — call to action */
--success:    #7BA881   /* sage muted — correct, progress */
--accent:     #F5C26B   /* mustard — highlights, milestones */
--indigo:     #6B8ACE   /* reveal/learning moments */
--line:       #E8E2D4   /* dividers, borders */
```

No pure saturated colors. No hard black. All Tailwind-translatable.

---

## 6. Gap analysis — Emiva summary screen (as of 2026-04-19)

| Element | Current | Neo-Montessori target |
|---|---|---|
| Background | Pure white (`#fafaf7` close) | Warm cream `#FAF6EE` |
| Success state | "80% +10%" text | Figurative + numeric (jar/plant filling) |
| Headline font | system-ui | Heebo 800 display |
| Body font | system-ui | Rubik 400/600 |
| Primary button | Flat `bg-blue-600` | Terracotta with soft shadow + subtle bounce |
| Milestone | None | Confetti / particle burst on first 80% |
| Mascot | None | One character reacting to result |
| Shape language | Square-ish rounded-xl | rounded-2xl/3xl, larger radii |

---

## 7. Implementation priority — 3 moves for 80% of the effect

1. **Palette + typography swap** — change `globals.css` + add `@fontsource/heebo` + `@fontsource/rubik`. Rename Tailwind theme tokens. ~1 hour, highest visible impact.
2. **Figurative progress** — inline SVG component (jar fills with sage liquid / plant grows). Replaces the "% number" element. Reusable across future subjects. ~2–3 hours.
3. **Celebration moment** — `canvas-confetti` (tiny npm dep, ~6KB) triggered on crossing mastery threshold. One-time per milestone. ~30 min.

Everything else (mascot, sound design, motion library) is layer 2.

---

## 8. Accessibility notes — must-haves for children

- **WCAG AA contrast** minimum, even with pastel palette. Muted does
  not mean low-contrast.
- **Focus states visible** — children often use keyboard on desktop,
  sometimes accidentally. Focus rings matter.
- **Motion respects `prefers-reduced-motion`** — some kids are
  sensitive to animation.
- **No timers / countdowns** under 7yo by default (stress response).
  Optional for 8–9.
- **No ads, no streak anxiety, no "lives lost" patterns.** All
  avoidance-driven engagement is banned.

---

## 9. Sources (for further reading)

**Books / long-form:**
- Donald Norman, *The Design of Everyday Things* — universal principles
- Jakob Nielsen / NN/g — *Children (Ages 3–12) on the Web*
- Gerd Bergman et al., *Designing for Kids*
- Debra Levin Gelman, *Design for Kids* (Rosenfeld Media)

**Ongoing research:**
- Nielsen Norman Group articles (search "children" on nngroup.com)
- Sesame Workshop Research (sesameworkshop.org/what-we-do/research)
- MIT Media Lab — Scratch papers (scratch.mit.edu/research)

**Design galleries / inspiration:**
- Apple Design Awards (children's education category)
- Communication Arts — Interactive Annual
- Awwwards — Kids category

---

*This is a living document. Update when a new award cycle or major
redesign in a referenced app suggests a trend shift. Deprecate if
replaced by a newer reference.*
