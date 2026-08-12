import { beforeEach, describe, expect, it } from "vitest";
import {
  appendMeasurementResult,
  hasBankExhaustedFlag,
  hasGraduatedFlag,
  loadMastery,
  loadMeasurementHistory,
  markBankExhausted,
  markGraduated,
  purgeProfileStorage,
  resetMastery,
  saveMastery,
} from "@/lib/storage";
import { emptyMastery, recordAttempt } from "@/lib/mastery";
import type { ExternalTestResult } from "@/lib/types";

type LegacyMasteryShape = {
  skill: "add_sub_100" | "fractions_intro";
  attempts: Array<{ itemId: string; correct: boolean; at: number }>;
  srs: Record<string, unknown>;
  sessionCount: number;
};

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
  keys(): string[] {
    return [...this.store.keys()];
  }
  get length() {
    return this.store.size;
  }
  key(i: number): string | null {
    return [...this.store.keys()][i] ?? null;
  }
}

function installMemoryStorage(): MemoryStorage {
  const mem = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
    localStorage: mem,
  };
  return mem;
}

beforeEach(() => {
  installMemoryStorage();
});

describe("storage — per-skill mastery", () => {
  it("loadMastery returns empty when nothing stored", () => {
    const state = loadMastery("p1", "add_sub_100");
    expect(state.attempts).toEqual([]);
    expect(state.skill).toBe("add_sub_100");
  });

  it("saveMastery + loadMastery round-trips", () => {
    const s = recordAttempt(emptyMastery("add_sub_100"), "i1", true);
    saveMastery("p1", s);
    const loaded = loadMastery("p1", "add_sub_100");
    expect(loaded.attempts.length).toBe(1);
    expect(loaded.skill).toBe("add_sub_100");
  });

  it("per-skill isolation — add_sub_100 and fractions_intro don't cross", () => {
    const a = recordAttempt(emptyMastery("add_sub_100"), "i1", true);
    const b = recordAttempt(emptyMastery("fractions_intro"), "j1", false);
    saveMastery("p1", a);
    saveMastery("p1", b);

    const loadedA = loadMastery("p1", "add_sub_100");
    const loadedB = loadMastery("p1", "fractions_intro");
    expect(loadedA.attempts[0]?.itemId).toBe("i1");
    expect(loadedB.attempts[0]?.itemId).toBe("j1");
  });

  it("resetMastery only clears the given skill", () => {
    const a = recordAttempt(emptyMastery("add_sub_100"), "i1", true);
    const b = recordAttempt(emptyMastery("fractions_intro"), "j1", true);
    saveMastery("p1", a);
    saveMastery("p1", b);
    resetMastery("p1", "add_sub_100");
    expect(loadMastery("p1", "add_sub_100").attempts).toEqual([]);
    expect(loadMastery("p1", "fractions_intro").attempts.length).toBe(1);
  });
});

