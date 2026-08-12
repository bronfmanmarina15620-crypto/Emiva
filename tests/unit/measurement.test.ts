import { beforeEach, describe, expect, it } from "vitest";
import {
  computeVerdict,
  dueForRetest,
  getLastResult,
  hasMeasurement,
  holdoutForSkill,
  MEASURABLE_SKILLS,
  pickTestItems,
  pickTestItemsForProfile,
  rememberTestItems,
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

  it("spreads across difficulty levels instead of clustering (BL-008)", () => {
    const bank = holdoutForSkill("add_sub_100");
    const levels = new Set(bank.map((i) => i.difficulty));
    const picked = pickTestItems(bank);
    const counts = new Map<number, number>();
    for (const item of picked) {
      counts.set(item.difficulty, (counts.get(item.difficulty) ?? 0) + 1);
    }
    // אף דרגה לא חוטפת את המבחן: התקרה היא מנה שווה + 1.
    const ceiling = Math.ceil(MEASUREMENT_TOTAL / levels.size) + 1;
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(ceiling);
    expect(counts.size).toBeGreaterThanOrEqual(Math.min(levels.size, 3));
  });
});

/**
 * BL-008 — הלקח המקודד. לפני התיקון חזרו בממוצע 3.35 מתוך 10 שאלות
 * בין שני מבחנים עוקבים; פריט שכבר נראה בודק שינון ולא העברה.
 * הרף כאן הוא **אפס** חזרות עד מיצוי המאגר, לא "פחות".
 */
describe("measurement — no repeats across rounds (BL-008)", () => {
  it("three consecutive rounds share zero items", () => {
    const bank = holdoutForSkill("add_sub_100");
    const seen: string[] = [];
    const rounds: string[][] = [];
    for (let r = 0; r < 3; r++) {
      const picked = pickTestItems(bank, Math.random, MEASUREMENT_TOTAL, seen);
      const ids = picked.map((i) => i.id);
      expect(ids.length).toBe(MEASUREMENT_TOTAL);
      for (const id of ids) expect(seen).not.toContain(id);
      rounds.push(ids);
      seen.push(...ids);
    }
    expect(new Set(rounds.flat()).size).toBe(30);
  });

  it("exhausts the whole bank before reusing anything", () => {
    const bank = holdoutForSkill("fractions_intro");
    const seen: string[] = [];
    for (let r = 0; r < 3; r++) {
      const picked = pickTestItems(bank, Math.random, MEASUREMENT_TOTAL, seen);
      seen.push(...picked.map((i) => i.id));
    }
    expect(new Set(seen).size).toBe(bank.length);
  });

  it("round 4 starts a fresh cycle instead of returning a short test", () => {
    const bank = holdoutForSkill("add_sub_100");
    const allSeen = bank.map((i) => i.id);
    const picked = pickTestItems(bank, Math.random, MEASUREMENT_TOTAL, allSeen);
    expect(picked.length).toBe(MEASUREMENT_TOTAL);
    expect(new Set(picked.map((i) => i.id)).size).toBe(MEASUREMENT_TOTAL);
  });

  it("partial exhaustion still fills a full-length test", () => {
    const bank = holdoutForSkill("add_sub_100");
    // 25 מתוך 30 נראו — 5 טריים בלבד, אבל המבחן חייב להישאר באורך 10.
    const seen = bank.slice(0, 25).map((i) => i.id);
    const picked = pickTestItems(bank, Math.random, MEASUREMENT_TOTAL, seen);
    expect(picked.length).toBe(MEASUREMENT_TOTAL);
    expect(new Set(picked.map((i) => i.id)).size).toBe(MEASUREMENT_TOTAL);
    const freshCount = picked.filter((i) => !seen.includes(i.id)).length;
    expect(freshCount).toBe(5);
  });

  it("empty seenIds behaves exactly like the old signature", () => {
    const bank = holdoutForSkill("add_sub_100");
    const fixed = () => 0.5;
    const a = pickTestItems(bank, fixed, MEASUREMENT_TOTAL);
    const b = pickTestItems(bank, fixed, MEASUREMENT_TOTAL, []);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });
});

describe("measurement — seen memory is per profile × skill", () => {
  it("remembering for one profile does not affect another", () => {
    const bank = holdoutForSkill("add_sub_100");
    const first = pickTestItemsForProfile("p1", "add_sub_100");
    rememberTestItems("p1", "add_sub_100", first);

    const second = pickTestItemsForProfile("p1", "add_sub_100");
    for (const item of second) {
      expect(first.map((i) => i.id)).not.toContain(item.id);
    }
    // p2 לא ראתה כלום — המאגר המלא פתוח בפניה.
    const other = pickTestItemsForProfile("p2", "add_sub_100");
    expect(other.length).toBe(MEASUREMENT_TOTAL);
    expect(bank.length).toBe(30);
  });

  it("a different skill keeps its own memory", () => {
    const picked = pickTestItemsForProfile("p1", "add_sub_100");
    rememberTestItems("p1", "add_sub_100", picked);
    const fractions = pickTestItemsForProfile("p1", "fractions_intro");
    expect(fractions.length).toBe(MEASUREMENT_TOTAL);
  });

  it("memory resets once the bank is fully consumed", () => {
    for (let r = 0; r < 3; r++) {
      const picked = pickTestItemsForProfile("p1", "add_sub_100");
      rememberTestItems("p1", "add_sub_100", picked);
    }
    // הסבב נסגר: הזיכרון מכיל רק את המבחן האחרון, כך שהמבחן הבא
    // נמנע ממנו אך שאר המאגר נפתח מחדש.
    const fourth = pickTestItemsForProfile("p1", "add_sub_100");
    expect(fourth.length).toBe(MEASUREMENT_TOTAL);
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
