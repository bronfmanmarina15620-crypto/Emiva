"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { DASHBOARD_TIMEOUT_MS } from "@/lib/types";
import { hasPinSet } from "@/lib/parent-auth";
import { loadProfiles, type Profile } from "@/lib/profiles";
import { computeWeeklyDigest } from "@/lib/parent-dashboard";
import { computeCoverage } from "@/lib/parent-focus";
import {
  entryFor,
  flagsFor,
  loadLog,
  monthKey,
  monthLabel,
  saveEntry,
  type BooksAnswer,
  type EmptyDayAnswer,
  type FoundationEntry,
  type MoodAnswer,
  type SleepAnswer,
} from "@/lib/foundation";
import { logEvent } from "@/lib/telemetry";

// §11.2 — חמש השורות, בניסוח של המסמך עצמו.
const SLEEP_OPTIONS: { value: SleepAnswer; label: string }[] = [
  { value: "yes", label: "כן, 9–11 שעות" },
  { value: "mostly", label: "רוב הלילות" },
  { value: "no", label: "פחות מ-9" },
];

const BOOKS_OPTIONS: { value: BooksAnswer; label: string }[] = [
  { value: "many", label: "כמה ספרים" },
  { value: "one", label: "ספר אחד" },
  { value: "none", label: "אף אחד" },
];

const EMPTY_DAY_OPTIONS: { value: EmptyDayAnswer; label: string }[] = [
  { value: "every_week", label: "כן, כל שבוע" },
  { value: "some_weeks", label: "בחלק מהשבועות" },
  { value: "none", label: "לא היה" },
];

const MOOD_OPTIONS: { value: MoodAnswer; label: string }[] = [
  { value: "happy", label: "שמחה" },
  { value: "mixed", label: "מעורב" },
  { value: "not_happy", label: "לא ממש" },
];

