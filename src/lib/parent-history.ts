import type { Attempt, MasteryState, Skill } from "./types";
import {
  FOCUS_DROP_THRESHOLD,
  FOCUS_LOW_PCT_THRESHOLD,
  FOCUS_MIN_ATTEMPTS,
  FOCUS_NEG_FEELING_SESSIONS,
  MAX_SESSION_MS,
} from "./types";
import { loadMastery } from "./storage";
import type { Profile } from "./profiles";
import { exportTelemetry, type TelemetryEvent } from "./telemetry";
import { SKILL_HEBREW } from "./parent-dashboard";

const DAY_MS = 86_400_000;

export type HistoryRange =
  | "today"
  | "week_current"
  | "week_prev"
  | "month_30";

export const HISTORY_RANGE_LABEL: Record<HistoryRange, string> = {
  today: "היום",
  week_current: "שבוע אחרון",
  week_prev: "שבוע שעבר",
  month_30: "30 ימים אחרונים",
};

export type FeelingCounts = { happy: number; ok: number; hard: number };

export type WindowStats = {
  attempts: number;
  firstTryPct: number | null;
  minutes: number;
  sessions: number;
  feelings: FeelingCounts;
};

export type WindowSummary = {
  range: HistoryRange;
  current: WindowStats;
  previous: WindowStats;
  hasPrevious: boolean;
};

export type SkillRow = {
  skill: Skill;
  skillHebrew: string;
  attempts: number;
  firstTryPct: number | null;
  firstTryPctDelta: number | null;
  dominantFeeling: "happy" | "ok" | "hard" | null;
};

export type FocusReason = "dropped" | "low_pct" | "negative_feeling";

export type FocusItem = {
  skill: Skill;
  skillHebrew: string;
  reason: FocusReason;
  reasonText: string;
  actionText: string;
  severity: number;
};

export type DayPoint = {
  /** local-date ISO ("YYYY-MM-DD") of the day */
  date: string;
  minutes: number;
  hasSession: boolean;
};

type Range = { from: number; to: number };

function startOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function rangeFor(r: HistoryRange, now: number): Range {
  switch (r) {
    case "today":
      return { from: startOfLocalDay(now), to: now };
    case "week_current":
      return { from: now - 7 * DAY_MS, to: now };
    case "week_prev":
      return { from: now - 14 * DAY_MS, to: now - 7 * DAY_MS };
    case "month_30":
      return { from: now - 30 * DAY_MS, to: now };
  }
}

export function previousRangeFor(r: HistoryRange, now: number): Range {
  switch (r) {
    case "today": {
      const startToday = startOfLocalDay(now);
      return { from: startToday - DAY_MS, to: startToday };
    }
    case "week_current":
      return { from: now - 14 * DAY_MS, to: now - 7 * DAY_MS };
    case "week_prev":
      return { from: now - 21 * DAY_MS, to: now - 14 * DAY_MS };
    case "month_30":
      return { from: now - 60 * DAY_MS, to: now - 30 * DAY_MS };
  }
}

function loadAllMastery(profile: Profile): MasteryState[] {
  return profile.allowedSkills.map((s) => loadMastery(profile.id, s));
}

function attemptsInRange(attempts: Attempt[], r: Range): Attempt[] {
  return attempts.filter((a) => a.at >= r.from && a.at < r.to);
}

function pct(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null;
  const correct = attempts.filter((a) => a.correct).length;
  return Math.round((correct / attempts.length) * 100);
}

function sessionsInRange(states: MasteryState[], r: Range): number {
  let n = 0;
  for (const s of states) {
    for (const t of s.sessionTimestamps) {
      if (t >= r.from && t < r.to) n++;
    }
  }
  return n;
}

