import { beforeEach, describe, expect, it } from "vitest";
import type { Attempt, MasteryState, Skill } from "@/lib/types";
import {
  WHEEL_SPIN_MIN_ATTEMPTS,
  WHEEL_SPIN_MIN_SESSIONS,
} from "@/lib/types";
import { saveMastery, markGraduated } from "@/lib/storage";
import type { Profile } from "@/lib/profiles";
import { logEvent } from "@/lib/telemetry";
import {
  computeActionLine,
  computeBeliefComparison,
  computeParentReminderNeeded,
  computePossibleCause,
  computeSessionFeelings,
  computeSkillTiles,
  computeTrend,
  computeVerdict,
  computeWeeklyDigest,
  computeWeeklyMinutes,
  computeWheelSpin,
} from "@/lib/parent-dashboard";
import { saveBelief } from "@/lib/parent-belief";

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

function profile7(): Profile {
  return {
    id: "p-evelyn",
    name: "Evelyn",
    age: 7,
    allowedSkills: ["add_sub_100", "multiplication"],
    createdAt: 0,
  };
}

function profile9(): Profile {
  return {
    id: "p-emilia",
    name: "Emilia",
    age: 9,
    allowedSkills: ["fractions_intro", "ops_1000", "long_division", "bar_models"],
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

function correctAttempts(skill: Skill, n: number, baseAt: number): Attempt[] {
  return Array.from({ length: n }, (_, i) => ({
    itemId: `${skill}-${i}`,
    correct: true,
    at: baseAt + i * 1000,
  }));
}

function wrongAttempts(skill: Skill, n: number, baseAt: number): Attempt[] {
  return Array.from({ length: n }, (_, i) => ({
    itemId: `${skill}-${i}`,
    correct: false,
    at: baseAt + i * 1000,
  }));
}

describe("computeVerdict", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();

  it("fresh profile with no activity → watch", () => {
    const v = computeVerdict(profile7(), NOW);
    expect(v).toBe("watch");
  });

  it("active yesterday, good performance → on_track", () => {
    const p = profile7();
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 5, NOW - 86_400_000), [NOW - 86_400_000]));
    expect(computeVerdict(p, NOW)).toBe("on_track");
  });

  it("no session 5 days → watch", () => {
    const p = profile7();
    const fiveDays = NOW - 5 * 86_400_000;
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 5, fiveDays), [fiveDays]));
    expect(computeVerdict(p, NOW)).toBe("watch");
  });

  it("no session 8 days → talk", () => {
    const p = profile7();
    const eightDays = NOW - 8 * 86_400_000;
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 5, eightDays), [eightDays]));
    expect(computeVerdict(p, NOW)).toBe("talk");
  });

  it("wheel-spinning skill → talk dominates inactivity-watch", () => {
    const p = profile7();
    const base = NOW - 2 * 86_400_000;
    const attempts: Attempt[] = [
      ...wrongAttempts("add_sub_100", 18, base),
      ...correctAttempts("add_sub_100", 2, base + 18_000),
    ];
    saveMastery(p.id, mk("add_sub_100", attempts, [base, base + 1_000, base + 2_000]));
    expect(computeVerdict(p, NOW)).toBe("talk");
  });
});

describe("computeWheelSpin", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();

  it("< 20 attempts → no flag", () => {
    const p = profile7();
    saveMastery(p.id, mk("add_sub_100", wrongAttempts("add_sub_100", 19, NOW - 1000), [NOW - 1000, NOW - 500, NOW - 100]));
    expect(computeWheelSpin(p, NOW)).toHaveLength(0);
  });

  it("20+ attempts but < 3 sessions → no flag", () => {
    const p = profile7();
    saveMastery(p.id, mk("add_sub_100", wrongAttempts("add_sub_100", 20, NOW - 1000), [NOW - 2000, NOW - 1000]));
    expect(computeWheelSpin(p, NOW)).toHaveLength(0);
  });

  it("20 attempts, 3 sessions, ≤ 40% correct → flag", () => {
    const p = profile7();
    const attempts: Attempt[] = [
      ...wrongAttempts("add_sub_100", 14, NOW - 1000),
      ...correctAttempts("add_sub_100", 6, NOW - 500),
    ];
    saveMastery(p.id, mk("add_sub_100", attempts, [NOW - 3000, NOW - 2000, NOW - 1000]));
    const flags = computeWheelSpin(p, NOW);
    expect(flags).toHaveLength(1);
    expect(flags[0]!.skill).toBe("add_sub_100");
  });

  it("above threshold → no flag", () => {
    const p = profile7();
    const attempts: Attempt[] = [
      ...wrongAttempts("add_sub_100", 8, NOW - 1000),
      ...correctAttempts("add_sub_100", 12, NOW - 500),
    ];
    saveMastery(p.id, mk("add_sub_100", attempts, [NOW - 3000, NOW - 2000, NOW - 1000]));
    expect(computeWheelSpin(p, NOW)).toHaveLength(0);
  });

  it("uses constants exported from types", () => {
    expect(WHEEL_SPIN_MIN_ATTEMPTS).toBe(20);
    expect(WHEEL_SPIN_MIN_SESSIONS).toBe(3);
  });
});

