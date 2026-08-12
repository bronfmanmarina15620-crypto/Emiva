import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { listPacks, getPackById } from "@/lib/review-packs";

/**
 * LAUNCH-PUBLIC-001 D2 — private home content must never reach strangers.
 *
 * The built-in pack was one school's class-ד assessment review, labelled with
 * a specific child's name that renders on screen, and served by exact-name
 * match to any family who chose that common Hebrew name.
 *
 * ⚠️ The lesson this file encodes: **a runtime flag did not work, and only
 * inspecting the built bundle revealed it.** The first fix kept a static
 * `import` of the JSON behind `if (FLAG)`; the pack's full content shipped to
 * every visitor regardless, because a static import is bundled whether or not
 * the condition around it is true. Content that must not reach strangers has
 * to be *absent from the build*, not hidden behind a condition.
 *
 * Packs now load via `import.meta.glob` over a gitignored private folder, so a
 * public checkout has nothing to bundle.
 */
describe("review packs — private content is gitignored, not flag-gated", () => {
  it("the private folder is excluded from version control", () => {
    const gitignore = readFileSync(
      resolve(__dirname, "../../.gitignore"),
      "utf8",
    );
    expect(gitignore).toContain("src/content/review-packs/private/*");
    // …but the README explaining the rule stays tracked.
    expect(gitignore).toContain(
      "!src/content/review-packs/private/README.md",
    );
  });

  it("no pack JSON is imported by a static path that would bundle it anyway", () => {
    const source = readFileSync(
      resolve(__dirname, "../../src/lib/review-packs.ts"),
      "utf8",
    );
    // Importing a named pack JSON directly is exactly the bug that shipped:
    // the bundler includes it whatever condition surrounds the import.
    expect(source).not.toMatch(/import\s+\w+\s+from\s+["'][^"']*\.json["']/);
    // Packs come from the private barrel, which is empty in a public clone.
    expect(source).toContain("review-packs/private");
  });

  it("the barrel COMMITTED to git ships no packs", () => {
    // Checks what git holds, not the working file: a maintainer may legitimately
    // wire her own private pack locally (that is the whole point of the folder).
    // What must never happen is that wiring reaching the repo — which is exactly
    // how the private content shipped the first time.
    let tracked: string;
    try {
      tracked = execFileSync(
        "git",
        ["show", "HEAD:src/content/review-packs/private/index.ts"],
        { encoding: "utf8", cwd: resolve(__dirname, "../..") },
      );
    } catch {
      // No git (e.g. a tarball build) — nothing to assert against.
      return;
    }
    expect(tracked).toMatch(/PRIVATE_PACKS[^=]*=\s*\[\s*\]/);
    expect(tracked).not.toMatch(/from\s+["']\.\/[^"']*\.json["']/);
  });

  it("a child sharing the audience name is never served someone else's pack", () => {
    // The pack (when present at home) is filtered by exact name match, which
    // is why it must not exist in a public build at all. Here we assert the
    // filter itself does not leak across profiles.
    const namesake = {
      id: "x",
      name: "אמיליה",
      age: 9,
      allowedSkills: [],
      createdAt: 0,
    };
    const other = { ...namesake, id: "y", name: "דנה" };
    const forNamesake = listPacks(namesake as never);
    const forOther = listPacks(other as never);
    // Whatever the local checkout holds, a differently-named child must never
    // receive a pack addressed to someone else.
    for (const p of forOther) {
      expect(p.audience === undefined || p.audience.trim() === "דנה").toBe(
        true,
      );
    }
    // And an unknown id resolves to nothing.
    expect(getPackById("no-such-pack")).toBeNull();
    expect(Array.isArray(forNamesake)).toBe(true);
  });
});
