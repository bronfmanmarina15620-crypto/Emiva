"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasPinSet } from "@/lib/parent-auth";
import { loadProfiles, type Profile } from "@/lib/profiles";
import {
  computeVerdict,
  holdoutForSkill,
  MEASURABLE_SKILLS,
  pickTestItems,
  saveResult,
  verdictBadge,
  verdictHebrew,
} from "@/lib/measurement";
import { isItemCorrect } from "@/lib/items";
import { logEvent } from "@/lib/telemetry";
import { FractionViz } from "@/components/FractionViz";
import { parseFraction } from "@/lib/fractions";
import {
  DASHBOARD_TIMEOUT_MS,
  type ExternalTestResult,
  type ExternalTestVerdict,
  type FractionItem,
  type Item,
  type Skill,
} from "@/lib/types";

const SKILL_HEBREW: Record<Skill, string> = {
  add_sub_100: "חיבור וחיסור עד 100",
  fractions_intro: "שברים",
  ops_1000: "פעולות עד 1000",
  multiplication: "לוח הכפל",
  long_division: "חילוק ארוך",
  bar_models: "בעיות מילוליות (Bar Models)",
  hebrew_comprehension: "הבנת הנקרא בעברית",
};

type Stage =
  | { kind: "pick" }
  | { kind: "test"; profile: Profile; skill: Skill; items: readonly Item[]; index: number; score: number; lastFeedback: "correct" | "wrong" | null }
  | { kind: "summary"; profile: Profile; skill: Skill; result: ExternalTestResult };

const VERDICT_TONE: Record<ExternalTestVerdict, string> = {
  passed: "bg-sage-soft text-warm-dark",
  gap: "bg-mustard-soft text-warm-dark",
  false_mastery: "bg-warm-indigo-soft text-warm-dark",
};

export default function MeasurementPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!hasPinSet()) {
      router.replace("/parent");
      return;
    }
    setProfiles(loadProfiles());
  }, [router]);

  useEffect(() => {
    function bump() {
      lastActiveRef.current = Date.now();
    }
    window.addEventListener("mousemove", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("touchstart", bump);
    const id = setInterval(() => {
      if (Date.now() - lastActiveRef.current >= DASHBOARD_TIMEOUT_MS) {
        router.replace("/parent");
      }
    }, 5000);
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("touchstart", bump);
      clearInterval(id);
    };
  }, [router]);

  const startTest = useCallback((profile: Profile, skill: Skill) => {
    const items = pickTestItems(holdoutForSkill(skill));
    if (items.length === 0) return;
    setStage({
      kind: "test",
      profile,
      skill,
      items,
      index: 0,
      score: 0,
      lastFeedback: null,
    });
  }, []);

  const submitAnswer = useCallback(
    (input: string) => {
      if (stage.kind !== "test") return;
      const item = stage.items[stage.index] as Item;
      const correct = isItemCorrect(item, input);
      const nextIndex = stage.index + 1;
      const nextScore = stage.score + (correct ? 1 : 0);
      if (nextIndex >= stage.items.length) {
        const total = stage.items.length;
        const verdict = computeVerdict(nextScore, total);
        const result: ExternalTestResult = {
          skill: stage.skill,
          score: nextScore,
          total,
          verdict,
          at: Date.now(),
        };
        saveResult(stage.profile.id, result);
        logEvent(stage.profile.id, {
          t: "external_test_completed",
          at: result.at,
          skill: stage.skill,
          score: nextScore,
          total,
          verdict,
        });
        setStage({ kind: "summary", profile: stage.profile, skill: stage.skill, result });
        return;
      }
      setStage({
        ...stage,
        index: nextIndex,
        score: nextScore,
        lastFeedback: correct ? "correct" : "wrong",
      });
      window.setTimeout(() => {
        setStage((prev) =>
          prev.kind === "test" ? { ...prev, lastFeedback: null } : prev,
        );
      }, 800);
    },
    [stage],
  );

  if (profiles === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            סיבוב מהיר — מדידה חיצונית
          </h1>
          <p className="text-sm text-warm-muted">
            10 שאלות שלא הופיעו באף תרגול. בודק האם השליטה אמיתית.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/parent/dashboard"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            חזרה לדשבורד
          </Link>
          <Link
            href="/"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            יציאה
          </Link>
        </div>
      </header>

      {stage.kind === "pick" && (
        <PickStage profiles={profiles} onStart={startTest} />
      )}

      {stage.kind === "test" && (
        <TestStage stage={stage} onSubmit={submitAnswer} />
      )}

      {stage.kind === "summary" && (
        <SummaryStage
          profile={stage.profile}
          skill={stage.skill}
          result={stage.result}
          onAgain={() => setStage({ kind: "pick" })}
        />
      )}
    </main>
  );
}

