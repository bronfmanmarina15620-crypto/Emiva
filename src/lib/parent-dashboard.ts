import type { Attempt, MasteryState, Skill } from "./types";
import {
  BELIEF_LOW_SAMPLE,
  BELIEF_WEAK_PCT,
  INACTIVITY_DAYS_TALK,
  INACTIVITY_DAYS_WATCH,
  MAX_SESSION_MS,
  REMINDER_DAYS,
  TREND_DELTA_PCT,
  WATCH_DROP_DELTA_PCT,
  WATCH_FIRST_TRY_PCT,
  WHEEL_SPIN_MIN_ATTEMPTS,
  WHEEL_SPIN_MIN_SESSIONS,
  WHEEL_SPIN_THRESHOLD_PCT,
} from "./types";
import { hasGraduatedFlag, loadMastery } from "./storage";
import type { Profile } from "./profiles";
import { latestBelief, type BeliefKind } from "./parent-belief";
import { exportTelemetry, type TelemetryEvent } from "./telemetry";

const DAY_MS = 86_400_000;

export type Verdict = "on_track" | "watch" | "talk";
export type TileState = "not_started" | "in_progress" | "mastered";
export type ActionTrigger =
  | "wheel_spin"
  | "inactivity"
  | "srs_due"
  | "default";

export type SkillTile = {
  skill: Skill;
  skillHebrew: string;
  state: TileState;
  sessionCount: number;
  firstTryPct: number | null;
};

export type WheelSpinFlag = {
  skill: Skill;
  skillHebrew: string;
};

export type ActionLine = {
  text: string;
  trigger: ActionTrigger;
  skill: Skill | null;
};

export type BeliefComparison = {
  text: string;
  kind: BeliefKind;
  daysAgo: number;
  attemptsSince: number;
  firstTryPctSince: number | null;
  sessionsSince: number;
  minutesSince: number;
  lowSample: boolean;
  weakData: boolean;
};

export type Trend = "up" | "down" | "flat" | "insufficient";

export type SessionFeelings = {
  happy: number;
  ok: number;
  hard: number;
};

export type WeeklyDigest = {
  totalAttempts: number;
  newlyMastered: number;
  wheelSpinCount: number;
  weeklyMinutes: number;
  feelings: SessionFeelings;
  topAction: string;
};

export const SKILL_HEBREW: Record<Skill, string> = {
  add_sub_100: "חיבור וחיסור עד 100",
  multiplication: "לוח הכפל",
  fractions_intro: "שברים",
  ops_1000: "חיבור וחיסור עד 1000",
  long_division: "חילוק ארוך",
  bar_models: "בעיות מילוליות",
};

export const POSSIBLE_CAUSE_HEBREW: Partial<Record<Skill, string>> = {
  fractions_intro: "חיבור/חיסור עד 100 שלא התייצב",
  multiplication: "חיבור/חיסור עד 100 שלא התייצב",
  ops_1000: "חיבור/חיסור עד 100 שלא התייצב",
  long_division: "כפל שלא התייצב",
  bar_models: "חיבור/חיסור או כפל בסיסיים",
};

function loadAllMastery(profile: Profile): MasteryState[] {
  return profile.allowedSkills.map((s) => loadMastery(profile.id, s));
}

function firstTryPct(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null;
  const correct = attempts.filter((a) => a.correct).length;
  return Math.round((correct / attempts.length) * 100);
}

function attemptsInWindow(
  attempts: Attempt[],
  fromMs: number,
  toMs: number,
): Attempt[] {
  return attempts.filter((a) => a.at >= fromMs && a.at < toMs);
}

function lastSessionAt(states: MasteryState[]): number | null {
  let latest: number | null = null;
  for (const s of states) {
    for (const t of s.sessionTimestamps) {
      if (latest === null || t > latest) latest = t;
    }
  }
  return latest;
}

