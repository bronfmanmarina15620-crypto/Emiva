"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getActiveProfile, type Profile } from "@/lib/profiles";
import {
  activityOfWeek,
  ENRICHMENT_TOPICS,
  TOPIC_HEBREW,
  weekKey,
  type EnrichmentActivity,
  type EnrichmentTopic,
} from "@/lib/enrichment";
import {
  loadEnrichmentLog,
  saveEnrichmentEntry,
  type EnrichmentEntry,
} from "@/lib/storage";

/**
 * שכבה 2 — Enrichment (MyLevel §1).
 *
 * המסך **מזמין ומתעד**. הפעילות עצמה קורה בעולם: ניסוי במטבח (§4.1),
 * משחק עם ההורה (§4.4). אין כאן ניקוד, אחוז שליטה או "תשובה נכונה" —
 * §1 קובע "אין מבחנים. מדידה: רכה".
 */
export default function EnrichmentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topic, setTopic] = useState<EnrichmentTopic>("science");
  const [log, setLog] = useState<EnrichmentEntry[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = getActiveProfile();
    if (!p) {
      router.replace("/");
      return;
    }
    setProfile(p);
    setLog(loadEnrichmentLog(p.id));
    setReady(true);
  }, [router]);

  const activity = profile ? activityOfWeek(topic, profile.age) : null;
  const week = weekKey();
  const existing = log.find((e) => e.topic === topic && e.week === week);

  useEffect(() => {
    setNote(existing?.note ?? "");
    setSaved(false);
  }, [topic, existing?.note]);

  const persist = useCallback(
    (done: boolean, text: string) => {
      if (!profile || !activity) return;
      const entry: EnrichmentEntry = {
        topic,
        week,
        activityId: activity.id,
        note: text,
        done,
        at: Date.now(),
      };
      saveEnrichmentEntry(profile.id, entry);
      setLog(loadEnrichmentLog(profile.id));
      setSaved(true);
    },
    [profile, activity, topic, week],
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    persist(existing?.done ?? false, note);
  }

  if (!ready || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            העשרה — פעם בשבוע
          </h1>
          <p className="text-sm text-warm-muted">
            שלום {profile.name} · בלי ציונים, בלי מבחנים. רק לגלות משהו.
          </p>
        </div>
        <Link
          href="/"
          className="bg-surface rounded-2xl shadow-soft px-4 py-2 text-warm-dark hover:shadow-warm transition"
        >
          חזרה
        </Link>
      </header>

      <div className="max-w-3xl mx-auto flex gap-2 mb-5">
        {ENRICHMENT_TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTopic(t)}
            className={`px-5 py-2 rounded-2xl text-sm transition ${
              t === topic
                ? "bg-terracotta text-white shadow-warm"
                : "bg-surface text-warm-dark shadow-soft hover:shadow-warm"
            }`}
          >
            {TOPIC_HEBREW[t]}
          </button>
        ))}
      </div>

      {activity === null ? (
        <section className="max-w-3xl mx-auto bg-surface rounded-3xl shadow-soft p-6">
          <p className="text-warm-muted text-sm">
            עוד אין פעילויות בנושא הזה לגיל שלך.
          </p>
        </section>
      ) : (
        <ActivityCard
          activity={activity}
          done={existing?.done ?? false}
          onToggleDone={() => persist(!(existing?.done ?? false), note)}
          note={note}
          setNote={setNote}
          onSubmit={handleSubmit}
          saved={saved}
        />
      )}
    </main>
  );
}

