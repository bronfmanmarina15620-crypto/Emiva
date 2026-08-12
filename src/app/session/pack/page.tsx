"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  addressFormOf,
  getActiveProfile,
  type AddressForm,
  type Profile,
} from "@/lib/profiles";
import { logEvent } from "@/lib/telemetry";
import { isItemCorrect, canonicalAnswer } from "@/lib/items";
import type { Item, BarModelItem, FractionItem } from "@/lib/types";
import {
  resolveActiveTarget,
  type PackItem,
  type ReviewPack,
} from "@/lib/review-packs";
import { BarModelViz } from "@/components/BarModelViz";
import { FractionViz } from "@/components/FractionViz";
import {
  correctMessage,
  retryMessage,
  revealIntro,
} from "@/lib/feedback-messages";
import Link from "next/link";

const MAX_ATTEMPTS = 3;

type Phase = "loading" | "active" | "retry" | "reveal" | "correct" | "summary";

export default function PackSessionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pack, setPack] = useState<ReviewPack | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [attemptCount, setAttemptCount] = useState(0);
  const [input, setInput] = useState("");
  const [stats, setStats] = useState({
    answered: 0,
    correct: 0,
    revealed: 0,
    offAppDone: 0,
  });
  const startAtRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const p = getActiveProfile();
    if (!p) {
      router.replace("/");
      return;
    }
    setProfile(p);
    const target = resolveActiveTarget(p);
    if (target.kind !== "pack") {
      router.replace("/session");
      return;
    }
    setPack(target.pack);
    startAtRef.current = Date.now();
    logEvent(p.id, {
      t: "session_start",
      at: Date.now(),
      skill: `pack:${target.pack.id}`,
    });
    setPhase("active");
  }, [router]);

  useEffect(() => {
    if (phase === "active" || phase === "retry") {
      const current = pack?.items[index];
      if (current && current.kind === "item" && needsTextInput(current.item))
        inputRef.current?.focus();
    }
  }, [phase, index, pack]);

  if (phase === "loading" || !pack || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  const total = pack.items.length;

  if (phase === "summary") {
    return (
      <main className="min-h-screen bg-cream p-6 flex items-center justify-center">
        <div className="bg-surface rounded-3xl shadow-soft p-6 max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            סיימת את החבילה
          </h1>
          <p className="text-sm text-warm-muted">{pack.name}</p>
          <div className="bg-cream rounded-2xl p-4 space-y-1 text-warm-dark">
            <p>
              ענית נכון על <strong>{stats.correct}</strong> מתוך{" "}
              <strong>{stats.answered}</strong> תרגילים בניסיון ראשון
            </p>
            {stats.revealed > 0 && (
              <p className="text-sm text-warm-muted">
                ב-{stats.revealed} תרגילים פתחנו יחד את הפתרון
              </p>
            )}
            {stats.offAppDone > 0 && (
              <p className="text-sm text-warm-muted">
                סיימת {stats.offAppDone} משימות דף
              </p>
            )}
          </div>
          <Link
            href="/"
            className="inline-block bg-terracotta text-white px-6 py-3 rounded-2xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
          >
            לדף הבית
          </Link>
        </div>
      </main>
    );
  }

  const current = pack.items[index];
  if (!current) {
    setPhase("summary");
    return null;
  }

  function advance() {
    setAttemptCount(0);
    setInput("");
    if (index + 1 >= total) {
      logEvent(profile!.id, {
        t: "session_end",
        at: Date.now(),
        skill: `pack:${pack!.id}`,
        answered: stats.answered + 1,
        correctFirstTry: stats.correct,
      });
      setPhase("summary");
    } else {
      setIndex(index + 1);
      setPhase("active");
    }
  }

  function handleSubmitInput(value: string) {
    if (!current || current.kind !== "item") return;
    const item = current.item;
    const correct = isItemCorrect(item, value);
    const newAttempt = attemptCount + 1;
    setAttemptCount(newAttempt);
    logEvent(profile!.id, {
      t: "attempt",
      at: Date.now(),
      itemId: item.id,
      attemptIdx: Math.min(2, newAttempt - 1) as 0 | 1 | 2,
      correct,
    });
    if (correct) {
      setStats((s) => ({
        answered: s.answered + 1,
        correct: s.correct + (attemptCount === 0 ? 1 : 0),
        revealed: s.revealed,
        offAppDone: s.offAppDone,
      }));
      setPhase("correct");
      return;
    }
    if (newAttempt >= MAX_ATTEMPTS) {
      logEvent(profile!.id, { t: "reveal", at: Date.now(), itemId: item.id });
      setStats((s) => ({
        answered: s.answered + 1,
        correct: s.correct,
        revealed: s.revealed + 1,
        offAppDone: s.offAppDone,
      }));
      setPhase("reveal");
      return;
    }
    setPhase("retry");
  }

  function handleOffAppDone() {
    setPhase("reveal");
  }

  function handleOffAppAdvance() {
    setStats((s) => ({ ...s, offAppDone: s.offAppDone + 1 }));
    advance();
  }

  return (
    <main className="min-h-screen bg-cream p-4 md:p-6">
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-display font-extrabold text-warm-dark">
            {pack.name}
          </h1>
          <p className="text-xs text-warm-muted">
            תרגיל {index + 1} מתוך {total}
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-warm-muted bg-surface px-3 py-1.5 rounded-xl shadow-soft hover:shadow-warm transition"
        >
          יציאה
        </Link>
      </header>

      <div className="max-w-2xl mx-auto space-y-4">
        <PackItemView
          packItem={current}
          addressForm={addressFormOf(profile)}
          phase={phase}
          attemptCount={attemptCount}
          input={input}
          onInputChange={setInput}
          onSubmitInput={handleSubmitInput}
          onAdvance={advance}
          onOffAppDone={handleOffAppDone}
          onOffAppAdvance={handleOffAppAdvance}
          inputRef={inputRef}
        />
      </div>
    </main>
  );
}

