"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DASHBOARD_TIMEOUT_MS } from "@/lib/types";
import { hasPinSet } from "@/lib/parent-auth";
import { loadProfiles, type Profile } from "@/lib/profiles";
import {
  computeActionLine,
  computeBeliefComparison,
  computeLastSessionDays,
  computePossibleCause,
  computeTrend,
  computeVerdict,
  computeWeeklyDigest,
  computeWheelSpin,
  type ActionLine,
  type BeliefComparison,
  type Trend,
  type Verdict,
  type WeeklyDigest,
  type WheelSpinFlag,
} from "@/lib/parent-dashboard";
import {
  clearParentFocus,
  computeCoverage,
  resolveEffectiveSkill,
  saveParentFocus,
  type CoverageBySubject,
  type CoverageRow,
  type EffectiveSkill,
} from "@/lib/parent-focus";
import type { Skill } from "@/lib/types";
import {
  isoWeekKey,
  loadBelief,
  saveBelief,
  type BeliefKind,
} from "@/lib/parent-belief";
import { logEvent } from "@/lib/telemetry";

type DaughterView = {
  profile: Profile;
  verdict: Verdict;
  action: ActionLine;
  cause: string | null;
  coverage: CoverageBySubject;
  active: EffectiveSkill;
  wheelSpins: WheelSpinFlag[];
  belief: BeliefComparison | null;
  lastSessionDays: number | null;
  digest: WeeklyDigest;
  trend: Trend;
};

const VERDICT_LABEL: Record<Verdict, string> = {
  on_track: "על המסלול",
  watch: "כדאי לשים לב",
  talk: "בואי נדבר",
};

const VERDICT_CLASS: Record<Verdict, string> = {
  on_track: "bg-sage-soft text-warm-dark",
  watch: "bg-mustard-soft text-warm-dark",
  talk: "bg-warm-indigo-soft text-warm-dark",
};

const COVERAGE_DOT: Record<CoverageRow["status"], string> = {
  not_started: "⚪",
  in_progress: "🟡",
  mastered: "🟢",
  mastered_review: "🟢⚠️",
};

const COVERAGE_STATUS_LABEL: Record<CoverageRow["status"], string> = {
  not_started: "לא התחילה",
  in_progress: "בתהליך",
  mastered: "שלטה",
  mastered_review: "שלטה — כדאי לרענן",
};

const TREND_LABEL: Record<Trend, string> = {
  up: "↑ מגמה של עלייה",
  down: "↓ מגמה של ירידה",
  flat: "→ יציב",
  insufficient: "",
};

const TREND_CLASS: Record<Trend, string> = {
  up: "text-sage",
  down: "text-terracotta-dark",
  flat: "text-warm-muted",
  insufficient: "text-warm-muted",
};

function lastSessionLabel(days: number | null): string {
  if (days === null) return "עוד לא היה סשן";
  if (days === 0) return "סשן אחרון: היום";
  if (days === 1) return "סשן אחרון: אתמול";
  return `סשן אחרון: לפני ${days} ימים`;
}

function buildView(profile: Profile): DaughterView {
  const verdict = computeVerdict(profile);
  const action = computeActionLine(profile);
  const cause = computePossibleCause(profile, verdict);
  const coverage = computeCoverage(profile);
  const active = resolveEffectiveSkill(profile);
  const wheelSpins = computeWheelSpin(profile);
  const belief = computeBeliefComparison(profile);
  const digest = computeWeeklyDigest(profile);
  const lastSessionDays = computeLastSessionDays(profile);
  const trend = computeTrend(profile);
  return {
    profile,
    verdict,
    action,
    cause,
    coverage,
    active,
    wheelSpins,
    belief,
    lastSessionDays,
    digest,
    trend,
  };
}

