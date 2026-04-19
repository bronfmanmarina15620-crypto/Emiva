"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProfile, setActiveProfileId } from "@/lib/profiles";

export default function NewProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("חסר שם");
      return;
    }
    if (trimmed.length > 20) {
      setError("שם ארוך מדי (עד 20 תווים)");
      return;
    }
    const ageN = Number(age);
    if (!Number.isFinite(ageN) || ageN < 3 || ageN > 18) {
      setError("גיל בין 3 ל־18");
      return;
    }
    const profile = createProfile(trimmed, ageN);
    setActiveProfileId(profile.id);
    router.push("/session");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-cream">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-extrabold text-warm-dark">
            משתמשת חדשה
          </h1>
          <p className="text-sm text-warm-muted">
            השם והגיל נשמרים על המכשיר הזה בלבד.
          </p>
        </div>

        <form onSubmit={submit} className="bg-surface rounded-3xl shadow-soft p-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-warm-dark">שם</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full text-lg bg-cream border-2 border-warm-line rounded-2xl py-3 px-4 focus:border-terracotta focus:outline-none text-warm-dark"
              autoFocus
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-warm-dark">גיל</span>
            <input
              type="number"
              min={3}
              max={18}
              value={age}
              onChange={(e) =>
                setAge(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full text-lg bg-cream border-2 border-warm-line rounded-2xl py-3 px-4 focus:border-terracotta focus:outline-none text-warm-dark tabular-nums"
            />
          </label>

          {error && (
            <p className="text-sm text-terracotta-dark">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-terracotta text-white py-4 rounded-2xl text-lg font-semibold shadow-warm hover:bg-terracotta-dark transition"
          >
            שמירה
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-warm-muted hover:text-terracotta"
          >
            חזרה
          </Link>
        </form>
      </div>
    </main>
  );
}
