import { beforeEach, describe, expect, it } from "vitest";
import {
  addAttempt,
  addBreedFact,
  addCommand,
  addNote,
  attemptsInContext,
  bookletDraft,
  breedResearchIsComplete,
  canAddCommands,
  canAdvanceStage,
  commandIsLearned,
  commandIsMastered,
  commandsAddedThisWeek,
  createJournal,
  daysSinceTrainingStart,
  inviteHelper,
  journalStage,
  load,
  methodIsComplete,
  ownerJournalForHelper,
  removeHelper,
  pacingWarning,
  removeBreedFact,
  removeCommand,
  roleForAge,
  save,
  setBreedName,
  startTraining,
  successRate,
  successRateInContext,
  toggleMethodPrinciple,
  weakContexts,
} from "@/lib/puppy-journal";
import {
  PUPPY_MASTERY_SUCCESS_PCT,
  PUPPY_METHOD_PRINCIPLES,
  PUPPY_SUGGESTED_COMMANDS,
} from "@/lib/types";

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
  it("createJournal trims the name and yields setup → learning stage", () => {
    const j = createJournal("  Buddy  ");
    expect(j.puppyName).toBe("Buddy");
    expect(j.commands).toEqual([]);
    expect(j.freeNotes).toEqual([]);
    expect(j.trainingStartDate).toBeNull();
    expect(journalStage(null)).toBe("setup");
    expect(journalStage(j)).toBe("learning");
  });

  it("startTraining moves the stage to training and sets a timestamp", () => {
    let j = createJournal("Buddy");
    j = startTraining(j, 1_000_000);
    expect(j.trainingStartDate).toBe(1_000_000);
    expect(journalStage(j)).toBe("training");
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

// --- T8ב (FLAGSHIP-PUPPY-002) — MyLevel §6 alignment ---

describe("puppy-journal — roles (§6.3)", () => {
  it("Eva (7) is a helper, not blocked — the regression this task fixes", () => {
    // Before T8ב the journal hard-blocked age < 9, so Eva saw only a
    // 'come back when you are older' screen. §6.3 gives her a real job.
    expect(roleForAge(7)).toBe("helper");
    expect(roleForAge(8)).toBe("helper");
  });

  it("Emilia (9+) owns the project", () => {
    expect(roleForAge(9)).toBe("owner");
    expect(roleForAge(10)).toBe("owner");
  });

  it("children below the helper age still get the friendly age message", () => {
    expect(roleForAge(6)).toBeNull();
  });

  it("only the owner adds commands or advances the stage (§6.3)", () => {
    expect(canAddCommands("owner")).toBe(true);
    expect(canAddCommands("helper")).toBe(false);
    expect(canAdvanceStage("owner")).toBe(true);
    expect(canAdvanceStage("helper")).toBe(false);
  });

  it("the helper's name is recorded on attempts she logs", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 30);
    const id = j.commands[0]!.id;
    j = addAttempt(j, id, true, undefined, 1000, "home", "אווה");
    expect(j.commands[0]?.attempts[0]?.loggedBy).toBe("אווה");
  });
});

describe("puppy-journal — stage 1: learning the method (§6.2)", () => {
  it("a new journal starts with nothing learned", () => {
    expect(methodIsComplete(createJournal("Buddy"))).toBe(false);
  });

  it("methodIsComplete only after all three principles are checked", () => {
    let j = createJournal("Buddy");
    for (const p of PUPPY_METHOD_PRINCIPLES.slice(0, 2)) {
      j = toggleMethodPrinciple(j, p.id);
    }
    expect(methodIsComplete(j)).toBe(false);
    j = toggleMethodPrinciple(j, PUPPY_METHOD_PRINCIPLES[2]!.id);
    expect(methodIsComplete(j)).toBe(true);
  });

  it("toggling twice unchecks, and unknown ids are ignored", () => {
    let j = createJournal("Buddy");
    const id = PUPPY_METHOD_PRINCIPLES[0]!.id;
    j = toggleMethodPrinciple(j, id);
    j = toggleMethodPrinciple(j, id);
    expect(j.methodLearned).toEqual([]);
    j = toggleMethodPrinciple(j, "not-a-principle");
    expect(j.methodLearned).toEqual([]);
  });

  it("the document's 5–7 foundation commands are offered", () => {
    // §6.2 stage 1: "בחירת 5–7 פקודות יסוד"
    expect(PUPPY_SUGGESTED_COMMANDS.length).toBeGreaterThanOrEqual(5);
    expect(PUPPY_SUGGESTED_COMMANDS.length).toBeLessThanOrEqual(7);
  });
});

