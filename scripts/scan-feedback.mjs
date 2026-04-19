#!/usr/bin/env node
/**
 * Layer 4 — scan tasks/FEEDBACK-LOG.md for trigger phrases, propose
 * BACKLOG entries. Does NOT edit BACKLOG.md automatically — prints
 * suggestions for human review.
 */
import fs from "node:fs";
import path from "node:path";

const LOG = path.resolve("tasks/FEEDBACK-LOG.md");

const TRIGGERS = [
  { phrase: "חוזר", category: "repetition", hint: "BL-001 (variety)" },
  { phrase: "שוב אותו", category: "repetition", hint: "BL-001 (variety)" },
  { phrase: "משעמם", category: "engagement", hint: "consider difficulty / pacing" },
  { phrase: "קשה", category: "difficulty", hint: "check adaptive calibration" },
  { phrase: "קל מדי", category: "difficulty", hint: "adaptive picking too easy" },
  { phrase: "לא אוהבת", category: "ux", hint: "investigate which element" },
  { phrase: "מתעצבנ", category: "tone", hint: "review wording for warmth" },
  { phrase: "לא מבינ", category: "pedagogy", hint: "explanation may be unclear" },
];

if (!fs.existsSync(LOG)) {
  console.error(`not found: ${LOG}`);
  process.exit(2);
}

const text = fs.readFileSync(LOG, "utf8");
const lines = text.split(/\r?\n/).filter((l) => /^\d{4}-\d{2}-\d{2}\s*\|/.test(l));

const findings = [];
for (const line of lines) {
  for (const trig of TRIGGERS) {
    if (line.includes(trig.phrase)) {
      findings.push({ line, trigger: trig });
    }
  }
}

console.log(`entries scanned: ${lines.length}`);
if (findings.length === 0) {
  console.log("no trigger phrases found.");
  process.exit(0);
}
console.log(`\nSUGGESTED BACKLOG additions (human to review):\n`);
for (const f of findings) {
  console.log(`- [${f.trigger.category}] ${f.trigger.hint}`);
  console.log(`  line: ${f.line.trim()}\n`);
}
