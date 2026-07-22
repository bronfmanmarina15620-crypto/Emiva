#!/usr/bin/env bash
# שופט תוכן אוטומטי: רץ אחרי כל עריכה/כתיבה של קובץ מאגר-שפה (PostToolUse).
#
# למה: השופט (scripts/judge-content.mjs) שווה משהו רק אם הוא רץ בלי
# שמישהו יזכור להריץ אותו. ה-hook הזה מצמיד אותו לפעולת הכתיבה עצמה —
# ברגע שקלוד נוגע במאגר תוכן, השופט נורה ומחזיר ממצאים.
#
# מדווח, לא חוסם: exit 0 תמיד. הממצאים מוזרקים לשיחה דרך stdout כדי
# שקלוד יראה אותם ויתקן לפני שהתוכן מגיע לילדה. חסימה תתווסף רק אחרי
# כיול אנושי (BL-005).

input=$(cat)

# שולף את נתיב הקובץ שנערך מתוך ה-JSON של PostToolUse.
file=$(printf '%s' "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//')

# רץ רק על מאגרי התוכן שהשופט מכיר. עריכות אחרות — יוצא בשקט.
case "$file" in
  *"src/content/english/vocab-"*.json|*"src/content/hebrew/comprehension-"*.json)
    ;;
  *)
    exit 0 ;;
esac

# מריץ את השופט. אם node לא זמין או הסקריפט חסר — יוצא בשקט (לא חוסם עבודה).
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(dirname "$0")/../.." || exit 0
[ -f scripts/judge-content.mjs ] || exit 0

output=$(node scripts/judge-content.mjs 2>/dev/null)
errors=$(printf '%s' "$output" | grep -oE 'שגיאות: [0-9]+' | grep -oE '[0-9]+' | head -1)

if [ -n "$errors" ] && [ "$errors" -gt 0 ]; then
  echo "🔍 השופט מצא $errors שגיאות-מבנה במאגר שנערך. תקן לפני המשך:" >&2
  printf '%s\n' "$output" | grep -A1 "🔴" >&2
fi

exit 0