export default function ParentFoundationPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [log, setLog] = useState<FoundationEntry[]>([]);
  const [month] = useState(() => monthKey());
  const lastActiveRef = useRef<number>(Date.now());

  // טופס
  const [sleep, setSleep] = useState<SleepAnswer>("yes");
  const [emptyDay, setEmptyDay] = useState<EmptyDayAnswer>("every_week");
  const [books, setBooks] = useState<Record<string, BooksAnswer>>({});
  const [mood, setMood] = useState<Record<string, MoodAnswer>>({});
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const hydrate = useCallback((existing: FoundationEntry | null) => {
    if (!existing) return;
    setSleep(existing.sleep);
    setEmptyDay(existing.emptyDay);
    setBooks({ ...existing.books });
    setMood({ ...existing.mood });
    setNote(existing.note ?? "");
  }, []);

  useEffect(() => {
    if (!hasPinSet()) {
      router.replace("/parent");
      return;
    }
    logEvent("_parent", { t: "dashboard_opened", at: Date.now() });
    const ps = loadProfiles();
    setProfiles(ps);
    const l = loadLog();
    setLog(l);
    hydrate(entryFor(l, month));
  }, [router, month, hydrate]);

  // guardrails §5 — האזור סגור כשהילד נוכח. אותו timeout כמו הדשבורד.
  useEffect(() => {
    function bump() {
      lastActiveRef.current = Date.now();
    }
    window.addEventListener("mousemove", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("touchstart", bump);
    const id = setInterval(() => {
      if (Date.now() - lastActiveRef.current >= DASHBOARD_TIMEOUT_MS) {
        router.replace("/parent");
      }
    }, 5000);
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("touchstart", bump);
      clearInterval(id);
    };
  }, [router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!profiles) return;
    const entry: FoundationEntry = {
      month,
      at: Date.now(),
      sleep,
      emptyDay,
      books,
      mood,
      note: note.trim() === "" ? undefined : note.trim(),
    };
    setLog(saveEntry(entry));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (profiles === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  const current = entryFor(log, month);
  const flags = current ? flagsFor(current, profiles) : [];
  const history = [...log].reverse().filter((e) => e.month !== month);

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            שלושת הדברים שאסור לפספס
          </h1>
          <p className="text-sm text-warm-muted mt-1">
            פעם בחודש · {monthLabel(month)}
          </p>
        </div>
        <Link
          href="/parent"
          className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition shrink-0"
        >
          חזרה
        </Link>
      </header>

      <div className="max-w-3xl mx-auto space-y-6">
        <section className="bg-surface rounded-3xl shadow-soft p-6 text-warm-dark leading-relaxed">
          <p>
            אלה תנאי הסף ללמידה. בלעדיהם כל תוכנית נכשלת — גם מבריקה.
            המסמך מגדיר אותם כחשובים יותר מכל הנושאים יחד.
          </p>
          <p className="text-sm text-warm-muted mt-2">
            המילוי אמור לקחת פחות משתי דקות. אם הוא לוקח יותר — זה נטל,
            וזה לא מה שהוא אמור להיות.
          </p>
        </section>

        <form onSubmit={submit} className="space-y-6">
          {/* שינה — §2 תנאי א' */}
          <RowCard
            emoji="😴"
            title="שינה"
            question="האם כולם ישנים 9–11 שעות?"
            hint="בגיל 7 בערך ב-20:30, בגיל 9 בערך ב-21:00. בלי מסכים שעה לפני."
          >
            <ChoiceRow
              options={SLEEP_OPTIONS}
              value={sleep}
              onChange={setSleep}
            />
          </RowCard>

          {/* קריאה — §2 תנאי ב' */}
          <RowCard
            emoji="📚"
            title="קריאה עצמאית"
            question="כמה ספרים סיימו החודש?"
            hint="15–20 דקות כל לילה, ספר לבחירה אישית. לא ככלי ענישה."
          >
            <div className="space-y-3">
              {profiles.map((p) => (
                <PerChildChoice
                  key={p.id}
                  name={p.name}
                  options={BOOKS_OPTIONS}
                  value={books[p.id]}
                  onChange={(v) => setBooks((s) => ({ ...s, [p.id]: v }))}
                />
              ))}
            </div>
          </RowCard>

          {/* זמן ריק — §2 תנאי ג' */}
          <RowCard
            emoji="🌱"
            title="זמן ריק"
            question="האם היה יום ריק מוחלט בכל שבוע?"
            hint="שעה ביום בלי מסך ובלי הוראה, ויום שלם ריק בשבוע. לא להציל מהשעמום."
          >
            <ChoiceRow
              options={EMPTY_DAY_OPTIONS}
              value={emptyDay}
              onChange={setEmptyDay}
            />
          </RowCard>

          {/* אווירה — §11.2 */}
          <RowCard
            emoji="🙂"
            title="אווירה"
            question="האם יש שמחה בזמן הלמידה?"
            hint="ההתרשמות שלך. למטה מופיע גם הדיווח העצמי — כאינדיקציה, לא במקום."
          >
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="space-y-1">
                  <PerChildChoice
                    name={p.name}
                    options={MOOD_OPTIONS}
                    value={mood[p.id]}
                    onChange={(v) => setMood((s) => ({ ...s, [p.id]: v }))}
                  />
                  <SelfReported profile={p} />
                </div>
              ))}
            </div>
          </RowCard>

          {/* התקדמות — §11.2, נשלף אוטומטית */}
          <RowCard
            emoji="📈"
            title="התקדמות"
            question="גיל 7: יש מעבר רמה? גיל 9: הפרויקט זז?"
            hint="השורה היחידה שהאפליקציה כבר יודעת לבד — אין מה למלא."
          >
            <div className="space-y-2">
              {profiles.map((p) => (
                <ProgressRow key={p.id} profile={p} />
              ))}
            </div>
          </RowCard>

          <section className="bg-surface rounded-3xl shadow-soft p-6 space-y-3">
            <label className="block text-warm-dark font-semibold">
              משהו נוסף מהחודש?
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="לא חובה."
              className="w-full bg-cream border-2 border-warm-line rounded-2xl p-4 text-warm-dark focus:border-terracotta focus:outline-none placeholder:text-warm-muted resize-none"
            />
            <button
              type="submit"
              className="w-full bg-terracotta text-white py-3 rounded-2xl text-lg font-semibold shadow-warm hover:bg-terracotta-dark transition"
            >
              {current ? "עדכני את החודש" : "שמרי"}
            </button>
            {saved && (
              <p className="text-sm text-sage text-center">נשמר ✓</p>
            )}
          </section>
        </form>

        {flags.length > 0 && <FlagsSection flags={flags} />}

        {history.length > 0 && <HistorySection entries={history} />}
      </div>
    </main>
  );
}

