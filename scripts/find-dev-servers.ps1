# BL-002 — מאתר תהליכי שרת-פיתוח חיים ומחזיר את ה-PID שלהם, אחד בשורה.
#
# למה קובץ נפרד ולא מחרוזת בתוך `dev-restart.mjs`:
# שאילתת PowerShell שעוברת דרך spawnSync ודרך Bash נשברת בשקט —
# ה-`$_` מתפרש על ידי המעטפת לפני ש-PowerShell רואה אותו, והתוצאה
# הייתה "לא נמצא שרת חי" בזמן שחמישה שרתים רצו (2026-08-10).
# קובץ `.ps1` נקרא כמו שהוא, בלי שכבת בריחה באמצע.

$ErrorActionPreference = 'SilentlyContinue'

# שלושה דפוסים — `next dev` מייצר שלושה תהליכים נפרדים:
#   · npx-cli  — ...\npx-cli.js next dev
#   · המפעיל   — ...\next\dist\bin\next dev
#   · השרת     — ...\next\dist\server\lib\start-server.js
# בלי השלישי נשאר שרת יתום שממשיך להחזיק את הפורט ולכתוב ל-.next.
#
# `-like` עם תווים כלליים ולא regex: נתיבי Windows מלאים בלוכסנים
# הפוכים, וכל ניסיון לברוח מהם ב-regex נשבר בשקט.
#
# הסינון נשען על שורת-הפקודה בלבד ולא על שם התהליך: המפעיל רץ
# לפעמים עם שורה שמתחילה ב-`"node"` בלבד ולא בנתיב מלא.

@(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and (
    ($_.CommandLine -like '*next*dist*server*lib*start-server*') -or
    ($_.CommandLine -like '*next*dist*bin*next*dev*') -or
    ($_.CommandLine -like '*npx-cli.js*next*dev*')
  )
}) | ForEach-Object { $_.ProcessId }
