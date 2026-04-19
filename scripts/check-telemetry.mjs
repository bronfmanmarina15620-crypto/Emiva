#!/usr/bin/env node
/**
 * Layer 3 — telemetry check. Reads a telemetry-*.json export, computes a few
 * thresholds, and prints BACKLOG-ready findings.
 *
 * Usage:
 *   node scripts/check-telemetry.mjs path/to/telemetry.json
 *
 * Thresholds (align with BACKLOG trigger conditions — update when BL items change):
 *   - repetition_rate > 0.5 in any session     → BL-001 (feedback variety)
 *   - mastery_delta < 0 over 3 consecutive sessions → fatigue / wrong difficulty
 *   - reveal_rate > 0.35 (>35% items revealed) → difficulty miscalibrated
 */
import fs from "node:fs";
import path from "node:path";

const argPath = process.argv[2];
if (!argPath) {
  console.error("usage: node scripts/check-telemetry.mjs <telemetry.json>");
  process.exit(2);
}

const raw = fs.readFileSync(path.resolve(argPath), "utf8");
const events = JSON.parse(raw);
if (!Array.isArray(events)) {
  console.error("telemetry file is not an array of events");
  process.exit(2);
}

const sessions = [];
let curr = null;
for (const e of events) {
  if (e.t === "session_start") {
    if (curr) sessions.push(curr);
    curr = { start: e.at, texts: [], reveals: 0, items: 0, firstTry: 0, end: null };
  } else if (!curr) {
    continue;
  } else if (e.t === "feedback_text") {
    curr.texts.push(`${e.kind}:${e.text}`);
  } else if (e.t === "reveal") {
    curr.reveals += 1;
  } else if (e.t === "item_shown") {
    curr.items += 1;
  } else if (e.t === "attempt" && e.attemptIdx === 0 && e.correct) {
    curr.firstTry += 1;
  } else if (e.t === "session_end") {
    curr.end = e.at;
    sessions.push(curr);
    curr = null;
  }
}
if (curr) sessions.push(curr);

const findings = [];

// BL-001 — repetition rate
for (const [i, s] of sessions.entries()) {
  if (s.texts.length < 3) continue;
  const unique = new Set(s.texts).size;
  const rate = 1 - unique / s.texts.length;
  if (rate > 0.5) {
    findings.push(
      `BL-001 TRIGGERED in session ${i + 1}: repetition_rate=${rate.toFixed(
        2,
      )} (>${0.5}). Expand feedback-messages variants.`,
    );
  }
}

// Reveal rate — difficulty miscalibration
for (const [i, s] of sessions.entries()) {
  if (s.items === 0) continue;
  const revealRate = s.reveals / s.items;
  if (revealRate > 0.35) {
    findings.push(
      `DIFFICULTY session ${i + 1}: reveal_rate=${revealRate.toFixed(
        2,
      )} (>0.35). Adaptive loop may be picking items too hard.`,
    );
  }
}

console.log(`sessions analyzed: ${sessions.length}`);
if (findings.length === 0) {
  console.log("no thresholds crossed. backlog triggers quiet.");
  process.exit(0);
}
console.log("\nFINDINGS (copy to tasks/BACKLOG.md):");
for (const f of findings) console.log(`- ${f}`);