function parseEvents(raw: string): TelemetryEvent[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

type SessionDur = { at: number; skill: string; ms: number };

function sessionDurations(events: TelemetryEvent[]): SessionDur[] {
  const out: SessionDur[] = [];
  const openBySkill = new Map<string, number>();
  for (const e of events) {
    if (e.t === "session_start") {
      openBySkill.set(e.skill, e.at);
    } else if (e.t === "session_end") {
      const start = openBySkill.get(e.skill);
      if (start !== undefined) {
        const ms = Math.min(MAX_SESSION_MS, Math.max(0, e.at - start));
        out.push({ at: e.at, skill: e.skill, ms });
        openBySkill.delete(e.skill);
      }
    }
  }
  return out;
}

function minutesInRange(events: TelemetryEvent[], r: Range): number {
  let ms = 0;
  for (const d of sessionDurations(events)) {
    if (d.at >= r.from && d.at < r.to) ms += d.ms;
  }
  return Math.round(ms / 60_000);
}

function feelingsInRange(
  events: TelemetryEvent[],
  r: Range,
  skill?: Skill,
): FeelingCounts {
  const out: FeelingCounts = { happy: 0, ok: 0, hard: 0 };
  for (const e of events) {
    if (e.t !== "session_feeling") continue;
    if (e.at < r.from || e.at >= r.to) continue;
    if (skill && e.skill !== skill) continue;
    out[e.rating]++;
  }
  return out;
}

function statsForRange(
  states: MasteryState[],
  events: TelemetryEvent[],
  r: Range,
): WindowStats {
  const all = states.flatMap((s) => s.attempts);
  const inWin = attemptsInRange(all, r);
  return {
    attempts: inWin.length,
    firstTryPct: pct(inWin),
    minutes: minutesInRange(events, r),
    sessions: sessionsInRange(states, r),
    feelings: feelingsInRange(events, r),
  };
}

export function computeHistoryWindow(
  profile: Profile,
  range: HistoryRange,
  now: number = Date.now(),
): WindowSummary {
  const states = loadAllMastery(profile);
  const events = parseEvents(exportTelemetry(profile.id));
  const cur = rangeFor(range, now);
  const prev = previousRangeFor(range, now);
  const current = statsForRange(states, events, cur);
  const previous = statsForRange(states, events, prev);
  const hasPrevious =
    previous.attempts > 0 ||
    previous.minutes > 0 ||
    previous.sessions > 0 ||
    previous.feelings.happy +
      previous.feelings.ok +
      previous.feelings.hard >
      0;
  return { range, current, previous, hasPrevious };
}

function dominant(f: FeelingCounts): SkillRow["dominantFeeling"] {
  const total = f.happy + f.ok + f.hard;
  if (total === 0) return null;
  if (f.hard > f.happy && f.hard > f.ok) return "hard";
  if (f.happy > f.hard && f.happy > f.ok) return "happy";
  return "ok";
}

export function computePerSkillStats(
  profile: Profile,
  range: HistoryRange,
  now: number = Date.now(),
): SkillRow[] {
  const events = parseEvents(exportTelemetry(profile.id));
  const cur = rangeFor(range, now);
  const prev = previousRangeFor(range, now);
  const rows: SkillRow[] = profile.allowedSkills.map((skill) => {
    const state = loadMastery(profile.id, skill);
    const inCur = attemptsInRange(state.attempts, cur);
    const inPrev = attemptsInRange(state.attempts, prev);
    const pctCur = pct(inCur);
    const pctPrev = pct(inPrev);
    const delta =
      pctCur !== null && pctPrev !== null && inPrev.length >= 5
        ? pctCur - pctPrev
        : null;
    return {
      skill,
      skillHebrew: SKILL_HEBREW[skill],
      attempts: inCur.length,
      firstTryPct: pctCur,
      firstTryPctDelta: delta,
      dominantFeeling: dominant(feelingsInRange(events, cur, skill)),
    };
  });
  rows.sort((a, b) => b.attempts - a.attempts);
  return rows;
}

function reasonRank(r: FocusReason): number {
  if (r === "dropped") return 3;
  if (r === "low_pct") return 2;
  return 1;
}

/**
 * Per-skill check: does this skill meet any of the focus-area criteria
 * (dropped / low_pct / negative_feeling) in the given window? Same primitives
 * as `computeFocusAreas` but without the 3-item cap and without priority — used
 * by the coverage view to flag "graduated but needs review" status, where every
 * qualifying skill needs the flag regardless of cap.
 */
export function skillNeedsReview(
  profile: Profile,
  skill: Skill,
  range: HistoryRange = "month_30",
  now: number = Date.now(),
): boolean {
  const cur = rangeFor(range, now);
  const prev = previousRangeFor(range, now);
  const state = loadMastery(profile.id, skill);
  const inCur = attemptsInRange(state.attempts, cur);
  const inPrev = attemptsInRange(state.attempts, prev);

  if (
    inCur.length >= FOCUS_MIN_ATTEMPTS &&
    inPrev.length >= FOCUS_MIN_ATTEMPTS
  ) {
    const pCur = pct(inCur);
    const pPrev = pct(inPrev);
    if (pCur !== null && pPrev !== null && pPrev - pCur >= FOCUS_DROP_THRESHOLD)
      return true;
  }

  if (inCur.length >= FOCUS_MIN_ATTEMPTS) {
    const pCur = pct(inCur);
    if (pCur !== null && pCur < FOCUS_LOW_PCT_THRESHOLD) return true;
  }

  const events = parseEvents(exportTelemetry(profile.id));
  const feelings = feelingsInRange(events, cur, skill);
  if (feelings.hard >= FOCUS_NEG_FEELING_SESSIONS) return true;

  return false;
}

export function computeFocusAreas(
  profile: Profile,
  range: HistoryRange,
  now: number = Date.now(),
): FocusItem[] {
  const name = profile.name;
  const events = parseEvents(exportTelemetry(profile.id));
  const cur = rangeFor(range, now);
  const prev = previousRangeFor(range, now);

  const items: FocusItem[] = [];
  const taken = new Set<Skill>();

  // 1. dropped (highest priority)
  for (const skill of profile.allowedSkills) {
    const state = loadMastery(profile.id, skill);
    const inCur = attemptsInRange(state.attempts, cur);
    const inPrev = attemptsInRange(state.attempts, prev);
    if (
      inCur.length < FOCUS_MIN_ATTEMPTS ||
      inPrev.length < FOCUS_MIN_ATTEMPTS
    )
      continue;
    const pctCur = pct(inCur);
    const pctPrev = pct(inPrev);
    if (pctCur === null || pctPrev === null) continue;
    const drop = pctPrev - pctCur;
    if (drop < FOCUS_DROP_THRESHOLD) continue;
    items.push({
      skill,
      skillHebrew: SKILL_HEBREW[skill],
      reason: "dropped",
      reasonText: `ירידה של ${drop} נקודות לעומת התקופה הקודמת (${pctPrev}% → ${pctCur}%)`,
      actionText: `היום את יכולה להציע ל${name} תרגיל קל יותר ב${SKILL_HEBREW[skill]} כדי לבנות ביטחון.`,
      severity: reasonRank("dropped") * 1000 + drop,
    });
    taken.add(skill);
  }

  // 2. low pct
  for (const skill of profile.allowedSkills) {
    if (taken.has(skill)) continue;
    const state = loadMastery(profile.id, skill);
    const inCur = attemptsInRange(state.attempts, cur);
    if (inCur.length < FOCUS_MIN_ATTEMPTS) continue;
    const pctCur = pct(inCur);
    if (pctCur === null) continue;
    if (pctCur >= FOCUS_LOW_PCT_THRESHOLD) continue;
    items.push({
      skill,
      skillHebrew: SKILL_HEBREW[skill],
      reason: "low_pct",
      reasonText: `${pctCur}% נכון בניסיון ראשון בחלון הזה`,
      actionText: `היום את יכולה להציע ל${name} לחזור על ${SKILL_HEBREW[skill]} בקצב שמתאים, ולתת לבחור מתי.`,
      severity: reasonRank("low_pct") * 1000 + (FOCUS_LOW_PCT_THRESHOLD - pctCur),
    });
    taken.add(skill);
  }

  // 3. negative feeling
  for (const skill of profile.allowedSkills) {
    if (taken.has(skill)) continue;
    const f = feelingsInRange(events, cur, skill);
    if (f.hard < FOCUS_NEG_FEELING_SESSIONS) continue;
    items.push({
      skill,
      skillHebrew: SKILL_HEBREW[skill],
      reason: "negative_feeling",
      reasonText: `סומן 😣 ב-${f.hard} סשנים בחלון הזה`,
      actionText: `היום כדאי להציע ל${name} לבחור נושא אחר, ולחזור ל${SKILL_HEBREW[skill]} בהמשך.`,
      severity: reasonRank("negative_feeling") * 1000 + f.hard,
    });
    taken.add(skill);
  }

  items.sort((a, b) => b.severity - a.severity);
  return items.slice(0, 3);
}

function localDateKey(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeDailyActivity(
  profile: Profile,
  range: HistoryRange,
  now: number = Date.now(),
): DayPoint[] {
  const events = parseEvents(exportTelemetry(profile.id));
  const r = rangeFor(range, now);
  const dayCount = Math.max(1, Math.ceil((r.to - r.from) / DAY_MS));

  const todayStart = startOfLocalDay(now);
  // Build calendar days from (today - dayCount + 1) → today inclusive for week/month;
  // for "today" → just today.
  const days: DayPoint[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const at = todayStart - i * DAY_MS;
    days.push({ date: localDateKey(at), minutes: 0, hasSession: false });
  }
  const byDate = new Map<string, DayPoint>();
  for (const p of days) byDate.set(p.date, p);

  for (const d of sessionDurations(events)) {
    const key = localDateKey(d.at);
    const p = byDate.get(key);
    if (!p) continue;
    p.minutes += Math.round(d.ms / 60_000);
    p.hasSession = true;
  }
  // Also flag days with session_start but no session_end (open session)
  for (const e of events) {
    if (e.t !== "session_start") continue;
    const key = localDateKey(e.at);
    const p = byDate.get(key);
    if (p) p.hasSession = true;
  }
  return days;
}
