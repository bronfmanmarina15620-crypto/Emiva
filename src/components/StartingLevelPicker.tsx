"use client";

import type { Difficulty } from "@/lib/types";

/**
 * BL-017 — נקודת-הפתיחה. שאלה אחת להורה בהרשמה.
 *
 * **שאלה על החומר, לא מבחן-רמה של הילד/ה.** מבחן-מיקום בכניסה
 * סותר את עקרון ה-growth-mindset — ילד/ה נכשל/ת לפני שהתחיל/ה
 * (`.claude/rules/pedagogy.md` §טון). לכן הכותרת היא *"מאיפה
 * להתחיל?"*, ושורות-העזר מתארות את **החומר** ואת מה שההורה יודע/ת
 * עליו — לעולם לא את יכולת הילד/ה.
 *
 * **"מההתחלה" ממוסגר כתשובה הבטוחה** (*"מתאים גם כשלא בטוחים"*).
 * בלי זה השאלה הופכת למבחן-כניסה מוסווה שבו הורה מרגיש/ה שצריך
 * "לנחש נכון".
 *
 * **שום אפשרות אינה מסומנת מראש** — וזה הבדל מבני מכוון מול
 * `DifficultyOffsetPicker`, ששם `value ?? 0` מסמן את "רגיל" מראש
 * וכך יצר באג שבו לחיצה על ברירת-המחדל לא שמרה כלום. כאן דילוג
 * הוא מצב אמיתי שצריך להישאר ניתן-לייצוג, ובדיקה נועלת את זה.
 */
export function StartingLevelPicker({
  value,
  onChange,
}: {
  value: Difficulty | undefined;
  onChange: (v: Difficulty) => void;
}) {
  const options: { id: Difficulty; label: string; help: string }[] = [
    {
      id: 1,
      label: "מההתחלה",
      help: "מתחילים מהבסיס ומתקדמים משם. מתאים גם כשלא בטוחים.",
    },
    {
      id: 3,
      label: "כבר מכירים את החומר",
      help: "החומר הזה נלמד בבית הספר או בבית, ורוב הדברים כבר מוכרים.",
    },
    {
      id: 5,
      label: "מחפשים אתגר",
      help: "החומר של הגיל הזה כבר קל, ומחפשים משהו יותר מאתגר.",
    },
  ];

  return (
    <fieldset className="block space-y-2">
      <legend className="text-sm font-semibold text-warm-dark">
        מאיפה להתחיל?
      </legend>
      <p className="text-xs text-warm-muted">
        אפשר לדלג — אז מתחילים מההתחלה. אחרי כמה שאלות התרגילים
        מתכווננים לבד בכל מקרה.
      </p>
      <div className="grid gap-2">
        {options.map((o) => {
          const selected = value === o.id;
          return (
            <label
              key={o.id}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition ${
                selected
                  ? "border-terracotta bg-cream"
                  : "border-warm-line hover:border-terracotta"
              }`}
            >
              <input
                type="radio"
                name="startingLevel"
                value={o.id}
                checked={selected}
                onChange={() => onChange(o.id)}
                className="accent-terracotta"
              />
              <span className="flex-1">
                <span className="block text-warm-dark">{o.label}</span>
                <span className="block text-xs text-warm-muted">{o.help}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