function PickStage({
  profiles,
  onStart,
}: {
  profiles: Profile[];
  onStart: (profile: Profile, skill: Skill) => void;
}) {
  const [profileId, setProfileId] = useState<string>(profiles[0]?.id ?? "");
  const selected = profiles.find((p) => p.id === profileId) ?? null;
  const skillsForProfile = useMemo(() => {
    if (!selected) return [];
    return MEASURABLE_SKILLS.filter((s) => selected.allowedSkills.includes(s));
  }, [selected]);

  if (profiles.length === 0) {
    return (
      <section className="max-w-3xl mx-auto bg-surface rounded-3xl shadow-soft p-6">
        <p className="text-warm-muted text-sm">
          עוד לא נוספו ילדות. הוסיפי פרופיל בדף הבית.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto bg-surface rounded-3xl shadow-soft p-6 space-y-5">
      <div className="space-y-2">
        <label className="block text-warm-dark font-semibold">בחרי ילדה</label>
        <div className="flex gap-2 flex-wrap">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProfileId(p.id)}
              className={`px-4 py-2 rounded-2xl text-sm transition ${
                p.id === profileId
                  ? "bg-terracotta text-white shadow-warm"
                  : "bg-cream text-warm-dark shadow-soft hover:shadow-warm"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-warm-dark font-semibold">בחרי נושא</label>
        {skillsForProfile.length === 0 ? (
          <p className="text-warm-muted text-sm">
            אין כרגע נושאים בגיל הזה עם מבחן חיצוני זמין. (סליס ראשון:
            חיבור־חיסור עד 100 ושברים בלבד.)
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {skillsForProfile.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => selected && onStart(selected, s)}
                className="bg-cream rounded-2xl p-4 text-right shadow-soft hover:shadow-warm transition border-2 border-transparent hover:border-terracotta"
              >
                <div className="text-warm-dark font-semibold">{SKILL_HEBREW[s]}</div>
                <div className="text-xs text-warm-muted">10 שאלות · בלי עזרות</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-warm-line pt-4 text-xs text-warm-muted leading-relaxed">
        ההסבר לילדה: <span className="text-warm-dark">״בואי נעשה סיבוב מהיר —
        10 שאלות, בלי רמזים, בלי &apos;נסי שוב&apos;. רק לראות איפה את היום.״</span>
      </div>
    </section>
  );
}

function TestStage({
  stage,
  onSubmit,
}: {
  stage: Extract<Stage, { kind: "test" }>;
  onSubmit: (input: string) => void;
}) {
  const item = stage.items[stage.index] as Item;
  const total = stage.items.length;
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInput("");
    inputRef.current?.focus();
  }, [stage.index]);

  const locked = stage.lastFeedback !== null;

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (input.trim() === "") return;
    onSubmit(input);
  }

  function handleChoose(choice: string) {
    if (locked) return;
    onSubmit(choice);
  }

  return (
    <section className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm text-warm-muted">
        <span>
          שאלה {stage.index + 1} מתוך {total}
        </span>
        <span>ילדה: {stage.profile.name}</span>
      </div>

      <div className="w-full bg-warm-line/40 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-terracotta transition-all"
          style={{ width: `${((stage.index) / total) * 100}%` }}
        />
      </div>

      <ItemPrompt item={item} />
      <ItemInput
        item={item}
        input={input}
        setInput={setInput}
        locked={locked}
        onSubmitText={handleSubmitText}
        onChoose={handleChoose}
        inputRef={inputRef}
      />

      {stage.lastFeedback && (
        <div
          className={`text-center text-2xl font-display ${
            stage.lastFeedback === "correct"
              ? "text-sage"
              : "text-terracotta-dark"
          }`}
        >
          {stage.lastFeedback === "correct" ? "✓" : "✗"}
        </div>
      )}
    </section>
  );
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
  if (item.skill === "fractions_intro") {
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
  return (
    <div className="bg-surface rounded-3xl shadow-soft py-8 px-6">
      <div className="text-xl text-warm-dark text-right">פריט לא נתמך במדידה זו.</div>
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

  if (item.skill === "fractions_intro") {
    const frac = item as FractionItem;
    if (frac.answer.kind === "choice") {
      const isVisualType = frac.type === "name_to_visual";
      return (
        <div className="grid gap-3 grid-cols-2">
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
                {isVisualType && parsed ? (
                  <FractionViz parts={parsed.den} filled={parsed.num} width={160} height={60} />
                ) : (
                  <span className="text-2xl font-display font-extrabold text-warm-dark tabular-nums">
                    {opt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      );
    }
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

  return null;
}

function SummaryStage({
  profile,
  skill,
  result,
  onAgain,
}: {
  profile: Profile;
  skill: Skill;
  result: ExternalTestResult;
  onAgain: () => void;
}) {
  const pct = Math.round((result.score / result.total) * 100);
  return (
    <section className="max-w-2xl mx-auto bg-surface rounded-3xl shadow-soft p-8 space-y-5 text-right">
      <h2 className="text-xl font-display font-extrabold text-warm-dark">
        סיכום — {profile.name} · {SKILL_HEBREW[skill]}
      </h2>

      <div className="flex items-center gap-4">
        <div className="text-5xl font-display font-extrabold text-warm-dark">
          {result.score}
          <span className="text-2xl text-warm-muted"> / {result.total}</span>
        </div>
        <div className="text-2xl text-warm-muted">({pct}%)</div>
        <span
          className={`text-sm font-semibold px-3 py-1 rounded-full ${VERDICT_TONE[result.verdict]}`}
        >
          {verdictBadge(result.verdict)}
        </span>
      </div>

      <p className="text-warm-dark leading-relaxed">
        {verdictHebrew(result.verdict)}
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onAgain}
          className="px-4 py-2 rounded-2xl bg-cream text-warm-dark shadow-soft hover:shadow-warm transition"
        >
          מבחן חדש
        </button>
        <Link
          href="/parent/dashboard"
          className="px-4 py-2 rounded-2xl bg-terracotta text-white shadow-warm hover:bg-terracotta-dark transition"
        >
          חזרה לדשבורד
        </Link>
      </div>
    </section>
  );
}

