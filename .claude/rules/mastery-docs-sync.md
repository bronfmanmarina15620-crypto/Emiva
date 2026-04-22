---
scope:
  - src/lib/mastery.ts
  - src/lib/types.ts
  - src/lib/srs.ts
  - src/app/session/page.tsx
---

# Mastery docs sync

**Rule:** any change to the mastery / SRS / attempt-credit logic in the files
listed in `scope` requires a parallel update to [docs/parent-guide.md](../../docs/parent-guide.md).

**Why:** `parent-guide.md` is the parent-facing explanation of how Emiva
decides a child has mastered something. It names specific constants
(`WINDOW_SIZE`, `MASTERY_TARGET`, `SRS_INTERVALS`) and a specific rule
(mastery credit only on attempt 1). If the code changes and the doc
doesn't, the parent loses their mental model — exactly the failure mode
that motivated the doc (see conversation 2026-04-22).

**Specifically, update the doc if you:**
- Change `WINDOW_SIZE` or `MASTERY_TARGET` in `types.ts` → section 2 + table in section 6.
- Change `SRS_INTERVALS` → section 3 table.
- Change the attempt-credit logic in `session/page.tsx` (the `attempts === 0` branch) → section 1.
- Implement skill graduation (currently stubbed as section 4 "proposed") → rewrite section 4 and section 6 table row.

**How to apply:** make the doc update in the same PR as the code change.
Don't defer to a follow-up — deferred doc updates do not happen.
