/**
 * Layer 3 — local telemetry. Browser-only event log in localStorage.
 * Per-profile scoped (`emiva.telemetry.v1.{profileId}`).
 *
 * Privacy: stays entirely on the child's device until the parent exports.
 * NEVER includes names or any PII — only `profileId` (opaque) + skill + difficulty.
 */

const PREFIX = "emiva.telemetry.v1";
const MAX_EVENTS = 2000;

export type TelemetryEvent =
  | { t: "session_start"; at: number; skill: string }
  | { t: "session_end"; at: number; skill: string; answered: number; correctFirstTry: number }
  | { t: "item_shown"; at: number; itemId: string; difficulty: number }
  | { t: "attempt"; at: number; itemId: string; attemptIdx: 0 | 1 | 2; correct: boolean }
  | { t: "reveal"; at: number; itemId: string }
  | { t: "feedback_text"; at: number; kind: "retry" | "correct" | "reveal"; text: string }
  | { t: "skill_graduated"; at: number; skill: string; firstAttemptCorrect: number; sessionCount: number; gapMs: number }
  | { t: "dashboard_opened"; at: number }
  | { t: "belief_submitted"; at: number; weekKey: string; kind: "performance" | "feeling" | "other" }
  | { t: "action_line_shown"; at: number; trigger: "wheel_spin" | "inactivity" | "srs_due" | "default" }
  | { t: "session_feeling"; at: number; skill: string; rating: "happy" | "ok" | "hard" };

function key(profileId: string): string {
  return `${PREFIX}.${profileId}`;
}

export function logEvent(profileId: string, ev: TelemetryEvent): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(key(profileId));
    const arr: TelemetryEvent[] = raw ? JSON.parse(raw) : [];
    arr.push(ev);
    const trimmed = arr.length > MAX_EVENTS ? arr.slice(-MAX_EVENTS) : arr;
    window.localStorage.setItem(key(profileId), JSON.stringify(trimmed));
  } catch {
    // swallow — telemetry must never break the app
  }
}

export function exportTelemetry(profileId: string): string {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(key(profileId)) ?? "[]";
}

export function clearTelemetry(profileId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(profileId));
}
