import { beforeEach, describe, expect, it } from "vitest";
import {
  allowedSkillsForAge,
  createProfile,
  deleteProfile,
  getActiveProfile,
  getActiveProfileId,
  itemsPerSessionForAge,
  loadProfiles,
  profileAllowsSkill,
  saveProfiles,
  setActiveProfileId,
} from "@/lib/profiles";
import { hasGraduatedFlag, markGraduated, saveMastery } from "@/lib/storage";
import { logEvent } from "@/lib/telemetry";
import { emptyMastery, recordAttempt } from "@/lib/mastery";

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
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
  key(i: number): string | null {
    return [...this.store.keys()][i] ?? null;
  }
  clear() {
    this.store.clear();
  }
}

beforeEach(() => {
  const mem = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
    localStorage: mem,
  };
});

describe("profiles", () => {
  describe("allowedSkillsForAge", () => {
    it("age 7 → add_sub_100, multiplication, hebrew_comprehension (ordered)", () => {
      expect(allowedSkillsForAge(7)).toEqual([
        "add_sub_100",
        "multiplication",
        "hebrew_comprehension",
      ]);
    });
    it("age 8 → same chain as age 7", () => {
      expect(allowedSkillsForAge(8)).toEqual([
        "add_sub_100",
        "multiplication",
        "hebrew_comprehension",
      ]);
    });
    it("age 9 → fractions_intro, ops_1000, long_division, bar_models (ordered)", () => {
      expect(allowedSkillsForAge(9)).toEqual([
        "fractions_intro",
        "ops_1000",
        "long_division",
        "bar_models",
      ]);
    });
    it("age 10 → fractions_intro, ops_1000, long_division, bar_models (ordered)", () => {
      expect(allowedSkillsForAge(10)).toEqual([
        "fractions_intro",
        "ops_1000",
        "long_division",
        "bar_models",
      ]);
    });
    it("age 5 → empty", () => {
      expect(allowedSkillsForAge(5)).toEqual([]);
    });
  });

  describe("itemsPerSessionForAge", () => {
    it("age 7 → 15 (MyLevel upper bound 12 + 3)", () => {
      expect(itemsPerSessionForAge(7)).toBe(15);
    });
    it("age 8 → 15 (same band as 7)", () => {
      expect(itemsPerSessionForAge(8)).toBe(15);
    });
    it("age 9 → 18 (MyLevel 15 + 3)", () => {
      expect(itemsPerSessionForAge(9)).toBe(18);
    });
    it("age 10 → 18 (same band as 9)", () => {
      expect(itemsPerSessionForAge(10)).toBe(18);
    });
    it("age outside 7-10 → 10 fallback", () => {
      expect(itemsPerSessionForAge(5)).toBe(10);
      expect(itemsPerSessionForAge(15)).toBe(10);
    });
  });

  describe("create + load + active", () => {
    it("empty initial state", () => {
      expect(loadProfiles()).toEqual([]);
      expect(getActiveProfileId()).toBeNull();
      expect(getActiveProfile()).toBeNull();
    });

    it("createProfile adds to list", () => {
      const p = createProfile("Alpha", 7);
      const all = loadProfiles();
      expect(all.length).toBe(1);
      expect(all[0]?.name).toBe("Alpha");
      expect(all[0]?.age).toBe(7);
      expect(all[0]?.allowedSkills).toEqual([
        "add_sub_100",
        "multiplication",
        "hebrew_comprehension",
      ]);
      expect(p.id).toBeTruthy();
    });

    it("setActiveProfileId + getActiveProfile", () => {
      const p = createProfile("Beta", 9);
      setActiveProfileId(p.id);
      expect(getActiveProfileId()).toBe(p.id);
      expect(getActiveProfile()?.name).toBe("Beta");
    });

    it("setActiveProfileId(null) clears", () => {
      const p = createProfile("Gamma", 7);
      setActiveProfileId(p.id);
      setActiveProfileId(null);
      expect(getActiveProfileId()).toBeNull();
      expect(getActiveProfile()).toBeNull();
    });

    it("getActiveProfile returns null when id references missing profile", () => {
      setActiveProfileId("ghost-id");
      expect(getActiveProfile()).toBeNull();
    });

    it("profiles persist via saveProfiles/loadProfiles", () => {
      const a = createProfile("A", 7);
      const b = createProfile("B", 9);
      const loaded = loadProfiles();
      expect(loaded.map((p) => p.id)).toEqual([a.id, b.id]);
    });

    it("profileAllowsSkill works", () => {
      const p = createProfile("C", 7);
      expect(profileAllowsSkill(p, "add_sub_100")).toBe(true);
      expect(profileAllowsSkill(p, "multiplication")).toBe(true);
      expect(profileAllowsSkill(p, "fractions_intro")).toBe(false);
      expect(profileAllowsSkill(p, "ops_1000")).toBe(false);
      const p9 = createProfile("D", 9);
      expect(profileAllowsSkill(p9, "add_sub_100")).toBe(false);
      expect(profileAllowsSkill(p9, "multiplication")).toBe(false);
      expect(profileAllowsSkill(p9, "fractions_intro")).toBe(true);
      expect(profileAllowsSkill(p9, "ops_1000")).toBe(true);
    });

    it("saveProfiles overwrites", () => {
      createProfile("X", 7);
      saveProfiles([]);
      expect(loadProfiles()).toEqual([]);
    });

    describe("deleteProfile", () => {
      it("removes profile from list", () => {
        const a = createProfile("A", 7);
        const b = createProfile("B", 9);
        deleteProfile(a.id);
        const remaining = loadProfiles();
        expect(remaining.map((p) => p.id)).toEqual([b.id]);
      });

      it("clears active profile id when deleting the active one", () => {
        const a = createProfile("A", 7);
        setActiveProfileId(a.id);
        deleteProfile(a.id);
        expect(getActiveProfileId()).toBeNull();
      });

      it("keeps active id when deleting a different profile", () => {
        const a = createProfile("A", 7);
        const b = createProfile("B", 9);
        setActiveProfileId(a.id);
        deleteProfile(b.id);
        expect(getActiveProfileId()).toBe(a.id);
      });

      it("purges mastery, graduation flag, and telemetry for the deleted profile only", () => {
        const a = createProfile("A", 7);
        const b = createProfile("B", 9);

        // seed storage for both
        saveMastery(a.id, recordAttempt(emptyMastery("add_sub_100"), "i1", true));
        saveMastery(b.id, recordAttempt(emptyMastery("fractions_intro"), "j1", true));
        markGraduated(a.id, "add_sub_100");
        markGraduated(b.id, "fractions_intro");
        logEvent(a.id, { t: "session_start", at: 1, skill: "add_sub_100" });
        logEvent(b.id, { t: "session_start", at: 1, skill: "fractions_intro" });

        deleteProfile(a.id);

        // A's data is gone
        expect(hasGraduatedFlag(a.id, "add_sub_100")).toBe(false);
        expect(loadProfiles().map((p) => p.id)).toEqual([b.id]);

        // B's data intact
        expect(hasGraduatedFlag(b.id, "fractions_intro")).toBe(true);
      });
    });

    it("loadProfiles re-derives allowedSkills from age (stale-cache safe)", () => {
      // Simulate a profile stored before a curriculum change, with empty allowedSkills.
      const stale = [
        {
          id: "p1",
          name: "Stale",
          age: 9,
          allowedSkills: [] as const,
          createdAt: 1,
        },
      ];
      saveProfiles(stale as unknown as ReturnType<typeof loadProfiles>);
      const reloaded = loadProfiles();
      expect(reloaded[0]?.allowedSkills).toEqual([
        "fractions_intro",
        "ops_1000",
        "long_division",
        "bar_models",
      ]);
    });
  });
});
