---
scope:
  - src/lib/mastery.ts
  - src/lib/types.ts
  - src/lib/srs.ts
  - src/app/session/page.tsx
---

# סנכרון מסמכי Mastery

**כלל:** כל שינוי בלוגיקת mastery / SRS / attempt-credit בקבצים
המופיעים ב-`scope` דורש עדכון מקביל של [docs/parent-guide.md](../../docs/parent-guide.md).

**למה:** `parent-guide.md` הוא ההסבר שפונה להורה איך Emiva
מחליטה שילדה שלטה במשהו. הוא מציין קבועים ספציפיים
(`WINDOW_SIZE`, `MASTERY_TARGET`, `SRS_INTERVALS`) וחוק ספציפי
(קרדיט שליטה רק על ניסיון 1). אם הקוד משתנה והמסמך לא,
ההורה מאבדת את המודל המנטלי שלה — בדיוק דפוס הכישלון
שהניע את המסמך (ראי שיחה 2026-04-22).

**ספציפית, עדכני את המסמך אם את:**
- משנה `WINDOW_SIZE` או `MASTERY_TARGET` ב-`types.ts` → סעיף 2 + טבלה בסעיף 6.
- משנה `SRS_INTERVALS` → טבלה בסעיף 3.
- משנה את לוגיקת attempt-credit ב-`session/page.tsx` (הענף `attempts === 0`) → סעיף 1.
- מיישמת graduation של מיומנות (כרגע stub כסעיף 4 "מוצע") → כתבי מחדש את סעיף 4 ואת השורה בטבלת סעיף 6.

**איך ליישם:** עשי את עדכון המסמך באותו PR כמו שינוי הקוד.
אל תדחי ל-follow-up — עדכוני מסמך שנדחים לא קורים.