describe("storage — legacy migration", () => {
  it("migrates legacy emiva.mastery.v1.{profileId} to per-skill key", () => {
    const mem = installMemoryStorage();

    const legacy: LegacyMasteryShape = {
      skill: "add_sub_100",
      attempts: [{ itemId: "old-1", correct: true, at: 1 }],
      srs: {},
      sessionCount: 3,
    };
    mem.setItem("emiva.mastery.v1.p1", JSON.stringify(legacy));

    const loaded = loadMastery("p1", "add_sub_100");
    expect(loaded.attempts.length).toBe(1);
    expect(loaded.attempts[0]?.itemId).toBe("old-1");
    expect(loaded.sessionCount).toBe(3);

    // Legacy key should be removed after migration
    expect(mem.getItem("emiva.mastery.v1.p1")).toBeNull();
    // New per-skill key should exist
    expect(mem.getItem("emiva.mastery.v1.p1.add_sub_100")).toBeTruthy();
  });

  it("migration does not leak to other skills", () => {
    const mem = installMemoryStorage();

    const legacy: LegacyMasteryShape = {
      skill: "add_sub_100",
      attempts: [{ itemId: "old-1", correct: true, at: 1 }],
      srs: {},
      sessionCount: 0,
    };
    mem.setItem("emiva.mastery.v1.p1", JSON.stringify(legacy));

    // Load fractions first — should not find legacy add_sub data
    const fractionsState = loadMastery("p1", "fractions_intro");
    expect(fractionsState.attempts).toEqual([]);

    // But add_sub should still be retrievable after the fractions read (migration happened)
    const addSubState = loadMastery("p1", "add_sub_100");
    expect(addSubState.attempts.length).toBe(1);
  });

  it("corrupt legacy value is removed without crashing", () => {
    const mem = installMemoryStorage();
    mem.setItem("emiva.mastery.v1.p1", "{not valid json");

    const state = loadMastery("p1", "add_sub_100");
    expect(state.attempts).toEqual([]);
    expect(mem.getItem("emiva.mastery.v1.p1")).toBeNull();
  });

  it("mastery stored without sessionTimestamps normalizes to empty array", () => {
    const mem = installMemoryStorage();
    const preGraduationSchema: LegacyMasteryShape = {
      skill: "add_sub_100",
      attempts: [{ itemId: "i1", correct: true, at: 1 }],
      srs: {},
      sessionCount: 5,
    };
    mem.setItem(
      "emiva.mastery.v1.p1.add_sub_100",
      JSON.stringify(preGraduationSchema),
    );

    const loaded = loadMastery("p1", "add_sub_100");
    expect(loaded.sessionTimestamps).toEqual([]);
    expect(loaded.attempts.length).toBe(1);
    expect(loaded.sessionCount).toBe(5);
  });
});

describe("storage — graduation flag (one-shot)", () => {
  it("flag is absent by default", () => {
    expect(hasGraduatedFlag("p1", "add_sub_100")).toBe(false);
  });

  it("markGraduated sets the flag; hasGraduatedFlag reads it back", () => {
    markGraduated("p1", "fractions_intro");
    expect(hasGraduatedFlag("p1", "fractions_intro")).toBe(true);
    // Other skill unaffected
    expect(hasGraduatedFlag("p1", "add_sub_100")).toBe(false);
  });

  it("flag is profile-scoped", () => {
    markGraduated("p1", "add_sub_100");
    expect(hasGraduatedFlag("p1", "add_sub_100")).toBe(true);
    expect(hasGraduatedFlag("p2", "add_sub_100")).toBe(false);
  });
});

