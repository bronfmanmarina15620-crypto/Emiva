import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhonicsPrompt } from "@/components/PhonicsPrompt";
import type { EnglishPhonicsItem } from "@/lib/types";

// CORE-ENGLISH-PHONICS-002 — הלקח מהסקירה השנייה כבדיקת-רכיב.
//
// הבדיקות על המאגר לבדו לא יכלו לתפוס את הבאג: הן אימתו טקסט, והבאג
// היה בשמע. כאן מרנדרים את הרכיב באמת ומאזינים ל-speechSynthesis.

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
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", U);
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: U,
    configurable: true,
    writable: true,
  });
}

const decodeItem: EnglishPhonicsItem = {
  id: "phe-d4-001",
  skill: "english_phonics",
  difficulty: 4,
  type: "decode",
  focus: "rabbit",
  parts: ["rab", "bit"],
  say: "rabbit",
  prompt: "מילה של שתי הברות. קראי אותה בעצמך — מה היא אומרת?",
  answer: {
    kind: "choice",
    correct: "ארנב",
    options: ["עכבר", "ארנב", "שועל", "צב"],
  },
  explanation: "rabbit מתפרקת ל-rab + bit = ארנב.",
};

const blendItem: EnglishPhonicsItem = {
  id: "phe-d1-001",
  skill: "english_phonics",
  difficulty: 1,
  type: "blend",
  focus: "hop",
  parts: ["h", "o", "p"],
  say: "hop",
  prompt: "לחצי על הרמקול. איזו מילה נוצרה מהצלילים?",
  answer: {
    kind: "choice",
    correct: "hop",
    options: ["hip", "hop", "hot", "top"],
  },
  explanation: "h-o-p מתחברים ל-hop.",
};

beforeEach(() => {
  installSpeechMock();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("<PhonicsPrompt> — decode items must not speak the answer", () => {
  it("renders no speaker button for a decode item", () => {
    render(
      <PhonicsPrompt item={decodeItem} rate={0.7} onRateChange={() => {}} />,
    );
    expect(screen.queryByLabelText("השמעה")).toBeNull();
  });

  it("says nothing at all for a decode item, even after autoplay delay", () => {
    render(
      <PhonicsPrompt item={decodeItem} rate={0.7} onRateChange={() => {}} />,
    );
    vi.advanceTimersByTime(2000);
    expect(spoken).toEqual([]);
  });

  it("shows the word so she can read it", () => {
    render(
      <PhonicsPrompt item={decodeItem} rate={0.7} onRateChange={() => {}} />,
    );
    expect(screen.getByText("rabbit")).toBeTruthy();
  });

  it("explains that there is no audio at this stage", () => {
    render(
      <PhonicsPrompt item={decodeItem} rate={0.7} onRateChange={() => {}} />,
    );
    expect(screen.getByText(/קוראת את המילה בעצמך/)).toBeTruthy();
  });
});

describe("<PhonicsPrompt> — blend items do speak, and hide the word", () => {
  it("offers a speaker button", () => {
    render(
      <PhonicsPrompt item={blendItem} rate={0.7} onRateChange={() => {}} />,
    );
    expect(screen.getByLabelText("השמעה")).toBeTruthy();
  });

  it("does not display the word it is asking for", () => {
    render(
      <PhonicsPrompt item={blendItem} rate={0.7} onRateChange={() => {}} />,
    );
    // המילה היא התשובה — אסור שתופיע כגליף גדול מעל השאלה.
    expect(screen.queryByText("hop")).toBeNull();
  });
});
