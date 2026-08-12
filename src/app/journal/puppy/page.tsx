"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getActiveProfile, loadProfiles, type Profile } from "@/lib/profiles";
import {
  addAttempt,
  addBreedFact,
  addCommand,
  addNote,
  attemptsInContext,
  bookletDraft,
  breedResearchIsComplete,
  BREED_FACTS_TARGET,
  canAddCommands,
  canAdvanceStage,
  commandIsLearned,
  commandIsMastered,
  createJournal,
  daysSinceTrainingStart,
  journalStage,
  load,
  methodIsComplete,
  pacingWarning,
  removeBreedFact,
  inviteHelper,
  ownerJournalForHelper,
  removeCommand,
  removeHelper,
  roleForAge,
  save,
  setBreedName,
  startTraining,
  STAGE_HEBREW,
  successRate,
  successRateInContext,
  toggleMethodPrinciple,
  weakContexts,
  type JournalStage,
  type PuppyRole,
} from "@/lib/puppy-journal";
import {
  PUPPY_CONTEXTS,
  PUPPY_CONTEXT_HEBREW,
  PUPPY_MASTERY_SUCCESS_PCT,
  PUPPY_METHOD_PRINCIPLES,
  PUPPY_SUGGESTED_COMMANDS,
  type PuppyContext,
  type PuppyCommand,
  type PuppyJournal,
} from "@/lib/types";

// §6.3 — the helper works on the owner's journal, but only on a journal that
// **explicitly invited her** (LAUNCH-PUBLIC-001 D1). This used to return the
// first owner-aged journal found on the device, which on a tablet shared by
// two families handed a child a stranger's journal with write access.
function findOwnerJournalId(helperId: string): string | null {
  const ownerIds = loadProfiles()
    .filter((p) => roleForAge(p.age) === "owner")
    .map((p) => p.id);
  return ownerJournalForHelper(helperId, ownerIds, load);
}

export default function PuppyJournalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [journal, setJournal] = useState<PuppyJournal | null>(null);
  const [ready, setReady] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);
  const [role, setRole] = useState<PuppyRole | null>(null);
  // The helper reads and writes the owner's journal — one puppy, one journal.
  const [journalOwnerId, setJournalOwnerId] = useState<string | null>(null);

  useEffect(() => {
    const p = getActiveProfile();
    if (!p) {
      router.replace("/");
      return;
    }
    const r = roleForAge(p.age);
    if (r === null) {
      // Below the helper age. Friendly message, never a silent redirect.
      setTooYoung(true);
      setReady(true);
      return;
    }
    setProfile(p);
    setRole(r);
    // MyLevel §6.3 — Eva helps on Emilia's project, so the helper opens the
    // owner's journal. Falls back to her own id if no owner journal exists.
    const ownerId = r === "owner" ? p.id : (findOwnerJournalId(p.id) ?? p.id);
    setJournalOwnerId(ownerId);
    setJournal(load(ownerId));
    setReady(true);
  }, [router]);

  const persist = useCallback(
    (next: PuppyJournal) => {
      if (!journalOwnerId) return;
      save(journalOwnerId, next);
      setJournal(next);
    },
    [journalOwnerId],
  );

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  if (tooYoung) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 bg-cream">
        <div className="max-w-sm w-full text-center bg-surface rounded-3xl shadow-soft p-8 space-y-4">
          <div className="text-4xl">🐕</div>
          <h1 className="text-xl font-display font-extrabold text-warm-dark">
            יומן הגור פתוח מגיל 7
          </h1>
          <p className="text-sm text-warm-muted leading-relaxed">
            עוד מעט תגדלי ותוכלי גם את לתעד גור משלך. בינתיים אפשר להמשיך
            לתרגל.
          </p>
          <Link
            href="/"
            className="inline-block bg-terracotta text-white px-6 py-3 rounded-2xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
          >
            חזרה
          </Link>
        </div>
      </main>
    );
  }

  if (profile === null || role === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  const stage = journalStage(journal);

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            יומן הגור
          </h1>
          <p className="text-sm text-warm-muted">
            {role === "owner"
              ? "המקום שלך לתעד מה את מלמדת את הגור."
              : "את העוזרת של הפרויקט — רושמת איך הלך וחוקרת על הגזע."}
          </p>
        </div>
        <Link
          href="/"
          className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
        >
          חזרה
        </Link>
      </header>

      {/* Helper with no owner journal yet — nothing to help with. */}
      {role === "helper" && journal === null && <HelperWaiting />}

      {role === "owner" && stage === "setup" && (
        <SetupStage
          onCreate={(name, birthday) => persist(createJournal(name, birthday))}
        />
      )}

      {journal !== null && stage !== "setup" && (
        <JournalStages
          journal={journal}
          stage={stage}
          role={role}
          childName={profile.name}
          onAddCommand={(he, en, target) =>
            persist(addCommand(journal, he, en, target))
          }
          onLogAttempt={(cmdId, success, context) =>
            persist(
              addAttempt(
                journal,
                cmdId,
                success,
                undefined,
                Date.now(),
                context,
                role === "helper" ? profile.name : undefined,
              ),
            )
          }
          onRemoveCommand={(cmdId) => {
            if (!window.confirm("למחוק את הפקודה הזאת מהיומן?")) return;
            persist(removeCommand(journal, cmdId));
          }}
          onAddNote={(text) => persist(addNote(journal, text))}
          onStartTraining={() => persist(startTraining(journal))}
          onToggleMethod={(id) => persist(toggleMethodPrinciple(journal, id))}
          onSetBreedName={(name) => persist(setBreedName(journal, name))}
          onAddBreedFact={(text) =>
            persist(addBreedFact(journal, text, Date.now(), profile.name))
          }
          onRemoveBreedFact={(id) => persist(removeBreedFact(journal, id))}
          ownerId={journalOwnerId ?? profile.id}
          onToggleHelper={(helperId) =>
            persist(
              (journal.helperIds ?? []).includes(helperId)
                ? removeHelper(journal, helperId)
                : inviteHelper(journal, helperId),
            )
          }
        />
      )}
    </main>
  );
}

