"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getActiveProfile, type Profile } from "@/lib/profiles";
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
import type { PuppyCommand, PuppyJournal } from "@/lib/types";

const MIN_AGE_FOR_PUPPY_JOURNAL = 9;

export default function PuppyJournalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [journal, setJournal] = useState<PuppyJournal | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = getActiveProfile();
    if (!p) {
      router.replace("/");
      return;
    }
    if (p.age < MIN_AGE_FOR_PUPPY_JOURNAL) {
      router.replace("/");
      return;
    }
    setProfile(p);
    setJournal(load(p.id));
    setReady(true);
  }, [router]);

  const persist = useCallback(
    (next: PuppyJournal) => {
      if (!profile) return;
      save(profile.id, next);
      setJournal(next);
    },
    [profile],
  );

  if (!ready || profile === null) {
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
            המקום שלך לתעד מה את מלמדת את הגור.
          </p>
        </div>
        <Link
          href="/"
          className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
        >
          חזרה
        </Link>
      </header>

      {stage === "setup" && (
        <SetupStage
          onCreate={(name, birthday) => persist(createJournal(name, birthday))}
        />
      )}

      {stage !== "setup" && journal !== null && (
        <ActiveOrPlanningStage
          journal={journal}
          stage={stage}
          onAddCommand={(he, en, target) =>
            persist(addCommand(journal, he, en, target))
          }
          onLogAttempt={(cmdId, success) =>
            persist(addAttempt(journal, cmdId, success))
          }
          onRemoveCommand={(cmdId) => {
            if (!window.confirm("למחוק את הפקודה הזאת מהיומן?")) return;
            persist(removeCommand(journal, cmdId));
          }}
          onAddNote={(text) => persist(addNote(journal, text))}
          onStartTraining={() => persist(startTraining(journal))}
        />
      )}
    </main>
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

function ActiveOrPlanningStage({
  journal,
  stage,
  onAddCommand,
  onLogAttempt,
  onRemoveCommand,
  onAddNote,
  onStartTraining,
}: {
  journal: PuppyJournal;
  stage: "planning" | "active";
  onAddCommand: (he: string, en: string, target: number) => void;
  onLogAttempt: (cmdId: string, success: boolean) => void;
  onRemoveCommand: (cmdId: string) => void;
  onAddNote: (text: string) => void;
  onStartTraining: () => void;
}) {
  const days = daysSinceTrainingStart(journal);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="bg-surface rounded-3xl shadow-soft p-5 text-right space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-extrabold text-warm-dark">
            הגור שלי: {journal.puppyName}
          </h2>
          {stage === "planning" ? (
            <span className="text-xs px-2 py-1 rounded-full bg-mustard-soft text-warm-dark">
              מצב תכנון
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-sage-soft text-warm-dark">
              מתאמנים — יום {(days ?? 0) + 1}
            </span>
          )}
        </div>
        {stage === "planning" && (
          <button
            type="button"
            onClick={onStartTraining}
            className="text-sm bg-terracotta text-white px-4 py-2 rounded-xl shadow-warm hover:bg-terracotta-dark transition"
          >
            התחלתי לאמן היום
          </button>
        )}
      </header>

      <CommandsSection
        journal={journal}
        stage={stage}
        onAddCommand={onAddCommand}
        onLogAttempt={onLogAttempt}
        onRemoveCommand={onRemoveCommand}
      />

      <FreeNotesSection journal={journal} onAddNote={onAddNote} />
    </div>
  );
}

function CommandsSection({
  journal,
  stage,
  onAddCommand,
  onLogAttempt,
  onRemoveCommand,
}: {
  journal: PuppyJournal;
  stage: "planning" | "active";
  onAddCommand: (he: string, en: string, target: number) => void;
  onLogAttempt: (cmdId: string, success: boolean) => void;
  onRemoveCommand: (cmdId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [hebrewName, setHebrewName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [target, setTarget] = useState("30");

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
        <h3 className="text-lg font-semibold text-warm-dark">פקודות שאני מלמדת</h3>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="text-sm bg-cream text-warm-dark px-3 py-1.5 rounded-xl shadow-soft hover:shadow-warm transition"
        >
          {showForm ? "ביטול" : "+ הוסיפי פקודה"}
        </button>
      </div>

      {showForm && (
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
          עוד אין פקודות ביומן. הוסיפי פקודה כדי לתכנן מה תרצי ללמד את {journal.puppyName}.
        </p>
      ) : (
        <ul className="space-y-3">
          {journal.commands.map((cmd) => (
            <CommandRow
              key={cmd.id}
              cmd={cmd}
              stage={stage}
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
  onLogAttempt,
  onRemove,
}: {
  cmd: PuppyCommand;
  stage: "planning" | "active";
  onLogAttempt: (cmdId: string, success: boolean) => void;
  onRemove: () => void;
}) {
  const rate = Math.round(successRate(cmd));
  const learned = commandIsLearned(cmd);
  return (
    <li className="bg-cream rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
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
        {learned && (
          <span className="text-xs px-2 py-1 rounded-full bg-sage text-white">
            נלמדה
          </span>
        )}
      </div>
      {stage === "active" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onLogAttempt(cmd.id, true)}
            className="flex-1 bg-sage-soft text-warm-dark py-2 rounded-xl text-sm font-semibold hover:brightness-95 transition"
          >
            תרגלנו ✓
          </button>
          <button
            type="button"
            onClick={() => onLogAttempt(cmd.id, false)}
            className="flex-1 bg-mustard-soft text-warm-dark py-2 rounded-xl text-sm font-semibold hover:brightness-95 transition"
          >
            תרגלנו, עוד לא הצליח
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-warm-muted/70 hover:text-terracotta-dark transition"
      >
        מחיקת פקודה
      </button>
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
