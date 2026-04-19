"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import addSubBank from "@/content/math/add-sub-100.json";
import fractionsBank from "@/content/math/fractions-intro.json";
import type {
  FractionItem,
  Item,
  MasteryState,
  Skill,
} from "@/lib/types";
import { MASTERY_TARGET } from "@/lib/types";
import {
  emptyMastery,
  incrementSession,
  masteryScore,
  recordAttempt,
} from "@/lib/mastery";
import { applySrsUpdate, decaySrsForNewSession } from "@/lib/srs";
import { selectNextItem } from "@/lib/adaptive";
import {
  loadLastSessionTime,
  loadMastery,
  saveLastSessionTime,
  saveMastery,
} from "@/lib/storage";
import { buildGreeting } from "@/lib/greetings";
import { explain } from "@/lib/explain";
import {
  correctMessage,
  retryMessage,
  revealIntro,
} from "@/lib/feedback-messages";
import { exportTelemetry, logEvent } from "@/lib/telemetry";
import {
  getActiveProfile,
  setActiveProfileId,
  type Profile,
} from "@/lib/profiles";
import { MasteryJar } from "@/components/MasteryJar";
import { FractionViz } from "@/components/FractionViz";
import { isItemCorrect } from "@/lib/items";
import { parseFraction } from "@/lib/fractions";

const ITEMS_PER_SESSION = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_ITEMS_PER_SESSION) || 10,
);
const MAX_ATTEMPTS = 3;

const ADD_SUB_BANK = addSubBank as unknown as readonly Item[];
const FRACTIONS_BANK = fractionsBank as unknown as readonly Item[];

function bankForSkill(skill: Skill): readonly Item[] {
  return skill === "add_sub_100" ? ADD_SUB_BANK : FRACTIONS_BANK;
}

type Phase =
  | "loading"
  | "no_content"
  | "welcome"
  | "active"
  | "retry"
  | "reveal"
  | "correct"
  | "summary";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function fireCelebration(): Promise<void> {
  if (prefersReducedMotion()) return;
  const mod = await import("canvas-confetti");
  const confetti = mod.default;
  const colors = ["#E87A5D", "#7BA881", "#F5C26B", "#6B8ACE"];
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.35 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, colors });
  }, 250);
}

