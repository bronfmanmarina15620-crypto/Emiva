const BELIEF_PREFIX = "emiva.parent_belief.v1";

export type BeliefKind = "performance" | "feeling" | "other";

export type BeliefNote = {
  text: string;
  at: number;
  weekKey: string;
  kind: BeliefKind;
};

export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function key(profileId: string, weekKey: string): string {
  return `${BELIEF_PREFIX}.${profileId}.${weekKey}`;
}

export function saveBelief(
  profileId: string,
  text: string,
  kind: BeliefKind,
  at: number = Date.now(),
): BeliefNote | null {
  if (typeof window === "undefined") return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const weekKey = isoWeekKey(new Date(at));
  const note: BeliefNote = { text: trimmed, at, weekKey, kind };
  window.localStorage.setItem(key(profileId, weekKey), JSON.stringify(note));
  return note;
}

function normalizeNote(raw: unknown): BeliefNote | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<BeliefNote>;
  if (typeof r.text !== "string" || typeof r.at !== "number") return null;
  const kind: BeliefKind =
    r.kind === "performance" || r.kind === "feeling" || r.kind === "other"
      ? r.kind
      : "other";
  const weekKey = typeof r.weekKey === "string" ? r.weekKey : isoWeekKey(new Date(r.at));
  return { text: r.text, at: r.at, weekKey, kind };
}

export function loadBelief(
  profileId: string,
  weekKey: string,
): BeliefNote | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(profileId, weekKey));
    if (!raw) return null;
    return normalizeNote(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function latestBelief(profileId: string): BeliefNote | null {
  if (typeof window === "undefined") return null;
  const ls = window.localStorage;
  const prefix = `${BELIEF_PREFIX}.${profileId}.`;
  let best: BeliefNote | null = null;
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    try {
      const raw = ls.getItem(k);
      if (!raw) continue;
      const note = normalizeNote(JSON.parse(raw));
      if (note === null) continue;
      if (best === null || note.at > best.at) best = note;
    } catch {
      // skip corrupt entries
    }
  }
  return best;
}

export function countBeliefsInLastNDays(
  profileId: string,
  nDays: number,
  now: number = Date.now(),
): number {
  if (typeof window === "undefined") return 0;
  const ls = window.localStorage;
  const prefix = `${BELIEF_PREFIX}.${profileId}.`;
  const cutoff = now - nDays * 86_400_000;
  let count = 0;
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    try {
      const raw = ls.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as BeliefNote;
      if (typeof parsed.at === "number" && parsed.at >= cutoff) count++;
    } catch {
      // skip
    }
  }
  return count;
}
