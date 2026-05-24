import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/lib/profiles";
import {
  clearActivePackId,
  getPackById,
  listPacks,
  loadActivePackId,
  resolveActiveTarget,
  saveActivePackId,
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

beforeEach(() => {
  installMemoryStorage();
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
    const pack = getPackById("emilia-assessment-review-2");
    expect(pack).not.toBeNull();
    expect(pack!.name).toContain("חזרה");
  });

  it("unknown pack id returns null", () => {
    expect(getPackById("nonexistent")).toBeNull();
  });

  it("the assessment pack contains both item and off_app entries", () => {
    const pack = getPackById("emilia-assessment-review-2")!;
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
    saveActivePackId("p-emilia", "emilia-assessment-review-2");
    expect(loadActivePackId("p-emilia")).toBe("emilia-assessment-review-2");
  });

  it("save rejects unknown pack id silently", () => {
    saveActivePackId("p-emilia", "nonexistent");
    expect(loadActivePackId("p-emilia")).toBeNull();
  });

  it("clear removes the active pack", () => {
    saveActivePackId("p-emilia", "emilia-assessment-review-2");
    clearActivePackId("p-emilia");
    expect(loadActivePackId("p-emilia")).toBeNull();
  });
});

describe("resolveActiveTarget", () => {
  it("returns pack when one is active", () => {
    saveActivePackId("p-emilia", "emilia-assessment-review-2");
    const target = resolveActiveTarget(emilia());
    expect(target.kind).toBe("pack");
    if (target.kind === "pack") expect(target.pack.id).toBe("emilia-assessment-review-2");
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
    saveActivePackId("p-emilia", "emilia-assessment-review-2");
    const target = resolveActiveTarget(emilia());
    expect(target.kind).toBe("pack");
  });
});
