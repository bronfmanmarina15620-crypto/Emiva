import { describe, expect, it } from "vitest";
import {
  emptyMastery,
  incrementSession,
  masteryScore,
  recordAttempt,
} from "@/lib/mastery";

describe("mastery", () => {
  it("empty mastery scores 0", () => {
    expect(masteryScore(emptyMastery("add_sub_100"))).toBe(0);
  });

  it("score rises with correct answers", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 10; i++) s = recordAttempt(s, `i${i}`, true);
    expect(masteryScore(s)).toBe(1);
  });

  it("score drops with wrong answers", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 10; i++) s = recordAttempt(s, `i${i}`, false);
    expect(masteryScore(s)).toBe(0);
  });

  it("uses only last 10 attempts (window)", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 10; i++) s = recordAttempt(s, `old${i}`, false);
    for (let i = 0; i < 10; i++) s = recordAttempt(s, `new${i}`, true);
    expect(masteryScore(s)).toBe(1);
  });

  it("mixed attempts yield partial score", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 8; i++) s = recordAttempt(s, `c${i}`, true);
    for (let i = 0; i < 2; i++) s = recordAttempt(s, `w${i}`, false);
    expect(masteryScore(s)).toBe(0.8);
  });

  it("incrementSession bumps counter", () => {
    const s = emptyMastery("add_sub_100");
    expect(incrementSession(s).sessionCount).toBe(1);
    expect(incrementSession(incrementSession(s)).sessionCount).toBe(2);
  });
});
