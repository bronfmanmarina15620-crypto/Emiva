import { describe, expect, it } from "vitest";
import {
  emptyMastery,
  incrementSession,
  recordAttempt,
  skillGraduated,
} from "@/lib/mastery";
import {
  GRADUATION_MIN_CORRECT,
  GRADUATION_MIN_GAP_MS,
} from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

function buildState(opts: {
  correct: number;
  incorrect?: number;
  sessionTimes: number[];
}) {
  let s = emptyMastery("add_sub_100");
  for (const t of opts.sessionTimes) s = incrementSession(s, t);
  for (let i = 0; i < opts.correct; i++) {
    s = recordAttempt(s, `c${i}`, true, T0 + i);
  }
  for (let i = 0; i < (opts.incorrect ?? 0); i++) {
    s = recordAttempt(s, `w${i}`, false, T0 + 1000 + i);
  }
  return s;
}

describe("skillGraduated", () => {
  it("not graduated on empty state", () => {
    const s = emptyMastery("add_sub_100");
    const r = skillGraduated(s, T0);
    expect(r.graduated).toBe(false);
    if (!r.graduated) expect(r.reason).toBe("need_more_correct");
  });

  it("not graduated below GRADUATION_MIN_CORRECT first-attempt correct", () => {
    const s = buildState({
      correct: GRADUATION_MIN_CORRECT - 1,
      sessionTimes: [T0, T0 + DAY + 1],
    });
    const r = skillGraduated(s, T0 + DAY + 2);
    expect(r.graduated).toBe(false);
    if (!r.graduated) expect(r.reason).toBe("need_more_correct");
  });

  it("not graduated with only 1 session, even with enough corrects", () => {
    const s = buildState({
      correct: GRADUATION_MIN_CORRECT + 5,
      sessionTimes: [T0],
    });
    const r = skillGraduated(s, T0 + DAY + 1);
    expect(r.graduated).toBe(false);
    if (!r.graduated) expect(r.reason).toBe("need_more_sessions");
  });

  it("not graduated when 2 sessions but gap < 24h", () => {
    const s = buildState({
      correct: GRADUATION_MIN_CORRECT,
      sessionTimes: [T0, T0 + GRADUATION_MIN_GAP_MS / 2],
    });
    const r = skillGraduated(s, T0 + GRADUATION_MIN_GAP_MS / 2 + 1000);
    expect(r.graduated).toBe(false);
    if (!r.graduated) expect(r.reason).toBe("need_more_time");
  });

  it("graduated when all three conditions hold", () => {
    const s = buildState({
      correct: GRADUATION_MIN_CORRECT,
      sessionTimes: [T0, T0 + DAY + 1],
    });
    const r = skillGraduated(s, T0 + DAY + 2);
    expect(r.graduated).toBe(true);
    if (r.graduated) {
      expect(r.firstAttemptCorrect).toBe(GRADUATION_MIN_CORRECT);
      expect(r.sessionCount).toBe(2);
      expect(r.gapMs).toBeGreaterThanOrEqual(GRADUATION_MIN_GAP_MS);
    }
  });

  it("non-first-attempt correct does NOT count — only attempts[].correct=true", () => {
    const s = buildState({
      correct: GRADUATION_MIN_CORRECT - 1,
      incorrect: 50,
      sessionTimes: [T0, T0 + DAY + 1],
    });
    const r = skillGraduated(s, T0 + DAY + 2);
    expect(r.graduated).toBe(false);
    if (!r.graduated) {
      expect(r.reason).toBe("need_more_correct");
      expect(r.firstAttemptCorrect).toBe(GRADUATION_MIN_CORRECT - 1);
    }
  });

  it("graduation is monotonic — once graduated, remains graduated as more corrects are added", () => {
    let s = buildState({
      correct: GRADUATION_MIN_CORRECT,
      sessionTimes: [T0, T0 + DAY + 1],
    });
    const r1 = skillGraduated(s, T0 + DAY + 2);
    expect(r1.graduated).toBe(true);

    s = recordAttempt(s, "more", true, T0 + DAY + 10);
    const r2 = skillGraduated(s, T0 + DAY + 11);
    expect(r2.graduated).toBe(true);
  });
});
