import { beforeEach, describe, expect, it } from "vitest";
import type { Attempt, MasteryState, Skill } from "@/lib/types";
import { saveMastery } from "@/lib/storage";
import type { Profile } from "@/lib/profiles";
import { logEvent } from "@/lib/telemetry";
import {
  computeDailyActivity,
  computeFocusAreas,
  computeHistoryWindow,
  computePerSkillStats,
  previousRangeFor,
  rangeFor,
} from "@/lib/parent-history";

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

const DAY = 86_400_000;

function profileEvelyn(): Profile {
  return {
    id: "p-evelyn",
    name: "אוולין",
    age: 7,
    allowedSkills: ["add_sub_100", "multiplication"],
    createdAt: 0,
  };
}

function profileEmilia(): Profile {
  return {
    id: "p-emilia",
    name: "אמיליה",
    age: 9,
    allowedSkills: ["fractions_intro", "ops_1000"],
    createdAt: 0,
  };
}

function mk(
  skill: Skill,
  attempts: Attempt[],
  sessionTimestamps: number[],
): MasteryState {
  return {
    skill,
    attempts,
    srs: {},
    sessionCount: sessionTimestamps.length,
    sessionTimestamps,
    itemLastSeen: {},
  };
}

function correct(skill: Skill, n: number, baseAt: number, gap = 1000): Attempt[] {
  return Array.from({ length: n }, (_, i) => ({
    itemId: `${skill}-c-${baseAt}-${i}`,
    correct: true,
    at: baseAt + i * gap,
  }));
}

function wrong(skill: Skill, n: number, baseAt: number, gap = 1000): Attempt[] {
  return Array.from({ length: n }, (_, i) => ({
    itemId: `${skill}-w-${baseAt}-${i}`,
    correct: false,
    at: baseAt + i * gap,
  }));
}

const NOW = new Date("2026-05-24T12:00:00Z").getTime();

describe("rangeFor / previousRangeFor", () => {
  it("today: from local midnight to now; previous: yesterday full day", () => {
    const r = rangeFor("today", NOW);
    const p = previousRangeFor("today", NOW);
    expect(r.to).toBe(NOW);
    expect(r.from).toBeLessThan(NOW);
    expect(p.to).toBe(r.from);
    expect(p.from).toBe(r.from - DAY);
  });

  it("week_current is rolling 7d ending now", () => {
    const r = rangeFor("week_current", NOW);
    expect(r.to).toBe(NOW);
    expect(r.from).toBe(NOW - 7 * DAY);
  });

  it("week_prev is the 7 days before week_current", () => {
    const r = rangeFor("week_prev", NOW);
    expect(r.from).toBe(NOW - 14 * DAY);
    expect(r.to).toBe(NOW - 7 * DAY);
  });

  it("month_30 is the 30 days ending now", () => {
    const r = rangeFor("month_30", NOW);
    expect(r.from).toBe(NOW - 30 * DAY);
    expect(r.to).toBe(NOW);
  });
});

describe("computeHistoryWindow", () => {
  it("empty profile → 0 across the board, no previous", () => {
    const w = computeHistoryWindow(profileEvelyn(), "week_current", NOW);
    expect(w.current.attempts).toBe(0);
    expect(w.current.firstTryPct).toBeNull();
    expect(w.hasPrevious).toBe(false);
  });

  it("attempts inside week_current are counted; outside are not", () => {
    const p = profileEvelyn();
    const inside = NOW - 2 * DAY;
    const outside = NOW - 10 * DAY;
    saveMastery(
      p.id,
      mk(
        "add_sub_100",
        [...correct("add_sub_100", 8, inside), ...wrong("add_sub_100", 2, inside + 9_000)],
        [inside],
      ),
    );
    saveMastery(
      p.id,
      mk("multiplication", correct("multiplication", 5, outside), [outside]),
    );
    const w = computeHistoryWindow(p, "week_current", NOW);
    expect(w.current.attempts).toBe(10);
    expect(w.current.firstTryPct).toBe(80);
    expect(w.current.sessions).toBe(1);
  });

  it("session minutes counted from session_start/session_end pairs", () => {
    const p = profileEvelyn();
    const start = NOW - DAY;
    const end = start + 10 * 60_000;
    logEvent(p.id, { t: "session_start", at: start, skill: "add_sub_100" });
    logEvent(p.id, {
      t: "session_end",
      at: end,
      skill: "add_sub_100",
      answered: 5,
      correctFirstTry: 4,
    });
    const w = computeHistoryWindow(p, "week_current", NOW);
    expect(w.current.minutes).toBe(10);
  });

  it("session_feeling events counted in window", () => {
    const p = profileEvelyn();
    logEvent(p.id, {
      t: "session_feeling",
      at: NOW - DAY,
      skill: "add_sub_100",
      rating: "happy",
    });
    logEvent(p.id, {
      t: "session_feeling",
      at: NOW - 10 * DAY,
      skill: "add_sub_100",
      rating: "hard",
    });
    const w = computeHistoryWindow(p, "week_current", NOW);
    expect(w.current.feelings).toEqual({ happy: 1, ok: 0, hard: 0 });
  });

  it("previous window is 8-14 days ago for week_current", () => {
    const p = profileEvelyn();
    saveMastery(
      p.id,
      mk(
        "add_sub_100",
        [
          ...correct("add_sub_100", 4, NOW - 10 * DAY),
          ...correct("add_sub_100", 6, NOW - 3 * DAY),
        ],
        [NOW - 10 * DAY, NOW - 3 * DAY],
      ),
    );
    const w = computeHistoryWindow(p, "week_current", NOW);
    expect(w.current.attempts).toBe(6);
    expect(w.previous.attempts).toBe(4);
    expect(w.hasPrevious).toBe(true);
  });
});

