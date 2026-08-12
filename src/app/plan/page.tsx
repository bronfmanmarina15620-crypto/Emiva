"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveProfile, type Profile } from "@/lib/profiles";
import { TOPIC_HEBREW } from "@/lib/enrichment";
import {
  dayFor,
  planForAge,
  todayHeadline,
  todayIndex,
  type DayId,
  type PlanDay,
} from "@/lib/weekly-plan";

/**
 * לוח השבוע (MyLevel §7).
 *
 * §7 נפתח ב*"זה לא תוכנית ברזל — זה מתווה. יום מחמיצים? לא
 * קטסטרופה"*, ולכן המסך **מראה ואינו עוקב**: אין סימון בוצע, אין
 * רצף, ואין שום דבר שהופך יום שהוחמץ לחוב. המטרה היחידה היא לענות
 * על "מה עושים היום" בלי לחפש.
 */
export default function PlanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selected, setSelected] = useState<DayId | null>(null);
  const [today, setToday] = useState<DayId>(0);

  useEffect(() => {
    const p = getActiveProfile();
    if (!p) {
      router.replace("/");
      return;
    }
    setProfile(p);
    // `todayIndex` נקרא ב-effect ולא ברינדור: התאריך אינו זהה
    // בשרת ובדפדפן, וקריאה ישירה הייתה יוצרת אי-התאמת hydration.
    const t = todayIndex();
    setToday(t);
    setSelected(t);
  }, [router]);

  if (!profile || selected === null) return null;

  const week = planForAge(profile.age);
  const day = dayFor(profile.age, selected);

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            השבוע של {profile.name}
          </h1>
          <p className="text-sm text-warm-muted">
            מתווה, לא תוכנית ברזל. יום שמחמיצים אינו קטסטרופה.
          </p>
        </header>

        {/* בורר הימים — היום הנוכחי מסומן תמיד, גם כשמסתכלים על יום אחר. */}
        <nav className="flex gap-1.5 justify-center flex-wrap">
          {week.map((d) => {
            const isToday = d.day === today;
            const isSelected = d.day === selected;
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelected(d.day)}
                aria-current={isSelected ? "true" : undefined}
                className={`px-3 py-2 rounded-2xl text-sm transition ${
                  isSelected
                    ? "bg-terracotta text-white shadow-warm"
                    : "bg-surface text-warm-muted hover:text-terracotta"
                } ${isToday && !isSelected ? "ring-2 ring-terracotta/40" : ""}`}
              >
                {d.name}
                {isToday && <span className="text-xs"> •</span>}
              </button>
            );
          })}
        </nav>

        <DayCard day={day} isToday={day.day === today} />

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-warm-muted hover:text-terracotta underline"
          >
            חזרה
          </Link>
        </div>
      </div>
    </main>
  );
}

function DayCard({ day, isToday }: { day: PlanDay; isToday: boolean }) {
  return (
    <section className="bg-surface rounded-3xl shadow-soft p-6 space-y-5">
      <div className="space-y-1">
        <p className="text-xs text-warm-muted">
          {isToday ? "היום" : `יום ${day.name}`}
        </p>
        <h2 className="text-xl font-display font-bold text-warm-dark">
          {todayHeadline(day)}
        </h2>
      </div>

      {/* יום מנוחה — §2 מגדיר זמן ריק כתנאי-סף, ולכן הוא מוצג
          כתוכן ולא כמסך ריק. במכוון אין כאן שום הצעה לפעילות. */}
      {day.rest && (
        <p className="text-warm-muted leading-relaxed">
          בלי תרגול, בלי פעילות מתוכננת, בלי מסך. שעמום הוא מקום שבו
          נולדים רעיונות — וזה חלק מהתוכנית, לא חסר בה.
        </p>
      )}

      {day.core.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-warm-muted">תרגול · 15–20 דקות</p>
          <div className="flex flex-wrap gap-2">
            {day.core.map((c) => (
              <span
                key={c}
                className="bg-warm-bg px-3 py-1.5 rounded-xl text-sm text-warm-dark"
              >
                {c}
              </span>
            ))}
          </div>
          <Link
            href="/session"
            className="inline-block bg-terracotta text-white px-6 py-3 rounded-2xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
          >
            לתרגול
          </Link>
        </div>
      )}

      {day.enrichment && (
        <div className="space-y-2">
          <p className="text-xs text-warm-muted">העשרה · 30–45 דקות</p>
          <p className="text-warm-dark">{TOPIC_HEBREW[day.enrichment]}</p>
          <Link
            href="/enrichment"
            className="inline-block text-sm text-terracotta hover:text-terracotta-dark underline"
          >
            לפעילות של השבוע
          </Link>
        </div>
      )}

      {/* נושא שמתוכנן בלוח אבל אין לו עדיין מסך — ערבית (BL-006),
          או פרויקט שקורה מחוץ לאפליקציה. מוצג בלי קישור, כי לוח
          שמסתיר את מה שחסר משקר על התוכנית. */}
      {!day.enrichment && day.enrichmentLabel && (
        <div className="space-y-1">
          <p className="text-xs text-warm-muted">העשרה</p>
          <p className="text-warm-dark">{day.enrichmentLabel}</p>
        </div>
      )}

      {day.ambient && (
        <div className="space-y-1 border-t border-warm-line/40 pt-4">
          <p className="text-xs text-warm-muted">ברקע</p>
          <p className="text-sm text-warm-muted">{day.ambient}</p>
        </div>
      )}
    </section>
  );
}
