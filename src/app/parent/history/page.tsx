"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DASHBOARD_TIMEOUT_MS } from "@/lib/types";
import { hasPinSet } from "@/lib/parent-auth";
import { loadProfiles, type Profile } from "@/lib/profiles";
import {
  computeDailyActivity,
  computeFocusAreas,
  computeHistoryWindow,
  computePerSkillStats,
  HISTORY_RANGE_LABEL,
  type DayPoint,
  type FocusItem,
  type HistoryRange,
  type SkillRow,
  type WindowSummary,
} from "@/lib/parent-history";
import { logEvent } from "@/lib/telemetry";

const RANGES: HistoryRange[] = [
  "today",
  "week_current",
  "week_prev",
  "month_30",
];

type DaughterView = {
  profile: Profile;
  summary: WindowSummary;
  perSkill: SkillRow[];
  focus: FocusItem[];
  daily: DayPoint[];
};

function buildView(profile: Profile, range: HistoryRange): DaughterView {
  return {
    profile,
    summary: computeHistoryWindow(profile, range),
    perSkill: computePerSkillStats(profile, range),
    focus: computeFocusAreas(profile, range),
    daily: computeDailyActivity(profile, range),
  };
}

function deltaLabel(
  current: number,
  previous: number,
  hasPrevious: boolean,
): string {
  if (!hasPrevious) return "";
  const d = current - previous;
  if (d === 0) return "= ללא שינוי";
  if (d > 0) return `↑ ${d}`;
  return `↓ ${Math.abs(d)}`;
}

function pctDeltaLabel(
  current: number | null,
  previous: number | null,
  hasPrevious: boolean,
): string {
  if (!hasPrevious || current === null || previous === null) return "";
  const d = current - previous;
  if (d === 0) return "= ללא שינוי";
  if (d > 0) return `↑ ${d} נק'`;
  return `↓ ${Math.abs(d)} נק'`;
}

function feelingEmoji(f: SkillRow["dominantFeeling"]): string {
  if (f === "happy") return "😊";
  if (f === "ok") return "😐";
  if (f === "hard") return "😣";
  return "—";
}

function dayLabel(date: string): string {
  // date is "YYYY-MM-DD" local
  const [y, m, d] = date.split("-").map(Number);
  return `${d}/${m}/${String(y).slice(-2)}`;
}

