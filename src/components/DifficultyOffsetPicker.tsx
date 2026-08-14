"use client";

/**
 * BL-021 — בחירת קצב ההתחלה (`difficultyOffset`).
 *
 * **מתאר את מצב ההורה, לא את יכולת הילד/ה.** זו אינה בחירה
 * אסתטית: `.claude/rules/pedagogy.md` §טון ו-guardrails §2 אוסרים
 * מסגור שמסמן ילד/ה ככישלון. לכן הכותרת היא *"קצב ההתחלה"* ולא
 * "רמת קושי", ושורות-העזר מתארות מתי **ההורה** יושבת ליד — לעולם
 * לא "מתקשה" או "חלש". הכלל מקודד כבדיקה ב-
 * `tests/ui/difficulty-offset-picker.test.tsx`.
 *
 * הערך מופחת מהדרגה המחושבת בכל בחירת פריט (`targetDifficulty`),
 * ולכן הוא מחזיק גם כשהרמה עצמה זזה.
 */
export function DifficultyOffsetPicker({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const options: { id: number; label: string; help: string }[] = [
    {
      id: 0,
      label: "רגיל",
      help: "הרמה נקבעת לפי איך שהולך בתרגול.",
    },
    {
      id: 1,
      label: "דרגה אחת קלה יותר",
      help: "מתאים כשאני יושבת ליד ומסבירה — ההסברים נרשמים כהצלחות, והמערכת מסיקה רמה גבוהה מדי.",
    },
    {
      id: 2,
      label: "שתי דרגות קלה יותר",
      help: "כשהתרגילים רחוקים מדי מהנקודה שבה נמצאים עכשיו.",
    },
  ];

  // חסר = "רגיל". אין ערך-ביניים של "לא נבחר": פרופיל חדש נפתח ב-0.
  const current = value ?? 0;

  return (
    <fieldset className="block space-y-2">
      <legend className="text-sm font-semibold text-warm-dark">
        קצב ההתחלה
      </legend>
      <p className="text-xs text-warm-muted">
        אפשר לשנות מתי שרוצים. זה לא משפיע על מה שכבר נלמד.
      </p>
      <div className="grid gap-2">
        {options.map((o) => {
          const selected = current === o.id;
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
                name="difficultyOffset"
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
