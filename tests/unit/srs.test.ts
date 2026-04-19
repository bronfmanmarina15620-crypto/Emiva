import { describe, expect, it } from "vitest";
import {
  applySrsUpdate,
  decaySrsForNewSession,
  initSrs,
  isDue,
  updateSrs,
} from "@/lib/srs";
import { emptyMastery } from "@/lib/mastery";
import { SRS_INTERVALS } from "@/lib/types";

describe("srs", () => {
  it("initSrs starts in box 1 with interval 1", () => {
    expect(initSrs()).toEqual({ box: 1, sessionsUntilDue: SRS_INTERVALS[1] });
  });

  it("correct answer moves item up one box", () => {
    const s = updateSrs(initSrs(), true);
    expect(s.box).toBe(2);
    expect(s.sessionsUntilDue).toBe(SRS_INTERVALS[2]);
  });

  it("wrong answer resets to box 1", () => {
    let s = updateSrs(initSrs(), true);
    s = updateSrs(s, true);
    s = updateSrs(s, true);
    expect(s.box).toBe(4);
    const reset = updateSrs(s, false);
    expect(reset.box).toBe(1);
  });

  it("correct answer from box 5 stays at 5", () => {
    let s = initSrs();
    for (let i = 0; i < 10; i++) s = updateSrs(s, true);
    expect(s.box).toBe(5);
  });

  it("item is due when never seen", () => {
    const state = emptyMastery("add_sub_100");
    expect(isDue(state, "new-item")).toBe(true);
  });

  it("item is not due right after correct answer", () => {
    const state = applySrsUpdate(
      emptyMastery("add_sub_100"),
      "x",
      true,
    );
    expect(isDue(state, "x")).toBe(false);
  });

  it("failed item is immediately due again (box 1, interval 1 minus 0 = 1, not due until decay)", () => {
    const state = applySrsUpdate(emptyMastery("add_sub_100"), "x", false);
    expect(state.srs["x"]?.box).toBe(1);
    expect(isDue(state, "x")).toBe(false);
    const decayed = decaySrsForNewSession(state);
    expect(isDue(decayed, "x")).toBe(true);
  });

  it("decay reduces sessionsUntilDue, floor at 0", () => {
    let state = applySrsUpdate(emptyMastery("add_sub_100"), "x", true);
    const firstInterval = state.srs["x"]?.sessionsUntilDue ?? 0;
    state = decaySrsForNewSession(state);
    expect(state.srs["x"]?.sessionsUntilDue).toBe(firstInterval - 1);
    for (let i = 0; i < 10; i++) state = decaySrsForNewSession(state);
    expect(state.srs["x"]?.sessionsUntilDue).toBe(0);
  });
});
