import { beforeEach, describe, expect, it } from "vitest";
import {
  allowedSkillsForAge,
  createProfile,
  getActiveProfile,
  getActiveProfileId,
  loadProfiles,
  profileAllowsSkill,
  saveProfiles,
  setActiveProfileId,
} from "@/lib/profiles";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
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
    it("age 7 → add_sub_100", () => {
      expect(allowedSkillsForAge(7)).toEqual(["add_sub_100"]);
    });
    it("age 8 → add_sub_100", () => {
      expect(allowedSkillsForAge(8)).toEqual(["add_sub_100"]);
    });
    it("age 9 → fractions_intro", () => {
      expect(allowedSkillsForAge(9)).toEqual(["fractions_intro"]);
    });
    it("age 10 → fractions_intro", () => {
      expect(allowedSkillsForAge(10)).toEqual(["fractions_intro"]);
    });
    it("age 5 → empty", () => {
      expect(allowedSkillsForAge(5)).toEqual([]);
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
      expect(all[0]?.allowedSkills).toEqual(["add_sub_100"]);
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
      expect(profileAllowsSkill(p, "fractions_intro")).toBe(false);
      const p9 = createProfile("D", 9);
      expect(profileAllowsSkill(p9, "add_sub_100")).toBe(false);
      expect(profileAllowsSkill(p9, "fractions_intro")).toBe(true);
    });

    it("saveProfiles overwrites", () => {
      createProfile("X", 7);
      saveProfiles([]);
      expect(loadProfiles()).toEqual([]);
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
      expect(reloaded[0]?.allowedSkills).toEqual(["fractions_intro"]);
    });
  });
});