function currentSkill(states: MasteryState[]): Skill | null {
  let bestSkill: Skill | null = null;
  let bestAt = -Infinity;
  for (const s of states) {
    if (s.attempts.length === 0) continue;
    const lastAt = s.attempts[s.attempts.length - 1]!.at;
    if (lastAt > bestAt) {
      bestAt = lastAt;
      bestSkill = s.skill;
    }
  }
  return bestSkill;
}

function daysSince(at: number | null, now: number): number | null {
  if (at === null) return null;
  return Math.floor((now - at) / DAY_MS);
}

export function computeLastSessionDays(
  profile: Profile,
  now: number = Date.now(),
): number | null {
  const states = loadAllMastery(profile);
  const last = lastSessionAt(states);
  return daysSince(last, now);
}

export function computeWheelSpin(
  profile: Profile,
  now: number = Date.now(),
): WheelSpinFlag[] {
  void now;
  const flags: WheelSpinFlag[] = [];
  for (const s of loadAllMastery(profile)) {
    if (s.attempts.length < WHEEL_SPIN_MIN_ATTEMPTS) continue;
    if (s.sessionTimestamps.length < WHEEL_SPIN_MIN_SESSIONS) continue;
    const last = s.attempts.slice(-WHEEL_SPIN_MIN_ATTEMPTS);
    const pct = firstTryPct(last) ?? 100;
    if (pct <= WHEEL_SPIN_THRESHOLD_PCT) {
      flags.push({ skill: s.skill, skillHebrew: SKILL_HEBREW[s.skill] });
    }
  }
  return flags;
}

export function computeSkillTiles(
  profile: Profile,
  now: number = Date.now(),
): SkillTile[] {
  void now;
  return profile.allowedSkills.map((skill) => {
    const state = loadMastery(profile.id, skill);
    const graduated = hasGraduatedFlag(profile.id, skill);
    const tileState: TileState = graduated
      ? "mastered"
      : state.attempts.length > 0
        ? "in_progress"
        : "not_started";
    return {
      skill,
      skillHebrew: SKILL_HEBREW[skill],
      state: tileState,
      sessionCount: state.sessionTimestamps.length,
      firstTryPct: firstTryPct(state.attempts),
    };
  });
}

export function computeVerdict(
  profile: Profile,
  now: number = Date.now(),
): Verdict {
  const states = loadAllMastery(profile);
  const wheelSpins = computeWheelSpin(profile, now);
  if (wheelSpins.length > 0) return "talk";

  const last = lastSessionAt(states);
  const daysAgo = daysSince(last, now);
  if (daysAgo === null) return "watch";
  if (daysAgo >= INACTIVITY_DAYS_TALK) return "talk";

  let watch = false;
  if (daysAgo >= INACTIVITY_DAYS_WATCH) watch = true;

  for (const s of states) {
    if (s.attempts.length >= WHEEL_SPIN_MIN_ATTEMPTS) {
      const pct = firstTryPct(s.attempts.slice(-WHEEL_SPIN_MIN_ATTEMPTS)) ?? 100;
      if (pct < WATCH_FIRST_TRY_PCT) watch = true;
    }
  }

  const weekMs = 7 * DAY_MS;
  const allAttempts: Attempt[] = states.flatMap((s) => s.attempts);
  const thisWeek = attemptsInWindow(allAttempts, now - weekMs, now);
  const priorWeek = attemptsInWindow(allAttempts, now - 2 * weekMs, now - weekMs);
  if (thisWeek.length >= 10 && priorWeek.length >= 10) {
    const pctNow = firstTryPct(thisWeek);
    const pctPrior = firstTryPct(priorWeek);
    if (pctNow !== null && pctPrior !== null) {
      if (pctPrior - pctNow >= WATCH_DROP_DELTA_PCT) watch = true;
    }
  }

  return watch ? "watch" : "on_track";
}

function anyDueSrs(state: MasteryState): boolean {
  for (const info of Object.values(state.srs)) {
    if (info.sessionsUntilDue <= 0) return true;
  }
  return false;
}