function HelperWaiting() {
  return (
    <section className="max-w-md mx-auto bg-surface rounded-3xl shadow-soft p-8 space-y-4 text-center">
      <div className="text-4xl">🐕</div>
      <h2 className="text-xl font-display font-extrabold text-warm-dark">
        הפרויקט עוד לא התחיל
      </h2>
      <p className="text-sm text-warm-muted leading-relaxed">
        כשהיומן של הגור ייפתח, תוכלי להיכנס לכאן ולעזור — לרשום איך הלך
        באימונים ולחקור על הגזע.
      </p>
    </section>
  );
}

function SetupStage({
  onCreate,
}: {
  onCreate: (name: string, birthday: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    onCreate(trimmed, birthday === "" ? null : birthday);
  }

  return (
    <section className="max-w-md mx-auto bg-surface rounded-3xl shadow-soft p-6 space-y-5 text-right">
      <h2 className="text-xl font-display font-extrabold text-warm-dark">
        איך קוראים לגור שלך?
      </h2>
      <p className="text-sm text-warm-muted leading-relaxed">
        עוד אין לך גור? זה בסדר. כתבי את השם שאת חושבת לתת לו, ותתחילי
        לתכנן מה תרצי ללמד אותו כשיגיע.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם הגור"
          className="w-full px-4 py-3 rounded-2xl border-2 border-warm-line bg-cream text-warm-dark text-right focus:border-terracotta focus:outline-none text-lg"
          autoFocus
        />
        <label className="block text-sm text-warm-muted">
          תאריך לידה (אופציונלי)
        </label>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border-2 border-warm-line bg-cream text-warm-dark focus:border-terracotta focus:outline-none"
        />
        <button
          type="submit"
          disabled={name.trim().length === 0}
          className="w-full bg-terracotta text-white py-3 rounded-2xl text-lg font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none hover:bg-terracotta-dark transition"
        >
          התחילי לתכנן
        </button>
      </form>
    </section>
  );
}

function JournalStages({
  journal,
  stage,
  role,
  childName,
  onAddCommand,
  onLogAttempt,
  onRemoveCommand,
  onAddNote,
  onStartTraining,
  onToggleMethod,
  onSetBreedName,
  onAddBreedFact,
  onRemoveBreedFact,
  ownerId,
  onToggleHelper,
}: {
  journal: PuppyJournal;
  stage: Exclude<JournalStage, "setup">;
  role: PuppyRole;
  childName: string;
  ownerId: string;
  onToggleHelper: (helperId: string) => void;
  onAddCommand: (he: string, en: string, target: number) => void;
  onLogAttempt: (
    cmdId: string,
    success: boolean,
    context: PuppyContext | undefined,
  ) => void;
  onRemoveCommand: (cmdId: string) => void;
  onAddNote: (text: string) => void;
  onStartTraining: () => void;
  onToggleMethod: (principleId: string) => void;
  onSetBreedName: (name: string) => void;
  onAddBreedFact: (text: string) => void;
  onRemoveBreedFact: (id: string) => void;
}) {
  const days = daysSinceTrainingStart(journal);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="bg-surface rounded-3xl shadow-soft p-5 text-right space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-display font-extrabold text-warm-dark">
            הגור שלי: {journal.puppyName}
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-sage-soft text-warm-dark whitespace-nowrap">
            {STAGE_HEBREW[stage]}
          </span>
        </div>
        {stage !== "learning" && (
          <p className="text-xs text-warm-muted">יום {(days ?? 0) + 1} לאימון</p>
        )}
        {role === "helper" && (
          <p className="text-sm text-warm-dark bg-mustard-soft rounded-xl px-3 py-2 leading-relaxed">
            👋 {childName}, את העוזרת. את יכולה לרשום איך הלך בכל אימון ולהוסיף
            עובדות על הגזע.
          </p>
        )}
      </header>

      {stage === "learning" && (
        <LearningStage
          journal={journal}
          role={role}
          onToggleMethod={onToggleMethod}
          onAddCommand={onAddCommand}
          onStartTraining={onStartTraining}
        />
      )}

      {stage !== "learning" && (
        <CommandsSection
          journal={journal}
          stage={stage}
          role={role}
          onAddCommand={onAddCommand}
          onLogAttempt={onLogAttempt}
          onRemoveCommand={onRemoveCommand}
        />
      )}

      {stage === "presenting" && <BookletSection journal={journal} />}

      <BreedResearchSection
        journal={journal}
        onSetBreedName={onSetBreedName}
        onAddBreedFact={onAddBreedFact}
        onRemoveBreedFact={onRemoveBreedFact}
      />

      {role === "owner" && (
        <FreeNotesSection journal={journal} onAddNote={onAddNote} />
      )}

      {role === "owner" && (
        <HelpersSection
          journal={journal}
          ownerId={ownerId}
          onToggleHelper={onToggleHelper}
        />
      )}
    </div>
  );
}

