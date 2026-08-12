import { describe, expect, it } from "vitest";
import addSubBank from "@/content/math/add-sub-100.json";
import addSubHoldout from "@/content/measurement/add-sub-100-holdout.json";
import fractionsBank from "@/content/math/fractions-intro.json";
import fractionsHoldout from "@/content/measurement/fractions-intro-holdout.json";
import multiplicationBank from "@/content/math/multiplication.json";
import multiplicationHoldout from "@/content/measurement/multiplication-holdout.json";
import mult2digitBank from "@/content/math/mult-2digit.json";
import mult2digitHoldout from "@/content/measurement/mult-2digit-holdout.json";
import ops1000Bank from "@/content/math/ops-1000.json";
import ops1000Holdout from "@/content/measurement/ops-1000-holdout.json";
import longDivisionBank from "@/content/math/long-division.json";
import longDivisionHoldout from "@/content/measurement/long-division-holdout.json";
import barModelsBank from "@/content/math/bar-models.json";
import barModelsHoldout from "@/content/measurement/bar-models-holdout.json";
import hebrewEvelynBank from "@/content/hebrew/comprehension-evelyn.json";
import hebrewEmiliaBank from "@/content/hebrew/comprehension-emilia.json";
import hebrewCompHoldout from "@/content/measurement/hebrew-comprehension-holdout.json";
import vocabEvelynBank from "@/content/english/vocab-evelyn.json";
import vocabEmiliaBank from "@/content/english/vocab-emilia.json";
import englishVocabHoldout from "@/content/measurement/english-vocab-holdout.json";
import { MEASURABLE_SKILLS, holdoutForSkill } from "@/lib/measurement";
import type { Item, Skill } from "@/lib/types";

const BANK_BY_SKILL = {
  add_sub_100: addSubBank as unknown as readonly Item[],
  fractions_intro: fractionsBank as unknown as readonly Item[],
  multiplication: multiplicationBank as unknown as readonly Item[],
  mult_2digit: mult2digitBank as unknown as readonly Item[],
  ops_1000: ops1000Bank as unknown as readonly Item[],
  long_division: longDivisionBank as unknown as readonly Item[],
  bar_models: barModelsBank as unknown as readonly Item[],
  // שתי הבנות חולקות את שם המיומנות ומאגר נבחר לפי גיל, ולכן
  // ה-holdout חייב להיות זר לשניהם.
  hebrew_comprehension: [
    ...(hebrewEvelynBank as unknown as readonly Item[]),
    ...(hebrewEmiliaBank as unknown as readonly Item[]),
  ],
  english_vocab: [
    ...(vocabEvelynBank as unknown as readonly Item[]),
    ...(vocabEmiliaBank as unknown as readonly Item[]),
  ],
};

const HOLDOUT_BY_SKILL = {
  add_sub_100: addSubHoldout as unknown as readonly Item[],
  fractions_intro: fractionsHoldout as unknown as readonly Item[],
  multiplication: multiplicationHoldout as unknown as readonly Item[],
  mult_2digit: mult2digitHoldout as unknown as readonly Item[],
  ops_1000: ops1000Holdout as unknown as readonly Item[],
  long_division: longDivisionHoldout as unknown as readonly Item[],
  bar_models: barModelsHoldout as unknown as readonly Item[],
  hebrew_comprehension: hebrewCompHoldout as unknown as readonly Item[],
  english_vocab: englishVocabHoldout as unknown as readonly Item[],
};

type CoveredSkill = keyof typeof BANK_BY_SKILL;
const COVERED = Object.keys(BANK_BY_SKILL) as CoveredSkill[];

/** מיומנויות עם `operands`/`op` — רק עליהן חלה בדיקת החשבון. */
const ARITHMETIC = new Set<string>([
  "add_sub_100",
  "multiplication",
  "mult_2digit",
  "ops_1000",
  "long_division",
]);

/**
 * השער שמונע שמיומנות תיכנס ל-MEASURABLE_SKILLS בלי שהבדיקות כאן
 * יכסו אותה. בלעדיו אפשר להוסיף מאגר חדש ולקבל ירוק על סמך
 * שתי המיומנויות הישנות בלבד — בדיוק דפוס הכשל של T4.
 */
describe("measurement — every measurable skill is covered by this file", () => {
  it("MEASURABLE_SKILLS and the tested banks are the same set", () => {
    expect([...MEASURABLE_SKILLS].sort()).toEqual([...COVERED].sort());
  });

  it("every measurable skill actually resolves to a non-empty bank", () => {
    for (const skill of MEASURABLE_SKILLS) {
      expect(holdoutForSkill(skill).length).toBeGreaterThan(0);
    }
  });
});

