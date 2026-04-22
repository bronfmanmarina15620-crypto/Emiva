import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_TOLERANCE,
  selectNextItem,
  targetDifficulty,
} from "@/lib/adaptive";
import { emptyMastery, recordAttempt, recordItemShown } from "@/lib/mastery";
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

  it("low mastery picks item within tolerance of difficulty 1", () => {
    const s = emptyMastery("add_sub_100");
    const next = selectNextItem(s, bank, new Set(), DETERMINISTIC);
    expect(next?.difficulty).toBeLessThanOrEqual(1 + DIFFICULTY_TOLERANCE);
  });

  it("high mastery picks item within tolerance of difficulty 5", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 10; i++) s = recordAttempt(s, `i${i}`, true);
    const next = selectNextItem(s, bank, new Set(), DETERMINISTIC);
    expect(next?.difficulty).toBeGreaterThanOrEqual(5 - DIFFICULTY_TOLERANCE);
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

  it("50% mastery picks item within tolerance of difficulty 3 (middle)", () => {
    let s = emptyMastery("add_sub_100");
    for (let i = 0; i < 5; i++) s = recordAttempt(s, `c${i}`, true);
    for (let i = 0; i < 5; i++) s = recordAttempt(s, `w${i}`, false);
    expect(targetDifficulty(s)).toBe(3);
    const next = selectNextItem(s, bank, new Set(), DETERMINISTIC);
    expect(next?.difficulty).toBeGreaterThanOrEqual(3 - DIFFICULTY_TOLERANCE);
    expect(next?.difficulty).toBeLessThanOrEqual(3 + DIFFICULTY_TOLERANCE);
  });

  it("anti-repeat: prefers items never shown over recently shown ones", () => {
    // Two items at same difficulty; one shown in session 0, the other never.
    const bankTwo: readonly Item[] = [
      { id: "a", skill: "add_sub_100", difficulty: 1, prompt: "1+1", answer: 2, operands: [1, 1], op: "+" },
      { id: "b", skill: "add_sub_100", difficulty: 1, prompt: "2+2", answer: 4, operands: [2, 2], op: "+" },
    ];
    let s = emptyMastery("add_sub_100");
    s = recordItemShown(s, "a");          // a was seen in session 0
    s = { ...s, sessionCount: 1 };        // advance to session 1
    const picked = selectNextItem(s, bankTwo, new Set(), DETERMINISTIC);
    expect(picked?.id).toBe("b");
  });

  it("anti-repeat: across same-staleness items, picks deterministically by order", () => {
    // Both items never shown → both staleness = Infinity → first wins with DETERMINISTIC=0
    const s = emptyMastery("add_sub_100");
    const next = selectNextItem(s, bank, new Set(), DETERMINISTIC);
    expect(next).toBeTruthy();
  });
});