describe("puppy-journal — stage 2: one command a week (§6.2)", () => {
  const T0 = 1_700_000_000_000;

  it("no warning for the first command of the week", () => {
    const j = createJournal("Buddy");
    expect(pacingWarning(j, T0)).toBeNull();
  });

  it("warns after a command was already added this week", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 30, T0);
    expect(commandsAddedThisWeek(j, T0)).toBe(1);
    expect(pacingWarning(j, T0)).toContain("שליטה קודמת לריבוי");
  });

  it("the pace is guidance, never a block — adding still works", () => {
    // plans/FLAGSHIP-PUPPY-002 §2: a child who is excited is not making an
    // error that deserves a wall.
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 30, T0);
    j = addCommand(j, "ארצה", "down", 30, T0);
    expect(j.commands.length).toBe(2);
  });

  it("the warning clears once the week has passed", () => {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 30, T0);
    const eightDaysLater = T0 + 8 * 24 * 60 * 60 * 1000;
    expect(commandsAddedThisWeek(j, eightDaysLater)).toBe(0);
    expect(pacingWarning(j, eightDaysLater)).toBeNull();
  });
});

describe("puppy-journal — stage 3: the three contexts (§6.2)", () => {
  function withAttempts(
    successesByContext: Record<string, [number, number]>,
  ) {
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 1);
    const id = j.commands[0]!.id;
    for (const [ctx, [wins, total]] of Object.entries(successesByContext)) {
      for (let i = 0; i < total; i++) {
        j = addAttempt(
          j,
          id,
          i < wins,
          undefined,
          1000 + i,
          ctx as "home" | "outside" | "distractions",
        );
      }
    }
    return j.commands[0]!;
  }

  it("success is measured per context, not pooled", () => {
    const cmd = withAttempts({ home: [10, 10], outside: [0, 10] });
    expect(successRateInContext(cmd, "home")).toBe(100);
    expect(successRateInContext(cmd, "outside")).toBe(0);
    expect(attemptsInContext(cmd, "distractions")).toBe(0);
  });

  it("perfect at home is NOT mastery — the whole point of stage 3", () => {
    // A dog that sits in the kitchen but not in the park has not learned
    // "sit". This is the failure the old single 80% number hid.
    const cmd = withAttempts({ home: [20, 20] });
    expect(commandIsLearned(cmd)).toBe(true);
    expect(commandIsMastered(cmd)).toBe(false);
  });

  it("mastery requires ≥90% in all three contexts (§6.2 stage 3)", () => {
    const cmd = withAttempts({
      home: [10, 10],
      outside: [9, 10],
      distractions: [10, 10],
    });
    expect(commandIsMastered(cmd)).toBe(true);
  });

  it("the bar is 90%, stricter than the old 80% learned bar", () => {
    expect(PUPPY_MASTERY_SUCCESS_PCT).toBe(90);
    const cmd = withAttempts({
      home: [10, 10],
      outside: [8, 10], // 80% — enough for "learned", not for mastery
      distractions: [10, 10],
    });
    expect(commandIsMastered(cmd)).toBe(false);
  });

  it("weakContexts names exactly what still needs work", () => {
    const cmd = withAttempts({ home: [10, 10], outside: [5, 10] });
    expect(weakContexts(cmd)).toEqual(["outside", "distractions"]);
  });

  it("attempts logged without a context do not count toward mastery", () => {
    // Journals from before T8ב have context-free attempts. They must not
    // silently satisfy the new bar.
    let j = createJournal("Buddy");
    j = addCommand(j, "שב", "sit", 1);
    const id = j.commands[0]!.id;
    for (let i = 0; i < 20; i++) j = addAttempt(j, id, true);
    expect(commandIsMastered(j.commands[0]!)).toBe(false);
  });
});