function needsTextInput(item: Item): boolean {
  if ("answer" in item && typeof item.answer === "number") return true;
  if (item.skill === "fractions_intro") {
    const fi = item as FractionItem;
    return (
      fi.answer.kind === "numeric" ||
      fi.answer.kind === "fraction" ||
      fi.answer.kind === "mixed"
    );
  }
  return false;
}

function PackItemView({
  packItem,
  addressForm,
  phase,
  attemptCount,
  input,
  onInputChange,
  onSubmitInput,
  onAdvance,
  onOffAppDone,
  onOffAppAdvance,
  inputRef,
}: {
  packItem: PackItem;
  addressForm: AddressForm;
  phase: Phase;
  attemptCount: number;
  input: string;
  onInputChange: (v: string) => void;
  onSubmitInput: (v: string) => void;
  onAdvance: () => void;
  onOffAppDone: () => void;
  onOffAppAdvance: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (packItem.kind === "off_app") {
    return (
      <OffAppView
        prompt={packItem.prompt}
        answerReveal={packItem.answerReveal}
        phase={phase}
        onDone={onOffAppDone}
        onAdvance={onOffAppAdvance}
      />
    );
  }

  const item = packItem.item;
  const locked = phase === "reveal" || phase === "correct";

  return (
    <>
      <ItemPrompt item={item} />

      {phase === "correct" && (
        <div className="bg-sage-soft rounded-2xl px-4 py-3 text-warm-dark space-y-2">
          <p className="font-semibold">{correctMessage(attemptCount === 1, Math.random, addressForm)}</p>
          <button
            type="button"
            onClick={onAdvance}
            className="w-full bg-sage text-white py-3 rounded-xl text-base font-semibold"
          >
            הלאה
          </button>
        </div>
      )}

      {phase === "retry" && (
        <div className="bg-mustard-soft rounded-2xl px-4 py-3 text-warm-dark">
          <p>{retryMessage(MAX_ATTEMPTS - attemptCount, Math.random, addressForm)}</p>
        </div>
      )}

      {phase === "reveal" && (
        <div className="bg-warm-indigo-soft rounded-2xl px-4 py-3 text-warm-dark space-y-3">
          <p>{revealIntro(Math.random, "problem", addressForm)}</p>
          <p>
            <span className="text-warm-muted">התשובה: </span>
            <strong>{canonicalAnswer(item)}</strong>
          </p>
          {"explanation" in item && item.explanation && (
            <p className="text-sm leading-relaxed">{item.explanation}</p>
          )}
          <button
            type="button"
            onClick={onAdvance}
            className="w-full bg-warm-indigo text-white py-3 rounded-xl text-base font-semibold"
          >
            הבנתי — המשך
          </button>
        </div>
      )}

      {(phase === "active" || phase === "retry") && (
        <ItemInput
          item={item}
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmitInput}
          locked={locked}
          inputRef={inputRef}
        />
      )}
    </>
  );
}

