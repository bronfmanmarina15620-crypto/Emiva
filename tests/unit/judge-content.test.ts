import { describe, expect, it } from "vitest";
// @ts-expect-error — סקריפט .mjs בלי טיפוסים; הבדיקה מריצה אותו כפי שהוא.
import { judgeItems } from "../../scripts/judge-content.mjs";

// CONTENT-JUDGE-001: השופט הוא בקרת-מבנה. הטסט הזה מזריק כל סוג באג
// שהשופט אמור לתפוס ומוודא שהוא אכן תופס — ההוכחה שאחרת נעשית ידנית
// ונמחקת (עקרון-איכות #1: בדיקה שלא רצה = לא קיימת).

const COMP = { kind: "comprehension" } as const;
const VOCAB = { kind: "vocab" } as const;

/** פריט הבנת-נקרא תקין — בסיס להזרקת באגים. */
function goodComp(overrides: Record<string, unknown> = {}) {
  return {
    id: "t-001",
    skill: "hebrew_comprehension",
    difficulty: 1,
    text: "החתול ישב על הגג וצפה בציפורים. הוא היה סקרן מאוד.",
    questions: [
      {
        question: "איפה ישב החתול?",
        options: ["על הגג", "בגינה", "במטבח", "על העץ"],
        correctIndex: 0,
        explanation: "כתוב במפורש שהחתול ישב על הגג.",
      },
      {
        question: "מה החתול הרגיש?",
        options: ["סקרנות", "פחד", "שעמום", "רעב"],
        correctIndex: 0,
        explanation: "כתוב שהוא היה סקרן מאוד.",
      },
    ],
    source_type: "story",
    topic: "animals",
  };
}

/** פריט אוצר-מילים תקין. */
function goodVocab(overrides: Record<string, unknown> = {}) {
  return {
    id: "v-001",
    skill: "english_vocab",
    difficulty: 1,
    type: "en_to_he",
    category: "animals",
    prompt: "What does 'cat' mean?",
    answer: { kind: "choice", correct: "חתול", options: ["חתול", "כלב", "פיל", "ארנב"] },
    ...overrides,
  };
}

type Finding = { severity: string; rule: string };
const rules = (findings: Finding[]) => findings.map((f: Finding) => f.rule);

describe("judge-content — תופס כשלי מבנה", () => {
  it("מאגר תקין → אין ממצאים", () => {
    expect(judgeItems([goodComp()], COMP)).toEqual([]);
    expect(judgeItems([goodVocab()], VOCAB)).toEqual([]);
  });

  it("שתי תשובות נכונות (אפשרות כפולה = הנכונה) → error", () => {
    const item = goodVocab();
    item.answer.options = ["חתול", "חתול", "פיל", "ארנב"];
    const found = judgeItems([item], VOCAB);
    expect(rules(found)).toContain("duplicate-option");
    expect(found.some((f: Finding) => f.severity === "error")).toBe(true);
  });

  it("התשובה הנכונה לא ברשימת האפשרויות → error", () => {
    const item = goodVocab();
    item.answer.correct = "סוס";
    expect(rules(judgeItems([item], VOCAB))).toContain("correct-not-in-options");
  });

  it("אפשרות ריקה → error", () => {
    const item = goodVocab();
    item.answer.options = ["חתול", "", "פיל", "ארנב"];
    expect(rules(judgeItems([item], VOCAB))).toContain("empty-option");
  });

  it("אפשרות שאינה טקסט → error, בלי קריסה", () => {
    const item = goodVocab();
    // @ts-expect-error — הזרקת ערך פסול בכוונה.
    item.answer.options = ["חתול", null, "פיל", "ארנב"];
    const found = judgeItems([item], VOCAB);
    expect(rules(found)).toContain("non-text-option");
    expect(rules(found)).not.toContain("checker-crash");
  });

  it("הסבר חסר בהבנת הנקרא → error", () => {
    const item = goodComp();
    item.questions[0]!.explanation = "";
    expect(rules(judgeItems([item], COMP))).toContain("missing-explanation");
  });

  it("correctIndex מחוץ לטווח → error", () => {
    const item = goodComp();
    item.questions[0]!.correctIndex = 7;
    expect(rules(judgeItems([item], COMP))).toContain("bad-correct-index");
  });

  it("ביטוי fixed-mindset בהסבר → error", () => {
    const item = goodComp();
    item.questions[0]!.explanation = "טעית, זו לא התשובה.";
    expect(rules(judgeItems([item], COMP))).toContain("fixed-mindset");
  });

  it("מזהה כפול → error", () => {
    const found = judgeItems([goodComp(), goodComp()], COMP);
    expect(rules(found)).toContain("duplicate-id");
  });

  it("טקסט כפול בין קטעים → error", () => {
    const a = goodComp();
    const b = goodComp();
    b.id = "t-002";
    expect(rules(judgeItems([a, b], COMP))).toContain("duplicate-text");
  });

  it("פריט null → מדווח, לא מקריס את הריצה", () => {
    const found = judgeItems([goodVocab(), null], VOCAB);
    expect(rules(found)).toContain("bad-item");
    expect(rules(found)).not.toContain("checker-crash");
  });

  it("options שאינו מערך → מדווח, לא מקריס", () => {
    const item = goodVocab();
    // @ts-expect-error — הזרקת טיפוס פסול.
    item.answer.options = "not-an-array";
    const found = judgeItems([item], VOCAB);
    expect(rules(found)).toContain("bad-options");
    expect(rules(found)).not.toContain("checker-crash");
  });
});
