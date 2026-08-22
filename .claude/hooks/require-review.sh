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
# תחת tasks/active/<TASK-ID>/ או tasks/done/<TASK-ID>/. תיקוני-תיעוד,
# סנכרון מסמכים ושינויי-תשתית עוברים בלי חיכוך.
#
# 2026-08-22: המשימות סודרו לתתי-תיקיות לפי סטטוס. הביטוי הקודם היה
# `^tasks/[A-Z].*/INSTRUCTIONS\.md$` — הוא נשען על כך שהסגמנט הראשון
# אחרי tasks/ מתחיל באות גדולה, ולכן `tasks/active/...` (אות קטנה) היה
# מחזיר 0 התאמות והשער היה **נכבה בשקט**: בלי הודעה, בלי קוד-שגיאה,
# בדיוק הכשל שה-hook נולד למנוע. הביטוי כאן אינו תלוי-רישיות ותומך
# גם במבנה השטוח הישן וגם בחדש; ה-TASK-ID נגזר מהסגמנט האחרון לפני
# INSTRUCTIONS.md, כי plans/ נשאר שטוח.
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

# קובץ-משימה: tasks/<ID>/INSTRUCTIONS.md או tasks/<active|done>/<ID>/INSTRUCTIONS.md.
# מוגדר פעם אחת כדי ששורת-הזיהוי ושורת-גזירת-ה-ID לא יסטו זו מזו.
TASK_FILE_RE='^tasks/\(active/\|done/\)\?[^/]\{1,\}/INSTRUCTIONS\.md$'

touches_src=$(printf '%s\n' "$staged" | grep -c '^src/')
touches_task=$(printf '%s\n' "$staged" | grep -c "$TASK_FILE_RE")

# לא קוד + מסמך-משימה יחד → לא סגירת-משימה. עובר.
if [ "$touches_src" -eq 0 ] || [ "$touches_task" -eq 0 ]; then
  exit 0
fi

# יש תוכנית ביצוע למשימה? (`plans/<TASK-ID>.md`)
#
# הכלל "תוכנית לפני ביצוע" היה קיים בצ'ק-ליסט כשורה מעורפלת ונשמט
# בשתי משימות הפוניקה (2026-08-10). מזהיר, לא חוסם: יש משימות שבאמת
# לא דורשות תוכנית (תיקון באג, הוספת תוכן), וחסימה כאן הייתה מייצרת
# תוכניות-פורמליות חסרות ערך רק כדי לעבור את השער.
# גזירת ה-TASK-ID: הסגמנט האחרון לפני INSTRUCTIONS.md. קילוף-פרפיקס
# (`s|^tasks/||`) היה מחזיר "active/BL-018" ושולח את הבדיקה למטה אל
# plans/active/BL-018.md — נתיב שלא קיים לעולם.
task_ids=$(printf '%s\n' "$staged" | grep "$TASK_FILE_RE" | sed 's|/INSTRUCTIONS\.md$||; s|.*/||')
for tid in $task_ids; do
  if [ ! -f "plans/$tid.md" ]; then
    echo "📋 שים לב: אין \`plans/$tid.md\`." >&2
    echo "   נדרשת תוכנית אם המשימה יוצרת מיומנות/מסך/מודול חדש," >&2
    echo "   נוגעת ב-3+ קבצים תחת src/, או משנה חוזה קיים." >&2
    echo "   לא נדרשת לתיקון באג או הוספת תוכן. (TASK-CHECKLIST §תכנון)" >&2
  fi
done

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
