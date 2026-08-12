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
  computeLastSessionAt,
  computeLastSessionDays,
  computePossibleCause,
  computeRecentSessions,
  computeTrend,
  computeVerdict,
  computeWeeklyDigest,
  computeWheelSpin,
  type ActionLine,
  type BeliefComparison,
  type RecentSession,
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
import {
  clearActivePackId,
  listPacks,
  loadActivePackId,
  saveActivePackId,
  type ReviewPack,
} from "@/lib/review-packs";
import {
  dueForRetest,
  getLastResult,
  hasMeasurement,
  MEASURABLE_SKILLS,
  verdictBadge,
} from "@/lib/measurement";
import {
  commandIsLearned,
  commandIsMastered,
  journalStage,
  load as loadPuppy,
  roleForAge,
  STAGE_HEBREW,
  type JournalStage,
} from "@/lib/puppy-journal";
import type {
  ExternalTestResult,
  ExternalTestVerdict,
  PuppyJournal,
  Skill,
} from "@/lib/types";
import {
  isoWeekKey,
  loadBelief,
  saveBelief,
  type BeliefKind,
} from "@/lib/parent-belief";
import { logEvent } from "@/lib/telemetry";

type MeasurementRow = {
  skill: Skill;
  skillHebrew: string;
  last: ExternalTestResult | null;
  due: boolean;
};

type PuppySummary = {
  stage: JournalStage;
  masteredCommands: number;
  breedFacts: number;
  helperLogs: number;
  puppyName: string;
  totalCommands: number;
  learnedCommands: number;
};

type DaughterView = {
  profile: Profile;
  verdict: Verdict;
  action: ActionLine;
  cause: string | null;
  coverage: CoverageBySubject;
  active: EffectiveSkill;
  activePackId: string | null;
  wheelSpins: WheelSpinFlag[];
  belief: BeliefComparison | null;
  lastSessionDays: number | null;
  lastSessionAt: number | null;
  recentSessions: RecentSession[];
  digest: WeeklyDigest;
  trend: Trend;
  measurements: MeasurementRow[];
  puppy: PuppySummary | null;
};

const MEASUREMENT_SKILL_HEBREW: Record<Skill, string> = {
  add_sub_100: "חיבור וחיסור עד 100",
  fractions_intro: "שברים",
  ops_1000: "פעולות עד 1000",
  multiplication: "לוח הכפל",
  mult_2digit: "כפל דו־ספרתי",
  long_division: "חילוק ארוך",
  bar_models: "בעיות מילוליות",
  hebrew_comprehension: "הבנת הנקרא",
  english_phonics: "קריאה באנגלית (פוניקה)",
  english_vocab: "אוצר מילים באנגלית",
};

const MEASUREMENT_VERDICT_CLASS: Record<ExternalTestVerdict, string> = {
  passed: "bg-sage-soft text-warm-dark",
  gap: "bg-mustard-soft text-warm-dark",
  false_mastery: "bg-warm-indigo-soft text-warm-dark",
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

function formatShortDateTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
}

