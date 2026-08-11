import { describe, expect, it } from "vitest";
import evelynBank from "@/content/english/vocab-evelyn.json";
import emiliaBank from "@/content/english/vocab-emilia.json";
import type { EnglishVocabItem } from "@/lib/types";
import { isItemCorrect } from "@/lib/items";

const eve = evelynBank as unknown as readonly EnglishVocabItem[];
const emi = emiliaBank as unknown as readonly EnglishVocabItem[];

/** התשובה עשויה להכיל תווים בעלי משמעות ב-regex (למשל "-"). */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    // CORE-ENGLISH-VOCAB-EXPLAIN-001 — כלל הפדגוגיה: חשיפה תמיד
    // מלווה בשיטה. עד התיקון הוצג משפט גנרי אחד לכל 100 הפריטים
    // ("זוהי מילה מקטגוריית abstract"), שלא לימד כלום.
    it("gives every item a non-trivial explanation", () => {
      for (const it of bank) {
        expect(
          (it.explanation ?? "").trim().length,
          `${it.id} has no real explanation`,
        ).toBeGreaterThan(15);
      }
    });

    it("never uses fixed-mindset wording", () => {
      const banned = [
        "לא נכון",
        "טעית",
        "שגוי",
        "פספסת",
        "כישלון",
        "נכשלת",
        "אחרי התלבטות",
      ];
      for (const it of bank) {
        const text = `${it.prompt} ${it.explanation}`;
        for (const phrase of banned) {
          expect(text, `${it.id} uses "${phrase}"`).not.toContain(phrase);
        }
      }
    });

    // הסבר לא חושף את התשובה של הפריט **שלו**.
    //
    // הבחנה חשובה: הסבר *כן* מותר להזכיר מילה אנגלית אחרת מהמאגר
    // ("slow — ההפך מ-fast"). זה לא דליפה אלא בדיוק שיטת "גשר ממילה
    // מוכרת" שכלל הפדגוגיה דורש, והחשיפה ממילא מופיעה רק אחרי שלושה
    // ניסיונות כושלים על אותו פריט — כלומר לא בזמן שנבחנים על האחר.
    // מה שאסור הוא שההסבר של פריט he_to_en ימסור את המילה שהילדה
    // עצמה אמורה להפיק, לפני שהיא ניסתה.
    it("never states its own answer before the girl produces it", () => {
      for (const it of bank) {
        if (it.type !== "he_to_en") continue;
        // ההסבר פותח במילה עצמה ("slow — איטי...") וזה תקין: הוא מוצג
        // אחרי שהתשובה כבר נחשפה. מה שנבדק הוא שהוא לא מכיל אותה
        // *פעמיים*, כלומר לא חוזר עליה כטריק במקום ללמד.
        const rest = it.explanation.slice(it.answer.correct.length);
        const re = new RegExp(`\\b${escapeRe(it.answer.correct)}\\b`, "gi");
        const extra = (rest.match(re) ?? []).length;
        expect(extra, `${it.id} repeats its own answer instead of teaching`)
          .toBeLessThanOrEqual(1);
      }
    });

    // ההסברים פותחים במילה האנגלית בתוך משפט עברי. זה תקין ומכוון —
    // אבל רק כל עוד ה-div שמציג אותם מכריז `dir="rtl"` במפורש, אחרת
    // ה-bidi של הדפדפן נגרר אחרי התו הראשון ומזיז את המילה לקצה
    // השני. הבדיקה מתעדת את התלות הזאת: אם מישהו יוריד את ההכרזה
    // ב-`page.tsx`, ההערה כאן היא העוגן שמסביר למה היא הייתה שם.
    it("opens with the English word — which is why the reveal must declare RTL", () => {
      const startsWithLatin = bank.filter((it) =>
        /^[A-Za-z]/.test(it.explanation.trim()),
      );
      expect(startsWithLatin.length).toBe(bank.length);
    });

    // ההכרעה של Marina (2026-08-11): הסבר ייחודי לכל מילה, לא תבנית
    // עם החלפת-מילה. הבדיקה הופכת את ההחלטה לדבר שאי אפשר לעקוף
    // בשקט — בדיוק כמו הבדיקות שתפסו את חשיפת-התשובה ב-T1.
    it("gives each word its own explanation, not a filled-in template", () => {
      const seen = new Map<string, string[]>();
      for (const it of bank) {
        // שלד המשפט: מסירים את המילה עצמה, את התשובה ואת כל הספרות
        // והאותיות הלטיניות, ומשווים את מה שנשאר. שתי תבניות זהות
        // ייראו זהות גם אחרי ההסרה.
        const skeleton = it.explanation
          .replace(/[A-Za-z]+/g, "•")
          .replace(new RegExp(escapeRe(it.answer.correct), "g"), "•")
          .replace(/\s+/g, " ")
          .trim();
        const bucket = seen.get(skeleton) ?? [];
        bucket.push(it.id);
        seen.set(skeleton, bucket);
      }
      const overused = [...seen.entries()].filter(([, ids]) => ids.length >= 3);
      expect(
        overused.map(([sk, ids]) => `"${sk}" → ${ids.join(",")}`),
        "explanations reuse a shared template",
      ).toEqual([]);
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

// ENGLISH-VOCAB-FIX-001: מקודד את הלקח שמסיח לא יהיה נרדף לתשובה
// הנכונה. השופט האוטומטי (judge-content) בודק מבנה ולא תופס דו-משמעות
// סמנטית; זה נתפס כאן, בקבוצות-נרדפים ידניות שנבנו מ-50 הפריטים
// שהיו שבורים. אם מסיח וה-`correct` נופלים לאותה קבוצה — טעות.
describe("vocab-emilia — אף מסיח אינו נרדף לתשובה הנכונה", () => {
  // כל קבוצה = מילים שמתחלפות זו בזו כתרגום. מסיח מקבוצת ה-correct = פסול.
  const SYNONYM_GROUPS: string[][] = [
    // עברית
    ["חיוני", "חשוב", "נחוץ", "הכרחי", "משמעותי", "מרכזי"],
    ["מסובך", "מורכב", "קשה", "כאוטי", "מאתגר"],
    ["מסוים", "מיוחד", "ייחודי", "ספציפי"],
    ["ברור", "מובן", "פשוט", "נראה"],
    ["מעניין", "מרתק", "מושך", "מסקרן"],
    ["רעיון", "מחשבה"],
    ["סיבה", "גורם"],
    ["מקום", "אזור"],
    ["מטרה", "כוונה"],
    ["להבין", "לדעת"],
    ["לבחור", "להחליט", "להעדיף"],
    ["להחליט", "לקבוע", "לבחור"],
    ["להצליח", "להשיג", "לנצח"],
    ["ליצור", "לבנות", "ליצר"],
    ["לזכור", "לשחזר"],
    ["לתאר", "להסביר", "לספר"],
    ["להשוות", "לבחון", "לבדוק"],
    ["לדמיין", "לחלום"],
    ["להציע", "להעלות"],
    ["אף על פי כן", "למרות זאת", "ובכל זאת", "אבל", "אולם"],
    ["למרות ש", "אף על פי", "אבל"],
    ["במקום זאת", "אחרת", "לחילופין"],
    ["יתרה מזאת", "בנוסף", "וגם", "מעבר לכך"],
    ["בסופו של דבר", "בסוף", "לבסוף"],
    ["מיד", "תכף", "מהר"],
    ["לאחרונה", "מזמן"],
    ["נבוך", "ביישן"],
    // אנגלית
    ["essential", "important", "necessary", "crucial"],
    ["world", "earth", "universe", "planet"],
    ["group", "team", "crowd"],
    ["story", "tale"],
    ["build", "create", "make", "form", "invent"],
    ["learn", "understand", "know"],
    ["teach", "guide"],
    ["change", "switch"],
    ["courage", "bravery"],
    ["emotion", "feeling"],
    ["hope", "dream", "wish"],
    ["worry", "concern", "fear", "stress"],
    ["announce", "notify"],
    ["encourage", "support", "inspire", "motivate"],
    ["warn", "alert", "caution"],
    ["listen", "hear", "attend"],
    ["assume", "suppose"],
    ["rare", "uncommon", "unusual", "scarce"],
    ["modern", "new", "current", "recent"],
    ["traditional", "classic"],
    ["ordinary", "normal", "usual", "common"],
    ["unique", "special", "distinct"],
    ["analyze", "examine", "study", "review"],
    ["prove", "demonstrate", "verify", "show"],
    ["summarize", "conclude"],
    ["check", "verify", "test", "examine"],
    ["publish", "release", "post"],
    ["recognize", "identify"],
    ["mention", "note"],
    ["prefer", "like"],
    ["similarly", "likewise", "alike", "equally"],
    ["in contrast", "unlike"],
    ["simultaneously", "meanwhile", "concurrently", "at the same time"],
    ["initially", "at first", "originally"],
    ["in principle", "basically", "essentially", "generally"],
  ];

  function groupOf(word: string): string[] | undefined {
    const w = word.toLowerCase();
    return SYNONYM_GROUPS.find((g) => g.some((x) => x.toLowerCase() === w));
  }

  it("לכל פריט: אף מסיח אינו באותה קבוצת-נרדפים כמו התשובה", () => {
    const offenders: string[] = [];
    for (const it of emi) {
      const group = groupOf(it.answer.correct);
      if (!group) continue;
      const inGroup = new Set(group.map((x) => x.toLowerCase()));
      for (const opt of it.answer.options) {
        if (opt === it.answer.correct) continue;
        if (inGroup.has(opt.toLowerCase())) {
          offenders.push(`${it.id}: "${opt}" נרדף ל-"${it.answer.correct}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
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
