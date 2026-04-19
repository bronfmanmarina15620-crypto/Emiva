# FEEDBACK-LOG

Layer 4 — משוב אנושי. רישום תצפיות של ההורה ושל הבנות. זה הערוץ שבו
"משהו מרגיש לא בסדר" מומר לטריגר BACKLOG.

## איך לכתוב

שורה אחת לכל תצפית, פורמט:

```
YYYY-MM-DD | observer | subject | observation
```

- `observer`: `Marina` / `bat7` / `bat9`
- `subject`: `math` / `ui` / `tone` / `difficulty` / `engagement` / `other`
- `observation`: משפט אחד, נטוראלי. לא לנסות לפתור — רק לתאר.

## סריקה אוטומטית

`node scripts/scan-feedback.mjs` מזהה מילות-טריגר ("חוזר", "משעמם", "קשה",
"לא אוהבת", "שוב אותו דבר") ומציע רישומים ל-`tasks/BACKLOG.md`.

## קצב סקירה

לפחות **פעם בשבוע** — יום ראשון, 2 דקות. אחרי 10 סשנים — סריקה אוטומטית
חובה.

## תצפיות

```
2026-04-19 | Marina | tone | הטקסט "לא נכון. נסה שוב" מרגיש מתנשא לבת 7. החלפתי לטון growth-mindset.
2026-04-19 | Marina | ui | הפרופיל של Emilia (שנוצר בסבב QA הראשון) הראה "בקרוב" גם אחרי שנפתח skill fractions_intro. גורם שורש: allowedSkills נשמר ב-localStorage במועד היצירה ולא מעודכן. תוקן: loadProfiles מחשב מחדש לפי גיל בכל טעינה.
```
