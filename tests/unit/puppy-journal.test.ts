import { beforeEach, describe, expect, it } from "vitest";
import {
  addAttempt,
  addCommand,
  addNote,
  commandIsLearned,
  createJournal,
  daysSinceTrainingStart,
  journalStage,
  load,
  removeCommand,
  save,
  startTraining,
  successRate,
} from "@/lib/puppy-journal";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  get length() {
    return this.store.size;
  }
  key(i: number) {
    return [...this.store.keys()][i] ?? null;
  }
}

function installMemoryStorage(): MemoryStorage {
  const mem = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
    localStorage: mem,
  };
  return mem;
}

beforeEach(() => {
  installMemoryStorage();
});

describe("puppy-journal — createJournal + stages", () => {
  it("createJournal trims the name and yields setup → planning stage", () => {
    const j = createJournal("  Buddy  ");
    expect(j.puppyName).toBe("Buddy");
    expect(j.commands).toEqual([]);
    expect(j.freeNotes).toEqual([]);
    expect(j.trainingStartDate).toBeNull();
    expect(journalStage(null)).toBe("setup");
    expect(journalStage(j)).toBe("planning");
  });

  it("startTraining moves the stage to active and sets a timestamp", () => {
    let j = createJournal("Buddy");
    j = startTraining(j, 1_000_000);
    expect(j.trainingStartDate).toBe(1_000_000);
    expect(journalStage(j)).toBe("active");
  });

  it("startTraining is idempotent — second call does not overwrite the date", () => {
    let j = createJournal("Buddy");
    j = startTraining(j, 1_000_000);
    j = startTraining(j, 9_000_000);
    expect(j.trainingStartDate).toBe(1_000_000);
  });
});

describe("puppy-journal — commands", () => {
  it("addCommand appends with trimmed names and a generated id", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "  שב  ", "  sit  ", 30, 123);
    expect(j.commands.length).toBe(1);
    expect(j.commands[0]?.hebrewName).toBe("שב");
    expect(j.commands[0]?.englishName).toBe("sit");
    expect(j.commands[0]?.targetSessions).toBe(30);
    expect(j.commands[0]?.addedAt).toBe(123);
    expect(j.commands[0]?.id).toBeTruthy();
    expect(j.commands[0]?.attempts).toEqual([]);
  });

  it("addCommand forces targetSessions to be ≥ 1 and an integer", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 0.7);
    expect(j.commands[0]?.targetSessions).toBe(1);
  });

  it("removeCommand removes by id and leaves siblings intact", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 30);
    j = addCommand(j, "ארצה", "down", 30);
    const firstId = j.commands[0]!.id;
    j = removeCommand(j, firstId);
    expect(j.commands.length).toBe(1);
    expect(j.commands[0]?.hebrewName).toBe("ארצה");
  });

  it("addAttempt appends an attempt to the right command only", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 30);
    j = addCommand(j, "ארצה", "down", 30);
    const sitId = j.commands[0]!.id;
    j = addAttempt(j, sitId, true, "מהיר", 1000);
    expect(j.commands[0]?.attempts.length).toBe(1);
    expect(j.commands[0]?.attempts[0]?.success).toBe(true);
    expect(j.commands[0]?.attempts[0]?.notes).toBe("מהיר");
    expect(j.commands[0]?.attempts[0]?.at).toBe(1000);
    expect(j.commands[1]?.attempts.length).toBe(0);
  });
});

describe("puppy-journal — derived values", () => {
  it("successRate is 0 with no attempts and 100 with all successes", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 3);
    const empty = j.commands[0]!;
    expect(successRate(empty)).toBe(0);
    j = addAttempt(j, empty.id, true);
    j = addAttempt(j, empty.id, true);
    expect(successRate(j.commands[0]!)).toBe(100);
  });

  it("commandIsLearned requires both ≥ targetSessions AND ≥ 80% success", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 5);
    const id = j.commands[0]!.id;
    // 4/5 attempts (80%) but only 4 attempts → not learned yet
    for (let i = 0; i < 4; i++) j = addAttempt(j, id, true);
    expect(commandIsLearned(j.commands[0]!)).toBe(false);
    // 5th attempt: 5/5 → learned
    j = addAttempt(j, id, true);
    expect(commandIsLearned(j.commands[0]!)).toBe(true);
  });

  it("commandIsLearned is false when success rate drops below 80%", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 5);
    const id = j.commands[0]!.id;
    for (let i = 0; i < 4; i++) j = addAttempt(j, id, true);
    for (let i = 0; i < 4; i++) j = addAttempt(j, id, false);
    // 4/8 = 50% — well below the 80% bar
    expect(commandIsLearned(j.commands[0]!)).toBe(false);
  });

  it("daysSinceTrainingStart returns null until training starts, then floor(days)", () => {
    let j = createJournal("Buddy");
    expect(daysSinceTrainingStart(j, 5_000_000)).toBeNull();
    const start = 1_000_000_000_000;
    j = startTraining(j, start);
    expect(daysSinceTrainingStart(j, start)).toBe(0);
    expect(daysSinceTrainingStart(j, start + 86_400_000)).toBe(1);
    expect(daysSinceTrainingStart(j, start + 3 * 86_400_000 + 1000)).toBe(3);
  });
});

describe("puppy-journal — notes", () => {
  it("addNote trims text and adds with timestamp/id", () => {
    let j = createJournal("Buddy");
    j = addNote(j, "  היה כיף היום  ", 555);
    expect(j.freeNotes.length).toBe(1);
    expect(j.freeNotes[0]?.text).toBe("היה כיף היום");
    expect(j.freeNotes[0]?.at).toBe(555);
    expect(j.freeNotes[0]?.id).toBeTruthy();
  });
});

describe("puppy-journal — storage roundtrip", () => {
  it("save + load roundtrip preserves the full journal", () => {
    let j = createJournal("Buddy", "2026-04-01");
    j = startTraining(j, 1000);
    j = addCommand(j, "שב", "sit", 30, 2000);
    const id = j.commands[0]!.id;
    j = addAttempt(j, id, true, undefined, 3000);
    j = addNote(j, "שב מצוין", 4000);
    save("p-emilia", j);

    const loaded = load("p-emilia");
    expect(loaded).not.toBeNull();
    expect(loaded?.puppyName).toBe("Buddy");
    expect(loaded?.puppyBirthday).toBe("2026-04-01");
    expect(loaded?.trainingStartDate).toBe(1000);
    expect(loaded?.commands.length).toBe(1);
    expect(loaded?.commands[0]?.attempts.length).toBe(1);
    expect(loaded?.freeNotes.length).toBe(1);
  });

  it("load returns null when no journal is stored", () => {
    expect(load("p-emilia")).toBeNull();
  });

  it("journals are scoped per profile", () => {
    let j1 = createJournal("Buddy");
    j1 = addCommand(j1, "שב", "sit", 30);
    save("p1", j1);
    const j2 = createJournal("Rex");
    save("p2", j2);

    expect(load("p1")?.puppyName).toBe("Buddy");
    expect(load("p1")?.commands.length).toBe(1);
    expect(load("p2")?.puppyName).toBe("Rex");
    expect(load("p2")?.commands.length).toBe(0);
  });
});
