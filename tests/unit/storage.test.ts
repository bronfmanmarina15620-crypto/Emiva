import { beforeEach, describe, expect, it } from "vitest";
import { loadMastery, saveMastery, resetMastery } from "@/lib/storage";
import { emptyMastery, recordAttempt } from "@/lib/mastery";
import type { MasteryState } from "@/lib/types";

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

    const legacy: MasteryState = {
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

    const legacy: MasteryState = {
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
});
