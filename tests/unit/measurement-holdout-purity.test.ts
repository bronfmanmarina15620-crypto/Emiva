import { describe, expect, it } from "vitest";
import addSubBank from "@/content/math/add-sub-100.json";
import addSubHoldout from "@/content/measurement/add-sub-100-holdout.json";
import fractionsBank from "@/content/math/fractions-intro.json";
import fractionsHoldout from "@/content/measurement/fractions-intro-holdout.json";
import type { Item } from "@/lib/types";

const BANK_BY_SKILL = {
  add_sub_100: addSubBank as unknown as readonly Item[],
  fractions_intro: fractionsBank as unknown as readonly Item[],
};

const HOLDOUT_BY_SKILL = {
  add_sub_100: addSubHoldout as unknown as readonly Item[],
  fractions_intro: fractionsHoldout as unknown as readonly Item[],
};

describe("measurement — holdout purity (training/holdout must be disjoint)", () => {
  for (const skill of Object.keys(BANK_BY_SKILL) as Array<
    keyof typeof BANK_BY_SKILL
  >) {
    it(`${skill}: no holdout id appears in the training bank`, () => {
      const bankIds = new Set(BANK_BY_SKILL[skill].map((i) => i.id));
      const overlap = HOLDOUT_BY_SKILL[skill]
        .map((i) => i.id)
        .filter((id) => bankIds.has(id));
      expect(overlap).toEqual([]);
    });

    it(`${skill}: holdout items all have unique ids`, () => {
      const ids = HOLDOUT_BY_SKILL[skill].map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it(`${skill}: holdout items all carry the correct skill tag`, () => {
      for (const item of HOLDOUT_BY_SKILL[skill]) {
        expect(item.skill).toBe(skill);
      }
    });
  }
});

describe("measurement — holdout bank size & difficulty distribution", () => {
  for (const skill of Object.keys(HOLDOUT_BY_SKILL) as Array<
    keyof typeof HOLDOUT_BY_SKILL
  >) {
    it(`${skill}: bank has ≥ 30 items`, () => {
      expect(HOLDOUT_BY_SKILL[skill].length).toBeGreaterThanOrEqual(30);
    });

    it(`${skill}: at least 4 items per difficulty (1–5)`, () => {
      const buckets = new Map<number, number>();
      for (const item of HOLDOUT_BY_SKILL[skill]) {
        buckets.set(item.difficulty, (buckets.get(item.difficulty) ?? 0) + 1);
      }
      for (let d = 1; d <= 5; d++) {
        expect(buckets.get(d) ?? 0).toBeGreaterThanOrEqual(4);
      }
    });
  }
});