describe("puppy-journal — stage progression (§6.2 four stages)", () => {
  const T0 = 1_700_000_000_000;

  function trainedJournal() {
    let j = createJournal("Buddy");
    j = startTraining(j, T0);
    j = addCommand(j, "שב", "sit", 1, T0);
    return j;
  }

  it("training → testing once work happens outside the home", () => {
    let j = trainedJournal();
    const id = j.commands[0]!.id;
    j = addAttempt(j, id, true, undefined, T0, "home");
    expect(journalStage(j)).toBe("training");
    j = addAttempt(j, id, true, undefined, T0, "outside");
    expect(journalStage(j)).toBe("testing");
  });

  it("testing → presenting once a command is mastered everywhere", () => {
    let j = trainedJournal();
    const id = j.commands[0]!.id;
    for (const ctx of ["home", "outside", "distractions"] as const) {
      j = addAttempt(j, id, true, undefined, T0, ctx);
    }
    expect(journalStage(j)).toBe("presenting");
  });

  it("all four document stages are reachable", () => {
    const seen = new Set<string>();
    let j = createJournal("Buddy");
    seen.add(journalStage(j)); // learning
    j = startTraining(j, T0);
    j = addCommand(j, "שב", "sit", 1, T0);
    const id = j.commands[0]!.id;
    j = addAttempt(j, id, true, undefined, T0, "home");
    seen.add(journalStage(j)); // training
    j = addAttempt(j, id, true, undefined, T0, "outside");
    seen.add(journalStage(j)); // testing
    j = addAttempt(j, id, true, undefined, T0, "distractions");
    seen.add(journalStage(j)); // presenting
    expect([...seen].sort()).toEqual([
      "learning",
      "presenting",
      "testing",
      "training",
    ]);
  });
});

describe("puppy-journal — breed research (§6.3)", () => {
  it("three facts complete the research", () => {
    let j = createJournal("Buddy");
    j = setBreedName(j, "  לברדור  ");
    expect(j.breedName).toBe("לברדור");
    expect(breedResearchIsComplete(j)).toBe(false);
    j = addBreedFact(j, "מקורו בקנדה", 1000, "אווה");
    j = addBreedFact(j, "אוהב מים", 2000, "אווה");
    expect(breedResearchIsComplete(j)).toBe(false);
    j = addBreedFact(j, "כלב עבודה", 3000, "אווה");
    expect(breedResearchIsComplete(j)).toBe(true);
    expect(j.breedFacts?.[0]?.loggedBy).toBe("אווה");
  });

  it("empty facts are rejected and facts can be removed", () => {
    let j = createJournal("Buddy");
    j = addBreedFact(j, "   ", 1000);
    expect(j.breedFacts).toEqual([]);
    j = addBreedFact(j, "מקורו בקנדה", 1000);
    const id = j.breedFacts![0]!.id;
    j = removeBreedFact(j, id);
    expect(j.breedFacts).toEqual([]);
  });
});

