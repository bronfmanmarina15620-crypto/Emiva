"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ageFromBirthDate,
  allowedSkillsForAge,
  createProfile,
  setActiveProfileId,
  type AddressForm,
} from "@/lib/profiles";
import type { Difficulty } from "@/lib/types";
import { logEvent } from "@/lib/telemetry";
import { TopicsPreview } from "@/components/TopicsPreview";
import { AddressFormPicker } from "@/components/AddressFormPicker";
import { StartingLevelPicker } from "@/components/StartingLevelPicker";

export default function NewProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [birthDate, setBirthDate] = useState("");
  // GENDER-INCLUSIVE-001 — לא נבחר עד שנוגעים; חסר = ניטרלי.
  const [addressForm, setAddressForm] = useState<AddressForm | undefined>(
    undefined,
  );
  // BL-017 — נקודת-הפתיחה. `undefined` = דילגו, וזה מצב אמיתי:
  // שום אפשרות אינה מסומנת מראש, ולכן הוא נשאר ניתן-לייצוג.
  const [startingLevel, setStartingLevel] = useState<Difficulty | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // תאריך-לידה גובר על גיל שהוקלד ידנית — הוא מקור-אמת שלא מזדקן.
  const derivedAge = birthDate ? ageFromBirthDate(birthDate) : null;
  const effectiveAge = derivedAge ?? (age === "" ? null : Number(age));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
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
    const profile = createProfile(
      trimmed,
      ageN,
      birthDate || undefined,
      addressForm,
      startingLevel,
    );
    // נורה **תמיד, כולל בדילוג** (`level: null`) — אחוז-הדילוג הוא
    // האות המרכזי לשאלה אם השאלה הזו עובדת בכלל.
    logEvent(profile.id, {
      t: "starting_level_chosen",
      at: Date.now(),
      level: startingLevel ?? null,
    });
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
            <span className="text-sm font-semibold text-warm-dark">
              תאריך לידה <span className="font-normal text-warm-muted">(מומלץ)</span>
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
            <span className="block text-xs text-warm-muted pt-1">
              כרגע 7–10. טווחים נוספים ייפתחו כשייכנס תוכן חדש.
            </span>
            <TopicsPreview age={effectiveAge} />
          </label>

          <AddressFormPicker value={addressForm} onChange={setAddressForm} />

          <StartingLevelPicker
            value={startingLevel}
            onChange={setStartingLevel}
          />

          {error && (
            <p className="text-sm text-terracotta-dark">{error}</p>
          )}

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
            חזרה
          </Link>
        </form>
      </div>
    </main>
  );
}