export default function ParentDashboard() {
  const router = useRouter();
  const [views, setViews] = useState<DaughterView[] | null>(null);
  const [beliefDraft, setBeliefDraft] = useState<Record<string, string>>({});
  const [beliefKind, setBeliefKind] = useState<Record<string, BeliefKind>>({});
  const lastActiveRef = useRef<number>(Date.now());

  const rebuild = useCallback(() => {
    const profiles = loadProfiles();
    setViews(profiles.map((p) => buildView(p)));
  }, []);

  useEffect(() => {
    if (!hasPinSet()) {
      router.replace("/parent");
      return;
    }
    logEvent("_parent", { t: "dashboard_opened", at: Date.now() });
    rebuild();
  }, [router, rebuild]);

  useEffect(() => {
    if (views === null) return;
    for (const v of views) {
      logEvent(v.profile.id, {
        t: "action_line_shown",
        at: Date.now(),
        trigger: v.action.trigger,
      });
    }
    // run once per view refresh — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views?.length]);

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

  const currentWeek = useMemo(() => isoWeekKey(), []);

  function pickSkill(profileId: string, skill: Skill) {
    saveParentFocus(profileId, skill);
    rebuild();
  }

  function clearFocus(profileId: string) {
    clearParentFocus(profileId);
    rebuild();
  }

  function submitBelief(profileId: string) {
    const text = (beliefDraft[profileId] ?? "").trim();
    if (text.length === 0) return;
    const kind: BeliefKind = beliefKind[profileId] ?? "performance";
    const note = saveBelief(profileId, text, kind);
    if (note === null) return;
    logEvent(profileId, {
      t: "belief_submitted",
      at: note.at,
      weekKey: note.weekKey,
      kind: note.kind,
    });
    setBeliefDraft((prev) => ({ ...prev, [profileId]: "" }));
    rebuild();
  }

  if (views === null) {
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
            האזור להורים
          </h1>
          <p className="text-sm text-warm-muted">
            אל תפתחי את הדף הזה כשהילדה ליד המסך.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/parent/history"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            מבט אחורה
          </Link>
          <Link
            href="/"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            יציאה
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto bg-surface rounded-3xl shadow-soft p-6 mb-6 space-y-3">
        <h2 className="text-lg font-display font-extrabold text-warm-dark">
          סיכום השבוע
        </h2>
        {views.length === 0 && (
          <p className="text-warm-muted text-sm">
            עוד לא נוספו ילדות. הוסיפי פרופיל בדף הבית.
          </p>
        )}
        {views.map((v) => {
          const d = v.digest;
          const feelings = d.feelings;
          const feelingsTotal = feelings.happy + feelings.ok + feelings.hard;
          return (
            <div
              key={v.profile.id}
              className="border-t border-warm-line pt-3 first:border-0 first:pt-0"
            >
              <p className="text-warm-dark font-semibold">{v.profile.name}:</p>
              <p className="text-sm text-warm-muted">
                {d.totalAttempts} תרגילים · {d.weeklyMinutes} דקות · {d.newlyMastered} מיומנויות חדשות · {d.wheelSpinCount} חיוויי תקיעות
              </p>
              {feelingsTotal > 0 && (
                <p className="text-sm text-warm-muted">
                  איך היה לה השבוע: {feelings.happy} 😊 · {feelings.ok} 😐 · {feelings.hard} 😟
                </p>
              )}
              <p className="text-sm text-warm-dark mt-1">
                המלצה: {d.topAction}
              </p>
            </div>
          );
        })}
      </section>

      <div className="max-w-3xl mx-auto space-y-6">
        {views.map((v) => {
          const beliefForThisWeek = loadBelief(v.profile.id, currentWeek);
          const kindForProfile: BeliefKind =
            beliefKind[v.profile.id] ?? "performance";
          return (
            <article
              key={v.profile.id}
              className="bg-surface rounded-3xl shadow-soft p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-extrabold text-warm-dark">
                  {v.profile.name}
                </h2>
                <div className="flex items-center gap-2">
                  {v.trend !== "insufficient" && (
                    <span className={`text-xs ${TREND_CLASS[v.trend]}`}>
                      {TREND_LABEL[v.trend]}
                    </span>
                  )}
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${VERDICT_CLASS[v.verdict]}`}
                  >
                    {VERDICT_LABEL[v.verdict]}
                  </span>
                </div>
              </div>

              <p className="text-warm-dark leading-relaxed">{v.action.text}</p>

              {v.cause && (
                <p className="text-sm text-warm-muted">{v.cause}</p>
              )}

              <CoveragePicker
                view={v}
                onPick={(skill) => pickSkill(v.profile.id, skill)}
                onAuto={() => clearFocus(v.profile.id)}
              />


              {v.wheelSpins.length > 0 && (
                <div className="bg-mustard-soft rounded-2xl px-4 py-3 text-sm text-warm-dark">
                  {v.wheelSpins
                    .map((w) => `חיווי תקיעות ב${w.skillHebrew}`)
                    .join(" · ")}
                </div>
              )}

              <div className="border-t border-warm-line pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-warm-dark">
                  מה חשבת השבוע?
                </h3>
                {v.belief !== null && (
                  <div
                    className={`text-sm space-y-1 ${v.belief.weakData ? "bg-mustard-soft rounded-2xl p-3" : "text-warm-muted"}`}
                  >
                    <p>
                      לפני {v.belief.daysAgo} ימים כתבת ({
                        v.belief.kind === "feeling"
                          ? "על רגש"
                          : v.belief.kind === "performance"
                            ? "על ביצועים"
                            : "אחר"
                      }): &quot;{v.belief.text}&quot;
                    </p>
                    {v.belief.kind === "feeling" ? (
                      <p>
                        מאז: {v.belief.sessionsSince} סשנים ו-{v.belief.minutesSince} דקות תרגול.
                        <br />
                        <span className="text-xs">
                          (רגש לא נמדד ישירות באפליקציה — שווה להשוות מול התחושה שלך מסשן אחרון.)
                        </span>
                      </p>
                    ) : (
                      <p>
                        מאז: {v.belief.attemptsSince} תרגילים
                        {v.belief.firstTryPctSince !== null
                          ? `, ${v.belief.firstTryPctSince}% נכון-בראשון`
                          : ""}
                        , {v.belief.sessionsSince} סשנים.
                        {v.belief.lowSample && (
                          <span className="block text-xs mt-1">
                            (מעט נתונים עדיין — כדאי לחכות לעוד סשנים לפני שמסיקים.)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
                {beliefForThisWeek === null && (
                  <div className="space-y-2">
                    <div className="flex gap-3 text-xs text-warm-muted">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`kind-${v.profile.id}`}
                          checked={kindForProfile === "performance"}
                          onChange={() =>
                            setBeliefKind((prev) => ({
                              ...prev,
                              [v.profile.id]: "performance",
                            }))
                          }
                        />
                        על ביצועים
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`kind-${v.profile.id}`}
                          checked={kindForProfile === "feeling"}
                          onChange={() =>
                            setBeliefKind((prev) => ({
                              ...prev,
                              [v.profile.id]: "feeling",
                            }))
                          }
                        />
                        על רגש
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name={`kind-${v.profile.id}`}
                          checked={kindForProfile === "other"}
                          onChange={() =>
                            setBeliefKind((prev) => ({
                              ...prev,
                              [v.profile.id]: "other",
                            }))
                          }
                        />
                        אחר
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={beliefDraft[v.profile.id] ?? ""}
                        onChange={(e) =>
                          setBeliefDraft((prev) => ({
                            ...prev,
                            [v.profile.id]: e.target.value,
                          }))
                        }
                        placeholder={`השבוע הרגשתי ש${v.profile.name}...`}
                        className="flex-1 rounded-2xl border border-warm-line px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => submitBelief(v.profile.id)}
                        className="bg-terracotta text-white px-4 py-2 rounded-2xl text-sm hover:bg-terracotta-dark transition"
                      >
                        שמרי
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-warm-muted">
                {lastSessionLabel(v.lastSessionDays)}
              </p>
            </article>
          );
        })}
      </div>

      <footer className="max-w-3xl mx-auto mt-8 text-center">
        <Link
          href="/"
          className="inline-block bg-terracotta text-white px-6 py-3 rounded-2xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
        >
          יציאה
        </Link>
      </footer>
    </main>
  );
}

function CoveragePicker({
  view,
  onPick,
  onAuto,
}: {
  view: DaughterView;
  onPick: (skill: Skill) => void;
  onAuto: () => void;
}) {
  const activeRow = view.coverage
    .flatMap((g) => g.rows)
    .find((r) => r.isActive);
  const activeName = activeRow?.skillHebrew ?? "—";
  const sourceLabel =
    view.active.source === "manual" ? "בחירת הורה" : "אוטומטי";

  return (
    <section className="border border-warm-line rounded-2xl p-4 space-y-3 bg-cream/40">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-warm-dark">
          <span className="text-warm-muted">תעבוד עכשיו על: </span>
          <span className="font-semibold">{activeName}</span>
          <span className="text-xs text-warm-muted"> ({sourceLabel})</span>
        </p>
        <button
          type="button"
          onClick={onAuto}
          disabled={view.active.source === "auto"}
          className="text-xs px-3 py-1.5 rounded-2xl bg-surface text-warm-dark shadow-soft hover:shadow-warm transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          אוטומטי
        </button>
      </div>

      {view.coverage.map((group) => (
        <div key={group.subject} className="space-y-1.5">
          <h4 className="text-xs font-semibold text-warm-muted">
            {group.subjectHebrew}
          </h4>
          <ul className="space-y-1.5">
            {group.rows.map((row) => (
              <li
                key={row.skill}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm ${
                  row.isActive
                    ? "bg-mustard-soft text-warm-dark"
                    : row.status === "mastered_review"
                      ? "bg-surface text-warm-dark border border-mustard"
                      : "bg-surface text-warm-dark"
                }`}
              >
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  <span aria-hidden>{COVERAGE_DOT[row.status]}</span>
                  <span className="truncate">{row.skillHebrew}</span>
                  <span className="text-xs text-warm-muted truncate">
                    · {COVERAGE_STATUS_LABEL[row.status]}
                    {row.attempts > 0 ? ` · ${row.attempts} ניס׳` : ""}
                    {!row.isDefaultForAge && (
                      <span className="mr-1">· מחוץ לגיל ברירת מחדל</span>
                    )}
                  </span>
                </span>
                {row.isActive ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-mustard text-warm-dark font-semibold">
                    פעיל
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPick(row.skill)}
                    className="text-xs px-3 py-1 rounded-2xl bg-terracotta text-white hover:bg-terracotta-dark transition"
                  >
                    בחרי
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