function ItemPrompt({ item }: { item: Item }) {
  if (item.skill === "bar_models") {
    const bm = item as BarModelItem;
    return (
      <div className="bg-surface rounded-3xl shadow-soft py-5 px-5 space-y-4">
        <p className="text-base md:text-lg text-right text-warm-dark leading-relaxed">
          {bm.prompt}
        </p>
        <BarModelViz bars={bm.bars} />
      </div>
    );
  }
  if (item.skill === "fractions_intro") {
    const fi = item as FractionItem;
    return (
      <div className="bg-surface rounded-3xl shadow-soft py-5 px-5 space-y-3 text-center">
        <p className="text-xl text-warm-dark leading-relaxed">{fi.prompt}</p>
        {fi.viz && (
          <div className="flex justify-center">
            <FractionViz parts={fi.viz.parts} filled={fi.viz.filled} width={240} height={80} />
          </div>
        )}
      </div>
    );
  }
  // arithmetic
  return (
    <div className="bg-surface rounded-3xl shadow-soft py-7 px-5 text-center">
      <p className="text-3xl md:text-4xl font-display font-extrabold text-warm-dark tabular-nums">
        {"prompt" in item ? item.prompt : ""}
      </p>
    </div>
  );
}

function ItemInput({
  item,
  input,
  onInputChange,
  onSubmit,
  locked,
  inputRef,
}: {
  item: Item;
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (v: string) => void;
  locked: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  // Fraction choice items
  if (item.skill === "fractions_intro") {
    const fi = item as FractionItem;
    if (fi.answer.kind === "choice") {
      return (
        <div className="grid grid-cols-2 gap-3">
          {fi.answer.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onSubmit(opt)}
              disabled={locked}
              className="bg-surface border-2 border-warm-line rounded-2xl p-4 shadow-soft hover:border-terracotta hover:shadow-warm transition disabled:opacity-60"
            >
              <span className="text-lg font-display font-extrabold text-warm-dark">
                {opt}
              </span>
            </button>
          ))}
        </div>
      );
    }
    const placeholder =
      fi.answer.kind === "mixed"
        ? "לדוגמה: 3 1/4 או 7 או 4/9"
        : fi.answer.kind === "fraction"
          ? "לדוגמה: 1/2"
          : "";
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() !== "") onSubmit(input);
        }}
        className="space-y-3"
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={locked}
          placeholder={placeholder}
          className="w-full text-2xl text-center bg-surface border-2 border-warm-line rounded-2xl py-3 focus:border-terracotta focus:outline-none disabled:bg-warm-line/30 text-warm-dark placeholder:text-warm-muted placeholder:text-base"
          autoFocus
        />
        <button
          type="submit"
          disabled={locked || input.trim() === ""}
          className="w-full bg-terracotta text-white py-3 rounded-2xl text-lg font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted hover:bg-terracotta-dark transition"
        >
          בדיקה
        </button>
      </form>
    );
  }

  // arithmetic / bar_models — numeric input
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (input.trim() !== "") onSubmit(input);
      }}
      className="space-y-3"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        disabled={locked}
        className="w-full text-3xl text-center bg-surface border-2 border-warm-line rounded-2xl py-3 focus:border-terracotta focus:outline-none tabular-nums disabled:bg-warm-line/30 text-warm-dark"
        autoFocus
      />
      <button
        type="submit"
        disabled={locked || input.trim() === ""}
        className="w-full bg-terracotta text-white py-3 rounded-2xl text-lg font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted hover:bg-terracotta-dark transition"
      >
        בדיקה
      </button>
    </form>
  );
}

function OffAppView({
  prompt,
  answerReveal,
  phase,
  onDone,
  onAdvance,
}: {
  prompt: string;
  answerReveal: string;
  phase: Phase;
  onDone: () => void;
  onAdvance: () => void;
}) {
  return (
    <div className="bg-surface rounded-3xl shadow-soft py-6 px-5 space-y-4">
      <div className="bg-cream rounded-2xl p-4 text-right text-warm-dark leading-relaxed">
        <p className="text-sm text-warm-muted mb-2">משימת דף</p>
        <p>{prompt}</p>
      </div>
      {phase !== "reveal" && phase !== "correct" && (
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-terracotta text-white py-3 rounded-2xl text-lg font-semibold shadow-warm hover:bg-terracotta-dark transition"
        >
          סיימתי — הראי לי את הפתרון
        </button>
      )}
      {(phase === "reveal" || phase === "correct") && (
        <>
          <div className="bg-warm-indigo-soft rounded-2xl p-4 text-warm-dark leading-relaxed">
            <p className="text-sm text-warm-muted mb-2">פתרון לבדיקה עצמית</p>
            <p>{answerReveal}</p>
          </div>
          <button
            type="button"
            onClick={onAdvance}
            className="w-full bg-warm-indigo text-white py-3 rounded-xl text-base font-semibold"
          >
            הבנתי — המשך
          </button>
        </>
      )}
    </div>
  );
}

