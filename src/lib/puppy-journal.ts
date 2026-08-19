import type {
  PuppyAttempt,
  PuppyBreedFact,
  PuppyCommand,
  PuppyContext,
  PuppyFreeNote,
  PuppyJournal,
} from "./types";
import {
  PUPPY_COMMANDS_PER_WEEK,
  PUPPY_CONTEXTS,
  PUPPY_LEARNED_SUCCESS_PCT,
  PUPPY_MASTERY_SUCCESS_PCT,
  PUPPY_METHOD_PRINCIPLES,
} from "./types";
import { loadPuppyJournal, savePuppyJournal } from "./storage";

// MyLevel §6.3 — Emilia owns the project; Eva helps. The role decides what
// the UI offers, never whether a girl may open the journal at all.
export type PuppyRole = "owner" | "helper";

// The age band comes from §6: the project belongs to the 9-year-old.
export const PUPPY_OWNER_MIN_AGE = 9;

// §6.3 gives Eva an explicit job, so she is never turned away — she gets the
// helper view instead. Younger children still see the friendly age message.
export const PUPPY_HELPER_MIN_AGE = 7;

export function roleForAge(age: number): PuppyRole | null {
  if (age >= PUPPY_OWNER_MIN_AGE) return "owner";
  if (age >= PUPPY_HELPER_MIN_AGE) return "helper";
  return null;
}

// What the helper may do, per §6.3: hold treats, log results, photograph,
// research the breed. She does not add commands or move the project stage.
export function canAddCommands(role: PuppyRole): boolean {
  return role === "owner";
}

export function canAdvanceStage(role: PuppyRole): boolean {
  return role === "owner";
}

// Logging an attempt and adding a breed fact are explicitly the helper's job
// in §6.3, so both roles may do them. No predicate needed — the absence of a
// gate is the rule.

// --- Pure data operations ---

