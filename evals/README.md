# evals/

Evaluation suites — distinct from `tests/` (deterministic software tests).

## Layout

- `backlog/` — **evals-as-backlog**. Each file is a test that **fails when a
  deferred BACKLOG item's trigger fires**. The pattern converts human memory
  into CI enforcement: a backlog trigger that's hard to remember becomes a
  test that is hard to ignore.
- `content/` — (future) content quality evals — item difficulty calibration,
  answer correctness, Hebrew grammar.
- `progression/` — (future) pedagogical progression evals — does the
  adaptive loop actually adapt? Does mastery predict retention?

## How to run

```bash
npm run eval:backlog   # runs evals/backlog/*.eval.ts only
```

Backlog evals are **not** part of `npm test` — they're a separate gate so a
normal unit-test failure doesn't hide a backlog trigger, and vice versa.

## Pattern: evals-as-backlog

1. A piece of deferred work lives in `tasks/BACKLOG.md` with a trigger
   (e.g. "variants pool < 2× daily exposures").
2. That trigger gets encoded as a failing-condition in a `.eval.ts` file.
3. CI / `npm run eval:backlog` runs these regularly. A failure = "the
   trigger fired, time to pick up this BACKLOG item".
4. When the item is implemented (pool expanded), the threshold is updated
   or the eval deleted + BACKLOG item moved to "closed".

Reference: Anthropic/OpenAI agent-dev guidance — evals as durable regression
mechanism (see `claude_md_instructions_recommendation.docx` §quality).
