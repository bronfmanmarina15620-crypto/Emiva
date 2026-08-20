"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  allowedSkillsForAge,
  deleteProfile,
  getActiveProfileId,
  loadProfiles,
  runAddressFormMigration,
  setActiveProfileId,
  type Profile,
} from "@/lib/profiles";
import { computeParentReminderNeeded } from "@/lib/parent-dashboard";
import { runEnglishResetMigration } from "@/lib/storage";
import { Logo } from "@/components/Logo";

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [parentReminder, setParentReminder] = useState(false);
  const [showParentCode, setShowParentCode] = useState(false);
  const [parentCodeInput, setParentCodeInput] = useState("");

  useEffect(() => {
    // חייבת לרוץ לפני קריאת הפרופילים — מאפסת ציוני אנגלית לא-אמינים
    // שנצברו כשהתשובה הנכונה הייתה תמיד הכפתור הראשון (ראי storage.ts).
    runEnglishResetMigration();
    // GENDER-INCLUSIVE-001 §M — פרופיל מלפני שדה לשון-הפנייה מקבל
    // `feminine`, כדי שאוולין ואמיליה לא יאבדו את החום שיש להן היום.
    // בניגוד למיגרציה שמעליה — כאן ריצה חוזרת היא תכונה (ראי profiles.ts).
    runAddressFormMigration();
    setProfiles(loadProfiles());
    setParentReminder(computeParentReminderNeeded());
  }, []);

  function choose(id: string) {
    setActiveProfileId(id);
    window.location.href = "/session";
  }

  function handleParentClick() {
    const expected = process.env.NEXT_PUBLIC_PARENT_GATE_CODE;
    if (!expected) {
      window.location.href = "/parent";
      return;
    }
    setShowParentCode((s) => !s);
    setParentCodeInput("");
  }

  function handleParentCodeSubmit(e: FormEvent) {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_PARENT_GATE_CODE;
    if (parentCodeInput === expected) {
      window.location.href = "/parent";
    } else {
      setParentCodeInput("");
    }
  }

  function handleDelete(p: Profile) {
    const ok = window.confirm(
      `למחוק את הפרופיל של ${p.name} (גיל ${p.age})?\nכל ההיסטוריה והטלמטריה יימחקו לצמיתות. לא ניתן לשחזר.`,
    );
    if (!ok) return;
    deleteProfile(p.id);
    setProfiles(loadProfiles());
  }

  if (profiles === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8 bg-cream">
      <div className="max-w-md w-full text-center space-y-10">
        <div className="space-y-3 flex flex-col items-center">
          <Logo size={96} />
          <p className="text-lg text-warm-muted">מי מתרגלת היום?</p>
        </div>

        {profiles.length > 0 && (
          <div className="space-y-3">
            {profiles.map((p) => {
              const activeId = getActiveProfileId();
              const active = activeId === p.id;
              const hasContent = allowedSkillsForAge(p.age).length > 0;
              const canPuppyJournal = p.age >= 9;
              return (
                <div key={p.id} className="space-y-2">
                  <div
                    className={`w-full bg-surface rounded-3xl shadow-soft flex items-center hover:shadow-warm transition ${
                      active ? "ring-2 ring-terracotta" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => choose(p.id)}
                      className="flex-1 flex items-center justify-between py-5 px-6 text-right"
                    >
                      <span className="text-xl font-display font-extrabold text-warm-dark">
                        {p.name}
                      </span>
                      <span
                        className={`text-sm ${
                          hasContent ? "text-warm-muted" : "text-terracotta-dark"
                        }`}
                      >
                        {hasContent ? `גיל ${p.age}` : `גיל ${p.age} · אין תוכן`}
                      </span>
                    </button>
                    <Link
                      href={`/profiles/edit/${p.id}`}
                      aria-label={`עריכת הפרופיל של ${p.name}`}
                      className="px-3 py-5 text-warm-muted hover:text-terracotta transition border-r border-warm-line/50"
                    >
                      ✎
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      aria-label={`מחיקת הפרופיל של ${p.name}`}
                      className="px-4 py-5 text-warm-muted hover:text-terracotta-dark transition border-r border-warm-line/50"
                    >
                      ✕
                    </button>
                  </div>
                  {canPuppyJournal && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProfileId(p.id);
                        window.location.href = "/journal/puppy";
                      }}
                      className="text-sm text-warm-muted hover:text-terracotta-dark transition pr-2"
                    >
                      🐕 יומן הגור
                    </button>
                  )}
                  {/* שכבה 2 (MyLevel §1) — פתוחה לכל גיל, בניגוד ליומן הגור. */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileId(p.id);
                      window.location.href = "/enrichment";
                    }}
                    className="text-sm text-warm-muted hover:text-terracotta-dark transition pr-2"
                  >
                    🔬 העשרה — הפעילות של השבוע
                  </button>
                  {/* לוח §7. הכניסה היחידה אליו — מסך בלי כניסה
                      אינו קיים בפועל (הטריגר "אף אחת לא מוצאת את
                      הכפתור" ב-BL-011). */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileId(p.id);
                      window.location.href = "/plan";
                    }}
                    className="text-sm text-warm-muted hover:text-terracotta-dark transition pr-2"
                  >
                    📅 מה עושים היום?
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Link
          href="/profiles/new"
          className={
            profiles.length === 0
              ? "inline-block bg-terracotta text-white px-10 py-5 rounded-3xl text-xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
              : "inline-block text-warm-muted hover:text-terracotta text-sm underline"
          }
        >
          {/*
            שם-פעולה ולא ציווי: הכפתור יושב במסך הבית, שהילד/ה רואה.
            "פרופיל" במקום "משתמשת" — שם-עצם ניטרלי, ולכן אין צורך
            בלוכסן (שאסור: התקן הממשלתי + קורא/ת מתחיל/ה).
          */}
          {profiles.length === 0 ? "הוספת פרופיל" : "הוספת פרופיל חדש"}
        </Link>

        <div className="pt-6 border-t border-warm-line/50">
          <button
            type="button"
            onClick={handleParentClick}
            className="text-xs text-warm-muted/70 hover:text-warm-muted transition inline-flex items-center gap-1.5"
          >
            הורים
            {parentReminder && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta"
                aria-label="תזכורת: לא נכנסת מזמן"
              />
            )}
          </button>
          {showParentCode && (
            <form onSubmit={handleParentCodeSubmit} className="mt-2">
              <input
                type="password"
                autoFocus
                value={parentCodeInput}
                onChange={(e) => setParentCodeInput(e.target.value)}
                aria-label="קוד גישה"
                className="text-xs px-3 py-1.5 rounded-lg border border-warm-line bg-surface text-warm-dark text-center focus:outline-none focus:border-warm-muted w-40"
              />
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
