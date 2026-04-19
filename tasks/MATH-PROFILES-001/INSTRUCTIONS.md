# INSTRUCTIONS.md — MATH-PROFILES-001

## Task Metadata
- task_id: MATH-PROFILES-001
- title: Per-user profiles — separate mastery + name-aware greetings + age-based content gating
- owner: Marina
- priority: P0 (blocks bat 9 ever touching the app)
- target_branch: feat/profiles-001

## Objective

Each daughter gets a distinct profile with separate mastery, telemetry,
and greeting. Names are **entered locally at first launch** and never
committed to the repo — they live in `localStorage` on the device only.

## In Scope
- `src/lib/profiles.ts` — `Profile` type `{ id, name, age, allowedSkills, createdAt }`, load/save profiles list + active profile ID.
- Profile storage keys:
  - `emiva.profiles.v1` — array of profiles
  - `emiva.active_profile.v1` — current active profile id
  - `emiva.mastery.v1.{profileId}` — mastery scoped
  - `emiva.last_session.v1.{profileId}` — last-session scoped
  - `emiva.telemetry.v1.{profileId}` — telemetry scoped
- Home page `/` becomes profile picker (buttons per profile + "הוסיפי משתמשת").
- New-profile form `/profiles/new` (name + age).
- Session page: requires active profile; greeting uses name; if profile's age not in skill's allowed range → show friendly "coming soon" card instead of session.
- Content gating: `add_sub_100` is offered to ages 7–8. Ages outside this range see a "coming soon" card.

## Out of Scope
- Editing / deleting profiles via UI (use DevTools for now).
- PIN / authentication.
- Avatars / photos.
- Sync across devices.
- Bat 9 math content (separate task `MATH-BAT9-001`).
- Reading / English content.

## Security — hard rules
- **Names never written to source, git-tracked files, logs, or telemetry JSON.**
- Telemetry keeps `profileId` only (opaque UUID), never `name`.
- Profile list lives in `localStorage` — device-local, per-browser.

## Deliverables
1. Fresh install flow: `/` → empty picker → "הוסיפי משתמשת" → `/profiles/new` → after create, profile is active, redirect to `/session`.
2. Returning flow: `/` → picker with profiles → click → active → `/session`.
3. `/session` welcome shows "היי {name}" or similar — name only in UI, never logged.
4. Age-gated content: Emilia (9) on `add_sub_100` sees "בקרוב תוכן מיוחד בשבילך", not the session.
5. Per-profile mastery isolation: completing a session for Evelyn doesn't touch Emilia's data, and vice versa.
6. Tests for `profiles.ts` load/save + active-profile logic.

## Validation
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- Manual:
  - Clear `localStorage` → open `/` → see "הוסיפי משתמשת" → create Evelyn age 7 → redirected to `/session` → welcome says "היי Evelyn" (or equivalent).
  - Return to `/` → see Evelyn's profile button + "הוסיפי משתמשת" → create Emilia age 9 → redirected to `/session` → see "בקרוב תוכן מיוחד בשבילך" card.
  - Return to `/` → switch between profiles. Verify mastery is separate (DevTools → Application → localStorage).

## Definition of Done
- All deliverables shipped.
- Validation run and reported.
- Security rules respected (no names in any repo file).
- `MATH-BAT9-001` remains deferred (no math content built for age 9 here).