describe("computePerSkillStats", () => {
  it("orders by activity (most attempts first) and shows delta", () => {
    const p = profileEvelyn();
    const cur = NOW - 2 * DAY;
    const prev = NOW - 10 * DAY;
    saveMastery(
      p.id,
      mk(
        "add_sub_100",
        [
          ...correct("add_sub_100", 16, cur), // 80% in cur (20 total)
          ...wrong("add_sub_100", 4, cur + 17_000),
          ...correct("add_sub_100", 14, prev), // 70% in prev (20 total)
          ...wrong("add_sub_100", 6, prev + 15_000),
        ],
        [cur, prev],
      ),
    );
    saveMastery(
      p.id,
      mk("multiplication", correct("multiplication", 5, cur), [cur]),
    );
    const rows = computePerSkillStats(p, "week_current", NOW);
    expect(rows[0]!.skill).toBe("add_sub_100");
    expect(rows[0]!.attempts).toBe(20);
    expect(rows[0]!.firstTryPct).toBe(80);
    expect(rows[0]!.firstTryPctDelta).toBe(10);
    expect(rows[1]!.skill).toBe("multiplication");
    expect(rows[1]!.firstTryPctDelta).toBeNull();
  });

  it("dominantFeeling reflects most common rating; null if none", () => {
    const p = profileEvelyn();
    const at = NOW - DAY;
    for (let i = 0; i < 3; i++)
      logEvent(p.id, { t: "session_feeling", at, skill: "add_sub_100", rating: "hard" });
    logEvent(p.id, { t: "session_feeling", at, skill: "add_sub_100", rating: "happy" });
    const rows = computePerSkillStats(p, "week_current", NOW);
    const row = rows.find((r) => r.skill === "add_sub_100")!;
    expect(row.dominantFeeling).toBe("hard");
    const mult = rows.find((r) => r.skill === "multiplication")!;
    expect(mult.dominantFeeling).toBeNull();
  });
});

