import { describe, expect, it } from "vitest";
import phonicsEvelyn from "@/content/english/phonics-evelyn.json";
import { allowedSkillsForAge } from "@/lib/profiles";
import { clampRate, SPEECH_RATE_DEFAULT } from "@/lib/speech";
import type { EnglishPhonicsItem } from "@/lib/types";

const bank = phonicsEvelyn as unknown as EnglishPhonicsItem[];

// CORE-ENGLISH-PHONICS-001.
//
// הלקח המקודד (עקרון-איכות 1): MyLevel §3.3 דורש "Phonics מפורש
// (שיטתי, לא Whole Language)". CORE-ENGLISH-001 דילגה על זה ובנתה
// אוצר-מילים בלבד; התוצאה — אווה לא הצליחה לקרוא כלום (2026-08-10).
// הבדיקות כאן נכשלות אם הפוניקה תוסר מהמסלול או תתרוקן מתוכן.

describe("phonics bank — structure", () => {
  it("has items across all five difficulties", () => {
    const byDifficulty = new Map<number, number>();
    for (const item of bank) {
      byDifficulty.set(item.difficulty, (byDifficulty.get(item.difficulty) ?? 0) + 1);
    }
    for (const d of [1, 2, 3, 4, 5]) {
      expect(byDifficulty.get(d) ?? 0).toBeGreaterThanOrEqual(10);
    }
  });

  it("has unique ids", () => {
    const ids = bank.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every item as english_phonics", () => {
    expect(bank.every((i) => i.skill === "english_phonics")).toBe(true);
  });

  it("gives every item exactly four distinct options", () => {
    for (const item of bank) {
      expect(item.answer.options).toHaveLength(4);
      expect(new Set(item.answer.options).size).toBe(4);
    }
  });

  it("includes the correct answer among the options", () => {
    for (const item of bank) {
      expect(item.answer.options).toContain(item.answer.correct);
    }
  });
});

describe("phonics bank — pedagogy", () => {
  // כלל הפדגוגיה: חשיפת תשובה תמיד מלווה בשיטה, לא רק בתשובה.
  // זה בדיוק מה שחסר ב-english_vocab (T3 יתקן שם).
  it("gives every item a non-trivial explanation", () => {
    for (const item of bank) {
      expect(item.explanation.trim().length).toBeGreaterThan(15);
    }
  });

  it("never uses fixed-mindset wording", () => {
    const banned = ["לא נכון", "טעית", "שגוי", "פספסת", "כישלון", "נכשלת"];
    for (const item of bank) {
      const text = `${item.prompt} ${item.explanation}`;
      for (const phrase of banned) {
        expect(text).not.toContain(phrase);
      }
    }
  });

  // Marina בחרה את שיטת מילת-העוגן (2026-08-10) אחרי שהשוותה בפועל:
  // צליל בודד ("mmm") נהגה כמילה ונשמע שגוי.
  it("pairs every letter-sound item with an anchor word", () => {
    const soundItems = bank.filter(
      (i) => i.type === "letter_sound" || i.type === "sound_to_letter",
    );
    expect(soundItems.length).toBeGreaterThan(0);
    for (const item of soundItems) {
      expect(item.anchorWord, `${item.id} needs an anchor word`).toBeTruthy();
      expect(item.say).toContain(item.anchorWord!);
    }
  });

  it("gives blend items their parts so the child hears the sounds join", () => {
    const blends = bank.filter((i) => i.type === "blend");
    expect(blends.length).toBeGreaterThan(0);
    for (const item of blends) {
      expect(item.parts, `${item.id} needs parts`).toBeTruthy();
      expect(item.parts!.length).toBeGreaterThanOrEqual(2);
      // הצלילים חייבים להרכיב את המילה עצמה — אחרת החיבור משקר.
      expect(item.parts!.join("")).toBe(item.focus);
    }
  });

  it("gives every item something to hear", () => {
    for (const item of bank) {
      const hasAudio = Boolean(item.say) || Boolean(item.parts?.length);
      expect(hasAudio, `${item.id} has nothing to play`).toBe(true);
    }
  });
});

describe("phonics bank — answer position is not guessable", () => {
  // הלקח מ-2026-08-06: באוצר-המילים התשובה הנכונה הופיעה ראשונה
  // ב-99 מ-100 פריטים, וילדה יכלה להגיע ל"שליטה" בלי לדעת כלום.
  it("does not concentrate the correct answer in one position", () => {
    const counts = new Map<number, number>();
    for (const item of bank) {
      const idx = item.answer.options.indexOf(item.answer.correct);
      counts.set(idx, (counts.get(idx) ?? 0) + 1);
    }
    const maxShare = Math.max(...counts.values()) / bank.length;
    expect(maxShare).toBeLessThan(0.5);
  });
});

describe("phonics comes before vocabulary", () => {
  // הסטייה המקורית: אווה קיבלה "What does 'cat' mean?" — שאלה כתובה
  // באנגלית, לילדה שלא יודעת לקרוא אנגלית.
  it("puts english_phonics ahead of english_vocab for age 7-8", () => {
    const skills = allowedSkillsForAge(7);
    const phonics = skills.indexOf("english_phonics");
    const vocab = skills.indexOf("english_vocab");
    expect(phonics).toBeGreaterThanOrEqual(0);
    expect(vocab).toBeGreaterThanOrEqual(0);
    expect(phonics).toBeLessThan(vocab);
  });

  it("keeps phonics in the age-8 track too", () => {
    expect(allowedSkillsForAge(8)).toContain("english_phonics");
  });
});

describe("speech rate", () => {
  // רעיון של Marina (2026-08-10): המהירות בשליטת הבת, לא ערך קבוע.
  it("keeps the rate inside a usable range", () => {
    expect(clampRate(0.1)).toBeGreaterThanOrEqual(0.4);
    expect(clampRate(9)).toBeLessThanOrEqual(1);
    expect(clampRate(0.7)).toBe(0.7);
  });

  it("falls back to the default for nonsense input", () => {
    expect(clampRate(Number.NaN)).toBe(SPEECH_RATE_DEFAULT);
  });
});