export function computeActionLine(
  profile: Profile,
  now: number = Date.now(),
): ActionLine {
  const name = profile.name;
  const wheelSpins = computeWheelSpin(profile, now);
  if (wheelSpins.length > 0) {
    const s = wheelSpins[0]!;
    return {
      trigger: "wheel_spin",
      skill: s.skill,
      text: `היום את יכולה להציע ל${name} לחזור על ${s.skillHebrew}, ולתת לה לבחור אם זה רגע טוב.`,
    };
  }

  const states = loadAllMastery(profile);
  const last = lastSessionAt(states);
  const daysAgo = daysSince(last, now);
  if (daysAgo === null || daysAgo >= INACTIVITY_DAYS_WATCH) {
    return {
      trigger: "inactivity",
      skill: null,
      text: `היום את יכולה להזמין את ${name} לסשן קצר, ולתת לה לבחור נושא.`,
    };
  }

  const current = currentSkill(states);
  if (current !== null) {
    const currentState = states.find((s) => s.skill === current)!;
    if (anyDueSrs(currentState)) {
      return {
        trigger: "srs_due",
        skill: current,
        text: `היום כדאי להציע חזרה על ${SKILL_HEBREW[current]} — כמה פריטים מחכים.`,
      };
    }
  }

  return {
    trigger: "default",
    skill: null,
    text: `היום את יכולה לתת ל${name} לבחור — כל כיוון בסדר.`,
  };
}

export function computePossibleCause(
  profile: Profile,
  verdict: Verdict,
  now: number = Date.now(),
): string | null {
  if (verdict === "on_track") return null;
  const states = loadAllMastery(profile);
  const skill = currentSkill(states);
  if (skill === null) return null;
  const cause = POSSIBLE_CAUSE_HEBREW[skill];
  if (!cause) return null;
  void now;
  return `אם היא מתקשה, סביר שהסיבה היא ${cause}.`;
}

export function computeBeliefComparison(
  profile: Profile,
  now: number = Date.now(),
): BeliefComparison | null {
  const note = latestBelief(profile.id);
  if (note === null) return null;
  const states = loadAllMastery(profile);
  const since = note.at;

  let attemptsSince = 0;
  let correctSince = 0;
  let sessionsSince = 0;
  for (const s of states) {
    for (const a of s.attempts) {
      if (a.at >= since) {
        attemptsSince++;
        if (a.correct) correctSince++;
      }
    }
    for (const t of s.sessionTimestamps) {
      if (t >= since) sessionsSince++;
    }
  }
  const pct =
    attemptsSince > 0 ? Math.round((correctSince / attemptsSince) * 100) : null;

  const daysAgo = Math.max(0, Math.floor((now - note.at) / DAY_MS));
  const minutesSince = computeMinutesSince(profile.id, since);
  const lowSample = attemptsSince < BELIEF_LOW_SAMPLE;
  const weakData =
    !lowSample && pct !== null && pct < BELIEF_WEAK_PCT;
  return {
    text: note.text,
    kind: note.kind,
    daysAgo,
    attemptsSince,
    firstTryPctSince: pct,
    sessionsSince,
    minutesSince,
    lowSample,
    weakData,
  };
}

