import { beforeEach, describe, expect, it } from "vitest";
import type { Skill } from "@/lib/types";
import { markGraduated, saveMastery } from "@/lib/storage";
import { logEvent } from "@/lib/telemetry";
import type { Profile } from "@/lib/profiles";
import {
  clearParentFocus,
  computeCoverage,
  loadParentFocus,
  resolveEffectiveSkill,
  resolveEffectiveSkillPure,
  saveParentFocus,
} from "@/lib/parent-focus";

class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(i: number): string | null {
    return [...this.store.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
}

function installMemoryStorage(): MemoryStorage {
  const mem = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window =
    { localStorage: mem };
  return mem;
}

beforeEach(() => {
  installMemoryStorage();
});

function profileEvelyn(): Profile {
  return {
    id: "p-evelyn",
    name: "אוולין",
    age: 7,
    allowedSkills: ["add_sub_100", "multiplication", "hebrew_comprehension"],
    createdAt: 0,
  };
}

function profileEmilia(): Profile {
  return {
    id: "p-emilia",
    name: "אמיליה",
    age: 9,
    allowedSkills: ["fractions_intro", "ops_1000", "long_division", "bar_models"],
    createdAt: 0,
  };
}

describe("parent-focus storage", () => {
  it("loadParentFocus returns null when nothing saved", () => {
    expect(loadParentFocus("p-evelyn")).toBeNull();
  });

  it("save → load round-trip", () => {
    saveParentFocus("p-evelyn", "fractions_intro");
    expect(loadParentFocus("p-evelyn")).toBe("fractions_intro");
  });

  it("clear removes the focus", () => {
    saveParentFocus("p-evelyn", "fractions_intro");
    clearParentFocus("p-evelyn");
    expect(loadParentFocus("p-evelyn")).toBeNull();
  });

  it("focus is scoped per-profile", () => {
    saveParentFocus("p-evelyn", "fractions_intro");
    saveParentFocus("p-emilia", "long_division");
    expect(loadParentFocus("p-evelyn")).toBe("fractions_intro");
    expect(loadParentFocus("p-emilia")).toBe("long_division");
  });

  it("save rejects non-skill strings silently (does not write)", () => {
    saveParentFocus("p-evelyn", "garbage" as Skill);
    expect(loadParentFocus("p-evelyn")).toBeNull();
  });

  it("load ignores corrupted values", () => {
    const mem = installMemoryStorage();
    mem.setItem("emiva.parent_focus.v1.p-evelyn", "not-a-skill");
    expect(loadParentFocus("p-evelyn")).toBeNull();
  });
});

describe("resolveEffectiveSkillPure", () => {
  const p = profileEvelyn();

  it("override beats auto", () => {
    const r = resolveEffectiveSkillPure(p, "fractions_intro", () => false);
    expect(r).toEqual({ skill: "fractions_intro", source: "manual" });
  });

  it("no override → first non-graduated in allowedSkills", () => {
    const r = resolveEffectiveSkillPure(p, null, (s) => s === "add_sub_100");
    expect(r).toEqual({ skill: "multiplication", source: "auto" });
  });

  it("all graduated → falls back to last allowed", () => {
    const r = resolveEffectiveSkillPure(p, null, () => true);
    expect(r).toEqual({ skill: "hebrew_comprehension", source: "auto" });
  });

  it("override is honored even when it is not in allowedSkills (cross-age)", () => {
    const r = resolveEffectiveSkillPure(p, "bar_models", () => false);
    expect(r).toEqual({ skill: "bar_models", source: "manual" });
  });

  it("profile with no allowedSkills and no override → null", () => {
    const empty: Profile = { ...p, allowedSkills: [] };
    const r = resolveEffectiveSkillPure(empty, null, () => false);
    expect(r).toEqual({ skill: null, source: "auto" });
  });
});

describe("resolveEffectiveSkill (live storage)", () => {
  it("returns auto with first non-graduated when no override saved", () => {
    const r = resolveEffectiveSkill(profileEvelyn());
    expect(r).toEqual({ skill: "add_sub_100", source: "auto" });
  });

  it("returns manual when focus saved", () => {
    saveParentFocus("p-evelyn", "long_division");
    const r = resolveEffectiveSkill(profileEvelyn());
    expect(r).toEqual({ skill: "long_division", source: "manual" });
  });

  it("after clear, falls back to auto", () => {
    saveParentFocus("p-evelyn", "long_division");
    clearParentFocus("p-evelyn");
    const r = resolveEffectiveSkill(profileEvelyn());
    expect(r.source).toBe("auto");
  });
});

describe("computeCoverage", () => {
  it("returns every skill grouped by subject (math + hebrew + english)", () => {
    const cov = computeCoverage(profileEvelyn());
    expect(cov.map((g) => g.subject)).toEqual(["math", "hebrew", "english"]);
    const math = cov.find((g) => g.subject === "math")!;
    const hebrew = cov.find((g) => g.subject === "hebrew")!;
    const english = cov.find((g) => g.subject === "english")!;
    expect(math.rows).toHaveLength(7);
    expect(hebrew.rows).toHaveLength(1);
    expect(english.rows).toHaveLength(1);
  });

  it("marks isDefaultForAge per row using allowedSkillsForAge", () => {
    const cov = computeCoverage(profileEvelyn());
    const allRows = cov.flatMap((g) => g.rows);
    const add = allRows.find((r) => r.skill === "add_sub_100")!;
    const frac = allRows.find((r) => r.skill === "fractions_intro")!;
    expect(add.isDefaultForAge).toBe(true);
    expect(frac.isDefaultForAge).toBe(false);
  });

  it("status reflects mastery and graduation state", () => {
    const p = profileEvelyn();
    saveMastery(p.id, {
      skill: "add_sub_100",
      attempts: [{ itemId: "x", correct: true, at: 1 }],
      srs: {},
      sessionCount: 1,
      sessionTimestamps: [1],
      itemLastSeen: {},
    });
    markGraduated(p.id, "multiplication");
    const cov = computeCoverage(p);
    const rows = cov.flatMap((g) => g.rows);
    expect(rows.find((r) => r.skill === "add_sub_100")!.status).toBe("in_progress");
    expect(rows.find((r) => r.skill === "multiplication")!.status).toBe("mastered");
    expect(rows.find((r) => r.skill === "fractions_intro")!.status).toBe("not_started");
  });

  it("isActive marks exactly one row, matching the resolved effective skill", () => {
    const p = profileEmilia();
    saveParentFocus(p.id, "long_division");
    const cov = computeCoverage(p);
    const actives = cov.flatMap((g) => g.rows).filter((r) => r.isActive);
    expect(actives).toHaveLength(1);
    expect(actives[0]!.skill).toBe("long_division");
  });

  it("graduated skill with recent low pct → mastered_review", () => {
    const p = profileEmilia();
    markGraduated(p.id, "fractions_intro");
    const recent = Date.now() - 2 * 86_400_000;
    // 10 attempts, 5 correct → 50% (under threshold 60)
    saveMastery(p.id, {
      skill: "fractions_intro",
      attempts: [
        ...Array.from({ length: 5 }, (_, i) => ({
          itemId: `c-${i}`,
          correct: true,
          at: recent + i * 1000,
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          itemId: `w-${i}`,
          correct: false,
          at: recent + (i + 5) * 1000,
        })),
      ],
      srs: {},
      sessionCount: 1,
      sessionTimestamps: [recent],
      itemLastSeen: {},
    });
    const row = computeCoverage(p)
      .flatMap((g) => g.rows)
      .find((r) => r.skill === "fractions_intro")!;
    expect(row.status).toBe("mastered_review");
  });

  it("graduated skill with no concerning recent data → plain mastered", () => {
    const p = profileEmilia();
    markGraduated(p.id, "fractions_intro");
    const row = computeCoverage(p)
      .flatMap((g) => g.rows)
      .find((r) => r.skill === "fractions_intro")!;
    expect(row.status).toBe("mastered");
  });

  it("graduated skill with ≥ 3 hard feelings → mastered_review", () => {
    const p = profileEmilia();
    markGraduated(p.id, "long_division");
    const recent = Date.now() - 2 * 86_400_000;
    for (let i = 0; i < 3; i++) {
      logEvent(p.id, {
        t: "session_feeling",
        at: recent + i * 1000,
        skill: "long_division",
        rating: "hard",
      });
    }
    const row = computeCoverage(p)
      .flatMap((g) => g.rows)
      .find((r) => r.skill === "long_division")!;
    expect(row.status).toBe("mastered_review");
  });

  it("attempts count reflects mastery state", () => {
    const p = profileEvelyn();
    saveMastery(p.id, {
      skill: "multiplication",
      attempts: Array.from({ length: 7 }, (_, i) => ({
        itemId: `m-${i}`,
        correct: true,
        at: i,
      })),
      srs: {},
      sessionCount: 1,
      sessionTimestamps: [0],
      itemLastSeen: {},
    });
    const cov = computeCoverage(p);
    const row = cov
      .flatMap((g) => g.rows)
      .find((r) => r.skill === "multiplication")!;
    expect(row.attempts).toBe(7);
  });
});