describe("puppy-journal — stage 4: booklet draft (§6.2)", () => {
  it("gathers only what the child actually wrote", () => {
    const T0 = 1_700_000_000_000;
    let j = createJournal("Buddy");
    j = setBreedName(j, "לברדור");
    j = addBreedFact(j, "מקורו בקנדה", T0);
    j = startTraining(j, T0);
    j = addCommand(j, "שב", "sit", 1, T0);
    const id = j.commands[0]!.id;
    for (const ctx of ["home", "outside", "distractions"] as const) {
      j = addAttempt(j, id, true, undefined, T0, ctx);
    }
    j = addCommand(j, "בוא", "come", 1, T0);
    j = addNote(j, "טיפ שני", T0 + 2000);
    j = addNote(j, "טיפ ראשון", T0 + 1000);

    const draft = bookletDraft(j);
    expect(draft.puppyName).toBe("Buddy");
    expect(draft.breedName).toBe("לברדור");
    expect(draft.breedFacts).toEqual(["מקורו בקנדה"]);
    // Only the mastered command appears — "בוא" has no attempts yet.
    expect(draft.masteredCommands).toEqual(["שב"]);
    // Tips read in the order they were written.
    expect(draft.tips).toEqual(["טיפ ראשון", "טיפ שני"]);
  });

  it("an empty journal yields an empty draft, not a crash", () => {
    const draft = bookletDraft(createJournal("Buddy"));
    expect(draft.breedName).toBeNull();
    expect(draft.masteredCommands).toEqual([]);
    expect(draft.tips).toEqual([]);
  });
});

describe("puppy-journal — backward compatibility", () => {
  it("a pre-T8ב journal (no new fields) still loads and works", () => {
    // Journals saved before this task have no methodLearned/breedFacts keys.
    const legacy = {
      puppyName: "Buddy",
      puppyBirthday: null,
      trainingStartDate: 1000,
      commands: [
        {
          id: "cmd-1",
          hebrewName: "שב",
          englishName: "sit",
          addedAt: 1000,
          targetSessions: 5,
          attempts: [{ at: 1100, success: true }],
        },
      ],
      freeNotes: [],
    };
    save("p-legacy", legacy as never);
    const loaded = load("p-legacy")!;
    expect(methodIsComplete(loaded)).toBe(false);
    expect(breedResearchIsComplete(loaded)).toBe(false);
    expect(journalStage(loaded)).toBe("training");
    expect(bookletDraft(loaded).breedFacts).toEqual([]);
    // Adding a fact to a journal that has no breedFacts array must not throw.
    const withFact = addBreedFact(loaded, "עובדה", 2000);
    expect(withFact.breedFacts?.length).toBe(1);
  });
});

// LAUNCH-PUBLIC-001 D1 — the helper link must be explicit. The previous
// implementation scanned the device and returned the first owner-aged
// journal, which on a tablet shared by two families handed a child a
// stranger's journal with write access.
describe("ownerJournalForHelper — explicit linking only", () => {
  const journalFor = (helperIds?: string[]) => ({
    ...createJournal("באדי", null),
    ...(helperIds ? { helperIds } : {}),
  });

  it("returns the owner who explicitly invited this helper", () => {
    const banks: Record<string, ReturnType<typeof journalFor>> = {
      "owner-1": journalFor(["helper-1"]),
    };
    expect(
      ownerJournalForHelper("helper-1", ["owner-1"], (id) => banks[id] ?? null),
    ).toBe("owner-1");
  });

  it("returns null when a journal exists but never invited her", () => {
    const banks: Record<string, ReturnType<typeof journalFor>> = {
      "stranger": journalFor(),
    };
    expect(
      ownerJournalForHelper("helper-1", ["stranger"], (id) => banks[id] ?? null),
    ).toBeNull();
  });

  it("picks the inviting owner, never merely the first one found", () => {
    const banks: Record<string, ReturnType<typeof journalFor>> = {
      "stranger": journalFor(["someone-else"]),
      "her-sister": journalFor(["helper-1"]),
    };
    expect(
      ownerJournalForHelper(
        "helper-1",
        ["stranger", "her-sister"],
        (id) => banks[id] ?? null,
      ),
    ).toBe("her-sister");
  });

  it("invite is idempotent and remove undoes it", () => {
    const j = journalFor();
    const once = inviteHelper(j, "h1");
    expect(inviteHelper(once, "h1").helperIds).toEqual(["h1"]);
    expect(removeHelper(once, "h1").helperIds).toEqual([]);
  });
});
