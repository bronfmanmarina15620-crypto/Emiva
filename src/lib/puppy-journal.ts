import type {
  PuppyAttempt,
  PuppyCommand,
  PuppyFreeNote,
  PuppyJournal,
} from "./types";
import { PUPPY_LEARNED_SUCCESS_PCT } from "./types";
import { loadPuppyJournal, savePuppyJournal } from "./storage";

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
): PuppyJournal {
  const attempt: PuppyAttempt = { at: now, success, notes };
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

export function daysSinceTrainingStart(
  journal: PuppyJournal,
  now: number = Date.now(),
): number | null {
  if (journal.trainingStartDate === null) return null;
  const ms = now - journal.trainingStartDate;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export type JournalStage = "setup" | "planning" | "active";

export function journalStage(journal: PuppyJournal | null): JournalStage {
  if (journal === null) return "setup";
  if (journal.trainingStartDate === null) return "planning";
  return "active";
}

// --- Storage delegates (for ergonomic callers) ---

export function load(profileId: string): PuppyJournal | null {
  return loadPuppyJournal(profileId);
}

export function save(profileId: string, journal: PuppyJournal): void {
  savePuppyJournal(profileId, journal);
}
