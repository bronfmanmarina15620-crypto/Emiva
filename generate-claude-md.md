You are working inside a Claude Code project.

A formal engineering document is attached to this session:
**`claude_md_instructions_recommendation.docx`**

It defines the correct architectural split between:
- CLAUDE.md (system-level rules)
- INSTRUCTIONS (task-level execution)

Your job is NOT to invent a new structure.
Your job is to strictly APPLY the engineering recommendations from that document
to the current project.

---

## STEP 1 — LOAD THE ENGINEERING STANDARD

Read the attached document: `claude_md_instructions_recommendation.docx`

Treat it as:
- authoritative
- binding
- non-negotiable design specification

Do NOT summarize loosely.
Extract its rules explicitly.
Note that the document contains a ready CLAUDE.md template — use it as the scaffold.

If the document is not attached or cannot be read, STOP and ask me to attach it.
Do not proceed from memory or general knowledge.

---

## STEP 2 — BUILD THE STRUCTURE FROM THE DOCUMENT

Using ONLY the rules from the attached document:
1. Define what belongs in CLAUDE.md
2. Define what belongs in INSTRUCTIONS
3. Define the boundary between them
4. Define conflict resolution rules
5. Define what belongs OUTSIDE both (hooks / permissions / CI)

Do NOT add ideas that are not in the document.
Do NOT simplify beyond what is written.

---

## STEP 3 — APPLY TO CURRENT PROJECT

Before mapping anything, explore the repo:
- List top-level files and directories
- Read README and any existing CLAUDE.md
- Detect the stack (package.json / pyproject.toml / Cargo.toml / etc.)
- Detect real build / test / lint commands
- Identify protected paths (.env, migrations/, secrets/, etc.)
- If an existing CLAUDE.md is present, do NOT overwrite silently —
  propose a diff instead
- If critical information is missing and cannot be inferred from the repo,
  STOP and ask me. Do not guess. Do not use placeholders.

Then, using the CLAUDE.md template from the attached document as the scaffold:
- Map each real element of this project to:
  → CLAUDE.md
  → INSTRUCTIONS
  → .claude/rules/
  → hooks / permissions / CI
- For every section of the template:
  → if it applies to this project, fill it with project-specific content
  → if it partially applies, adapt and trim
  → if it does not apply, DELETE the section entirely
- If something does not clearly belong anywhere,
  explicitly flag it as "UNDEFINED BY STANDARD"

---

## STEP 4 — ENFORCE STRUCTURAL DISCIPLINE

Ensure:
- No duplication between CLAUDE.md and INSTRUCTIONS
- No leakage of system rules into task instructions
- No task logic inside CLAUDE.md
- No generic template text that is not actually true for this project

---

## STEP 5 — DELIVERABLE

1. Show me a short DISCOVERY REPORT:
   - Stack detected
   - Build / test / lint commands found
   - Protected paths identified
   - Existing CLAUDE.md status
   - Open questions that affect content

2. If there are open questions that affect content, ASK me before writing.
   Do not proceed with assumptions.

3. Once resolved, WRITE the file directly to ./CLAUDE.md.
   Do not just print it to chat.

4. Separately, list in chat:
   - Items routed to tasks/<TASK-ID>/INSTRUCTIONS.md
   - Items routed to .claude/rules/
   - Items requiring hooks / permissions / CI enforcement
   - Anything marked "UNDEFINED BY STANDARD"

---

## HARD RULES

- The attached document `claude_md_instructions_recommendation.docx` is the
  ONLY source of architectural rules. Do not substitute it with prior knowledge.
- Do NOT invent architectural rules beyond the document's framework
- DO describe this project's actual stack, architecture, and commands
  (the document's framework is the scaffold; the project's reality fills it in)
- Do NOT rely on prior assumptions
- Do NOT mix layers
- Do NOT optimize beyond the document
- Aggressively delete template sections that don't apply to this project
  (CLAUDE.md is loaded every session — shorter is better)
- If the document is unclear → say so explicitly
- If the repo is unclear → ask, don't guess