/**
 * §6.3 — the owner chooses who helps her. Before LAUNCH-PUBLIC-001 D1 the
 * helper was matched by scanning the device, so on a shared tablet a child
 * could land in another family's journal. The invitation is now explicit.
 */
function HelpersSection({
  journal,
  ownerId,
  onToggleHelper,
}: {
  journal: PuppyJournal;
  ownerId: string;
  onToggleHelper: (helperId: string) => void;
}) {
  const candidates = loadProfiles().filter(
    (p) => p.id !== ownerId && roleForAge(p.age) === "helper",
  );
  const invited = journal.helperIds ?? [];

  if (candidates.length === 0) return null;

  return (
    <section className="bg-surface rounded-3xl shadow-soft p-6 space-y-3">
      <h2 className="font-display font-bold text-warm-dark">מי עוזרת לי</h2>
      <p className="text-sm text-warm-muted leading-relaxed">
        אפשר להזמין מישהי לעזור לך בפרויקט. היא תוכל לרשום איך הלך ולהוסיף
        עובדות על הגזע — הפקודות נשארות שלך.
      </p>
      <ul className="space-y-2">
        {candidates.map((c) => {
          const isIn = invited.includes(c.id);
          return (
            <li key={c.id} className="flex items-center justify-between gap-3">
              <span className="text-warm-dark">{c.name}</span>
              <button
                type="button"
                onClick={() => onToggleHelper(c.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  isIn
                    ? "bg-terracotta text-white hover:bg-terracotta-dark"
                    : "bg-cream text-warm-dark hover:shadow-warm"
                }`}
              >
                {isIn ? "מוזמנת ✓" : "להזמין"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// §6.2 stage 1 — watch the videos, talk about the method, choose commands.
function LearningStage({
  journal,
  role,
  onToggleMethod,
  onAddCommand,
  onStartTraining,
}: {
  journal: PuppyJournal;
  role: PuppyRole;
  onToggleMethod: (principleId: string) => void;
  onAddCommand: (he: string, en: string, target: number) => void;
  onStartTraining: () => void;
}) {
  const learned = journal.methodLearned ?? [];
  const ready = methodIsComplete(journal) && journal.commands.length > 0;
  const readOnly = !canAddCommands(role);

  return (
    <section className="bg-surface rounded-3xl shadow-soft p-5 space-y-5 text-right">
      <div>
        <h3 className="text-lg font-semibold text-warm-dark">
          לפני שמתחילים — לומדות איך מאלפים
        </h3>
        <p className="text-sm text-warm-muted leading-relaxed mt-1">
          כדאי לצפות ב-3–4 סרטונים על אילוף גורים ולדבר עליהם. אחר כך סמני
          את שלושת הדברים שהבנת.
        </p>
      </div>

      <ul className="space-y-2">
        {PUPPY_METHOD_PRINCIPLES.map((p) => {
          const checked = learned.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onToggleMethod(p.id)}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-right transition ${
                  checked ? "bg-sage-soft" : "bg-cream"
                } ${readOnly ? "opacity-70" : "hover:brightness-95"}`}
              >
                <span className="text-warm-dark font-semibold">
                  {p.hebrew}{" "}
                  <span dir="ltr" className="text-warm-muted text-sm font-normal">
                    ({p.english})
                  </span>
                </span>
                <span className="text-xl">{checked ? "✓" : "○"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!readOnly && (
        <SuggestedCommands journal={journal} onAddCommand={onAddCommand} />
      )}

      {!readOnly && (
        <div className="pt-2 border-t border-warm-line space-y-2">
          <button
            type="button"
            onClick={onStartTraining}
            disabled={!ready}
            className="w-full bg-terracotta text-white py-3 rounded-2xl font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none hover:bg-terracotta-dark transition"
          >
            סיימנו ללמוד — מתחילות לאמן
          </button>
          {!ready && (
            <p className="text-xs text-warm-muted leading-relaxed">
              כדי להתחיל: לסמן את שלושת הדברים ולבחור לפחות פקודה אחת.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// §6.2 stage 1 — "בחירת 5–7 פקודות יסוד". One tap adds a suggestion.
function SuggestedCommands({
  journal,
  onAddCommand,
}: {
  journal: PuppyJournal;
  onAddCommand: (he: string, en: string, target: number) => void;
}) {
  const already = new Set(journal.commands.map((c) => c.hebrewName));
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-warm-dark">
        פקודות היסוד — בחרי 5 עד 7
      </h4>
      <p className="text-xs text-warm-muted">
        נבחרו {journal.commands.length} מתוך 7
      </p>
      <div className="flex flex-wrap gap-2">
        {PUPPY_SUGGESTED_COMMANDS.map((s) => {
          const added = already.has(s.hebrew);
          return (
            <button
              key={s.hebrew}
              type="button"
              disabled={added}
              onClick={() => onAddCommand(s.hebrew, s.english, 30)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                added
                  ? "bg-sage-soft text-warm-dark"
                  : "bg-cream text-warm-dark shadow-soft hover:shadow-warm"
              }`}
            >
              {added ? "✓ " : "+ "}
              {s.hebrew}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// §6.2 stage 4 — the app gathers a draft; the booklet is made at home.
function BookletSection({ journal }: { journal: PuppyJournal }) {
  const draft = bookletDraft(journal);
  return (
    <section className="bg-surface rounded-3xl shadow-soft p-5 space-y-4 text-right">
      <div>
        <h3 className="text-lg font-semibold text-warm-dark">
          🎉 טיוטת הספרון שלך
        </h3>
        <p className="text-sm text-warm-muted leading-relaxed mt-1">
          יש לך פקודה שהגור יודע בכל מקום. הנה כל מה שאספת — אפשר להעתיק
          את זה לספרון ולהציג למשפחה.
        </p>
      </div>

      <div className="bg-cream rounded-2xl p-4 space-y-3 text-sm text-warm-dark leading-relaxed">
        <p className="font-semibold text-base">
          הגור {draft.puppyName}
          {draft.breedName ? ` — ${draft.breedName}` : ""}
        </p>

        {draft.masteredCommands.length > 0 && (
          <div>
            <p className="font-semibold">מה הוא כבר יודע:</p>
            <p>{draft.masteredCommands.join(" · ")}</p>
          </div>
        )}

        {draft.breedFacts.length > 0 && (
          <div>
            <p className="font-semibold">עובדות על הגזע:</p>
            <ul className="list-disc pr-5 space-y-1">
              {draft.breedFacts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {draft.tips.length > 0 && (
          <div>
            <p className="font-semibold">טיפים שלמדתי בדרך:</p>
            <ul className="list-disc pr-5 space-y-1">
              {draft.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-xs text-warm-muted leading-relaxed">
        רעיון להצגה: לספר מי הגור, מה לימדת אותו, מה היה קשה, ומה הכי הצחיק
        אתכן. חמש דקות מספיקות.
      </p>
    </section>
  );
}

// §6.3 — Eva's independent breed research. Both girls can add facts.
function BreedResearchSection({
  journal,
  onSetBreedName,
  onAddBreedFact,
  onRemoveBreedFact,
}: {
  journal: PuppyJournal;
  onSetBreedName: (name: string) => void;
  onAddBreedFact: (text: string) => void;
  onRemoveBreedFact: (id: string) => void;
}) {
  const [breedDraft, setBreedDraft] = useState(journal.breedName ?? "");
  const [factDraft, setFactDraft] = useState("");
  const facts = journal.breedFacts ?? [];
  const done = breedResearchIsComplete(journal);

  function submitFact(e: FormEvent) {
    e.preventDefault();
    if (factDraft.trim().length === 0) return;
    onAddBreedFact(factDraft);
    setFactDraft("");
  }

  return (
    <section className="bg-surface rounded-3xl shadow-soft p-5 space-y-4 text-right">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-warm-dark">
          🔎 מחקר על הגזע
        </h3>
        {done && (
          <span className="text-xs px-2 py-1 rounded-full bg-sage text-white whitespace-nowrap">
            המחקר מוכן
          </span>
        )}
      </div>
      <p className="text-sm text-warm-muted leading-relaxed">
        מאיפה הגזע הזה הגיע? מה מייחד אותו? אספי {BREED_FACTS_TARGET} עובדות
        או יותר.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={breedDraft}
          onChange={(e) => setBreedDraft(e.target.value)}
          onBlur={() => onSetBreedName(breedDraft)}
          placeholder="איזה גזע?"
          className="flex-1 px-3 py-2 rounded-xl border border-warm-line bg-cream text-warm-dark text-right focus:border-terracotta focus:outline-none"
        />
      </div>

      <form onSubmit={submitFact} className="space-y-2">
        <textarea
          value={factDraft}
          onChange={(e) => setFactDraft(e.target.value)}
          placeholder="עובדה שגילית…"
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-warm-line bg-cream text-warm-dark text-right focus:border-terracotta focus:outline-none"
        />
        <button
          type="submit"
          disabled={factDraft.trim().length === 0}
          className="bg-terracotta text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none hover:bg-terracotta-dark transition"
        >
          הוסיפי עובדה
        </button>
      </form>

      {facts.length > 0 && (
        <ul className="space-y-2">
          {facts.map((f) => (
            <li
              key={f.id}
              className="bg-cream rounded-xl p-3 text-sm text-warm-dark leading-relaxed"
            >
              <div className="flex items-start justify-between gap-2">
                <span>{f.text}</span>
                <button
                  type="button"
                  onClick={() => onRemoveBreedFact(f.id)}
                  className="text-xs text-warm-muted/70 hover:text-terracotta-dark transition shrink-0"
                >
                  מחיקה
                </button>
              </div>
              {f.loggedBy && (
                <div className="text-xs text-warm-muted mt-1">
                  נרשם על ידי {f.loggedBy}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommandsSection({
  journal,
  stage,
  role,
  onAddCommand,
  onLogAttempt,
  onRemoveCommand,
}: {
  journal: PuppyJournal;
  stage: Exclude<JournalStage, "setup" | "learning">;
  role: PuppyRole;
  onAddCommand: (he: string, en: string, target: number) => void;
  onLogAttempt: (
    cmdId: string,
    success: boolean,
    context: PuppyContext | undefined,
  ) => void;
  onRemoveCommand: (cmdId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [hebrewName, setHebrewName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [target, setTarget] = useState("30");

  const mayEdit = canAddCommands(role);
  // Soft guidance only — the warning shows, the button still works (§6.2).
  const pacing = pacingWarning(journal);

  function submit(e: FormEvent) {
    e.preventDefault();
    const he = hebrewName.trim();
    const en = englishName.trim();
    const t = parseInt(target, 10);
    if (he.length === 0 || en.length === 0 || !Number.isFinite(t) || t < 1) return;
    onAddCommand(he, en, t);
    setHebrewName("");
    setEnglishName("");
    setTarget("30");
    setShowForm(false);
  }

  return (
    <section className="bg-surface rounded-3xl shadow-soft p-5 space-y-4 text-right">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-warm-dark">
          {mayEdit ? "פקודות שאני מלמדת" : "הפקודות שאתן מלמדות"}
        </h3>
        {mayEdit && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="text-sm bg-cream text-warm-dark px-3 py-1.5 rounded-xl shadow-soft hover:shadow-warm transition"
          >
            {showForm ? "ביטול" : "+ הוסיפי פקודה"}
          </button>
        )}
      </div>

      {mayEdit && showForm && pacing && (
        <p className="text-sm text-warm-dark bg-mustard-soft rounded-xl px-3 py-2 leading-relaxed">
          🐢 {pacing}
        </p>
      )}

      {mayEdit && showForm && (
        <form onSubmit={submit} className="space-y-3 bg-cream rounded-2xl p-4">
          <input
            type="text"
            value={hebrewName}
            onChange={(e) => setHebrewName(e.target.value)}
            placeholder="שם בעברית (למשל: שב)"
            className="w-full px-3 py-2 rounded-xl border border-warm-line bg-surface text-warm-dark text-right focus:border-terracotta focus:outline-none"
            autoFocus
          />
          <input
            type="text"
            value={englishName}
            onChange={(e) => setEnglishName(e.target.value)}
            placeholder="Name in English (e.g. sit)"
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-warm-line bg-surface text-warm-dark focus:border-terracotta focus:outline-none"
          />
          <label className="block text-sm text-warm-muted">
            כמה אימונים אני רוצה להגיע אליהם?
          </label>
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-warm-line bg-surface text-warm-dark text-center focus:border-terracotta focus:outline-none"
          />
          <button
            type="submit"
            className="w-full bg-terracotta text-white py-2 rounded-xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
          >
            שמרי
          </button>
        </form>
      )}

      {journal.commands.length === 0 ? (
        <p className="text-warm-muted text-sm leading-relaxed">
          {mayEdit
            ? `עוד אין פקודות ביומן. הוסיפי פקודה כדי לתכנן מה תרצי ללמד את ${journal.puppyName}.`
            : `עוד אין פקודות ביומן. כשיהיו, תוכלי לרשום כאן איך הלך לגור ${journal.puppyName}.`}
        </p>
      ) : (
        <ul className="space-y-3">
          {journal.commands.map((cmd) => (
            <CommandRow
              key={cmd.id}
              cmd={cmd}
              stage={stage}
              role={role}
              onLogAttempt={onLogAttempt}
              onRemove={() => onRemoveCommand(cmd.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommandRow({
  cmd,
  stage,
  role,
  onLogAttempt,
  onRemove,
}: {
  cmd: PuppyCommand;
  stage: Exclude<JournalStage, "setup" | "learning">;
  role: PuppyRole;
  onLogAttempt: (
    cmdId: string,
    success: boolean,
    context: PuppyContext | undefined,
  ) => void;
  onRemove: () => void;
}) {
  // Where the training happened. §6.2 stage 2 is mostly at home, so that is
  // the sensible default; stage 3 is where the other two start to matter.
  const [context, setContext] = useState<PuppyContext>("home");

  const rate = Math.round(successRate(cmd));
  const learned = commandIsLearned(cmd);
  const mastered = commandIsMastered(cmd);
  const weak = weakContexts(cmd);

  return (
    <li className="bg-cream rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-warm-dark font-semibold text-lg">
            {cmd.hebrewName}{" "}
            <span dir="ltr" className="text-warm-muted text-sm">
              ({cmd.englishName})
            </span>
          </div>
          <div className="text-xs text-warm-muted">
            {cmd.attempts.length} מתוך {cmd.targetSessions} אימונים · הצלחה {rate}%
          </div>
        </div>
        {mastered ? (
          <span className="text-xs px-2 py-1 rounded-full bg-sage text-white whitespace-nowrap">
            יודע בכל מקום 🏆
          </span>
        ) : (
          learned && (
            <span className="text-xs px-2 py-1 rounded-full bg-sage-soft text-warm-dark whitespace-nowrap">
              נלמדה
            </span>
          )
        )}
      </div>

      {/* §6.2 stage 3 — per-context breakdown, so weak spots are visible. */}
      <div className="grid grid-cols-3 gap-2">
        {PUPPY_CONTEXTS.map((ctx) => {
          const n = attemptsInContext(cmd, ctx);
          const pct = Math.round(successRateInContext(cmd, ctx));
          const ok = n > 0 && pct >= PUPPY_MASTERY_SUCCESS_PCT;
          return (
            <div
              key={ctx}
              className={`rounded-xl px-2 py-1.5 text-center ${
                ok ? "bg-sage-soft" : "bg-surface"
              }`}
            >
              <div className="text-xs text-warm-dark font-semibold">
                {PUPPY_CONTEXT_HEBREW[ctx]}
              </div>
              <div className="text-xs text-warm-muted">
                {n === 0 ? "עוד לא" : `${pct}%`}
              </div>
            </div>
          );
        })}
      </div>

      {stage === "testing" && weak.length > 0 && !mastered && (
        <p className="text-xs text-warm-dark bg-mustard-soft rounded-xl px-3 py-2 leading-relaxed">
          כדאי להתאמן עוד {weak.map((c) => PUPPY_CONTEXT_HEBREW[c]).join(" · ")}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex gap-1.5">
          {PUPPY_CONTEXTS.map((ctx) => (
            <button
              key={ctx}
              type="button"
              onClick={() => setContext(ctx)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                context === ctx
                  ? "bg-warm-dark text-white"
                  : "bg-surface text-warm-muted hover:brightness-95"
              }`}
            >
              {PUPPY_CONTEXT_HEBREW[ctx]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onLogAttempt(cmd.id, true, context)}
            className="flex-1 bg-sage-soft text-warm-dark py-2 rounded-xl text-sm font-semibold hover:brightness-95 transition"
          >
            תרגלנו ✓
          </button>
          <button
            type="button"
            onClick={() => onLogAttempt(cmd.id, false, context)}
            className="flex-1 bg-mustard-soft text-warm-dark py-2 rounded-xl text-sm font-semibold hover:brightness-95 transition"
          >
            תרגלנו, עוד לא הצליח
          </button>
        </div>
      </div>

      {canAddCommands(role) && (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-warm-muted/70 hover:text-terracotta-dark transition"
        >
          מחיקת פקודה
        </button>
      )}
    </li>
  );
}

function FreeNotesSection({
  journal,
  onAddNote,
}: {
  journal: PuppyJournal;
  onAddNote: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = draft.trim();
    if (t.length === 0) return;
    onAddNote(t);
    setDraft("");
  }

  const ordered = [...journal.freeNotes].sort((a, b) => b.at - a.at);

  return (
    <section className="bg-surface rounded-3xl shadow-soft p-5 space-y-4 text-right">
      <h3 className="text-lg font-semibold text-warm-dark">יומן חופשי</h3>
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="מה רצית לכתוב היום?"
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-warm-line bg-cream text-warm-dark text-right focus:border-terracotta focus:outline-none"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="bg-terracotta text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-warm disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none hover:bg-terracotta-dark transition"
        >
          שמרי הערה
        </button>
      </form>
      {ordered.length > 0 && (
        <ul className="space-y-2">
          {ordered.map((n) => (
            <li
              key={n.id}
              className="bg-cream rounded-xl p-3 text-sm text-warm-dark leading-relaxed"
            >
              <div className="text-xs text-warm-muted mb-1">
                {new Date(n.at).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                })}
              </div>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