function lastSessionLabel(days: number | null, at: number | null): string {
  if (days === null || at === null) return "עוד לא היה סשן";
  const stamp = formatShortDateTime(at);
  if (days === 0) return `סשן אחרון: היום (${stamp})`;
  if (days === 1) return `סשן אחרון: אתמול (${stamp})`;
  return `סשן אחרון: לפני ${days} ימים (${stamp})`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} שנ׳`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec === 0 ? `${min} דק׳` : `${min}:${String(sec).padStart(2, "0")} דק׳`;
  const h = Math.floor(min / 60);
  const rm = min % 60;
  return `${h}:${String(rm).padStart(2, "0")} שע׳`;
}

function buildView(profile: Profile): DaughterView {
  const verdict = computeVerdict(profile);
  const action = computeActionLine(profile);
  const cause = computePossibleCause(profile, verdict);
  const coverage = computeCoverage(profile);
  const active = resolveEffectiveSkill(profile);
  const activePackId = loadActivePackId(profile.id);
  const wheelSpins = computeWheelSpin(profile);
  const belief = computeBeliefComparison(profile);
  const digest = computeWeeklyDigest(profile);
  const lastSessionDays = computeLastSessionDays(profile);
  const lastSessionAt = computeLastSessionAt(profile);
  const recentSessions = computeRecentSessions(profile);
  const trend = computeTrend(profile);
  const measurements: MeasurementRow[] = MEASURABLE_SKILLS.filter(
    (s) => hasMeasurement(s) && profile.allowedSkills.includes(s),
  ).map((skill) => {
    const last = getLastResult(profile.id, skill);
    return {
      skill,
      skillHebrew: MEASUREMENT_SKILL_HEBREW[skill],
      last,
      due: dueForRetest(last?.at ?? null),
    };
  });
  // The journal belongs to the owner (§6.3), so only her card shows it. The
  // helper's contribution appears there too — see helperLogs below.
  const puppyJournal: PuppyJournal | null =
    roleForAge(profile.age) === "owner" ? loadPuppy(profile.id) : null;
  const puppy: PuppySummary | null =
    puppyJournal === null
      ? null
      : {
          puppyName: puppyJournal.puppyName,
          totalCommands: puppyJournal.commands.length,
          learnedCommands: puppyJournal.commands.filter(commandIsLearned).length,
          masteredCommands:
            puppyJournal.commands.filter(commandIsMastered).length,
          stage: journalStage(puppyJournal),
          breedFacts: (puppyJournal.breedFacts ?? []).length,
          // How many entries the younger sister logged — §6.3 makes her a
          // participant, so her work should be visible to the parent.
          helperLogs:
            puppyJournal.commands.reduce(
              (n, c) => n + c.attempts.filter((a) => a.loggedBy).length,
              0,
            ) + (puppyJournal.breedFacts ?? []).filter((f) => f.loggedBy).length,
        };
  return {
    profile,
    verdict,
    action,
    cause,
    coverage,
    active,
    activePackId,
    wheelSpins,
    belief,
    lastSessionDays,
    lastSessionAt,
    recentSessions,
    digest,
    trend,
    measurements,
    puppy,
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
    clearActivePackId(profileId);
    rebuild();
  }

  function clearFocus(profileId: string) {
    clearParentFocus(profileId);
    clearActivePackId(profileId);
    rebuild();
  }

  function activatePack(profileId: string, packId: string) {
    saveActivePackId(profileId, packId);
    rebuild();
  }

  function deactivatePack(profileId: string) {
    clearActivePackId(profileId);
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
            href="/parent/foundation"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            תשתית
          </Link>
          <Link
            href="/parent/history"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            מבט אחורה
          </Link>
          <Link
            href="/parent/measurement"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            סיבוב מהיר
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

              <PackSection
                profile={v.profile}
                activePackId={v.activePackId}
                onActivate={(packId) => activatePack(v.profile.id, packId)}
                onDeactivate={() => deactivatePack(v.profile.id)}
              />

              <CoveragePicker
                view={v}
                onPick={(skill) => pickSkill(v.profile.id, skill)}
                onAuto={() => clearFocus(v.profile.id)}
              />

              {v.measurements.length > 0 && (
                <MeasurementSection rows={v.measurements} />
              )}

              {v.puppy !== null && <PuppySection summary={v.puppy} />}

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
                {lastSessionLabel(v.lastSessionDays, v.lastSessionAt)}
              </p>
              {v.recentSessions.length > 0 && (
                <details className="text-xs text-warm-muted">
                  <summary className="cursor-pointer hover:text-warm-dark transition">
                    סשנים אחרונים ({v.recentSessions.length})
                  </summary>
                  <ul className="mt-2 space-y-1 pr-2">
                    {v.recentSessions.map((s) => (
                      <li key={s.startedAt} className="flex justify-between gap-3">
                        <span>{s.label}</span>
                        <span>
                          {formatShortDateTime(s.startedAt)} · {formatDuration(s.durationMs)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
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

function PackSection({
  profile,
  activePackId,
  onActivate,
  onDeactivate,
}: {
  profile: Profile;
  activePackId: string | null;
  onActivate: (packId: string) => void;
  onDeactivate: () => void;
}) {
  const packs: ReviewPack[] = listPacks(profile);
  if (packs.length === 0) return null;

  return (
    <section className="border border-warm-line rounded-2xl p-4 space-y-3 bg-cream/40">
      <h3 className="text-sm font-semibold text-warm-dark">חבילות חזרה</h3>
      <ul className="space-y-2">
        {packs.map((pack) => {
          const isActive = pack.id === activePackId;
          return (
            <li
              key={pack.id}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm ${
                isActive
                  ? "bg-mustard-soft text-warm-dark"
                  : "bg-surface text-warm-dark"
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="font-semibold block truncate">{pack.name}</span>
                {pack.audience && (
                  <span className="text-xs text-warm-muted block">
                    {pack.audience} · {pack.items.length} תרגילים
                  </span>
                )}
              </span>
              {isActive ? (
                <button
                  type="button"
                  onClick={onDeactivate}
                  className="text-xs px-3 py-1 rounded-2xl bg-surface text-warm-dark shadow-soft hover:shadow-warm transition"
                >
                  כיבוי
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onActivate(pack.id)}
                  className="text-xs px-3 py-1 rounded-2xl bg-terracotta text-white hover:bg-terracotta-dark transition"
                >
                  הפעילי
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {activePackId && (
        <p className="text-xs text-warm-muted">
          בזמן שהחבילה פעילה, הסשן הבא של הילדה ירוץ עם תרגילי החבילה במקום
          ראוטר הרגיל.
        </p>
      )}
    </section>
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
  const activePack = view.activePackId
    ? listPacks().find((p) => p.id === view.activePackId) ?? null
    : null;
  const activeRow = view.coverage
    .flatMap((g) => g.rows)
    .find((r) => r.isActive);
  const activeName = activePack
    ? activePack.name
    : activeRow?.skillHebrew ?? "—";
  const sourceLabel = activePack
    ? "חבילה"
    : view.active.source === "manual"
      ? "בחירת הורה"
      : "אוטומטי";

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
          disabled={!activePack && view.active.source === "auto"}
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

function formatMeasurementDate(at: number): string {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
}

function PuppySection({ summary }: { summary: PuppySummary }) {
  return (
    <section className="border border-warm-line rounded-2xl p-4 space-y-2 bg-cream/40">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-warm-dark">
          🐕 פרויקט הגור
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-mustard-soft text-warm-dark whitespace-nowrap">
          {STAGE_HEBREW[summary.stage]}
        </span>
      </div>
      <div className="text-sm text-warm-dark">
        הגור: <span className="font-semibold">{summary.puppyName}</span>
      </div>
      <div className="text-xs text-warm-muted">
        {summary.totalCommands === 0
          ? "עוד אין פקודות ביומן."
          : `${summary.totalCommands} פקודות · ${summary.learnedCommands} נלמדו · ${summary.masteredCommands} יודע בכל מקום`}
      </div>
      {summary.breedFacts > 0 && (
        <div className="text-xs text-warm-muted">
          {summary.breedFacts} עובדות על הגזע
        </div>
      )}
      {summary.helperLogs > 0 && (
        <div className="text-xs text-warm-muted">
          האחות הקטנה עזרה ורשמה {summary.helperLogs} פעמים 👋
        </div>
      )}
      <p className="text-xs text-warm-muted leading-relaxed">
        זה היומן האישי שלה. את רואה כאן רק סיכום — לא אמורה לערוך.
      </p>
    </section>
  );
}

function MeasurementSection({ rows }: { rows: MeasurementRow[] }) {
  return (
    <section className="border border-warm-line rounded-2xl p-4 space-y-3 bg-cream/40">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-warm-dark">
          מדידה חיצונית
        </h3>
        <Link
          href="/parent/measurement"
          className="text-xs px-3 py-1.5 rounded-2xl bg-terracotta text-white shadow-warm hover:bg-terracotta-dark transition"
        >
          התחילי סיבוב מהיר
        </Link>
      </div>
      <ul className="space-y-1.5">
        {rows.map((row) => {
          const last = row.last;
          return (
            <li
              key={row.skill}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm bg-surface text-warm-dark"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="truncate">{row.skillHebrew}</span>
                <span className="text-xs text-warm-muted truncate">
                  {last
                    ? `· ${last.score}/${last.total} · ${formatMeasurementDate(last.at)}`
                    : "· טרם נמדד"}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {last && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${MEASUREMENT_VERDICT_CLASS[last.verdict]}`}
                  >
                    {verdictBadge(last.verdict)}
                  </span>
                )}
                {row.due && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-mustard text-warm-dark font-semibold">
                    כדאי לבדוק
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
