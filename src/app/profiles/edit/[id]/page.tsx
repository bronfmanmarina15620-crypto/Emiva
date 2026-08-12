"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ageFromBirthDate,
  allowedSkillsForAge,
  loadProfiles,
  updateProfile,
  type AddressForm,
  type Profile,
} from "@/lib/profiles";
import { TopicsPreview } from "@/components/TopicsPreview";
import { AddressFormPicker } from "@/components/AddressFormPicker";

/**
 * עריכת פרופיל קיים — שם, גיל ותאריך-לידה — בלי לגעת בהיסטוריה.
 * נולד מ-postmortem 2026-07-19: עד היום הדרך היחידה לתקן גיל שגוי
 * הייתה למחוק את הפרופיל, וזה מוחק את כל ההתקדמות.
 */
export default function EditProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [addressForm, setAddressForm] = useState<AddressForm | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const found = loadProfiles().find((p) => p.id === params.id) ?? null;
    setProfile(found);
    if (found) {
      setName(found.name);
      setAge(found.age);
      setBirthDate(found.birthDate ?? "");
      setAddressForm(found.addressForm);
    }
  }, [params.id]);

  const derivedAge = birthDate ? ageFromBirthDate(birthDate) : null;
  const effectiveAge = derivedAge ?? (age === "" ? null : Number(age));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !profile) return;
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
    if (birthDate && derivedAge === null) {
      setError("תאריך הלידה לא תקין");
      return;
    }
    const ageN = Number(effectiveAge);
    if (!Number.isFinite(ageN) || ageN < 7 || ageN > 10) {
      setError("כרגע יש תוכן לגילאים 7–10");
      return;
    }
    if (allowedSkillsForAge(ageN).length === 0) {
      setError("עדיין אין תוכן מתאים לגיל הזה");
      return;
    }
    setSubmitting(true);
    updateProfile(profile.id, {
      name: trimmed,
      age: ageN,
      birthDate: birthDate === "" ? null : birthDate,
      // undefined = לא נגעו; לא דורסים בחירה קיימת.
      ...(addressForm !== undefined ? { addressForm } : {}),
    });
    router.push("/");
  }

  if (profile === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוענת…</p>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center space-y-4">
          <p className="text-warm-dark">הפרופיל לא נמצא.</p>
          <Link href="/" className="text-sm text-terracotta underline">
            חזרה
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-cream">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-extrabold text-warm-dark">
            עריכת הפרופיל של {profile.name}
          </h1>
          <p className="text-sm text-warm-muted">
            כל ההתקדמות וההיסטוריה נשמרות — משתנים רק הפרטים.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-surface rounded-3xl shadow-soft p-6 space-y-4"
        >
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-warm-dark">שם</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full text-lg bg-cream border-2 border-warm-line rounded-2xl py-3 px-4 focus:border-terracotta focus:outline-none text-warm-dark"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-warm-dark">
              תאריך לידה{" "}
              <span className="font-normal text-warm-muted">(מומלץ)</span>
            </span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full text-lg bg-cream border-2 border-warm-line rounded-2xl py-3 px-4 focus:border-terracotta focus:outline-none text-warm-dark tabular-nums"
            />
            <span className="block text-xs text-warm-muted pt-1">
              עם תאריך לידה הגיל מתעדכן לבד בכל יום הולדת.
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-warm-dark">גיל</span>
            <input
              type="number"
              min={7}
              max={10}
              value={derivedAge ?? age}
              disabled={derivedAge !== null}
              onChange={(e) =>
                setAge(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full text-lg bg-cream border-2 border-warm-line rounded-2xl py-3 px-4 focus:border-terracotta focus:outline-none text-warm-dark tabular-nums disabled:opacity-70"
            />
            <TopicsPreview age={effectiveAge} />
          </label>

          <AddressFormPicker value={addressForm} onChange={setAddressForm} />

          {error && <p className="text-sm text-terracotta-dark">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-terracotta text-white py-4 rounded-2xl text-lg font-semibold shadow-warm hover:bg-terracotta-dark transition disabled:bg-warm-line disabled:text-warm-muted disabled:shadow-none disabled:cursor-not-allowed"
          >
            {submitting ? "שומרת..." : "שמירה"}
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-warm-muted hover:text-terracotta"
          >
            חזרה בלי לשמור
          </Link>
        </form>
      </div>
    </main>
  );
}
