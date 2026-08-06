import { beforeEach, describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
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
  updateProfile,
} from "@/lib/profiles";
import {
  hasGraduatedFlag,
  loadMastery,
  markGraduated,
  saveMastery,
} from "@/lib/storage";
import { exportTelemetry, logEvent } from "@/lib/telemetry";
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
        "english_vocab",
      ]);
    });
    it("age 8 → same chain as age 7", () => {
      expect(allowedSkillsForAge(8)).toEqual([
        "add_sub_100",
        "multiplication",
        "hebrew_comprehension",
        "english_vocab",
      ]);
    });
    it("age 9 → fractions_intro, ops_1000, long_division, bar_models, mult_2digit, hebrew_comprehension, english_vocab (ordered)", () => {
      expect(allowedSkillsForAge(9)).toEqual([
        "fractions_intro",
        "ops_1000",
        "long_division",
        "bar_models",
        "mult_2digit",
        "hebrew_comprehension",
        "english_vocab",
      ]);
    });
    it("age 10 → fractions_intro, ops_1000, long_division, bar_models, mult_2digit, hebrew_comprehension, english_vocab (ordered)", () => {
      expect(allowedSkillsForAge(10)).toEqual([
        "fractions_intro",
        "ops_1000",
        "long_division",
        "bar_models",
        "mult_2digit",
        "hebrew_comprehension",
        "english_vocab",
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
    it("age 9 → 13 (Marina 2026-07-26)", () => {
      expect(itemsPerSessionForAge(9)).toBe(13);
    });
    it("age 10 → 13 (same band as 9)", () => {
      expect(itemsPerSessionForAge(10)).toBe(13);
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
        "english_vocab",
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

    // postmortem 2026-07-19: גיל קפוא בפרופיל שלח בת 9 לנושאים של בת 7.
    // הבלוקים הבאים מקודדים את הלקח: גיל נגזר מתאריך-לידה, ועריכת גיל
    // לא מוחקת היסטוריה.
    describe("ageFromBirthDate", () => {
      it("returns age before this year's birthday", () => {
        expect(ageFromBirthDate("2016-12-01", new Date(2026, 6, 19))).toBe(9);
      });
      it("advances age on the birthday itself", () => {
        expect(ageFromBirthDate("2016-07-19", new Date(2026, 6, 19))).toBe(10);
      });
      it("rejects malformed or impossible dates", () => {
        expect(ageFromBirthDate("not-a-date")).toBeNull();
        expect(ageFromBirthDate("2016-13-01")).toBeNull();
        expect(ageFromBirthDate("2016-02-30")).toBeNull();
      });
      it("rejects future birth dates", () => {
        expect(ageFromBirthDate("2027-01-01", new Date(2026, 6, 19))).toBeNull();
      });
    });

    it("loadProfiles derives age from birthDate, overriding a stale stored age", () => {
      // בדיוק התקרית: בפרופיל שמור age 8, אבל לפי תאריך-הלידה הבת כבר בת 9.
      const now = new Date();
      const nineAndAHalfYearsAgo = new Date(
        now.getFullYear() - 9,
        now.getMonth() - 6,
        15,
      );
      const iso = `${nineAndAHalfYearsAgo.getFullYear()}-${String(
        nineAndAHalfYearsAgo.getMonth() + 1,
      ).padStart(2, "0")}-${String(nineAndAHalfYearsAgo.getDate()).padStart(2, "0")}`;
      const stale = [
        {
          id: "p-stale-age",
          name: "Emilia",
          age: 8,
          birthDate: iso,
          allowedSkills: [] as const,
          createdAt: 1,
        },
      ];
      saveProfiles(stale as unknown as ReturnType<typeof loadProfiles>);
      const loaded = loadProfiles();
      expect(loaded[0]?.age).toBe(9);
      expect(loaded[0]?.allowedSkills).toContain("fractions_intro");
      expect(loaded[0]?.allowedSkills).not.toContain("add_sub_100");
    });

    describe("updateProfile", () => {
      it("fixes a wrong age and re-derives allowedSkills, keeping id + createdAt", () => {
        const p = createProfile("Emilia", 8);
        const updated = updateProfile(p.id, { age: 9 });
        expect(updated?.id).toBe(p.id);
        expect(updated?.createdAt).toBe(p.createdAt);
        expect(updated?.age).toBe(9);
        expect(updated?.allowedSkills).toContain("fractions_intro");
        expect(updated?.allowedSkills).not.toContain("add_sub_100");
      });

      it("keeps mastery, graduation, telemetry, and active id (unlike delete+recreate)", () => {
        const p = createProfile("Emilia", 8);
        setActiveProfileId(p.id);
        saveMastery(p.id, recordAttempt(emptyMastery("add_sub_100"), "i1", true));
        markGraduated(p.id, "add_sub_100");
        logEvent(p.id, { t: "session_start", at: 1, skill: "add_sub_100" });

        updateProfile(p.id, { age: 9 });

        expect(loadMastery(p.id, "add_sub_100").attempts.length).toBe(1);
        expect(hasGraduatedFlag(p.id, "add_sub_100")).toBe(true);
        expect(JSON.parse(exportTelemetry(p.id)).length).toBe(1);
        expect(getActiveProfileId()).toBe(p.id);
      });

      it("stores birthDate so future loads derive age from it", () => {
        const p = createProfile("Emilia", 9);
        updateProfile(p.id, { birthDate: "2016-12-01" });
        const reloaded = loadProfiles().find((x) => x.id === p.id);
        expect(reloaded?.birthDate).toBe("2016-12-01");
      });

      it("birthDate: null clears it; unknown id returns null", () => {
        const p = createProfile("Emilia", 9, "2016-12-01");
        updateProfile(p.id, { birthDate: null });
        const reloaded = loadProfiles().find((x) => x.id === p.id);
        expect(reloaded?.birthDate).toBeUndefined();
        expect(updateProfile("ghost", { age: 9 })).toBeNull();
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
        "mult_2digit",
        "hebrew_comprehension",
        "english_vocab",
      ]);
    });
  });
});
