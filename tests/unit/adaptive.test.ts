import { describe, expect, it } from "vitest";
import { selectNextItem, targetDifficulty } from "@/lib/adaptive";
import { emptyMastery, recordAttempt } from "@/lib/mastery";
import type { Item } from "@/lib/types";

const bank: readonly Item[] = [
  { id: "d1", skill: "add_sub_100", difficulty: 1, prompt: "1+1", answer: 2, operands: [1, 1], op: "+" },
  { id: "d2", skill: "add_sub_100", difficulty: 2, prompt: "7+5", answer: 12, operands: [7, 5], op: "+" },
  { id: "d3", skill: "add_sub_100", difficulty: 3, prompt: "42+5", answer: 47, operands: [42, 5], op: "+" },
  { id: "d4", skill: "add_sub_100", difficulty: 4, prompt: "37+8", answer: 45, operands: [37, 8], op: "+" },
  { id: "d5", skill: "add_sub_100", difficulty: 5, prompt: "37+28", answer: 65, operands: [37, 28], op: "+" },
];

const DETERMINISTIC = () => 0;

describe("adaptive", () => {
  it("empty mastery targets difficulty 1", () => {
    expect(targetDifficulty(emptyMastery("add_sub_100"))).toBe(1);
  });

  it("perfect mastery targets difficulty 5", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 10; i++) s = recordAttempt(s, `i${i}`, true);
    expect(targetDifficulty(s)).toBe(5);
  });

  it("low mastery picks easy item", () => {
    const s = emptyMastery("add_sub_100");
    const next = selectNextItem(s, bank, new Set(), DETERMINISTIC);
    expect(next?.difficulty).toBe(1);
  });

  it("high mastery picks hard item", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 10; i++) s = recordAttempt(s, `i${i}`, true);
    const next = selectNextItem(s, bank, new Set(), DETERMINISTIC);
    expect(next?.difficulty).toBe(5);
  });

  it("skips items already used in session", () => {
    const s = emptyMastery("add_sub_100");
    const used = new Set(["d1"]);
    const next = selectNextItem(s, bank, used, DETERMINISTIC);
    expect(next?.id).not.toBe("d1");
  });

  it("returns null when pool exhausted", () => {
    const s = emptyMastery("add_sub_100");
    const used = new Set(bank.map((i) => i.id));
    expect(selectNextItem(s, bank, used, DETERMINISTIC)).toBeNull();
  });

  it("50% mastery targets difficulty 3 (middle)", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 5; i++) s = recordAttempt(s, `c${i}`, true);
    for (let i = 0; i < 5; i++) s = recordAttempt(s, `w${i}`, false);
    expect(targetDifficulty(s)).toBe(3);
    const next = selectNextItem(s, bank, new Set(), DETERMINISTIC);
    expect(next?.difficulty).toBe(3);
  });
});
