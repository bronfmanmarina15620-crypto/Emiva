import { allowedSkillsForAge } from "@/lib/profiles";
import { SKILL_HEBREW } from "@/lib/parent-dashboard";

/**
 * מציג אילו נושאים נפתחים לגיל שהוקלד, בזמן-אמת בטופס יצירה/עריכה של
 * פרופיל. נולד מ-postmortem 2026-07-19: גיל שגוי בפרופיל שלח את אמיליה
 * לנושאים של בת 7, ואף מסך לא הראה את ההשלכה של המספר שהוקלד.
 */
export function TopicsPreview({ age }: { age: number | null }) {
  if (age === null || !Number.isFinite(age)) return null;
  const skills = allowedSkillsForAge(age);
  if (skills.length === 0) {
    return (
      <p className="text-xs text-terracotta-dark pt-1">
        לגיל {age} עדיין אין תוכן במערכת.
      </p>
    );
  }
  return (
    <p className="text-xs text-warm-muted pt-1">
      <span className="font-semibold text-warm-dark">עם גיל {age} מתרגלים: </span>
      {skills.map((s) => SKILL_HEBREW[s]).join(" · ")}
    </p>
  );
}