describe("computeActionLine", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();

  it("wheel-spin triggers wheel_spin action", () => {
    const p = profile7();
    const attempts: Attempt[] = [
      ...wrongAttempts("add_sub_100", 14, NOW - 1000),
      ...correctAttempts("add_sub_100", 6, NOW - 500),
    ];
    saveMastery(p.id, mk("add_sub_100", attempts, [NOW - 3000, NOW - 2000, NOW - 1000]));
    const a = computeActionLine(p, NOW);
    expect(a.trigger).toBe("wheel_spin");
    expect(a.skill).toBe("add_sub_100");
    expect(a.text).toContain("Evelyn");
    expect(a.text).toContain("חיבור וחיסור עד 100");
  });

  it("no recent activity → inactivity action", () => {
    const p = profile7();
    const fiveDays = NOW - 5 * 86_400_000;
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 3, fiveDays), [fiveDays]));
    const a = computeActionLine(p, NOW);
    expect(a.trigger).toBe("inactivity");
    expect(a.text).toContain("Evelyn");
  });

  it("fresh profile → inactivity action", () => {
    const p = profile7();
    const a = computeActionLine(p, NOW);
    expect(a.trigger).toBe("inactivity");
  });

  it("active recent, no SRS due → default action", () => {
    const p = profile7();
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 3, NOW - 86_400_000), [NOW - 86_400_000]));
    const a = computeActionLine(p, NOW);
    expect(a.trigger).toBe("default");
  });

  it("all action texts are autonomy-invitational (banned-phrase audit)", () => {
    const banned = [
      "לא נכון",
      "טעית",
      "שגוי",
      "פספסת",
      "אחרי התלבטות",
      "סוף סוף",
      "עבדי איתה",
      "תגרמי",
      "דרשי",
    ];
    const p = profile7();
    const a1 = computeActionLine(p, NOW);
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 3, NOW - 86_400_000), [NOW - 86_400_000]));
    const a2 = computeActionLine(p, NOW);
    const attempts: Attempt[] = [
      ...wrongAttempts("add_sub_100", 14, NOW - 1000),
      ...correctAttempts("add_sub_100", 6, NOW - 500),
    ];
    saveMastery(p.id, mk("add_sub_100", attempts, [NOW - 3000, NOW - 2000, NOW - 1000]));
    const a3 = computeActionLine(p, NOW);

    for (const a of [a1, a2, a3]) {
      for (const phrase of banned) {
        expect(a.text).not.toContain(phrase);
      }
      // Must start the recommendation clause with an invitation verb.
      const hasInvitation =
        a.text.includes("את יכולה") || a.text.includes("כדאי להציע");
      expect(hasInvitation).toBe(true);
    }
  });
});

describe("computePossibleCause", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();

  it("returns null when verdict is on_track", () => {
    const p = profile9();
    saveMastery(p.id, mk("fractions_intro", correctAttempts("fractions_intro", 3, NOW - 86_400_000), [NOW - 86_400_000]));
    expect(computePossibleCause(p, "on_track", NOW)).toBeNull();
  });

  it("fractions_intro → points at add/sub as upstream", () => {
    const p = profile9();
    saveMastery(p.id, mk("fractions_intro", wrongAttempts("fractions_intro", 3, NOW - 86_400_000), [NOW - 86_400_000]));
    const cause = computePossibleCause(p, "watch", NOW);
    expect(cause).not.toBeNull();
    expect(cause).toContain("חיבור/חיסור עד 100");
  });

  it("no current skill → null", () => {
    const p = profile7();
    expect(computePossibleCause(p, "watch", NOW)).toBeNull();
  });
});