function parseEvents(raw: string): TelemetryEvent[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function sessionDurations(events: TelemetryEvent[]): Array<{ at: number; ms: number }> {
  const pairs: Array<{ at: number; ms: number }> = [];
  const openByskill = new Map<string, number>();
  for (const e of events) {
    if (e.t === "session_start") {
      openByskill.set(e.skill, e.at);
    } else if (e.t === "session_end") {
      const start = openByskill.get(e.skill);
      if (start !== undefined) {
        const ms = Math.min(MAX_SESSION_MS, Math.max(0, e.at - start));
        pairs.push({ at: e.at, ms });
        openByskill.delete(e.skill);
      }
    }
  }
  return pairs;
}

export function computeMinutesSince(profileId: string, since: number): number {
  const events = parseEvents(exportTelemetry(profileId));
  let ms = 0;
  for (const d of sessionDurations(events)) {
    if (d.at >= since) ms += d.ms;
  }
  return Math.round(ms / 60_000);
}

export function computeWeeklyMinutes(
  profile: Profile,
  now: number = Date.now(),
): number {
  const weekStart = weekStartSunday(now);
  return computeMinutesSince(profile.id, weekStart);
}

export function computeSessionFeelings(
  profile: Profile,
  now: number = Date.now(),
): SessionFeelings {
  const weekStart = weekStartSunday(now);
  const events = parseEvents(exportTelemetry(profile.id));
  const out: SessionFeelings = { happy: 0, ok: 0, hard: 0 };
  for (const e of events) {
    if (e.t !== "session_feeling") continue;
    if (e.at < weekStart) continue;
    out[e.rating]++;
  }
  return out;
}

export function computeTrend(
  profile: Profile,
  now: number = Date.now(),
): Trend {
  const weekMs = 7 * DAY_MS;
  const states = loadAllMastery(profile);
  const all = states.flatMap((s) => s.attempts);
  const thisWeek = attemptsInWindow(all, now - weekMs, now);
  const priorWeek = attemptsInWindow(all, now - 2 * weekMs, now - weekMs);
  if (thisWeek.length < 10 || priorWeek.length < 10) return "insufficient";
  const pctNow = firstTryPct(thisWeek);
  const pctPrior = firstTryPct(priorWeek);
  if (pctNow === null || pctPrior === null) return "insufficient";
  const delta = pctNow - pctPrior;
  if (delta >= TREND_DELTA_PCT) return "up";
  if (delta <= -TREND_DELTA_PCT) return "down";
  return "flat";
}

export function computeParentReminderNeeded(now: number = Date.now()): boolean {
  const events = parseEvents(exportTelemetry("_parent"));
  const opens = events.filter((e) => e.t === "dashboard_opened");
  if (opens.length === 0) return false;
  const latest = Math.max(...opens.map((e) => e.at));
  return now - latest > REMINDER_DAYS * DAY_MS;
}

function weekStartSunday(now: number): number {
  const d = new Date(now);
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function graduatedThisWeek(profileId: string, weekStart: number): number {
  const events = parseEvents(exportTelemetry(profileId));
  return events.filter((e) => e.t === "skill_graduated" && e.at >= weekStart)
    .length;
}

export function computeWeeklyDigest(
  profile: Profile,
  now: number = Date.now(),
): WeeklyDigest {
  const weekStart = weekStartSunday(now);
  const states = loadAllMastery(profile);
  const totalAttempts = states.reduce(
    (acc, s) => acc + s.attempts.filter((a) => a.at >= weekStart).length,
    0,
  );
  const wheelSpinCount = computeWheelSpin(profile, now).length;
  const newlyMastered = graduatedThisWeek(profile.id, weekStart);
  const weeklyMinutes = computeWeeklyMinutes(profile, now);
  const feelings = computeSessionFeelings(profile, now);
  const topAction = computeActionLine(profile, now).text;
  return {
    totalAttempts,
    newlyMastered,
    wheelSpinCount,
    weeklyMinutes,
    feelings,
    topAction,
  };
}

export function countDashboardEventsInLastNDays(
  nDays: number,
  now: number = Date.now(),
): { opens: number; beliefs: number } {
  const cutoff = now - nDays * DAY_MS;
  let opens = 0;
  let beliefs = 0;
  const parse = (raw: string): TelemetryEvent[] => {
    try {
      return JSON.parse(raw) as TelemetryEvent[];
    } catch {
      return [];
    }
  };
  const parentRaw = exportTelemetry("_parent");
  for (const e of parse(parentRaw)) {
    if (e.t === "dashboard_opened" && e.at >= cutoff) opens++;
  }
  if (typeof window !== "undefined") {
    const ls = window.localStorage;
    const prefix = "emiva.telemetry.v1.";
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      if (k === `${prefix}_parent`) continue;
      const raw = ls.getItem(k);
      if (!raw) continue;
      for (const e of parse(raw)) {
        if (e.t === "belief_submitted" && e.at >= cutoff) beliefs++;
      }
    }
  }
  return { opens, beliefs };
}