describe("storage — measurement history (MEASUREMENT-EXTERNAL-TEST-001)", () => {
  function mkResult(
    skill: ExternalTestResult["skill"],
    score: number,
    at: number,
  ): ExternalTestResult {
    return {
      skill,
      score,
      total: 10,
      verdict: score >= 8 ? "passed" : score >= 6 ? "gap" : "false_mastery",
      at,
    };
  }

  it("loadMeasurementHistory returns [] when nothing is stored", () => {
    expect(loadMeasurementHistory("p1", "add_sub_100")).toEqual([]);
  });

  it("appendMeasurementResult writes a single result; loadMeasurementHistory reads it back", () => {
    appendMeasurementResult("p1", mkResult("add_sub_100", 8, 100));
    const history = loadMeasurementHistory("p1", "add_sub_100");
    expect(history.length).toBe(1);
    expect(history[0]?.score).toBe(8);
    expect(history[0]?.verdict).toBe("passed");
  });

  it("appends are additive (history grows, oldest first)", () => {
    appendMeasurementResult("p1", mkResult("add_sub_100", 5, 100));
    appendMeasurementResult("p1", mkResult("add_sub_100", 7, 200));
    appendMeasurementResult("p1", mkResult("add_sub_100", 9, 300));
    const history = loadMeasurementHistory("p1", "add_sub_100");
    expect(history.map((r) => r.at)).toEqual([100, 200, 300]);
    expect(history.map((r) => r.score)).toEqual([5, 7, 9]);
  });

  it("history is isolated per profile × skill", () => {
    appendMeasurementResult("p1", mkResult("add_sub_100", 8, 1));
    appendMeasurementResult("p2", mkResult("add_sub_100", 3, 2));
    appendMeasurementResult("p1", mkResult("fractions_intro", 6, 3));

    expect(loadMeasurementHistory("p1", "add_sub_100").length).toBe(1);
    expect(loadMeasurementHistory("p1", "add_sub_100")[0]?.score).toBe(8);
    expect(loadMeasurementHistory("p2", "add_sub_100")[0]?.score).toBe(3);
    expect(loadMeasurementHistory("p1", "fractions_intro")[0]?.score).toBe(6);
    expect(loadMeasurementHistory("p2", "fractions_intro")).toEqual([]);
  });

  it("corrupt stored value is treated as empty without throwing", () => {
    const mem = installMemoryStorage();
    mem.setItem("emiva.measurement.v1.p1.add_sub_100", "{not valid json");
    expect(loadMeasurementHistory("p1", "add_sub_100")).toEqual([]);
  });

  it("purgeProfileStorage removes measurement history for that profile only", () => {
    appendMeasurementResult("p1", mkResult("add_sub_100", 8, 1));
    appendMeasurementResult("p1", mkResult("fractions_intro", 7, 2));
    appendMeasurementResult("p2", mkResult("add_sub_100", 5, 3));

    purgeProfileStorage("p1");

    expect(loadMeasurementHistory("p1", "add_sub_100")).toEqual([]);
    expect(loadMeasurementHistory("p1", "fractions_intro")).toEqual([]);
    expect(loadMeasurementHistory("p2", "add_sub_100").length).toBe(1);
  });

  /**
   * LAUNCH-PUBLIC-001 D3 — deletion must leave NOTHING behind.
   *
   * This asserts by scanning the whole keyspace rather than by checking a
   * hand-written list, because a hand-written list is exactly what went
   * stale: `parent_focus`, `review_pack_active` and `parent_belief` are all
   * per-profile yet none were purged. Once accounts exist this stops being
   * untidiness and becomes a legal problem — "I deleted my child" has to be
   * true (Amendment 13 / PUBLIC-READY-001).
   */
  it("purgeProfileStorage leaves no trace of the profile anywhere", () => {
    const mem = installMemoryStorage();
    // Every per-profile key the app writes today, plus the three that the
    // old prefix list forgot.
    const keys = [
      "emiva.mastery.v1.p1.add_sub_100",
      "emiva.graduated.v1.p1.add_sub_100",
      "emiva.last_session.v1.p1",
      "emiva.bank_exhausted.v1.p1.hebrew_comprehension",
      "emiva.measurement.v1.p1.add_sub_100",
      "emiva.measurement.seen.v1.p1.add_sub_100",
      "emiva.puppy_journal.v1.p1",
      "emiva.enrichment.v1.p1",
      "emiva.parent_focus.v1.p1",
      "emiva.review_pack_active.v1.p1",
      "emiva.parent_belief.v1.p1.2026-W33",
    ];
    keys.forEach((k) => mem.setItem(k, "{}"));
    // A second child's data must survive untouched.
    mem.setItem("emiva.mastery.v1.p2.add_sub_100", "{}");
    mem.setItem("emiva.parent_focus.v1.p2", "{}");

    purgeProfileStorage("p1");

    const leftovers: string[] = [];
    for (let i = 0; i < mem.length; i++) {
      const k = mem.key(i);
      if (k && k.includes(".p1")) leftovers.push(k);
    }
    expect(leftovers).toEqual([]);
    expect(mem.getItem("emiva.mastery.v1.p2.add_sub_100")).not.toBeNull();
    expect(mem.getItem("emiva.parent_focus.v1.p2")).not.toBeNull();
  });
});

describe("storage — bank-exhausted flag (CORE-HEBREW-EVELYN-003)", () => {
  it("flag is absent by default", () => {
    expect(hasBankExhaustedFlag("p1", "hebrew_comprehension")).toBe(false);
  });

  it("markBankExhausted sets the flag; hasBankExhaustedFlag reads it back", () => {
    markBankExhausted("p1", "hebrew_comprehension");
    expect(hasBankExhaustedFlag("p1", "hebrew_comprehension")).toBe(true);
    // Other skill unaffected
    expect(hasBankExhaustedFlag("p1", "add_sub_100")).toBe(false);
  });

  it("flag is profile-scoped", () => {
    markBankExhausted("p1", "hebrew_comprehension");
    expect(hasBankExhaustedFlag("p1", "hebrew_comprehension")).toBe(true);
    expect(hasBankExhaustedFlag("p2", "hebrew_comprehension")).toBe(false);
  });
});
