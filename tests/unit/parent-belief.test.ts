import { beforeEach, describe, expect, it } from "vitest";
import {
  countBeliefsInLastNDays,
  isoWeekKey,
  latestBelief,
  loadBelief,
  saveBelief,
} from "@/lib/parent-belief";

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
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
    localStorage: mem,
  };
  return mem;
}

beforeEach(() => {
  installMemoryStorage();
});

describe("parent-belief — isoWeekKey", () => {
  it("known Thursday → expected week", () => {
    // 2026-04-23 is a Thursday → ISO week 17 of 2026
    expect(isoWeekKey(new Date("2026-04-23T12:00:00Z"))).toBe("2026-W17");
  });

  it("start of year handled", () => {
    // 2026-01-01 Thursday → ISO W01
    expect(isoWeekKey(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
  });

  it("Sunday vs Monday boundary", () => {
    // Sunday 2026-04-19 → still W16 per ISO (ISO weeks start Monday)
    expect(isoWeekKey(new Date("2026-04-19T12:00:00Z"))).toBe("2026-W16");
    // Monday 2026-04-20 → W17
    expect(isoWeekKey(new Date("2026-04-20T12:00:00Z"))).toBe("2026-W17");
  });
});

describe("parent-belief — save / load", () => {
  it("saveBelief + loadBelief round-trips", () => {
    const at = new Date("2026-04-22T10:00:00Z").getTime();
    const note = saveBelief("p1", "השבוע הרגשתי שהיא חזקה", "feeling", at);
    expect(note).not.toBeNull();
    const loaded = loadBelief("p1", "2026-W17");
    expect(loaded?.text).toBe("השבוע הרגשתי שהיא חזקה");
    expect(loaded?.at).toBe(at);
  });

  it("saveBelief rejects empty text", () => {
    const note = saveBelief("p1", "   ", "performance");
    expect(note).toBeNull();
  });

  it("saves kind with the note", () => {
    const note = saveBelief("p1", "נראית נהנית", "feeling");
    expect(note?.kind).toBe("feeling");
    const loaded = loadBelief("p1", note!.weekKey);
    expect(loaded?.kind).toBe("feeling");
  });

  it("normalizes missing kind as 'other' for legacy notes", () => {
    const weekKey = "2026-W17";
    window.localStorage.setItem(
      `emiva.parent_belief.v1.p1.${weekKey}`,
      JSON.stringify({ text: "legacy", at: 1000, weekKey }),
    );
    const loaded = loadBelief("p1", weekKey);
    expect(loaded?.kind).toBe("other");
  });

  it("overwrites within same week", () => {
    const at1 = new Date("2026-04-21T10:00:00Z").getTime();
    const at2 = new Date("2026-04-23T10:00:00Z").getTime();
    saveBelief("p1", "ראשון", "performance", at1);
    saveBelief("p1", "שני", "performance", at2);
    const loaded = loadBelief("p1", "2026-W17");
    expect(loaded?.text).toBe("שני");
  });

  it("latestBelief returns most recent across weeks", () => {
    const weekAgo = new Date("2026-04-16T10:00:00Z").getTime();
    const today = new Date("2026-04-22T10:00:00Z").getTime();
    saveBelief("p1", "שבוע שעבר", "performance", weekAgo);
    saveBelief("p1", "השבוע", "performance", today);
    expect(latestBelief("p1")?.text).toBe("השבוע");
  });

  it("latestBelief null when empty", () => {
    expect(latestBelief("pnone")).toBeNull();
  });
});

describe("parent-belief — countBeliefsInLastNDays", () => {
  it("counts only notes within window", () => {
    const now = new Date("2026-04-22T10:00:00Z").getTime();
    saveBelief("p1", "ישן", "performance", now - 40 * 86_400_000);
    saveBelief("p1", "חדש", "performance", now - 10 * 86_400_000);
    const count = countBeliefsInLastNDays("p1", 28, now);
    expect(count).toBe(1);
  });

  it("0 when profile has no notes", () => {
    const now = Date.now();
    expect(countBeliefsInLastNDays("pnone", 28, now)).toBe(0);
  });
});
