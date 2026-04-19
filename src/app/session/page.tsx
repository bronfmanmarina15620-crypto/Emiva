"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import bank from "@/content/math/add-sub-100.json";
import type { Item, MasteryState } from "@/lib/types";
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
  profileAllowsSkill,
  setActiveProfileId,
  type Profile,
} from "@/lib/profiles";
import { MasteryJar } from "@/components/MasteryJar";

const ITEMS_PER_SESSION = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_ITEMS_PER_SESSION) || 10,
);
const MAX_ATTEMPTS = 3;
const SKILL = "add_sub_100" as const;
const TYPED_BANK = bank as unknown as readonly Item[];

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
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<MasteryState>(() => emptyMastery(SKILL));
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

    if (!profileAllowsSkill(active, SKILL)) {
      setPhase("no_content");
      return;
    }

    const loaded = loadMastery(active.id, SKILL);
    const fresh = incrementSession(decaySrsForNewSession(loaded));
    startMasteryRef.current = masteryScore(loaded);
    const first = selectNextItem(fresh, TYPED_BANK, new Set());
    setState(fresh);
    firstItemRef.current = first;
    setGreeting(buildGreeting(loadLastSessionTime(active.id), active.name));
    setPhase(first ? "welcome" : "summary");
  }, [router]);

  useEffect(() => {
    if (phase === "active" || phase === "retry") inputRef.current?.focus();
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
    if (!profile) return;
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
      skill: SKILL,
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !profile) return;
    if (phase !== "active" && phase !== "retry") return;
    const parsed = Number(input.trim());
    if (input.trim() === "" || Number.isNaN(parsed)) return;

    const correct = parsed === current.answer;
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

  function advance() {
    if (!profile) return;
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
        skill: SKILL,
        answered,
        correctFirstTry: correctCount,
      });
      setPhase("summary");
      return;
    }
    const next = selectNextItem(state, TYPED_BANK, newUsed);
    if (!next) {
      logEvent(profile.id, {
        t: "session_end",
        at: Date.now(),
        skill: SKILL,
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
          <div className="bg-surface rounded-3xl shadow-soft py-10 px-6">
            <div className="text-7xl font-display font-extrabold text-center tabular-nums text-warm-dark">
              {current.prompt}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={formLocked}
            className="w-full text-4xl text-center bg-surface border-2 border-warm-line rounded-2xl py-4 focus:border-terracotta focus:outline-none tabular-nums disabled:bg-warm-line/30 text-warm-dark"
            autoFocus
          />
          <button
            type="submit"
            disabled={formLocked || input.trim() === ""}
            className="w-full bg-terracotta text-white py-4 rounded-2xl text-xl font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none hover:bg-terracotta-dark transition"
          >
            בדיקה
          </button>
        </form>

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
          <div className="text-right py-5 px-5 rounded-2xl bg-warm-indigo-soft border border-warm-indigo/30 space-y-3">
            <div className="text-lg font-semibold text-warm-dark">
              {revealText}{" "}
              <span className="font-display font-extrabold text-warm-indigo">
                {current.answer}
              </span>
            </div>
            <div className="text-base text-warm-dark leading-relaxed">
              {explain(current)}
            </div>
            <button
              onClick={advance}
              className="w-full bg-warm-indigo text-white py-3 rounded-xl text-base font-semibold hover:brightness-95 transition"
            >
              הבנתי — המשך
            </button>
          </div>
        )}
      </div>
    </main>
  );
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