describe("measurement — holdout purity (training/holdout must be disjoint)", () => {
  for (const skill of COVERED) {
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

    it(`${skill}: every holdout id uses the ext- prefix`, () => {
      for (const item of HOLDOUT_BY_SKILL[skill]) {
        expect(item.id.startsWith("ext-")).toBe(true);
      }
    });
  }
});

/**
 * חפיפה **לפי תוכן**, לא לפי id.
 *
 * `id` שונה עם אותו תרגיל בדיוק עובר את בדיקת ה-id למעלה ופוגע
 * בדיוק במה שהמאגר אמור להגן עליו: פריט שהילדה כבר תרגלה בודק
 * שינון. בכפל גם הסדר ההפוך נחשב — 3×7 ו-7×3 הם אותו תרגיל.
 *
 * חריג מתועד: `multiplication`. מאגר התרגול מכסה 67 מתוך 76 הזוגות
 * בלוח 2–10, ולכן הצורה ההפוכה מותרת שם. ההגנה האמיתית שם היא
 * פריטי גורם-חסר, שהתרגול אינו מבקש מעולם.
 */
const ORDER_INSENSITIVE_EXEMPT = new Set<Skill>(["multiplication"]);

/**
 * פריט אריתמטי עם אופרנדים. `Item` הוא union שכולל גם הבנת-הנקרא
 * (בלי `prompt`/`answer`), ולכן מצרים אותו לפני כל גישה לשדות.
 */
type OperandItem = Extract<Item, { operands: [number, number] }>;

function isOperandItem(item: Item): item is OperandItem {
  return "operands" in item && "op" in item;
}

/** פריט גורם-חסר: ה-"?" יושב בגוף השאלה ולא בסופה (`? × 7 = 56`). */
function isMissingFactor(item: OperandItem): boolean {
  return item.prompt.includes("?") && !item.prompt.trimEnd().endsWith("?");
}

function arithmeticKeys(item: Item, commutes: boolean): string[] {
  if (!isOperandItem(item)) return [];
  const [a, b] = item.operands;
  // גורם-חסר אינו אותו תרגיל גם כשהאופרנדים זהים: התרגול מבקש
  // מכפלה, המבחן מבקש להפוך את הפעולה. זהו כיוון שליפה אחר.
  const prefix = isMissingFactor(item) ? "missing" : item.op;
  if (item.op === "*" && commutes) return [`${prefix}:${a}:${b}`, `${prefix}:${b}:${a}`];
  return [`${prefix}:${a}:${b}`];
}

describe("measurement — holdout does not repeat a trained exercise", () => {
  for (const skill of COVERED) {
    if (!ARITHMETIC.has(skill)) continue; // אינו אריתמטי-אופרנדים
    it(`${skill}: no holdout exercise appears in training by content`, () => {
      const commutes = !ORDER_INSENSITIVE_EXEMPT.has(skill);
      const trained = new Set(
        BANK_BY_SKILL[skill].flatMap((i) => arithmeticKeys(i, commutes)),
      );
      const clashes = HOLDOUT_BY_SKILL[skill]
        .filter(isOperandItem)
        .filter((i) => arithmeticKeys(i, commutes).some((k) => trained.has(k)))
        .map((i) => i.prompt);
      expect(clashes).toEqual([]);
    });
  }
});

/**
 * כל תשובה מאומתת חשבונית. אי אפשר לאמת 120 פריטים בעין, ותשובה
 * שגויה במבחן החיצוני גרועה במיוחד: היא מענישה ילדה שענתה נכון.
 */
describe("measurement — every holdout answer is arithmetically true", () => {
  for (const skill of COVERED) {
    if (!ARITHMETIC.has(skill)) continue;
    it(`${skill}: answer matches the operands`, () => {
      for (const item of HOLDOUT_BY_SKILL[skill]) {
        if (!isOperandItem(item)) continue;
        const [a, b] = item.operands;
        const expected =
          item.op === "+"
            ? a + b
            : item.op === "-"
              ? a - b
              : item.op === "*"
                ? a * b
                : a / b;
        // בפריטי גורם-חסר ה-answer הוא האופרנד החסר, לא המכפלה.
        if (isMissingFactor(item)) {
          expect(item.answer).toBe(a);
          expect(Number.isInteger(expected)).toBe(true);
        } else {
          expect(item.answer).toBe(expected);
        }
      }
    });

    it(`${skill}: no negative or fractional answers`, () => {
      for (const item of HOLDOUT_BY_SKILL[skill]) {
        if (!isOperandItem(item)) continue;
        expect(Number.isInteger(item.answer)).toBe(true);
        expect(item.answer).toBeGreaterThanOrEqual(0);
      }
    });
  }

  it("ops_1000 stays inside its stated range", () => {
    for (const item of HOLDOUT_BY_SKILL.ops_1000) {
      if (!isOperandItem(item)) continue;
      expect(item.answer).toBeLessThanOrEqual(1000);
    }
  });

  it("long_division divides evenly (no remainders)", () => {
    for (const item of HOLDOUT_BY_SKILL.long_division) {
      if (!isOperandItem(item)) continue;
      const [n, d] = item.operands;
      expect(n % d).toBe(0);
    }
  });
});