export default function SessionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<MasteryState>(() =>
    emptyMastery("add_sub_100"),
  );
  const [current, setCurrent] = useState<Item | null>(null);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [retryText, setRetryText] = useState("");
  const [correctText, setCorrectText] = useState("");
  const [revealText, setRevealText] = useState("");
  const [input, setInput] = useState("");
  const [greeting, setGreeting] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const startMasteryRef = useRef(0);
  const celebratedRef = useRef(false);
  const firstItemRef = useRef<Item | null>(null);

  useEffect(() => {
    const active = getActiveProfile();
    if (!active) {
      router.replace("/");
      return;
    }
    setProfile(active);

    const chosenSkill = active.allowedSkills[0];
    if (!chosenSkill) {
      setPhase("no_content");
      return;
    }
    setSkill(chosenSkill);

    const bank = bankForSkill(chosenSkill);
    const loaded = loadMastery(active.id, chosenSkill);
    const fresh = incrementSession(decaySrsForNewSession(loaded));
    startMasteryRef.current = masteryScore(loaded);
    const first = selectNextItem(fresh, bank, new Set());
    setState(fresh);
    firstItemRef.current = first;
    setGreeting(buildGreeting(loadLastSessionTime(active.id), active.name));
    setPhase(first ? "welcome" : "summary");
  }, [router]);

  useEffect(() => {
    if (phase === "active" || phase === "retry") {
      // Only auto-focus numeric inputs; choice-based items use buttons.
      if (current && needsTextInput(current)) inputRef.current?.focus();
    }
  }, [phase, current]);

  useEffect(() => {
    if (phase !== "summary" || celebratedRef.current) return;
    const endMastery = masteryScore(state);
    const crossed =
      endMastery >= MASTERY_TARGET && startMasteryRef.current < MASTERY_TARGET;
    if (crossed) {
      celebratedRef.current = true;
      void fireCelebration();
    }
  }, [phase, state]);

  const progress = useMemo(
    () => `${answered} / ${ITEMS_PER_SESSION}`,
    [answered],
  );

  function beginSession() {
    if (!profile || !skill) return;
    const first = firstItemRef.current;
    if (!first) {
      setPhase("summary");
      return;
    }
    setCurrent(first);
    saveLastSessionTime(profile.id);
    logEvent(profile.id, {
      t: "session_start",
      at: Date.now(),
      skill,
    });
    logEvent(profile.id, {
      t: "item_shown",
      at: Date.now(),
      itemId: first.id,
      difficulty: first.difficulty,
    });
    setPhase("active");
  }

  function finishItem(correct: boolean) {
    if (!current || !profile) return;
    const next = applySrsUpdate(
      recordAttempt(state, current.id, correct),
      current.id,
      correct,
    );
    setState(next);
    saveMastery(profile.id, next);
    if (correct) setCorrectCount((c) => c + 1);
    setAnswered((n) => n + 1);
  }

  function processAnswer(rawInput: string) {
    if (!current || !profile) return;
    if (phase !== "active" && phase !== "retry") return;
    if (rawInput.trim() === "") return;

    const correct = isItemCorrect(current, rawInput);
    const nextAttempts = attempts + 1;
    const attemptIdx = attempts as 0 | 1 | 2;
    logEvent(profile.id, {
      t: "attempt",
      at: Date.now(),
      itemId: current.id,
      attemptIdx,
      correct,
    });

    if (correct) {
      finishItem(attempts === 0);
      const text = correctMessage(attempts === 0);
      setCorrectText(text);
      logEvent(profile.id, {
        t: "feedback_text",
        at: Date.now(),
        kind: "correct",
        text,
      });
      setPhase("correct");
      return;
    }

    if (nextAttempts < MAX_ATTEMPTS) {
      const attemptsLeft = MAX_ATTEMPTS - nextAttempts;
      const text = retryMessage(attemptsLeft);
      setAttempts(nextAttempts);
      setRetryText(text);
      logEvent(profile.id, {
        t: "feedback_text",
        at: Date.now(),
        kind: "retry",
        text,
      });
      setInput("");
      setPhase("retry");
      return;
    }

    finishItem(false);
    const text = revealIntro();
    setRevealText(text);
    logEvent(profile.id, {
      t: "reveal",
      at: Date.now(),
      itemId: current.id,
    });
    logEvent(profile.id, {
      t: "feedback_text",
      at: Date.now(),
      kind: "reveal",
      text,
    });
    setPhase("reveal");
  }

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    processAnswer(input);
  }

  function submitChoice(choice: string) {
    setInput(choice);
    processAnswer(choice);
  }

  function advance() {
    if (!profile || !skill) return;
    const newUsed = current
      ? new Set([...usedIds, current.id])
      : new Set(usedIds);
    setUsedIds(newUsed);
    setInput("");
    setAttempts(0);

    if (answered >= ITEMS_PER_SESSION) {
      logEvent(profile.id, {
        t: "session_end",
        at: Date.now(),
        skill,
        answered,
        correctFirstTry: correctCount,
      });
      setPhase("summary");
      return;
    }
    const next = selectNextItem(state, bankForSkill(skill), newUsed);
    if (!next) {
      logEvent(profile.id, {
        t: "session_end",
        at: Date.now(),
        skill,
        answered,
        correctFirstTry: correctCount,
      });
      setPhase("summary");
      return;
    }
    setCurrent(next);
    logEvent(profile.id, {
      t: "item_shown",
      at: Date.now(),
      itemId: next.id,
      difficulty: next.difficulty,
    });
    setPhase("active");
  }

  function switchProfile() {
    setActiveProfileId(null);
    router.push("/");
  }

  if (phase === "loading") {
    return <CenteredMessage>טוען…</CenteredMessage>;
  }

  if (phase === "no_content" && profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-surface rounded-3xl shadow-soft p-8 space-y-3">
            <h1 className="text-2xl font-display font-extrabold text-warm-dark">
              {profile.name}, בקרוב ✨
            </h1>
            <p className="text-warm-muted leading-relaxed">
              אנחנו מכינים תכני מתמטיקה מיוחדים בשבילך. נהיה מוכנים עוד מעט.
            </p>
          </div>
          <button
            type="button"
            onClick={switchProfile}
            className="text-terracotta hover:text-terracotta-dark text-sm underline"
          >
            למסך הפתיחה
          </button>
        </div>
      </main>
    );
  }

  if (phase === "welcome") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-surface rounded-3xl shadow-soft py-10 px-8 space-y-2">
            <p className="text-2xl font-display font-extrabold text-warm-dark leading-relaxed">
              {greeting}
            </p>
            <p className="text-warm-muted text-sm">מוכנה להתחיל?</p>
          </div>
          <button
            type="button"
            onClick={beginSession}
            className="bg-terracotta text-white px-10 py-4 rounded-3xl text-xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
            autoFocus
          >
            נתחיל
          </button>
          <button
            type="button"
            onClick={switchProfile}
            className="block mx-auto text-warm-muted hover:text-terracotta text-xs"
          >
            החלפת משתמשת
          </button>
        </div>
      </main>
    );
  }

  if (phase === "summary") {
    const acc = answered === 0 ? 0 : correctCount / answered;
    const endMastery = masteryScore(state);
    const delta = endMastery - startMasteryRef.current;
    const ready = endMastery >= MASTERY_TARGET;
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-4xl font-display font-extrabold text-warm-dark">
            סיימת את הסשן!
          </h1>

          <div className="flex justify-center">
            <MasteryJar value={endMastery} size={200} />
          </div>
          <p className="text-sm text-warm-muted -mt-4">
            שליטה {delta >= 0 ? "עלתה" : "ירדה"} ב־
            {Math.abs(Math.round(delta * 100))}%
          </p>

          <div className="bg-surface rounded-3xl shadow-soft p-6 space-y-3 text-right">
            <Stat label="ניסיון ראשון" value={`${correctCount} / ${answered}`} />
            <Stat label="דיוק בסשן" value={`${Math.round(acc * 100)}%`} />
          </div>

          {ready ? (
            <p className="text-sage font-semibold text-lg">
              הגעת ליעד 80% — מוכנה לשלב הבא ✨
            </p>
          ) : (
            <p className="text-warm-muted">
              יעד: 80% שליטה. עוד סשן-שניים ונגיע.
            </p>
          )}

          <a
            href="/session"
            className="inline-block bg-terracotta text-white px-8 py-4 rounded-3xl text-lg font-semibold shadow-warm hover:bg-terracotta-dark transition"
          >
            סשן חדש
          </a>

          <div className="flex justify-between items-center text-xs text-warm-muted/70 pt-2">
            <button
              type="button"
              onClick={switchProfile}
              className="hover:text-terracotta"
            >
              החלפת משתמשת
            </button>
            <details className="text-right">
              <summary className="cursor-pointer">הורי/ה: ייצוא</summary>
              <button
                type="button"
                onClick={() => {
                  if (!profile) return;
                  const blob = new Blob([exportTelemetry(profile.id)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `telemetry-${profile.id.slice(0, 8)}-${new Date()
                    .toISOString()
                    .slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="mt-2 text-xs bg-warm-line/50 text-warm-muted px-3 py-1.5 rounded-lg"
              >
                הורדת telemetry.json
              </button>
            </details>
          </div>
        </div>
      </main>
    );
  }

  const formLocked = phase === "correct" || phase === "reveal";

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-cream">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-between items-center text-sm text-warm-muted">
          <span>{progress}</span>
          <span>שליטה: {Math.round(masteryScore(state) * 100)}%</span>
        </div>

        {current && (
          <ItemPrompt item={current} />
        )}

        {current && (
          <ItemInput
            item={current}
            input={input}
            setInput={setInput}
            locked={formLocked}
            onSubmitText={submitText}
            onChoose={submitChoice}
            inputRef={inputRef}
          />
        )}

        {phase === "retry" && (
          <div className="text-center text-lg font-semibold py-4 px-5 rounded-2xl bg-mustard-soft text-warm-dark border border-mustard">
            {retryText}
          </div>
        )}

        {phase === "correct" && current && (
          <div className="text-center text-xl font-semibold py-5 px-5 rounded-2xl bg-sage-soft text-warm-dark space-y-3 border border-sage/40">
            <div>{correctText}</div>
            <button
              onClick={advance}
              className="bg-surface text-sage px-5 py-2 rounded-xl text-base font-semibold shadow-soft hover:shadow-warm transition"
            >
              המשך
            </button>
          </div>
        )}

        {phase === "reveal" && current && (
          <ItemReveal item={current} introText={revealText} onAdvance={advance} />
        )}
      </div>
    </main>
  );
}

function needsTextInput(item: Item): boolean {
  if (item.skill === "add_sub_100") return true;
  return item.answer.kind === "numeric" || item.answer.kind === "fraction";
}

function ItemPrompt({ item }: { item: Item }) {
  if (item.skill === "add_sub_100") {
    return (
      <div className="bg-surface rounded-3xl shadow-soft py-10 px-6">
        <div className="text-7xl font-display font-extrabold text-center tabular-nums text-warm-dark">
          {item.prompt}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-3xl shadow-soft py-8 px-6 space-y-5">
      <div className="text-2xl font-display font-extrabold text-center text-warm-dark">
        {item.prompt}
      </div>
      {item.viz && (
        <div className="flex justify-center">
          <FractionViz parts={item.viz.parts} filled={item.viz.filled} />
        </div>
      )}
    </div>
  );
}

type InputProps = {
  item: Item;
  input: string;
  setInput: (v: string) => void;
  locked: boolean;
  onSubmitText: (e: React.FormEvent) => void;
  onChoose: (choice: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

function ItemInput({
  item,
  input,
  setInput,
  locked,
  onSubmitText,
  onChoose,
  inputRef,
}: InputProps) {
  if (item.skill === "add_sub_100") {
    return (
      <form onSubmit={onSubmitText} className="space-y-4">
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={locked}
          className="w-full text-4xl text-center bg-surface border-2 border-warm-line rounded-2xl py-4 focus:border-terracotta focus:outline-none tabular-nums disabled:bg-warm-line/30 text-warm-dark"
          autoFocus
        />
        <button
          type="submit"
          disabled={locked || input.trim() === ""}
          className="w-full bg-terracotta text-white py-4 rounded-2xl text-xl font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none hover:bg-terracotta-dark transition"
        >
          בדיקה
        </button>
      </form>
    );
  }

  const frac = item as FractionItem;

  if (frac.answer.kind === "choice") {
    const isVisualType = frac.type === "name_to_visual";
    return (
      <div
        className={`grid gap-3 ${
          isVisualType ? "grid-cols-2" : frac.answer.options.length === 2 ? "grid-cols-2" : "grid-cols-2"
        }`}
      >
        {frac.answer.options.map((opt) => {
          const parsed = parseFraction(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChoose(opt)}
              disabled={locked}
              className="bg-surface border-2 border-warm-line rounded-2xl p-4 shadow-soft hover:border-terracotta hover:shadow-warm transition disabled:opacity-60 disabled:hover:border-warm-line disabled:hover:shadow-soft flex flex-col items-center gap-2"
            >
              {isVisualType && parsed && (
                <FractionViz
                  parts={parsed.den}
                  filled={parsed.num}
                  width={140}
                  height={48}
                />
              )}
              <span className="text-2xl font-display font-extrabold text-warm-dark tabular-nums">
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // numeric or fraction text input
  const isFraction = frac.answer.kind === "fraction";
  return (
    <form onSubmit={onSubmitText} className="space-y-4">
      <input
        ref={inputRef}
        type="text"
        inputMode={isFraction ? "text" : "numeric"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={locked}
        placeholder={isFraction ? "לדוגמה: 1/2" : ""}
        className="w-full text-4xl text-center bg-surface border-2 border-warm-line rounded-2xl py-4 focus:border-terracotta focus:outline-none tabular-nums disabled:bg-warm-line/30 text-warm-dark placeholder:text-warm-muted placeholder:text-xl"
        autoFocus
      />
      <button
        type="submit"
        disabled={locked || input.trim() === ""}
        className="w-full bg-terracotta text-white py-4 rounded-2xl text-xl font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none hover:bg-terracotta-dark transition"
      >
        בדיקה
      </button>
    </form>
  );
}

function ItemReveal({
  item,
  introText,
  onAdvance,
}: {
  item: Item;
  introText: string;
  onAdvance: () => void;
}) {
  if (item.skill === "add_sub_100") {
    return (
      <div className="text-right py-5 px-5 rounded-2xl bg-warm-indigo-soft border border-warm-indigo/30 space-y-3">
        <div className="text-lg font-semibold text-warm-dark">
          {introText}{" "}
          <span className="font-display font-extrabold text-warm-indigo">
            {item.answer}
          </span>
        </div>
        <div className="text-base text-warm-dark leading-relaxed">
          {explain(item)}
        </div>
        <button
          onClick={onAdvance}
          className="w-full bg-warm-indigo text-white py-3 rounded-xl text-base font-semibold hover:brightness-95 transition"
        >
          הבנתי — המשך
        </button>
      </div>
    );
  }

  const answerText = canonicalFractionAnswer(item);
  return (
    <div className="text-right py-5 px-5 rounded-2xl bg-warm-indigo-soft border border-warm-indigo/30 space-y-3">
      <div className="text-lg font-semibold text-warm-dark">
        {introText}{" "}
        <span className="font-display font-extrabold text-warm-indigo tabular-nums">
          {answerText}
        </span>
      </div>
      {item.viz && (
        <div className="flex justify-center py-2">
          <FractionViz parts={item.viz.parts} filled={item.viz.filled} />
        </div>
      )}
      <div className="text-base text-warm-dark leading-relaxed">
        {item.explanation}
      </div>
      <button
        onClick={onAdvance}
        className="w-full bg-warm-indigo text-white py-3 rounded-xl text-base font-semibold hover:brightness-95 transition"
      >
        הבנתי — המשך
      </button>
    </div>
  );
}

function canonicalFractionAnswer(item: FractionItem): string {
  switch (item.answer.kind) {
    case "choice":
      return item.answer.correct;
    case "numeric":
      return String(item.answer.correct);
    case "fraction":
      return `${item.answer.num}/${item.answer.den}`;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-warm-muted">{label}</span>
      <span className="font-display font-extrabold text-warm-dark text-xl">
        {value}
      </span>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-cream">
      <div className="text-lg text-warm-muted">{children}</div>
    </main>
  );
}
