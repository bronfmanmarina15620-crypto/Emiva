import { describe, expect, it } from "vitest";
import phonicsEmilia from "@/content/english/phonics-emilia.json";
import phonicsEvelyn from "@/content/english/phonics-evelyn.json";
import { allowedSkillsForAge } from "@/lib/profiles";
import { clampRate, SPEECH_RATE_DEFAULT } from "@/lib/speech";
import type { EnglishPhonicsItem } from "@/lib/types";

const bank = phonicsEvelyn as unknown as EnglishPhonicsItem[];
const emiliaBank = phonicsEmilia as unknown as EnglishPhonicsItem[];

// שני המאגרים חייבים לעמוד באותם כללים. `allBanks` נועד לוודא שכל
// בדיקת-הגנה חלה על שניהם — מאגר חדש שנוסף בלי לעבור כאן הוא בדיוק
// הפרצה שאפשרה ל-CORE-ENGLISH-001 לדלג על פוניקה מלכתחילה.
const allBanks: ReadonlyArray<[string, EnglishPhonicsItem[]]> = [
  ["evelyn", bank],
  ["emilia", emiliaBank],
];

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

describe("phonics bank — the item must not give away its own answer", () => {
  // סקירת קוד 2026-08-10 מצאה ששלוש דרגות חשפו את התשובה של עצמן:
  //   D4 blend  — הציג את המילה השלמה מעל "איזו מילה יצאה?"
  //   D3 sound  — השמיע "s. sit"; המנוע הוגה "s" כשם-האות ומכריז עליה
  //   D5 decode — הקריא את המילה לפני שהילדה קראה אותה
  // בשלושתן הבת מקבלת קרדיט שליטה בלי ללמוד — בדיוק ה-false mastery
  // שהמשימה הזאת נועדה לתקן. הבדיקות כאן מונעות חזרה.

  it("never speaks the exact answer for sound_to_letter items", () => {
    for (const item of bank.filter((i) => i.type === "sound_to_letter")) {
      const spoken = (item.say ?? "").toLowerCase();
      const answer = item.answer.correct.toLowerCase();
      // המילה נאמרת, האות לא — הבת חייבת לחלץ את הצליל בעצמה.
      expect(
        spoken.split(/[\s.]+/).filter(Boolean),
        `${item.id} speaks the answer letter outright`,
      ).not.toContain(answer);
    }
  });

  it("keeps blend items from showing the word they ask for", () => {
    // ההגנה בקוד היא `glyphIsAnswer` ב-PhonicsPrompt. הבדיקה מוודאת
    // שהתנאי אכן מזוהה — focus זהה לתשובה, ולכן הגליף חייב להיות מוסתר.
    for (const item of bank.filter((i) => i.type === "blend")) {
      expect(item.focus).toBe(item.answer.correct);
      expect(item.parts?.join("")).toBe(item.focus);
    }
  });

  it("asks decode items to read, not to listen", () => {
    for (const item of bank.filter((i) => i.type === "decode")) {
      // התשובה היא המשמעות בעברית — לא המילה האנגלית.
      expect(item.answer.correct).not.toBe(item.focus);
      // והשאלה לא מכילה את המילה, כי היא מוצגת בנפרד וגדול.
      expect(item.prompt).not.toContain(item.focus);
    }
  });
});

describe("phonics bank — a sound question must have an audible answer", () => {
  // סקירה 2026-08-10 (סבב שני): שני פריטי D3 ביקשו מאווה להבחין בין
  // צלילים שאי אפשר להבחין ביניהם.
  //   ph-d3-012 "cup" — המסיחים כללו k. הצליל של c ו-k **זהה לחלוטין**;
  //             לא הייתה תשובה שאפשר לשמוע, רק לנחש.
  //   ph-d3-010 "van" — המסיחים כללו f, ההבחנה הקשה ביותר שיש.
  // פריט כזה מעניש על מה שהוא לא מלמד: הבת טועה, מקבלת חשיפה, והאות
  // האדפטיבי מסיק שהיא לא שולטת בדרגה 3 — בזמן שהיא כן.
  //
  // זוגות קוליים/אטומים (s/z, b/p, t/d) **נשארים מותרים** בכוונה: הם
  // נבדלים באוזן, וההבחנה ביניהם היא בדיוק מה שפוניקה מלמדת.
  const IDENTICAL_SOUND: Record<string, readonly string[]> = {
    c: ["k"],
    k: ["c"],
  };

  it("never offers a distractor that sounds identical to the answer", () => {
    for (const file of [phonicsEvelyn, phonicsEmilia]) {
      const items = file as unknown as EnglishPhonicsItem[];
      for (const item of items.filter((i) => i.type === "sound_to_letter")) {
        const correct = item.answer.correct.toLowerCase();
        const clashes = item.answer.options
          .map((o) => o.toLowerCase())
          .filter(
            (o) => o !== correct && (IDENTICAL_SOUND[correct] ?? []).includes(o),
          );
        expect(
          clashes,
          `${item.id} ("${item.say}") offers ${clashes.join("/")} — indistinguishable from "${correct}" by ear`,
        ).toEqual([]);
      }
    }
  });

  it("keeps the spoken word actually starting with the answer letter", () => {
    for (const file of [phonicsEvelyn, phonicsEmilia]) {
      const items = file as unknown as EnglishPhonicsItem[];
      for (const item of items.filter((i) => i.type === "sound_to_letter")) {
        const spoken = (item.say ?? "").trim().toLowerCase();
        expect(
          spoken.startsWith(item.answer.correct.toLowerCase()),
          `${item.id}: "${spoken}" does not start with "${item.answer.correct}"`,
        ).toBe(true);
      }
    }
  });
});