describe("computeFocusAreas", () => {
  it("empty → empty list", () => {
    expect(computeFocusAreas(profileEvelyn(), "month_30", NOW)).toEqual([]);
  });

  it("dropped takes priority over low_pct on same skill", () => {
    const p = profileEvelyn();
    const cur = NOW - 2 * DAY;
    const prev = NOW - 40 * DAY; // outside month_30 by design, so use week_current
    const prevForWeek = NOW - 10 * DAY;
    saveMastery(
      p.id,
      mk(
        "add_sub_100",
        [
          // prev window: 80% (10 attempts)
          ...correct("add_sub_100", 8, prevForWeek),
          ...wrong("add_sub_100", 2, prevForWeek + 9_000),
          // cur window: 40% (10 attempts) → 40 pt drop, also low_pct
          ...correct("add_sub_100", 4, cur),
          ...wrong("add_sub_100", 6, cur + 5_000),
        ],
        [prevForWeek, cur],
      ),
    );
    const items = computeFocusAreas(p, "week_current", NOW);
    expect(items).toHaveLength(1);
    expect(items[0]!.reason).toBe("dropped");
    expect(items[0]!.actionText).toContain("את יכולה להציע");
    void prev;
  });

  it("low_pct flagged when ≥ 10 attempts and < 60% and no drop", () => {
    const p = profileEvelyn();
    const cur = NOW - 2 * DAY;
    saveMastery(
      p.id,
      mk(
        "add_sub_100",
        [
          ...correct("add_sub_100", 5, cur),
          ...wrong("add_sub_100", 5, cur + 5_000),
        ],
        [cur],
      ),
    );
    const items = computeFocusAreas(p, "week_current", NOW);
    expect(items).toHaveLength(1);
    expect(items[0]!.reason).toBe("low_pct");
  });

  it("negative_feeling flagged when ≥ 3 hard sessions in window", () => {
    const p = profileEvelyn();
    for (let i = 0; i < 3; i++) {
      logEvent(p.id, {
        t: "session_feeling",
        at: NOW - (i + 1) * DAY,
        skill: "multiplication",
        rating: "hard",
      });
    }
    const items = computeFocusAreas(p, "week_current", NOW);
    expect(items).toHaveLength(1);
    expect(items[0]!.skill).toBe("multiplication");
    expect(items[0]!.reason).toBe("negative_feeling");
  });

  it("caps at 3 items", () => {
    const p = profileEmilia();
    const cur = NOW - 2 * DAY;
    // 2 skills with low_pct
    for (const s of p.allowedSkills) {
      saveMastery(
        p.id,
        mk(
          s,
          [
            ...correct(s, 4, cur),
            ...wrong(s, 6, cur + 5_000),
          ],
          [cur],
        ),
      );
    }
    // also negative feeling for one skill, but it's already taken
    logEvent(p.id, {
      t: "session_feeling",
      at: cur,
      skill: "fractions_intro",
      rating: "hard",
    });
    const items = computeFocusAreas(p, "week_current", NOW);
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it("every actionText is autonomy-inviting (banned-phrase guard)", () => {
    const p = profileEvelyn();
    const cur = NOW - 2 * DAY;
    saveMastery(
      p.id,
      mk(
        "add_sub_100",
        [
          ...correct("add_sub_100", 4, cur),
          ...wrong("add_sub_100", 6, cur + 5_000),
        ],
        [cur],
      ),
    );
    const items = computeFocusAreas(p, "week_current", NOW);
    expect(items).toHaveLength(1);
    const t = items[0]!.actionText;
    const banned = ["עבדי איתה", "תגרמי", "דרשי", "חייבת", "טעתה", "לא נכון", "שגוי", "פספסת"];
    for (const b of banned) expect(t).not.toContain(b);
    expect(
      t.startsWith("היום את יכולה להציע") ||
        t.startsWith("היום את יכולה להזמין") ||
        t.startsWith("היום כדאי להציע"),
    ).toBe(true);
  });
});

describe("computeDailyActivity", () => {
  it("week_current returns 7 day buckets in chronological order", () => {
    const days = computeDailyActivity(profileEvelyn(), "week_current", NOW);
    expect(days).toHaveLength(7);
    // last entry should be today's local date
    const todayStr = new Date(NOW);
    const expectedToday = `${todayStr.getFullYear()}-${String(todayStr.getMonth() + 1).padStart(2, "0")}-${String(todayStr.getDate()).padStart(2, "0")}`;
    expect(days[6]!.date).toBe(expectedToday);
  });

  it("month_30 returns 30 day buckets", () => {
    const days = computeDailyActivity(profileEvelyn(), "month_30", NOW);
    expect(days).toHaveLength(30);
  });

  it("today returns 1 bucket", () => {
    const days = computeDailyActivity(profileEvelyn(), "today", NOW);
    expect(days).toHaveLength(1);
  });

  it("session_start without session_end still marks the day as active", () => {
    const p = profileEvelyn();
    logEvent(p.id, { t: "session_start", at: NOW - DAY, skill: "add_sub_100" });
    const days = computeDailyActivity(p, "week_current", NOW);
    const active = days.filter((d) => d.hasSession);
    expect(active.length).toBe(1);
  });

  it("counts minutes from completed session", () => {
    const p = profileEvelyn();
    const start = NOW - DAY;
    const end = start + 12 * 60_000;
    logEvent(p.id, { t: "session_start", at: start, skill: "add_sub_100" });
    logEvent(p.id, {
      t: "session_end",
      at: end,
      skill: "add_sub_100",
      answered: 5,
      correctFirstTry: 4,
    });
    const days = computeDailyActivity(p, "week_current", NOW);
    const total = days.reduce((acc, d) => acc + d.minutes, 0);
    expect(total).toBe(12);
  });
});