describe("computeSkillTiles", () => {
  it("Evelyn: 2 tiles; Emilia: 4 tiles", () => {
    const e = computeSkillTiles(profile7());
    const m = computeSkillTiles(profile9());
    expect(e).toHaveLength(2);
    expect(m).toHaveLength(4);
  });

  it("no attempts → not_started", () => {
    const p = profile7();
    const tiles = computeSkillTiles(p);
    expect(tiles[0]!.state).toBe("not_started");
  });

  it("attempts but no graduation → in_progress", () => {
    const p = profile7();
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 3, 1000), [1000]));
    const tiles = computeSkillTiles(p);
    const addSub = tiles.find((t) => t.skill === "add_sub_100")!;
    expect(addSub.state).toBe("in_progress");
  });

  it("graduated flag → mastered", () => {
    const p = profile7();
    saveMastery(p.id, mk("add_sub_100", correctAttempts("add_sub_100", 20, 1000), [1000, 2000]));
    markGraduated(p.id, "add_sub_100");
    const tiles = computeSkillTiles(p);
    const addSub = tiles.find((t) => t.skill === "add_sub_100")!;
    expect(addSub.state).toBe("mastered");
  });
});

describe("computeWeeklyDigest", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime(); // Wednesday

  function weekStartSunday(now: number): number {
    const d = new Date(now);
    const day = d.getDay();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  }

  it("counts only attempts in current week", () => {
    const p = profile7();
    const weekStart = weekStartSunday(NOW);
    const thisWeek = correctAttempts("add_sub_100", 5, weekStart + 1000);
    const lastWeek = correctAttempts(
      "add_sub_100",
      3,
      weekStart - 3 * 86_400_000,
    );
    saveMastery(p.id, mk("add_sub_100", [...lastWeek, ...thisWeek], [weekStart + 1000]));
    const d = computeWeeklyDigest(p, NOW);
    expect(d.totalAttempts).toBe(5);
  });

  it("newlyMastered reflects graduation events in current week", () => {
    const p = profile9();
    const weekStart = weekStartSunday(NOW);
    logEvent(p.id, {
      t: "skill_graduated",
      at: weekStart + 3600_000,
      skill: "fractions_intro",
      firstAttemptCorrect: 20,
      sessionCount: 2,
      gapMs: 24 * 3600_000,
    });
    logEvent(p.id, {
      t: "skill_graduated",
      at: weekStart - 2 * 86_400_000,
      skill: "ops_1000",
      firstAttemptCorrect: 20,
      sessionCount: 2,
      gapMs: 24 * 3600_000,
    });
    const d = computeWeeklyDigest(p, NOW);
    expect(d.newlyMastered).toBe(1);
  });

  it("topAction matches current action-line text", () => {
    const p = profile7();
    const d = computeWeeklyDigest(p, NOW);
    const a = computeActionLine(p, NOW);
    expect(d.topAction).toBe(a.text);
  });

  it("includes weeklyMinutes + feelings shape", () => {
    const p = profile7();
    const d = computeWeeklyDigest(p, NOW);
    expect(typeof d.weeklyMinutes).toBe("number");
    expect(d.feelings).toEqual({ happy: 0, ok: 0, hard: 0 });
  });
});

describe("computeWeeklyMinutes", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();

  function weekStartSunday(now: number): number {
    const d = new Date(now);
    const day = d.getDay();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  }

  it("sums paired session_start + session_end within the week", () => {
    const p = profile7();
    const start = weekStartSunday(NOW) + 3600_000;
    logEvent(p.id, { t: "session_start", at: start, skill: "add_sub_100" });
    logEvent(p.id, {
      t: "session_end",
      at: start + 12 * 60_000,
      skill: "add_sub_100",
      answered: 10,
      correctFirstTry: 8,
    });
    expect(computeWeeklyMinutes(p, NOW)).toBe(12);
  });

  it("caps run-away sessions at MAX_SESSION_MS", () => {
    const p = profile7();
    const start = weekStartSunday(NOW) + 3600_000;
    logEvent(p.id, { t: "session_start", at: start, skill: "add_sub_100" });
    logEvent(p.id, {
      t: "session_end",
      at: start + 2 * 3600_000,
      skill: "add_sub_100",
      answered: 10,
      correctFirstTry: 8,
    });
    expect(computeWeeklyMinutes(p, NOW)).toBe(30);
  });

  it("ignores sessions from prior weeks", () => {
    const p = profile7();
    const lastWeek = weekStartSunday(NOW) - 3 * 86_400_000;
    logEvent(p.id, { t: "session_start", at: lastWeek, skill: "add_sub_100" });
    logEvent(p.id, {
      t: "session_end",
      at: lastWeek + 10 * 60_000,
      skill: "add_sub_100",
      answered: 10,
      correctFirstTry: 8,
    });
    expect(computeWeeklyMinutes(p, NOW)).toBe(0);
  });
});