function RowCard({
  emoji,
  title,
  question,
  hint,
  children,
}: {
  emoji: string;
  title: string;
  question: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface rounded-3xl shadow-soft p-6 space-y-3">
      <div>
        <h2 className="text-lg font-display font-extrabold text-warm-dark">
          {emoji} {title}
        </h2>
        <p className="text-warm-dark mt-1">{question}</p>
        <p className="text-xs text-warm-muted mt-1 leading-relaxed">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 min-w-[7rem] py-2.5 px-3 rounded-2xl text-sm font-semibold transition ${
            value === o.value
              ? "bg-warm-dark text-white"
              : "bg-cream text-warm-dark shadow-soft hover:shadow-warm"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PerChildChoice<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="bg-cream rounded-2xl p-3 space-y-2">
      <div className="text-sm font-semibold text-warm-dark">{name}</div>
      <ChoiceRow options={options} value={value} onChange={onChange} />
    </div>
  );
}

/**
 * מה שהילד עצמו דיווח אחרי סשנים השבוע (כל מגדר).
 * 🔴 מוצג **לצד** שאלת האווירה ולא במקומה: §11.2 שואל את ההורה,
 * וזה דיווח של הילד. שתי שאלות שונות.
 */
function SelfReported({ profile }: { profile: Profile }) {
  const { feelings } = computeWeeklyDigest(profile);
  const total = feelings.happy + feelings.ok + feelings.hard;
  if (total === 0) {
    return (
      <p className="text-xs text-warm-muted px-3">
        אין דיווח מהשבוע האחרון.
      </p>
    );
  }
  return (
    <p className="text-xs text-warm-muted px-3">
      הדיווח השבוע: 😊 {feelings.happy} · 😐 {feelings.ok} · 😣{" "}
      {feelings.hard}
    </p>
  );
}

/** §11.2 שורת ההתקדמות — נשלפת מהכיסוי הקיים, בלי מילוי ידני. */
function ProgressRow({ profile }: { profile: Profile }) {
  // computeCoverage מקבץ לפי נושא; כאן מעניין הסך הכול.
  const coverage = computeCoverage(profile);
  const rows = coverage.flatMap((group) => group.rows);
  const mastered = rows.filter(
    (r) => r.status === "mastered" || r.status === "mastered_review",
  ).length;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;

  return (
    <div className="bg-cream rounded-2xl p-3">
      <div className="text-sm font-semibold text-warm-dark">{profile.name}</div>
      <div className="text-xs text-warm-muted mt-0.5">
        {mastered} מיומנויות נשלטו · {inProgress} בתהליך
      </div>
    </div>
  );
}

/**
 * הדגלים. **בלי ציון ובלי סיכום מספרי** — §2 אינו מדרג בתים,
 * הוא מצביע על תנאי סף שלא מתקיים.
 */
function FlagsSection({
  flags,
}: {
  flags: ReturnType<typeof flagsFor>;
}) {
  return (
    <section className="bg-surface rounded-3xl shadow-soft p-6 space-y-3">
      <h2 className="text-lg font-display font-extrabold text-warm-dark">
        מה שכדאי לשים לב אליו
      </h2>
      <ul className="space-y-2">
        {flags.map((f, i) => (
          <li
            key={i}
            className="bg-mustard-soft rounded-2xl p-3 text-sm text-warm-dark leading-relaxed"
          >
            {f.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function HistorySection({ entries }: { entries: FoundationEntry[] }) {
  return (
    <section className="bg-surface rounded-3xl shadow-soft p-6 space-y-3">
      <h2 className="text-lg font-display font-extrabold text-warm-dark">
        חודשים קודמים
      </h2>
      <p className="text-xs text-warm-muted">
        מה שמעניין כאן אינו החודש הבודד אלא הכיוון — משתפר או נשחק.
      </p>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.month} className="bg-cream rounded-2xl p-3 space-y-1">
            <div className="text-sm font-semibold text-warm-dark">
              {monthLabel(e.month)}
            </div>
            <div className="text-xs text-warm-muted">
              שינה:{" "}
              {SLEEP_OPTIONS.find((o) => o.value === e.sleep)?.label ?? "—"} ·
              יום ריק:{" "}
              {EMPTY_DAY_OPTIONS.find((o) => o.value === e.emptyDay)?.label ??
                "—"}
            </div>
            {e.note && (
              <div className="text-xs text-warm-dark leading-relaxed pt-1">
                {e.note}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
