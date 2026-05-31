import { beforeEach, describe, expect, it } from "vitest";
import {
  computeVerdict,
  dueForRetest,
  getLastResult,
  hasMeasurement,
  holdoutForSkill,
  MEASURABLE_SKILLS,
  pickTestItems,
  saveResult,
  verdictBadge,
  verdictHebrew,
} from "@/lib/measurement";
import type { ExternalTestResult, Skill } from "@/lib/types";
import {
  MEASUREMENT_GAP_PCT,
  MEASUREMENT_PASSED_PCT,
  MEASUREMENT_RETEST_INTERVAL_MS,
  MEASUREMENT_TOTAL,
} from "@/lib/types";

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
  get length() {
    return this.store.size;
  }
  key(i: number) {
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

describe("measurement — computeVerdict", () => {
  it("8/10 returns passed (boundary, ≥ 80%)", () => {
    expect(computeVerdict(8, 10)).toBe("passed");
  });

  it("10/10 returns passed", () => {
    expect(computeVerdict(10, 10)).toBe("passed");
  });

  it("7/10 returns gap (between 60% and 80%)", () => {
    expect(computeVerdict(7, 10)).toBe("gap");
  });

  it("6/10 returns gap (boundary, ≥ 60%)", () => {
    expect(computeVerdict(6, 10)).toBe("gap");
  });

  it("5/10 returns false_mastery (< 60%)", () => {
    expect(computeVerdict(5, 10)).toBe("false_mastery");
  });

  it("0/10 returns false_mastery", () => {
    expect(computeVerdict(0, 10)).toBe("false_mastery");
  });

  it("invalid total returns false_mastery", () => {
    expect(computeVerdict(0, 0)).toBe("false_mastery");
  });

  it("constants are aligned with parent-guide §6", () => {
    expect(MEASUREMENT_PASSED_PCT).toBe(80);
    expect(MEASUREMENT_GAP_PCT).toBe(60);
  });
});

describe("measurement — pickTestItems", () => {
  it("returns up to MEASUREMENT_TOTAL items", () => {
    const items = pickTestItems(holdoutForSkill("add_sub_100"));
    expect(items.length).toBe(MEASUREMENT_TOTAL);
  });

  it("returns no duplicates", () => {
    const items = pickTestItems(holdoutForSkill("add_sub_100"));
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("deterministic under fixed rand", () => {
    const bank = holdoutForSkill("fractions_intro");
    const fixed = () => 0.5;
    const a = pickTestItems(bank, fixed);
    const b = pickTestItems(bank, fixed);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });

  it("two different rands give different orderings (no hidden global state)", () => {
    const bank = holdoutForSkill("fractions_intro");
    let i = 0;
    const seq = [0.1, 0.4, 0.7, 0.2, 0.9, 0.3, 0.6, 0.8, 0.5, 0.05];
    const r1 = () => seq[i++ % seq.length] as number;
    i = 0;
    const a = pickTestItems(bank, r1);
    i = 5;
    const b = pickTestItems(bank, r1);
    expect(a.map((x) => x.id)).not.toEqual(b.map((x) => x.id));
  });

  it("returns empty for an empty bank", () => {
    expect(pickTestItems([])).toEqual([]);
  });

  it("returns all items when bank smaller than count", () => {
    const small = holdoutForSkill("add_sub_100").slice(0, 5);
    const picked = pickTestItems(small, undefined, 10);
    expect(picked.length).toBe(5);
  });
});

describe("measurement — dueForRetest", () => {
  it("returns true when lastAt is null (never tested)", () => {
    expect(dueForRetest(null)).toBe(true);
  });

  it("returns false right after a test", () => {
    const now = 1_000_000_000_000;
    expect(dueForRetest(now, now)).toBe(false);
  });

  it("returns false after 1 day", () => {
    const now = 1_000_000_000_000;
    const oneDay = 24 * 60 * 60 * 1000;
    expect(dueForRetest(now - oneDay, now)).toBe(false);
  });

  it("returns true after 6 weeks (the interval boundary)", () => {
    const now = 1_000_000_000_000;
    expect(dueForRetest(now - MEASUREMENT_RETEST_INTERVAL_MS, now)).toBe(true);
  });

  it("returns true after 50 days", () => {
    const now = 1_000_000_000_000;
    const fiftyDays = 50 * 24 * 60 * 60 * 1000;
    expect(dueForRetest(now - fiftyDays, now)).toBe(true);
  });
});

describe("measurement — save + load roundtrip", () => {
  it("getLastResult returns null when no history exists", () => {
    expect(getLastResult("p1", "add_sub_100")).toBeNull();
  });

  it("saveResult + getLastResult round-trip", () => {
    const r: ExternalTestResult = {
      skill: "add_sub_100",
      score: 8,
      total: 10,
      verdict: "passed",
      at: 123,
    };
    saveResult("p1", r);
    const last = getLastResult("p1", "add_sub_100");
    expect(last).not.toBeNull();
    expect(last?.score).toBe(8);
    expect(last?.at).toBe(123);
  });

  it("getLastResult returns the most recent result by timestamp", () => {
    saveResult("p1", {
      skill: "add_sub_100",
      score: 5,
      total: 10,
      verdict: "false_mastery",
      at: 100,
    });
    saveResult("p1", {
      skill: "add_sub_100",
      score: 9,
      total: 10,
      verdict: "passed",
      at: 200,
    });
    saveResult("p1", {
      skill: "add_sub_100",
      score: 7,
      total: 10,
      verdict: "gap",
      at: 150,
    });
    expect(getLastResult("p1", "add_sub_100")?.at).toBe(200);
    expect(getLastResult("p1", "add_sub_100")?.score).toBe(9);
  });

  it("results are scoped per profile × skill", () => {
    saveResult("p1", {
      skill: "add_sub_100",
      score: 8,
      total: 10,
      verdict: "passed",
      at: 1,
    });
    saveResult("p2", {
      skill: "add_sub_100",
      score: 3,
      total: 10,
      verdict: "false_mastery",
      at: 2,
    });
    saveResult("p1", {
      skill: "fractions_intro",
      score: 7,
      total: 10,
      verdict: "gap",
      at: 3,
    });
    expect(getLastResult("p1", "add_sub_100")?.score).toBe(8);
    expect(getLastResult("p2", "add_sub_100")?.score).toBe(3);
    expect(getLastResult("p1", "fractions_intro")?.score).toBe(7);
    expect(getLastResult("p2", "fractions_intro")).toBeNull();
  });
});

describe("measurement — hasMeasurement / MEASURABLE_SKILLS", () => {
  it("includes only currently-supported skills (sliver 1)", () => {
    expect([...MEASURABLE_SKILLS].sort()).toEqual(
      ["add_sub_100", "fractions_intro"].sort(),
    );
  });

  it("hasMeasurement true for supported skills", () => {
    expect(hasMeasurement("add_sub_100")).toBe(true);
    expect(hasMeasurement("fractions_intro")).toBe(true);
  });

  it("hasMeasurement false for unsupported skills", () => {
    const unsupported: Skill[] = [
      "ops_1000",
      "multiplication",
      "long_division",
      "bar_models",
      "hebrew_comprehension",
    ];
    for (const s of unsupported) {
      expect(hasMeasurement(s)).toBe(false);
    }
  });
});

describe("measurement — labels (growth-mindset tone)", () => {
  it("verdictBadge has all three labels in Hebrew", () => {
    expect(verdictBadge("passed")).toBe("עברה");
    expect(verdictBadge("gap")).toBe("פער");
    expect(verdictBadge("false_mastery")).toBe("כדאי לחזק");
  });

  it("verdictHebrew sentences avoid forbidden growth-mindset terms", () => {
    const forbidden = ["טעית", "נכשל", "כשלון", "כישלון", "שגוי", "פספסת"];
    const verdicts: Array<"passed" | "gap" | "false_mastery"> = [
      "passed",
      "gap",
      "false_mastery",
    ];
    for (const v of verdicts) {
      const text = verdictHebrew(v);
      for (const bad of forbidden) {
        expect(text).not.toContain(bad);
      }
    }
  });
});
