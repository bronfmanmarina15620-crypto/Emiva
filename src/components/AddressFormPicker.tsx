"use client";

import type { AddressForm } from "@/lib/profiles";

/**
 * GENDER-INCLUSIVE-001 G1 — בחירת לשון הפנייה.
 *
 * **שאלת לשון, לא שאלת מין.** כך ממליץ התקן הממשלתי (ראי
 * `plans/GENDER-INCLUSIVE-001.md §6`), וכך גם מנוסחת השאלה: לא
 * *"מה המין שלך?"* אלא *"איך לפנות אליך?"*. ההבדל אינו סמנטי —
 * הוא מוריד את הרגישות הרגולטורית של השדה ומדבר על מה שבאמת
 * משפיע: הטקסט שהילד/ה יראה.
 *
 * **"לא רוצה לומר" חובה.** גם כבוד למשתמש/ת, וגם הצורה שבה
 * פרופילים ישנים ממשיכים לעבוד בלי שאיש נדרש למלא כלום.
 */
export function AddressFormPicker({
  value,
  onChange,
}: {
  value: AddressForm | undefined;
  onChange: (v: AddressForm) => void;
}) {
  const options: { id: AddressForm; label: string; example: string }[] = [
    { id: "feminine", label: "בלשון נקבה", example: "מוכנה להתחיל?" },
    { id: "masculine", label: "בלשון זכר", example: "מוכן להתחיל?" },
    { id: "neutral", label: "בלי להעדיף", example: "אפשר להתחיל?" },
  ];

  return (
    <fieldset className="block space-y-2">
      <legend className="text-sm font-semibold text-warm-dark">
        איך לפנות אליך?
      </legend>
      <p className="text-xs text-warm-muted">
        בעברית כל משפט פונה בלשון זכר או נקבה. אפשר לשנות מתי שרוצים.
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
                name="addressForm"
                value={o.id}
                checked={selected}
                onChange={() => onChange(o.id)}
                className="accent-terracotta"
              />
              <span className="flex-1">
                <span className="block text-warm-dark">{o.label}</span>
                <span className="block text-xs text-warm-muted">
                  {o.example}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
