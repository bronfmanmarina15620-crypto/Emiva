# docs/

Stable reference material. Not rules (see `.claude/rules/`), not task
briefs (see `tasks/`), not execution plans (see `plans/`).

Every file here is **advisory**. If content should be enforced, promote
it to `.claude/rules/` or `CLAUDE.md`.

## Layout

- `design/` — UI/UX research, design systems, accessibility references
- `curriculum/` — distillations of `MyLevel.docx` (legacy filename, pre-rebrand) and related sources
- `pedagogy/` — Model A, Singapore CPA, Science of Reading, etc.
- `adr/` — Architecture Decision Records (one decision per file)

## How to use

- Tasks link to docs via relative paths (not copy-paste).
- Docs are dated in a frontmatter-like header; when a doc is superseded,
  mark it `status: deprecated` and link to the replacement.
- Keep docs scannable: headers, tables, bullets. No walls of prose.
