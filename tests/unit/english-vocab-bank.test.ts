import { describe, expect, it } from "vitest";
import evelynBank from "@/content/english/vocab-evelyn.json";
import emiliaBank from "@/content/english/vocab-emilia.json";
import type { EnglishVocabItem } from "@/lib/types";
import { isItemCorrect } from "@/lib/items";

const eve = evelynBank as unknown as readonly EnglishVocabItem[];
const emi = emiliaBank as unknown as readonly EnglishVocabItem[];

function checkBank(label: string, bank: readonly EnglishVocabItem[], idPrefix: string) {
  describe(`${label} — bank integrity`, () => {
    it("has ≥ 50 items", () => {
      expect(bank.length).toBeGreaterThanOrEqual(50);
    });

    it("all items carry skill=english_vocab and a known type", () => {
      for (const it of bank) {
        expect(it.skill).toBe("english_vocab");
        expect(["en_to_he", "he_to_en"]).toContain(it.type);
      }
    });

    it("all IDs are unique and use the expected prefix", () => {
      const ids = bank.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id.startsWith(idPrefix)).toBe(true);
    });

    it("5 difficulty tiers, each ≥ 10 items", () => {
      const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const it of bank)
        byTier[it.difficulty] = (byTier[it.difficulty] ?? 0) + 1;
      for (let d = 1; d <= 5; d++) {
        expect(byTier[d]).toBeGreaterThanOrEqual(10);
      }
    });

    it("direction is roughly balanced (40–60% en→he)", () => {
      const enToHe = bank.filter((i) => i.type === "en_to_he").length;
      const ratio = enToHe / bank.length;
      expect(ratio).toBeGreaterThanOrEqual(0.4);
      expect(ratio).toBeLessThanOrEqual(0.6);
    });

    it("every item has 4 distinct options, with `correct` among them", () => {
      for (const it of bank) {
        const opts = it.answer.options;
        expect(opts.length).toBe(4);
        expect(new Set(opts).size).toBe(4);
        expect(opts).toContain(it.answer.correct);
      }
    });

    it("each English-side string contains only ASCII Latin letters / spaces / hyphens", () => {
      const ascii = /^[A-Za-z\s'-]+$/;
      for (const it of bank) {
        if (it.type === "he_to_en") {
          for (const opt of it.answer.options) {
            expect(ascii.test(opt)).toBe(true);
          }
        } else {
          // En→He: prompt is English; options are Hebrew.
          // Just sanity-check `correct` is non-empty Hebrew.
          expect(it.answer.correct.length).toBeGreaterThan(0);
        }
      }
    });

    it("no duplicate English word appears twice in the same bank", () => {
      // Heuristic: extract the English token (the `correct` for he_to_en, or
      // the quoted word in the en→he prompt).
      const englishTokens: string[] = [];
      for (const it of bank) {
        if (it.type === "he_to_en") {
          englishTokens.push(it.answer.correct.toLowerCase());
        } else {
          const m = it.prompt.match(/'([^']+)'/);
          if (m) englishTokens.push(m[1]!.toLowerCase());
        }
      }
      expect(new Set(englishTokens).size).toBe(englishTokens.length);
    });
  });
}

checkBank("vocab-evelyn", eve, "eve-");
checkBank("vocab-emilia", emi, "emi-");

describe("english_vocab — no overlap between Evelyn and Emilia banks", () => {
  function englishTokens(bank: readonly EnglishVocabItem[]): Set<string> {
    const out = new Set<string>();
    for (const it of bank) {
      if (it.type === "he_to_en") {
        out.add(it.answer.correct.toLowerCase());
      } else {
        const m = it.prompt.match(/'([^']+)'/);
        if (m) out.add(m[1]!.toLowerCase());
      }
    }
    return out;
  }

  it("no English word appears in both A1 (Evelyn) and A2 (Emilia)", () => {
    const a1 = englishTokens(eve);
    const a2 = englishTokens(emi);
    const overlap = [...a1].filter((w) => a2.has(w));
    expect(overlap).toEqual([]);
  });
});

describe("english_vocab — integration with items.ts", () => {
  it("isItemCorrect accepts the canonical option", () => {
    for (const it of [...eve, ...emi]) {
      expect(isItemCorrect(it, it.answer.correct)).toBe(true);
    }
  });

  it("isItemCorrect rejects a wrong option", () => {
    for (const it of [...eve, ...emi]) {
      const wrong = it.answer.options.find((o) => o !== it.answer.correct)!;
      expect(isItemCorrect(it, wrong)).toBe(false);
    }
  });
});
