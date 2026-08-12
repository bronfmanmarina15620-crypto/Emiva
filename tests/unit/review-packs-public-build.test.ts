import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * LAUNCH-PUBLIC-001 D2 — the built-in review pack is one school's class-ד
 * assessment material, and its `audience` field ("אמיליה") renders on screen.
 * It must NOT ship in the public build.
 *
 * The rest of the suite runs with `NEXT_PUBLIC_ENABLE_HOME_PACKS=1` (see
 * vitest.config.ts) so the pack MECHANISM stays covered. This file is the
 * counterpart: it re-imports the module with the flag off and asserts the
 * pack is genuinely absent — including through the two paths that used to
 * bypass the audience filter entirely (`listPacks()` with no profile, and
 * `getPackById` from a persisted active-pack id).
 */
describe("review packs — public build excludes private home content", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("ships no built-in packs when the home flag is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_HOME_PACKS", "");
    const { listPacks, getPackById } = await import("@/lib/review-packs");

    // The no-profile path used to return every pack regardless of audience.
    expect(listPacks()).toEqual([]);

    // A persisted active-pack id must not resurrect it either.
    expect(getPackById("emilia-assessment-review-2")).toBeNull();

    vi.unstubAllEnvs();
  });

  it("a child who happens to share the audience name gets nothing", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_HOME_PACKS", "");
    const { listPacks } = await import("@/lib/review-packs");
    const { newProfileId } = await import("@/lib/profiles");

    // "אמיליה" is a common Hebrew name — this is exactly the leak.
    const namesake = {
      id: newProfileId(),
      name: "אמיליה",
      age: 9,
      allowedSkills: [],
      createdAt: 0,
    };
    expect(listPacks(namesake as never)).toEqual([]);

    vi.unstubAllEnvs();
  });

  it("the pack IS available at home when the flag is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_HOME_PACKS", "1");
    const { listPacks } = await import("@/lib/review-packs");
    expect(listPacks().length).toBeGreaterThan(0);
    vi.unstubAllEnvs();
  });
});