function ActivityCard({
  activity,
  done,
  onToggleDone,
  note,
  setNote,
  onSubmit,
  saved,
}: {
  activity: EnrichmentActivity;
  done: boolean;
  onToggleDone: () => void;
  note: string;
  setNote: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  saved: boolean;
}) {
  // ההסבר מוצג רק אחרי בקשה מפורשת: §4.1 מאמץ Guided Inquiry —
  // הילדה מנחשת ובודקת, וההסבר הישיר מגיע בסוף (de Jong 2023).
  const [showWhy, setShowWhy] = useState(false);

  return (
    <section className="max-w-3xl mx-auto space-y-4">
      <div className="bg-surface rounded-3xl shadow-soft p-6 space-y-4">
        <h2 className="text-xl font-display font-extrabold text-warm-dark">
          {activity.title}
        </h2>

        <p className="text-lg text-warm-dark leading-relaxed">
          {activity.activity}
        </p>

        {/* מה צריך להכין — לפני הכול, כדי לא לגלות באמצע שחסר משהו. */}
        {activity.materials && activity.materials.length > 0 && (
          <div className="bg-cream rounded-2xl p-4 space-y-2">
            <div className="text-sm font-semibold text-warm-dark">
              מה צריך
            </div>
            <ul className="space-y-1">
              {activity.materials.map((m, i) => (
                <li key={i} className="text-warm-dark leading-relaxed">
                  • {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* §4.1 Guided Inquiry — הניחוש בא לפני הבדיקה, לא אחריה. */}
        {activity.predict && (
          <div className="bg-mustard-soft rounded-2xl p-4 space-y-1">
            <div className="text-sm font-semibold text-warm-dark">
              🤔 קודם כול — נחשי
            </div>
            <p className="text-warm-dark leading-relaxed">{activity.predict}</p>
          </div>
        )}

        {/* השלבים עצמם. בלי אלה הפעילות היא כותרת, לא הוראה. */}
        {activity.steps && activity.steps.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-warm-dark">
              איך עושים את זה
            </div>
            <ol className="space-y-2">
              {activity.steps.map((s, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-terracotta text-white text-sm font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-warm-dark leading-relaxed pt-0.5">
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* מה לחפש — מונע "עשינו, לא קרה כלום". במכוון בלי ה"למה". */}
        {activity.expected && (
          <div className="bg-sage-soft rounded-2xl p-4 space-y-1">
            <div className="text-sm font-semibold text-warm-dark">
              👀 מה אמור לקרות
            </div>
            <p className="text-warm-dark leading-relaxed">{activity.expected}</p>
          </div>
        )}

        {!showWhy ? (
          <button
            type="button"
            onClick={() => setShowWhy(true)}
            className="text-sm text-terracotta-dark underline underline-offset-4"
          >
            כבר ניסיתי — למה זה קורה?
          </button>
        ) : (
          <div className="bg-cream rounded-2xl p-4 space-y-1">
            <div className="text-xs text-warm-muted">למה זה קורה</div>
            <p className="text-warm-dark leading-relaxed">{activity.why}</p>
          </div>
        )}

        <div className="border-t border-warm-line pt-3 text-sm text-warm-muted">
          רוצה עוד? {activity.resource}
        </div>
      </div>

      <div className="bg-surface rounded-3xl shadow-soft p-6 space-y-4">
        <button
          type="button"
          onClick={onToggleDone}
          className={`w-full py-3 rounded-2xl text-lg font-semibold transition ${
            done
              ? "bg-sage-soft text-warm-dark"
              : "bg-cream text-warm-dark shadow-soft hover:shadow-warm"
          }`}
        >
          {done ? "✓ עשינו את זה השבוע" : "עשינו את זה"}
        </button>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-warm-dark font-semibold">
            מה היה הכי מעניין?
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="אפשר לכתוב מה שרוצים — אין כאן נכון או לא נכון."
            className="w-full bg-cream border-2 border-warm-line rounded-2xl p-4 text-warm-dark focus:border-terracotta focus:outline-none placeholder:text-warm-muted resize-none"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-2xl bg-terracotta text-white shadow-warm hover:bg-terracotta-dark transition"
          >
            שמירה
          </button>
          {saved && (
            <span className="text-sage text-sm mr-3">נשמר ✓</span>
          )}
        </form>
      </div>

      <div className="bg-surface rounded-3xl shadow-soft p-5">
        <div className="text-xs text-warm-muted mb-1">להורה</div>
        <p className="text-warm-dark text-sm leading-relaxed">
          {activity.parentTip}
        </p>
      </div>
    </section>
  );
}
