#!/usr/bin/env bash
# שער-סקירה: עוצר commit של משימה שלא נסקרה (PreToolUse על Bash).
#
# למה זה קיים:
# ב-2026-08-10 תחנת הסקירה נשמטה **פעמיים ברצף** — ב-T1 וב-T2 של
# מסלול הפוניקה. בשתי הפעמים Marina היא ששאלה "עשינו REVIEW?",
# ובשתיהן הסקירה מצאה באג שהחזיר את המשימה לנקודת-הפתיחה שלה:
# פריטים שחשפו את התשובה של עצמם, כלומר בדיוק ה-false mastery
# שהמשימות נועדו למנוע. **הבדיקות היו ירוקות בשני המקרים.**
#
# עקרון-איכות 1 (CLAUDE.md גלובלי): לקח בר-קידוד נכתב כ-selftest.
# שורה בצ'ק-ליסט היא בקשה לזכור — והכלל "תוכנית לפני קוד" כבר הוכיח
# שבקשות כאלה נשכחות. ה-hook הזה הופך את הסקירה מ"כתוב שצריך"
# ל"אי אפשר בלי".
#
# מה נחשב "משימה": commit שנוגע ב-src/ ומוסיף/משנה קובץ-משימה
# תחת tasks/<TASK-ID>/. תיקוני-תיעוד, סנכרון מסמכים ושינויי-תשתית
# עוברים בלי חיכוך.
#
# איך מסמנים שנסקר: `.claude/.review-done` נוצר על ידי הרצת
# /code-review, או ידנית על ידי Marina כשהיא מוותרת במודע.

input=$(cat)

cmd=$(printf '%s' "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"\(\\.\|[^"\\]\)*"' | head -1)

# רלוונטי רק ל-git commit.
case "$cmd" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(dirname "$0")/../.." || exit 0

# מה מוכן ל-commit?
staged=$(git diff --cached --name-only 2>/dev/null)
[ -n "$staged" ] || exit 0

touches_src=$(printf '%s\n' "$staged" | grep -c '^src/')
touches_task=$(printf '%s\n' "$staged" | grep -c '^tasks/[A-Z].*/INSTRUCTIONS\.md$')

# לא קוד + מסמך-משימה יחד → לא סגירת-משימה. עובר.
if [ "$touches_src" -eq 0 ] || [ "$touches_task" -eq 0 ]; then
  exit 0
fi

# נסקר? הסימון תקף רק אם הוא חדש יותר מהקוד שנערך.
marker=".claude/.review-done"
if [ -f "$marker" ]; then
  newer=$(printf '%s\n' "$staged" | grep '^src/' | while read -r f; do
    [ -f "$f" ] && [ "$f" -nt "$marker" ] && echo "stale"
  done)
  if [ -z "$newer" ]; then
    exit 0
  fi
  reason="הסקירה רצה, אבל קוד השתנה אחריה."
else
  reason="לא נמצאה סקירה למשימה הזאת."
fi

echo "🔍 חסום: משימה בלי סקירת קוד" >&2
echo "" >&2
echo "$reason" >&2
echo "" >&2
echo "התחנה הזאת נשמטה פעמיים ב-2026-08-10 (T1 ו-T2 של הפוניקה)." >&2
echo "בשתי הפעמים Marina היא ששאלה, ובשתיהן נמצא באג שהחזיר את" >&2
echo "המשימה לנקודת-ההתחלה. הבדיקות היו ירוקות בשני המקרים." >&2
echo "" >&2
echo "הרץ /code-review לפני ה-commit." >&2
echo "ויתור מודע של Marina: touch .claude/.review-done" >&2
exit 2