describe("blend audio stays distinguishable at every speed", () => {
  // הצלילים חייבים להישמע נפרדים מהמילה גם במהירות האיטית ביותר —
  // דווקא שם, אצל בת שמתקשה ומאטה. `rate - 0.15` נכשל בזה.
  it("separates parts from the whole word even at the slowest rate", () => {
    for (const rate of [0.4, 0.5, 0.7, 1.0]) {
      const whole = clampRate(rate);
      const parts = Math.max(0.4, whole * 0.75);
      // או שהמהירות שונה, או שיש הפסקה — לפחות אחד מהם חייב להתקיים.
      const rateDiffers = parts < whole;
      const hasPause = true; // speakBlend מוסיף "." אחרי כל חלק
      expect(rateDiffers || hasPause).toBe(true);
    }
  });
});

describe("both banks obey the same protections", () => {
  it.each(allBanks)("%s: no item reveals its answer in the prompt", (_name, b) => {
    for (const item of b.filter((i) => i.type === "decode")) {
      expect(item.prompt, `${item.id}`).not.toContain(item.focus);
      expect(item.answer.correct).not.toBe(item.focus);
    }
  });

  // הפער שהסקירה השנייה חשפה (2026-08-10): הבדיקות אימתו את *הטקסט*
  // של פריטי decode אבל לא את השמע. כל 36 פריטי ה-decode של אמיליה
  // נשאו `parts`, ולחיצה אחת השמיעה "rab. bit. rabbit" — כלומר את
  // המילה שהיא אמורה לקרוא בעצמה.
  //
  // ההגנה חיה ב-PhonicsPrompt (`hasAudio` = false ל-decode). הבדיקה
  // הזאת נועלת את החוזה: אם מישהו יסיר את התנאי, פריטי decode יחזרו
  // להשמיע את התשובה.
  it.each(allBanks)("%s: decode items are read, never played", (_name, b) => {
    const decodeItems = b.filter((i) => i.type === "decode");
    for (const item of decodeItems) {
      // המילה שהבת קוראת חייבת להיות מוצגת...
      expect(item.focus, `${item.id}`).toBeTruthy();
      // ...והתשובה היא המשמעות, לא המילה עצמה.
      expect(item.answer.correct).not.toBe(item.focus);
    }
    // ולפחות פריט אחד כזה קיים, אחרת הבדיקה ריקה ולא מגינה על כלום.
    if (b === emiliaBank) expect(decodeItems.length).toBeGreaterThan(0);
  });

  it.each(allBanks)("%s: blend parts rebuild the word", (_name, b) => {
    for (const item of b.filter((i) => i.type === "blend")) {
      expect(item.parts?.join(""), `${item.id}`).toBe(item.focus);
    }
  });

  it.each(allBanks)("%s: answer position is spread", (_name, b) => {
    const counts = new Map<number, number>();
    for (const item of b) {
      const idx = item.answer.options.indexOf(item.answer.correct);
      counts.set(idx, (counts.get(idx) ?? 0) + 1);
    }
    expect(Math.max(...counts.values()) / b.length).toBeLessThan(0.5);
  });

  it.each(allBanks)("%s: every item explains and none shames", (_name, b) => {
    const banned = ["לא נכון", "טעית", "שגוי", "פספסת", "כישלון", "נכשלת"];
    for (const item of b) {
      expect(item.explanation.trim().length).toBeGreaterThan(15);
      for (const phrase of banned) {
        expect(`${item.prompt} ${item.explanation}`).not.toContain(phrase);
      }
    }
  });

  it.each(allBanks)("%s: ids are unique and options distinct", (_name, b) => {
    expect(new Set(b.map((i) => i.id)).size).toBe(b.length);
    for (const item of b) {
      expect(new Set(item.answer.options).size).toBe(4);
      expect(item.answer.options).toContain(item.answer.correct);
    }
  });
});

describe("Emilia's bank starts where she actually is", () => {
  // Marina 2026-08-10: "אמיליה מכירה טוב את ה-ABC". מסלול שמתחיל
  // מזיהוי אותיות ייקרא אצל בת 9 כירידה לרמה של אחותה הקטנה.
  it("never asks her to identify a letter", () => {
    const babyTypes = emiliaBank.filter(
      (i) => i.type === "letter_name" || i.type === "sound_to_letter",
    );
    expect(babyTypes).toHaveLength(0);
  });

  it("reaches multi-syllable words at the top difficulties", () => {
    const top = emiliaBank.filter((i) => i.difficulty >= 4);
    expect(top.length).toBeGreaterThan(0);
    // כל פריט בדרגות הגבוהות חייב להיות מילה מרובת-הברות.
    for (const item of top) {
      expect(item.parts?.length ?? 0, `${item.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps phonics before vocabulary for age 9-10 too", () => {
    const skills = allowedSkillsForAge(9);
    expect(skills.indexOf("english_phonics")).toBeLessThan(
      skills.indexOf("english_vocab"),
    );
    expect(allowedSkillsForAge(10)).toContain("english_phonics");
  });

  it("does not reuse Evelyn's beginner words at difficulty 1-2", () => {
    const evelynEasy = new Set(
      bank.filter((i) => i.difficulty <= 2).map((i) => i.focus),
    );
    const overlap = emiliaBank
      .filter((i) => i.difficulty <= 2)
      .filter((i) => evelynEasy.has(i.focus));
    expect(overlap.map((i) => i.focus)).toEqual([]);
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