/**
 * המיומנויות המילוליות (T7ב). כאן החפיפה אינה אריתמטית: בהבנת
 * הנקרא היא **הטקסט**, ובאוצר המילים היא **המילה הנלמדת**.
 */
describe("measurement — verbal holdouts do not reuse trained material", () => {
  it("hebrew_comprehension: no holdout text appears in either training bank", () => {
    const trained = new Set(
      BANK_BY_SKILL.hebrew_comprehension.map((i) =>
        "text" in i ? i.text : "",
      ),
    );
    const clashes = HOLDOUT_BY_SKILL.hebrew_comprehension
      .filter((i) => "text" in i && trained.has(i.text))
      .map((i) => i.id);
    expect(clashes).toEqual([]);
  });

  it("hebrew_comprehension: every item has 2 questions with 4 unique options", () => {
    for (const item of HOLDOUT_BY_SKILL.hebrew_comprehension) {
      if (!("questions" in item)) throw new Error(`${item.id} has no questions`);
      expect(item.questions.length).toBe(2);
      for (const q of item.questions) {
        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * הלקח של T4 מקודד: שם 11 מתוך 18 התשובות הראשונות היו נכונות,
   * וילדה שניחשה "הראשונה" קיבלה "יש פער" במקום "לא יודעת".
   * כאן הרף הוא פיזור אמיתי — אף מיקום אינו נושא יותר מ-40%.
   */
  it("hebrew_comprehension: the correct answer is not biased to one position", () => {
    const counts = [0, 0, 0, 0];
    let total = 0;
    for (const item of HOLDOUT_BY_SKILL.hebrew_comprehension) {
      if (!("questions" in item)) continue;
      for (const q of item.questions) {
        counts[q.correctIndex] = (counts[q.correctIndex] ?? 0) + 1;
        total += 1;
      }
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(0);
      expect(c / total).toBeLessThanOrEqual(0.4);
    }
  });

  it("english_vocab: no holdout word appears in either training bank", () => {
    const taught = new Set<string>();
    for (const item of BANK_BY_SKILL.english_vocab) {
      if (!("type" in item) || !("answer" in item)) continue;
      const word =
        item.type === "en_to_he"
          ? (item.prompt.match(/'([^']+)'/) ?? [])[1]
          : (item.answer as { correct: string }).correct;
      if (word) taught.add(word.toLowerCase());
    }
    const clashes: string[] = [];
    for (const item of HOLDOUT_BY_SKILL.english_vocab) {
      if (!("type" in item) || !("answer" in item)) continue;
      const word =
        item.type === "en_to_he"
          ? (item.prompt.match(/'([^']+)'/) ?? [])[1]
          : (item.answer as { correct: string }).correct;
      if (word && taught.has(word.toLowerCase())) {
        clashes.push(`${item.id}: ${word}`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("english_vocab: direction is balanced and options are well formed", () => {
    const byType = new Map<string, number>();
    for (const item of HOLDOUT_BY_SKILL.english_vocab) {
      if (!("type" in item) || !("answer" in item)) continue;
      byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
      const answer = item.answer as { correct: string; options: string[] };
      expect(answer.options.length).toBe(4);
      expect(new Set(answer.options).size).toBe(4);
      expect(answer.options).toContain(answer.correct);
    }
    // איזון 50/50 בין הכיוונים, כמו במאגרי התרגול.
    expect(byType.get("en_to_he")).toBe(byType.get("he_to_en"));
  });

  it("bar_models: segment weights match the stated total, and '?' matches the answer", () => {
    for (const item of HOLDOUT_BY_SKILL.bar_models) {
      if (!("bars" in item)) throw new Error(`${item.id} has no bars`);
      for (const bar of item.bars) {
        if (!bar.totalLabel || !/^\d+$/.test(bar.totalLabel)) continue;
        const sum = bar.segments.reduce((s, g) => s + g.weight, 0);
        expect(sum).toBe(Number(bar.totalLabel));
        const unknown = bar.segments.filter((s) => s.label === "?");
        if (unknown.length === 1) {
          expect(unknown[0]!.weight).toBe(item.answer);
        }
      }
    }
  });
});

describe("measurement — holdout bank size & difficulty distribution", () => {
  for (const skill of COVERED) {
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
