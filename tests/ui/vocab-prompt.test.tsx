import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VocabPrompt, wordFromPrompt } from "@/components/VocabPrompt";
import type { EnglishVocabItem } from "@/lib/types";

// CORE-ENGLISH-VOCAB-READALOUD-001 — הלקח מהפוניקה כבדיקת-רכיב.
//
// הבאג שנתפס בסקירת T2: פריט decode השמיע את המילה שהילדה הייתה
// אמורה לקרוא, והפך מבחן-קריאה למבחן-שמיעה. כאן הסכנה המקבילה היא
// פריט he_to_en — שם התשובה היא המילה האנגלית, והשמעתה מוסרת אותה.

const spoken: string[] = [];

function installSpeechMock() {
  spoken.length = 0;
  const synth = {
    speak: (u: { text: string }) => spoken.push(u.text),
    cancel: () => {},
    getVoices: () => [{ name: "Test EN", lang: "en-US" }],
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal("speechSynthesis", synth);
  Object.defineProperty(window, "speechSynthesis", {
    value: synth,
    configurable: true,
    writable: true,
  });
  class U {
    text: string;
    lang = "";
    rate = 1;
    voice: unknown = null;
    constructor(t: string) {
      this.text = t;
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", U);
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: U,
    configurable: true,
    writable: true,
  });
}

function enItem(): EnglishVocabItem {
  return {
    id: "eve-001",
    skill: "english_vocab",
    difficulty: 1,
    type: "en_to_he",
    category: "animals",
    prompt: "What does 'cat' mean?",
    answer: {
      kind: "choice",
      correct: "חתול",
      options: ["חתול", "כלב", "פיל", "ארנב"],
    },
    explanation: "c-a-t — שלושה צלילים, בדיוק כמו שלמדת לפרק. חתול.",
  };
}

function heItem(): EnglishVocabItem {
  return {
    id: "eve-006",
    skill: "english_vocab",
    difficulty: 1,
    type: "he_to_en",
    category: "places",
    prompt: "מה זה 'בית' באנגלית?",
    answer: {
      kind: "choice",
      correct: "house",
      options: ["school", "park", "store", "house"],
    },
    explanation: "house — בית. ה-ou באמצע עושה \"אָוּ\".",
  };
}

describe("<VocabPrompt>", () => {
  beforeEach(installSpeechMock);
  afterEach(() => vi.unstubAllGlobals());

  it("extracts the taught word from the quoted prompt", () => {
    expect(wordFromPrompt("What does 'cat' mean?")).toBe("cat");
    expect(wordFromPrompt("מה זה 'בית' באנגלית?")).toBe("בית");
    expect(wordFromPrompt("no quotes here")).toBeNull();
  });

  it("offers audio when the question itself is written in English", () => {
    render(<VocabPrompt item={enItem()} rate={0.7} onRateChange={() => {}} />);
    expect(screen.getByLabelText("השמעת המילה")).toBeTruthy();
  });

  it("speaks only the word, not the surrounding English question", () => {
    render(<VocabPrompt item={enItem()} rate={0.7} onRateChange={() => {}} />);
    screen.getByLabelText("השמעת המילה").click();
    expect(spoken).toEqual(["cat"]);
    // `what`, `does` ו-`mean` הן מילות-עזר שמטביעות את המילה הנלמדת.
    expect(spoken.join(" ")).not.toContain("What does");
  });

  // הבדיקה המרכזית — הלקח מ-decode.
  it("stays silent when the answer is the English word", () => {
    render(<VocabPrompt item={heItem()} rate={0.7} onRateChange={() => {}} />);
    expect(screen.queryByLabelText("השמעת המילה")).toBeNull();
    expect(spoken).toEqual([]);
  });

  it("renders the English question left-to-right", () => {
    const { container } = render(
      <VocabPrompt item={enItem()} rate={0.7} onRateChange={() => {}} />,
    );
    const prompt = container.querySelector('[dir="ltr"]');
    expect(prompt?.textContent).toContain("What does 'cat' mean?");
  });
});
