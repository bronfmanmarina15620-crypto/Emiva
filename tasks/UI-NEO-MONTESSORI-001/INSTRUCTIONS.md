# INSTRUCTIONS.md — UI-NEO-MONTESSORI-001

## Task Metadata
- task_id: UI-NEO-MONTESSORI-001
- title: Neo-Montessori UI pass — palette, typography, figurative progress, milestone celebration
- owner: Marina
- priority: P1
- target_branch: feat/ui-neo-montessori-001
- references:
  - [docs/design/children-ed-ui-research.md](../../docs/design/children-ed-ui-research.md) §5–7

## Objective

Replace the clinical default UI with a Neo-Montessori aesthetic per the
research doc: warm palette, friendly Hebrew typography, figurative
progress (jar instead of raw %), one-time celebration at 80% mastery.

## In Scope
- Palette tokens in `globals.css` + `tailwind.config.ts` (cream, terracotta, sage, mustard, warm-dark, warm-indigo, warm-line).
- Heebo 400/600/800 + Rubik 400/600 via `next/font/google`.
- `src/components/MasteryJar.tsx` — SVG jar filling with sage liquid, % label below.
- `canvas-confetti` dependency + one-time celebration when crossing `MASTERY_TARGET`.
- Apply tokens to: `src/app/page.tsx`, `src/app/session/page.tsx`.
- Respect `prefers-reduced-motion` for confetti.

## Out of Scope
- Mascot / character illustration.
- Sound design.
- Lottie / Framer Motion animations beyond confetti.
- Redesign of retry/correct/reveal micro-layouts beyond color swap.
- Typography for math numerals (separate task if needed).

## Deliverables
1. New palette live on home + session screens.
2. Hebrew rendered in Heebo (headings) + Rubik (body).
3. `MasteryJar` component used on summary page.
4. Confetti fires exactly once per crossing from < 80% to ≥ 80%.
5. All existing tests still pass.
6. Typecheck + lint + build clean.

## Validation
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- Manual: start dev server, complete a session with ≥ 80% → confetti fires. Complete a second session (already at 80%) → no confetti. Toggle OS "reduce motion" → no confetti regardless.
- Visual: home + session + summary screens render in cream/terracotta/sage, no `bg-blue-600` or stark white left.

## Constraints
- No mascot yet (out of scope — keep discipline).
- No new runtime deps beyond `canvas-confetti` (small, ~6KB).
- Tests in `tests/unit/` already green must stay green.

## Definition of Done
- All deliverables shipped.
- Validation run and reported.
- No backlog items regressed (backlog evals still pass).
- If any rule needs promotion to CLAUDE.md (e.g. "always respect reduced-motion"), propose separately.