export function createJournal(
  puppyName: string,
  puppyBirthday: string | null = null,
): PuppyJournal {
  return {
    puppyName: puppyName.trim(),
    puppyBirthday,
    trainingStartDate: null,
    commands: [],
    freeNotes: [],
    methodLearned: [],
    breedName: undefined,
    breedFacts: [],
  };
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function addCommand(
  journal: PuppyJournal,
  hebrewName: string,
  englishName: string,
  targetSessions: number,
  now: number = Date.now(),
): PuppyJournal {
  const cmd: PuppyCommand = {
    id: newId("cmd"),
    hebrewName: hebrewName.trim(),
    englishName: englishName.trim(),
    addedAt: now,
    targetSessions: Math.max(1, Math.floor(targetSessions)),
    attempts: [],
  };
  return { ...journal, commands: [...journal.commands, cmd] };
}

export function addAttempt(
  journal: PuppyJournal,
  commandId: string,
  success: boolean,
  notes: string | undefined = undefined,
  now: number = Date.now(),
  context: PuppyContext | undefined = undefined,
  loggedBy: string | undefined = undefined,
): PuppyJournal {
  const attempt: PuppyAttempt = { at: now, success, notes, context, loggedBy };
  return {
    ...journal,
    commands: journal.commands.map((c) =>
      c.id === commandId ? { ...c, attempts: [...c.attempts, attempt] } : c,
    ),
  };
}

export function removeCommand(
  journal: PuppyJournal,
  commandId: string,
): PuppyJournal {
  return {
    ...journal,
    commands: journal.commands.filter((c) => c.id !== commandId),
  };
}

export function addNote(
  journal: PuppyJournal,
  text: string,
  now: number = Date.now(),
): PuppyJournal {
  const note: PuppyFreeNote = { id: newId("note"), at: now, text: text.trim() };
  return { ...journal, freeNotes: [...journal.freeNotes, note] };
}

export function startTraining(
  journal: PuppyJournal,
  now: number = Date.now(),
): PuppyJournal {
  if (journal.trainingStartDate !== null) return journal;
  return { ...journal, trainingStartDate: now };
}

// --- §6.2 stage 1: learning the method ---

export function toggleMethodPrinciple(
  journal: PuppyJournal,
  principleId: string,
): PuppyJournal {
  const known = PUPPY_METHOD_PRINCIPLES.some((p) => p.id === principleId);
  if (!known) return journal;
  const current = journal.methodLearned ?? [];
  const next = current.includes(principleId)
    ? current.filter((id) => id !== principleId)
    : [...current, principleId];
  return { ...journal, methodLearned: next };
}

export function methodIsComplete(journal: PuppyJournal): boolean {
  const learned = journal.methodLearned ?? [];
  return PUPPY_METHOD_PRINCIPLES.every((p) => learned.includes(p.id));
}

// --- §6.3: Eva's breed research ---

export function setBreedName(
  journal: PuppyJournal,
  breedName: string,
): PuppyJournal {
  return { ...journal, breedName: breedName.trim() };
}

export function addBreedFact(
  journal: PuppyJournal,
  text: string,
  now: number = Date.now(),
  loggedBy: string | undefined = undefined,
): PuppyJournal {
  const trimmed = text.trim();
  if (trimmed.length === 0) return journal;
  const fact: PuppyBreedFact = {
    id: newId("fact"),
    at: now,
    text: trimmed,
    loggedBy,
  };
  return { ...journal, breedFacts: [...(journal.breedFacts ?? []), fact] };
}

export function removeBreedFact(
  journal: PuppyJournal,
  factId: string,
): PuppyJournal {
  return {
    ...journal,
    breedFacts: (journal.breedFacts ?? []).filter((f) => f.id !== factId),
  };
}

// §6.3 asks for "3–4 עובדות" about the breed.
export const BREED_FACTS_TARGET = 3;

export function breedResearchIsComplete(journal: PuppyJournal): boolean {
  return (journal.breedFacts ?? []).length >= BREED_FACTS_TARGET;
}

// --- Derived values ---

export function successRate(cmd: PuppyCommand): number {
  if (cmd.attempts.length === 0) return 0;
  const wins = cmd.attempts.filter((a) => a.success).length;
  return (wins / cmd.attempts.length) * 100;
}

export function commandIsLearned(cmd: PuppyCommand): boolean {
  return (
    cmd.attempts.length >= cmd.targetSessions &&
    successRate(cmd) >= PUPPY_LEARNED_SUCCESS_PCT
  );
}

// --- §6.2 stage 3: the three contexts ---

export function successRateInContext(
  cmd: PuppyCommand,
  context: PuppyContext,
): number {
  const inContext = cmd.attempts.filter((a) => a.context === context);
  if (inContext.length === 0) return 0;
  const wins = inContext.filter((a) => a.success).length;
  return (wins / inContext.length) * 100;
}

export function attemptsInContext(
  cmd: PuppyCommand,
  context: PuppyContext,
): number {
  return cmd.attempts.filter((a) => a.context === context).length;
}

// The document's real bar: 90% in all three contexts. This is deliberately
// stricter than commandIsLearned — a dog that sits at home but not in the
// park has not learned "sit" (§6.2 stage 3).
export function commandIsMastered(cmd: PuppyCommand): boolean {
  return PUPPY_CONTEXTS.every(
    (ctx) =>
      attemptsInContext(cmd, ctx) > 0 &&
      successRateInContext(cmd, ctx) >= PUPPY_MASTERY_SUCCESS_PCT,
  );
}

// §6.2 stage 3 — "זיהוי חולשות". Which contexts are not yet at the bar.
export function weakContexts(cmd: PuppyCommand): PuppyContext[] {
  return PUPPY_CONTEXTS.filter(
    (ctx) =>
      attemptsInContext(cmd, ctx) === 0 ||
      successRateInContext(cmd, ctx) < PUPPY_MASTERY_SUCCESS_PCT,
  );
}

// --- §6.2: "פקודה אחת בכל שבוע" (soft guidance, never a block) ---

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function commandsAddedThisWeek(
  journal: PuppyJournal,
  now: number = Date.now(),
): number {
  return journal.commands.filter((c) => now - c.addedAt < WEEK_MS).length;
}

// Returns a gentle warning string, or null when the pace is fine. The caller
// shows it as advice — adding the command still succeeds either way.
export function pacingWarning(
  journal: PuppyJournal,
  now: number = Date.now(),
): string | null {
  if (commandsAddedThisWeek(journal, now) < PUPPY_COMMANDS_PER_WEEK) {
    return null;
  }
  return "כבר הוספת פקודה השבוע. הכי טוב ללמד פקודה אחת בכל שבוע — שליטה קודמת לריבוי. אם בא לך להוסיף עוד אחת, זה בסדר.";
}

export function daysSinceTrainingStart(
  journal: PuppyJournal,
  now: number = Date.now(),
): number | null {
  if (journal.trainingStartDate === null) return null;
  const ms = now - journal.trainingStartDate;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

// MyLevel §6.2 defines four stages across 12–16 weeks. "setup" (naming the
// puppy) sits before stage 1 and is not one of the document's four.
//   learning  → stage 1 (weeks 1–2):  videos, method, choosing commands
//   training  → stage 2 (weeks 3–8):  one command a week, logging attempts
//   testing   → stage 3 (weeks 9–12): the three contexts, finding weaknesses
//   presenting→ stage 4 (weeks 13–16): booklet + presenting to the family
export type JournalStage =
  | "setup"
  | "learning"
  | "training"
  | "testing"
  | "presenting";

// Stage 3 starts when every command has at least one contextual attempt
// logged outside the home — that is what "בדיקה ב-3 הקשרים" means in practice.
function hasStartedContextTesting(journal: PuppyJournal): boolean {
  return journal.commands.some((c) =>
    c.attempts.some((a) => a.context !== undefined && a.context !== "home"),
  );
}

// Stage 4 opens once at least one command is mastered in all three contexts.
// The document ties the presentation to real achievement, not to a date.
function isReadyToPresent(journal: PuppyJournal): boolean {
  return journal.commands.some((c) => commandIsMastered(c));
}

export function journalStage(journal: PuppyJournal | null): JournalStage {
  if (journal === null) return "setup";
  if (journal.trainingStartDate === null) return "learning";
  if (isReadyToPresent(journal)) return "presenting";
  if (hasStartedContextTesting(journal)) return "testing";
  return "training";
}

/**
 * GENDER-INCLUSIVE-001 — תוויות השלבים שהמסך מציג לילד/ה.
 *
 * ⚠️ ארבע התוויות היו **רבים-בנקבה** ("לומדות", "מתאמנות") — מגדר
 * בתחפושת, אותה מלכודת שמתועדת ב-greetings.ts. הן חמקו משומר
 * `ui-address-form` רק משום שהוא סורק את `src/app`, בעוד שהמחרוזות
 * יושבות כאן ומרונדרות משם. הצורה הניטרלית היא רבים-סתמי.
 */
export const STAGE_HEBREW: Record<JournalStage, string> = {
  setup: "התחלה",
  learning: "שלב 1 — לומדים את השיטה",
  training: "שלב 2 — מתאמנים",
  testing: "שלב 3 — בודקים בכל מקום",
  presenting: "שלב 4 — מציגים",
};

// §6.2 stage 4 — the booklet is produced at home (Canva). The app only
// gathers what the child already wrote, as a draft she can copy from.
export function bookletDraft(journal: PuppyJournal): {
  puppyName: string;
  breedName: string | null;
  breedFacts: string[];
  masteredCommands: string[];
  tips: string[];
} {
  return {
    puppyName: journal.puppyName,
    breedName: journal.breedName ?? null,
    breedFacts: (journal.breedFacts ?? []).map((f) => f.text),
    masteredCommands: journal.commands
      .filter((c) => commandIsMastered(c))
      .map((c) => c.hebrewName),
    tips: [...journal.freeNotes]
      .sort((a, b) => a.at - b.at)
      .map((n) => n.text),
  };
}

// --- Storage delegates (for ergonomic callers) ---

export function load(profileId: string): PuppyJournal | null {
  return loadPuppyJournal(profileId);
}

/**
 * LAUNCH-PUBLIC-001 D1 — which journal a helper may open.
 *
 * Returns the id of the owner whose journal has **explicitly invited** this
 * helper, or `null` when nobody has. The previous version scanned the device
 * and returned the first owner-aged journal it found; inside one family that
 * is the intended "one puppy, one journal" shortcut, but on a shared tablet
 * it handed a child another family's journal with write access.
 *
 * Pure and injectable: the caller passes the candidate owners, so this stays
 * testable without touching storage (same style as `resolveEffectiveSkillPure`).
 */
export function ownerJournalForHelper(
  helperId: string,
  ownerIds: readonly string[],
  loadJournal: (id: string) => PuppyJournal | null = loadPuppyJournal,
): string | null {
  for (const ownerId of ownerIds) {
    if (ownerId === helperId) continue;
    const journal = loadJournal(ownerId);
    if (journal?.helperIds?.includes(helperId)) return ownerId;
  }
  return null;
}

/** Owner invites a helper onto the project (§6.3). Idempotent. */
export function inviteHelper(
  journal: PuppyJournal,
  helperId: string,
): PuppyJournal {
  const current = journal.helperIds ?? [];
  if (current.includes(helperId)) return journal;
  return { ...journal, helperIds: [...current, helperId] };
}

/** Owner removes a helper. */
export function removeHelper(
  journal: PuppyJournal,
  helperId: string,
): PuppyJournal {
  const current = journal.helperIds ?? [];
  if (!current.includes(helperId)) return journal;
  return { ...journal, helperIds: current.filter((id) => id !== helperId) };
}

export function save(profileId: string, journal: PuppyJournal): void {
  savePuppyJournal(profileId, journal);
}