describe("computeSessionFeelings", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();

  function weekStartSunday(now: number): number {
    const d = new Date(now);
    const day = d.getDay();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  }

  it("aggregates ratings in current week", () => {
    const p = profile7();
    const start = weekStartSunday(NOW) + 3600_000;
    logEvent(p.id, { t: "session_feeling", at: start, skill: "add_sub_100", rating: "happy" });
    logEvent(p.id, { t: "session_feeling", at: start + 1000, skill: "add_sub_100", rating: "happy" });
    logEvent(p.id, { t: "session_feeling", at: start + 2000, skill: "add_sub_100", rating: "hard" });
    const f = computeSessionFeelings(p, NOW);
    expect(f).toEqual({ happy: 2, ok: 0, hard: 1 });
  });

  it("ignores ratings from prior weeks", () => {
    const p = profile7();
    const lastWeek = weekStartSunday(NOW) - 3 * 86_400_000;
    logEvent(p.id, { t: "session_feeling", at: lastWeek, skill: "add_sub_100", rating: "happy" });
    const f = computeSessionFeelings(p, NOW);
    expect(f).toEqual({ happy: 0, ok: 0, hard: 0 });
  });
});

describe("computeTrend", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();
  const DAY = 86_400_000;

  it("insufficient when fewer than 10 attempts each window", () => {
    const p = profile7();
    const attempts: Attempt[] = [
      ...correctAttempts("add_sub_100", 3, NOW - DAY),
      ...correctAttempts("add_sub_100", 3, NOW - 8 * DAY),
    ];
    saveMastery(p.id, mk("add_sub_100", attempts, [NOW - DAY]));
    expect(computeTrend(p, NOW)).toBe("insufficient");
  });

  it("up when current week ≥ 5pp better than prior", () => {
    const p = profile7();
    const thisWeek: Attempt[] = [
      ...correctAttempts("add_sub_100", 10, NOW - DAY),
    ];
    const priorWeek: Attempt[] = [
      ...correctAttempts("add_sub_100", 5, NOW - 10 * DAY),
      ...wrongAttempts("add_sub_100", 5, NOW - 10 * DAY + 1000),
    ];
    saveMastery(p.id, mk("add_sub_100", [...priorWeek, ...thisWeek], [NOW - DAY]));
    expect(computeTrend(p, NOW)).toBe("up");
  });

  it("down when current week ≥ 5pp worse than prior", () => {
    const p = profile7();
    const thisWeek: Attempt[] = [
      ...wrongAttempts("add_sub_100", 10, NOW - DAY),
    ];
    const priorWeek: Attempt[] = [
      ...correctAttempts("add_sub_100", 10, NOW - 10 * DAY),
    ];
    saveMastery(p.id, mk("add_sub_100", [...priorWeek, ...thisWeek], [NOW - DAY]));
    expect(computeTrend(p, NOW)).toBe("down");
  });
});

describe("computeParentReminderNeeded", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();
  const DAY = 86_400_000;

  it("no opens recorded → no reminder (new user)", () => {
    expect(computeParentReminderNeeded(NOW)).toBe(false);
  });

  it("last open 10 days ago → no reminder", () => {
    logEvent("_parent", { t: "dashboard_opened", at: NOW - 10 * DAY });
    expect(computeParentReminderNeeded(NOW)).toBe(false);
  });

  it("last open 20 days ago → reminder needed", () => {
    logEvent("_parent", { t: "dashboard_opened", at: NOW - 20 * DAY });
    expect(computeParentReminderNeeded(NOW)).toBe(true);
  });
});

describe("computeBeliefComparison — new fields", () => {
  const NOW = new Date("2026-04-22T10:00:00Z").getTime();

  it("marks lowSample when < 10 attempts since note", () => {
    const p = profile7();
    saveBelief(p.id, "נראית חזקה בחיבור", "performance", NOW - 86_400_000);
    saveMastery(
      p.id,
      mk("add_sub_100", correctAttempts("add_sub_100", 5, NOW - 3600_000), [NOW - 3600_000]),
    );
    const c = computeBeliefComparison(p, NOW);
    expect(c?.lowSample).toBe(true);
  });

  it("marks weakData when ≥ 10 attempts and < 50% first-try", () => {
    const p = profile7();
    saveBelief(p.id, "חזקה", "performance", NOW - 86_400_000);
    const attempts: Attempt[] = [
      ...wrongAttempts("add_sub_100", 8, NOW - 3600_000),
      ...correctAttempts("add_sub_100", 4, NOW - 1800_000),
    ];
    saveMastery(p.id, mk("add_sub_100", attempts, [NOW - 3600_000]));
    const c = computeBeliefComparison(p, NOW);
    expect(c?.weakData).toBe(true);
    expect(c?.lowSample).toBe(false);
  });

  it("exposes the kind field", () => {
    const p = profile7();
    saveBelief(p.id, "נראית עצובה", "feeling", NOW - 86_400_000);
    const c = computeBeliefComparison(p, NOW);
    expect(c?.kind).toBe("feeling");
  });
});