export default function ParentHistoryPage() {
  const router = useRouter();
  const [range, setRange] = useState<HistoryRange>("month_30");
  const [views, setViews] = useState<DaughterView[] | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const rebuild = useCallback((r: HistoryRange) => {
    const profiles = loadProfiles();
    setViews(profiles.map((p) => buildView(p, r)));
  }, []);

  useEffect(() => {
    if (!hasPinSet()) {
      router.replace("/parent");
      return;
    }
    logEvent("_parent", { t: "dashboard_opened", at: Date.now() });
    rebuild(range);
  }, [router, rebuild, range]);

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

  const totalDays = useMemo(() => {
    if (range === "today") return 1;
    if (range === "month_30") return 30;
    return 7;
  }, [range]);

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
            מבט אחורה
          </h1>
          <p className="text-sm text-warm-muted">
            אל תפתחי את הדף הזה כשהילדה ליד המסך.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/parent/dashboard"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            תמונת מצב נוכחית
          </Link>
          <Link
            href="/"
            className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
          >
            יציאה
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto mb-6">
        <div
          role="tablist"
          aria-label="חלון זמן"
          className="flex gap-2 flex-wrap"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-2xl text-sm transition ${
                range === r
                  ? "bg-terracotta text-white shadow-warm"
                  : "bg-surface text-warm-dark shadow-soft hover:shadow-warm"
              }`}
            >
              {HISTORY_RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </section>

      {views.length === 0 && (
        <section className="max-w-3xl mx-auto bg-surface rounded-3xl shadow-soft p-6">
          <p className="text-warm-muted text-sm">
            עוד לא נוספו ילדות. הוסיפי פרופיל בדף הבית.
          </p>
        </section>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {views.map((v) => {
          const s = v.summary.current;
          const p = v.summary.previous;
          const has = v.summary.hasPrevious;
          const feelingsTotal = s.feelings.happy + s.feelings.ok + s.feelings.hard;
          return (
            <article
              key={v.profile.id}
              className="bg-surface rounded-3xl shadow-soft p-6 space-y-5"
            >
              <h2 className="text-xl font-display font-extrabold text-warm-dark">
                {v.profile.name}
              </h2>

              {/* א. summary numbers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCell
                  label="אחוז ראשון"
                  value={s.firstTryPct === null ? "—" : `${s.firstTryPct}%`}
                  hint={pctDeltaLabel(s.firstTryPct, p.firstTryPct, has)}
                />
                <SummaryCell
                  label="דקות"
                  value={String(s.minutes)}
                  hint={deltaLabel(s.minutes, p.minutes, has)}
                />
                <SummaryCell
                  label="סשנים"
                  value={String(s.sessions)}
                  hint={deltaLabel(s.sessions, p.sessions, has)}
                />
                <SummaryCell
                  label="פידבק"
                  value={
                    feelingsTotal === 0
                      ? "—"
                      : `😊 ${s.feelings.happy} · 😐 ${s.feelings.ok} · 😣 ${s.feelings.hard}`
                  }
                  hint=""
                />
              </div>

              {/* ב. per-skill table */}
              {v.perSkill.some((row) => row.attempts > 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-warm-muted text-right">
                        <th className="py-2">מיומנות</th>
                        <th className="py-2">ניסיונות</th>
                        <th className="py-2">אחוז ראשון</th>
                        <th className="py-2">שינוי</th>
                        <th className="py-2">פידבק</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.perSkill.map((row) => (
                        <tr
                          key={row.skill}
                          className="border-t border-warm-line text-warm-dark"
                        >
                          <td className="py-2">{row.skillHebrew}</td>
                          <td className="py-2">{row.attempts}</td>
                          <td className="py-2">
                            {row.firstTryPct === null ? "—" : `${row.firstTryPct}%`}
                          </td>
                          <td className="py-2 text-warm-muted">
                            {row.firstTryPctDelta === null
                              ? "—"
                              : row.firstTryPctDelta === 0
                                ? "= 0"
                                : row.firstTryPctDelta > 0
                                  ? `↑ ${row.firstTryPctDelta}`
                                  : `↓ ${Math.abs(row.firstTryPctDelta)}`}
                          </td>
                          <td className="py-2">{feelingEmoji(row.dominantFeeling)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-warm-muted">
                  בחלון הזה לא היו תרגילים.
                </p>
              )}

              {/* ג. focus areas */}
              <div className="border-t border-warm-line pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-warm-dark">
                  מקומות לחזק
                </h3>
                {v.focus.length === 0 ? (
                  <p className="text-sm text-warm-muted">
                    בחלון הזה הכל זרם — אין נקודה שדורשת תשומת לב מיוחדת.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {v.focus.map((f) => (
                      <li
                        key={f.skill}
                        className="bg-cream rounded-2xl px-4 py-3 space-y-1"
                      >
                        <p className="text-warm-dark font-semibold">
                          {f.skillHebrew}
                        </p>
                        <p className="text-xs text-warm-muted">{f.reasonText}</p>
                        <p className="text-sm text-warm-dark">{f.actionText}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ד. daily activity */}
              <div className="border-t border-warm-line pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-warm-dark">
                  פעילות יומית ({totalDays} ימים)
                </h3>
                <div className="flex flex-wrap gap-1.5" dir="ltr">
                  {v.daily.map((d) => (
                    <span
                      key={d.date}
                      title={`${dayLabel(d.date)} · ${d.minutes} דקות`}
                      className={`inline-block rounded-full ${
                        d.hasSession
                          ? "bg-sage"
                          : "bg-warm-line"
                      }`}
                      style={{
                        width: dotSize(d.minutes),
                        height: dotSize(d.minutes),
                      }}
                    />
                  ))}
                </div>
              </div>
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

function dotSize(minutes: number): string {
  if (minutes >= 20) return "16px";
  if (minutes >= 10) return "12px";
  if (minutes > 0) return "10px";
  return "8px";
}

function SummaryCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-cream rounded-2xl px-4 py-3">
      <p className="text-xs text-warm-muted">{label}</p>
      <p className="text-lg font-display font-extrabold text-warm-dark">
        {value}
      </p>
      {hint && <p className="text-xs text-warm-muted mt-0.5">{hint}</p>}
    </div>
  );
}
