"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  allowedSkillsForAge,
  deleteProfile,
  getActiveProfileId,
  loadProfiles,
  setActiveProfileId,
  type Profile,
} from "@/lib/profiles";
import { computeParentReminderNeeded } from "@/lib/parent-dashboard";
import { Logo } from "@/components/Logo";

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [parentReminder, setParentReminder] = useState(false);

  useEffect(() => {
    setProfiles(loadProfiles());
    setParentReminder(computeParentReminderNeeded());
  }, []);

  function choose(id: string) {
    setActiveProfileId(id);
    window.location.href = "/session";
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
              return (
                <div
                  key={p.id}
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
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    aria-label={`מחיקת הפרופיל של ${p.name}`}
                    className="px-4 py-5 text-warm-muted hover:text-terracotta-dark transition border-r border-warm-line/50"
                  >
                    ✕
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
          {profiles.length === 0 ? "הוסיפי משתמשת" : "הוסיפי משתמשת חדשה"}
        </Link>

        <div className="pt-6 border-t border-warm-line/50">
          <Link
            href="/parent"
            className="text-xs text-warm-muted/70 hover:text-warm-muted transition inline-flex items-center gap-1.5"
          >
            הורים
            {parentReminder && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta"
                aria-label="תזכורת: לא נכנסת מזמן"
              />
            )}
          </Link>
        </div>
      </div>
    </main>
  );
}
