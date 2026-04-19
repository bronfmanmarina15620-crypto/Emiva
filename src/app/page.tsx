"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getActiveProfileId,
  loadProfiles,
  setActiveProfileId,
  type Profile,
} from "@/lib/profiles";
import { Logo } from "@/components/Logo";

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);

  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  function choose(id: string) {
    setActiveProfileId(id);
    window.location.href = "/session";
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
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choose(p.id)}
                  className={`w-full bg-surface rounded-3xl shadow-soft py-5 px-6 flex items-center justify-between hover:shadow-warm transition ${
                    active ? "ring-2 ring-terracotta" : ""
                  }`}
                >
                  <span className="text-xl font-display font-extrabold text-warm-dark">
                    {p.name}
                  </span>
                  <span className="text-sm text-warm-muted">גיל {p.age}</span>
                </button>
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
      </div>
    </main>
  );
}
