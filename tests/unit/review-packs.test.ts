import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/lib/profiles";
import {
  clearActivePackId,
  getPackById,
  listPacks,
  loadActivePackId,
  resolveActiveTarget,
  saveActivePackId,
  __clearPacksForTests,
  __registerPackForTests,
} from "@/lib/review-packs";
import { saveParentFocus } from "@/lib/parent-focus";

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

// LAUNCH-PUBLIC-001 D2 — no pack ships publicly (the private folder is empty
// in a clean clone), so the MECHANISM is exercised against a fixture rather
// than against whatever private content happens to sit on this machine.
const FIXTURE_PACK = {
  id: "test-review-pack",
  name: "כיתה ד' — חזרה לדוגמה",
  audience: "אמיליה",
  items: [
    {
      kind: "off_app" as const,
      id: "off-1",
      prompt: "ציירי מודל בר לבעיה",
      answerReveal: "התשובה: 12",
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      kind: "item" as const,
      item: {
        id: `fx-${i}`,
        skill: "ops_1000",
        difficulty: 2,
        a: 100 + i,
        b: 5,
        op: "+",
        answer: 105 + i,
      } as never,
    })),
  ],
};

beforeEach(() => {
  installMemoryStorage();
  __clearPacksForTests();
  __registerPackForTests(FIXTURE_PACK as never);
});

function emilia(): Profile {
  return {
    id: "p-emilia",
    name: "אמיליה",
    age: 9,
    allowedSkills: ["fractions_intro", "ops_1000", "long_division", "bar_models"],
    createdAt: 0,
  };
}

describe("built-in packs", () => {
  it("listPacks returns at least one (the assessment review pack)", () => {
    const packs = listPacks();
    expect(packs.length).toBeGreaterThanOrEqual(1);
  });

  it("getPackById returns the pack by id", () => {
    const pack = getPackById("test-review-pack");
    expect(pack).not.toBeNull();
    expect(pack!.name).toContain("חזרה");
  });

  it("unknown pack id returns null", () => {
    expect(getPackById("nonexistent")).toBeNull();
  });

  it("the assessment pack contains both item and off_app entries", () => {
    const pack = getPackById("test-review-pack")!;
    const offApps = pack.items.filter((i) => i.kind === "off_app");
    const items = pack.items.filter((i) => i.kind === "item");
    expect(offApps.length).toBeGreaterThanOrEqual(1);
    expect(items.length).toBeGreaterThanOrEqual(20);
  });
});

describe("active pack storage", () => {
  it("loadActivePackId returns null when nothing saved", () => {
    expect(loadActivePackId("p-emilia")).toBeNull();
  });

  it("save → load round-trip", () => {
    saveActivePackId("p-emilia", "test-review-pack");
    expect(loadActivePackId("p-emilia")).toBe("test-review-pack");
  });

  it("save rejects unknown pack id silently", () => {
    saveActivePackId("p-emilia", "nonexistent");
    expect(loadActivePackId("p-emilia")).toBeNull();
  });

  it("clear removes the active pack", () => {
    saveActivePackId("p-emilia", "test-review-pack");
    clearActivePackId("p-emilia");
    expect(loadActivePackId("p-emilia")).toBeNull();
  });
});

describe("resolveActiveTarget", () => {
  it("returns pack when one is active", () => {
    saveActivePackId("p-emilia", "test-review-pack");
    const target = resolveActiveTarget(emilia());
    expect(target.kind).toBe("pack");
    if (target.kind === "pack") expect(target.pack.id).toBe("test-review-pack");
  });

  it("returns parent-focus skill when no pack but focus set", () => {
    saveParentFocus("p-emilia", "ops_1000");
    const target = resolveActiveTarget(emilia());
    expect(target.kind).toBe("skill");
    if (target.kind === "skill") {
      expect(target.skill).toBe("ops_1000");
      expect(target.source).toBe("manual");
    }
  });

  it("returns auto skill when neither pack nor focus", () => {
    const target = resolveActiveTarget(emilia());
    expect(target.kind).toBe("skill");
    if (target.kind === "skill") expect(target.source).toBe("auto");
  });

  it("pack takes priority over parent-focus skill", () => {
    saveParentFocus("p-emilia", "ops_1000");
    saveActivePackId("p-emilia", "test-review-pack");
    const target = resolveActiveTarget(emilia());
    expect(target.kind).toBe("pack");
  });
});
