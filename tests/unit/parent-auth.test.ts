import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPin,
  hashPin,
  hasPinSet,
  isValidPin,
  makeMathGate,
  setPin,
  verifyPin,
} from "@/lib/parent-auth";

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
  clear() {
    this.store.clear();
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

describe("parent-auth — PIN validation", () => {
  it("isValidPin accepts 4–6 digit strings", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12345")).toBe(true);
  });

  it("isValidPin rejects too short / too long / non-digits", () => {
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });
});

describe("parent-auth — hashPin", () => {
  it("produces 64-char hex", async () => {
    const h = await hashPin("1234");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1234");
    expect(a).toBe(b);
  });

  it("differs across inputs", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1235");
    expect(a).not.toBe(b);
  });
});

describe("parent-auth — setPin / verifyPin / clearPin", () => {
  it("hasPinSet false before setup", () => {
    expect(hasPinSet()).toBe(false);
  });

  it("setPin persists hash; verifyPin matches correct pin", async () => {
    await setPin("1234");
    expect(hasPinSet()).toBe(true);
    expect(await verifyPin("1234")).toBe(true);
  });

  it("verifyPin rejects wrong pin", async () => {
    await setPin("1234");
    expect(await verifyPin("9999")).toBe(false);
  });

  it("setPin throws on invalid pin", async () => {
    await expect(setPin("12")).rejects.toThrow();
  });

  it("clearPin removes stored hash", async () => {
    await setPin("1234");
    clearPin();
    expect(hasPinSet()).toBe(false);
    expect(await verifyPin("1234")).toBe(false);
  });
});

describe("parent-auth — makeMathGate", () => {
  it("produces solvable multiplication with matching answer", () => {
    for (let i = 0; i < 50; i++) {
      const g = makeMathGate();
      expect(g.answer).toBe(g.a * g.b);
      expect(g.a).toBeGreaterThanOrEqual(11);
      expect(g.a).toBeLessThanOrEqual(99);
      expect(g.b).toBeGreaterThanOrEqual(2);
      expect(g.b).toBeLessThanOrEqual(9);
    }
  });
});
