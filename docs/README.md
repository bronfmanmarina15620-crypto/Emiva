# docs/

חומר עזר יציב. לא כללים (ראי `.claude/rules/`), לא briefs של
משימות (ראי `tasks/`), לא תוכניות ביצוע (ראי `plans/`).

כל קובץ כאן הוא **מייעץ**. אם תוכן צריך להיות נאכף, הפכי אותו לכלל
תחת `.claude/rules/` או `CLAUDE.md`.

## מבנה

- `design/` — מחקר UI/UX, מערכות עיצוב, הפניות נגישות
- `curriculum/` — תמציות של `MyLevel.docx` (שם legacy, לפני השינוי) ומקורות קשורים
- `pedagogy/` — Model A, Singapore CPA, Science of Reading וכו'
- `adr/` — Architecture Decision Records (החלטה אחת לקובץ)

## איך להשתמש

- משימות מקושרות למסמכים דרך נתיבים יחסיים (לא copy-paste).
- מסמכים מתוארכים בכותרת דמוית-frontmatter; כשמסמך מוחלף,
  סמני אותו `status: deprecated` וקשרי לחליף.
- שמרי על מסמכים ברי-סריקה: headers, טבלאות, נקודות. בלי קירות של פרוזה.
