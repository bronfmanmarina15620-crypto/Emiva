# UI חינוכי לילדים — הפניית מחקר

- **סטטוס:** פעיל
- **נוצר:** 2026-04-19
- **Owner:** Marina
- **טווח:** גילאי 7–9, אפליקציות למידה, עברית RTL כראשי
- **בשימוש:** משימות רדיזיין UI עתידיות (לדוגמה `UI-NEO-MONTESSORI-001`)

זיקוק של best practice עכשווי ב-UI חינוכי לילדים.
הפניה ברת-ציטוט. לא כלל — בחירות עדיין שייכות למעצב.

---

## 1. מי נחשב "best in class"

אפליקציות שזוכות בפרסי עיצוב חוזרים (Apple Design Awards, D&AD, Webby,
Red Dot, Communication Arts):

| אפליקציה | חוזק | טווח גיל |
|---|---|---|
| Khan Academy Kids (Duck Duck Moose) | חמים, מגובה-מחקר, מונע-דמות | 4–8 |
| Sago Mini / Toca Boca | איור שובבי, תנועה, זוכי ADA | 3–8 |
| Lingokids | סקנדינבי-נקי, לימוד שפה מלוטש | 3–9 |
| Synthesis (לשעבר בית ספר SpaceX) | פרמיום, אסתטיקה בוגרת לילדים גדולים | 8–14 |
| Prisma | מינימליזם רגוע, פלטפורמת K-12 | 6–14 |
| Homer Learning | ספרותי חמים, ממוקד-קריאה | 2–8 |
| Osmo | פיזי-דיגיטלי, שובבי מרוסן | 5–12 |
| Duolingo | מונע-מסקוט, רגעי חגיגה, streaks | 7–מבוגר |

מוסדות מחקר על UX לילדים:
- **Harvard GSE** — מחקר EdTech, עיצוב מותאם-גיל
- **Stanford d.school** — חשיבת עיצוב k-12
- **MIT Media Lab** — ממשק Scratch (עיצוב קונסטרוקציוניסטי)
- **Sesame Workshop Research** — 50+ שנות eye-tracking על ילדים
- **Cooper Hewitt / RISD** — פרסי עיצוב למוצרים חינוכיים

---

## 2. שמונה עקרונות שחוזרים אצל המובילים

1. **רגוע על פני מגרה.** טרנד פוסט-2023: הרחק מצבעי primary
   רוויים, לעבר **Neo-Montessori דיגיטלי** — פסטלים, טוני אדמה,
   whitespace. רדיזיין Khan Kids + Prisma מדגימים.
2. **מעוגל בכל.** פינות, אייקונים, כפתורים, טיפוגרפיה. מפחית
   לחץ נתפס (Sesame eye-tracking, גילאי 6–9).
3. **קידוד כפול.** כל מושג: טקסט + איור + צליל אופציונלי
   (Mayer, *Multimedia Learning* research).
4. **התקדמות פיגורטיבית, לא נומרית.** ילדים 7–9 לא מפרשים "80%"
   רגשית. הם מפרשים צנצנת מתמלאת, הר מטפסים, צמח
   גדל. התקדמות כמטאפורה מנצחת אחוזים גולמיים.
5. **דמות / מסקוט ריאקטיביים.** יצור אחד שמגיב. בונה
   קשר רגשי. Duo (Duolingo), Kodie (Khan Kids).
6. **רגעי חגיגה — במשורה.** אפקטי confetti / bounce / חלקיקים
   רק באבני דרך משמעותיות. שימוש יתר = פיחות.
7. **Tap targets גדולים (≥ 60px).** שליטה מוטורית עדינה של ילדים
   מתפתחת. ברירות מחדל של Apple HIG (44px) מכוילות למבוגרים.
8. **טיפוגרפיה: מעוגלת, ידידותית, מותאמת-מסך.** אף פעם לא Arial /
   Times / condensed. ראי §4 לבחירות ספציפיות לעברית.

---

## 3. טרנד נוכחי (2024–2026): Neo-Montessori דיגיטלי

אסתטיקה מתכנסת באפליקציות חינוך פרמיום:

- **פלטה:** רקעי קרם חמים, טוני אדמה מרוסנים כאקצנטים, ירוקי
  sage, terracotta, חרדל. ללא צבעי primary RGB רוויים טהורים.
- **איור:** תחושת צייר-ביד, לא flat vector. רמזים של קו לא
  מושלם, טקסטורות טבעיות (נייר, עץ).
- **תנועה:** Lottie / Framer Motion — רכה, מבוססת-פיזיקה, לעולם לא
  מיידית. Easing חשוב יותר ממהירות.
- **Duotones** מחליפים gradients. פחות rainbow, יותר ריסון.
- **עיצוב אודיו עולה** — עיצוב צליל מטופל כ-first-class, לא
  קישוט.

דחייה של:
- היפר-גירוי (dark patterns, חרדת streak, קשב בסגנון פרסומת)
- גיימיפיקציה בסגנון "candy-crush" כלולאה הראשית
- מינימליזם קליני-מבוגרי (לבן טהור, פינות חדות, system fonts)

---

## 4. טיפוגרפיה לעברית + דו-לשונית

עברית-ראשית, עם fallback לטיני:

| פונט | אופי | שימוש |
|---|---|---|
| **Heebo** | נקי, נייטיב ל-Google-fonts, משקלים רחבים | כותרות, UI |
| **Rubik** | מעוגל ידידותי, פופולרי מאוד ב-UI ישראלי | גוף, UI |
| **Assistant** | מותאם-מסך, חמים | גוף, long-form |
| **Ploni** | sans ישראלי מודרני, תחושת פרמיום | display, כותרות |
| **Frank Ruhl Libre** | Serif, מכובד | שימוש display נדיר בלבד |

צימודים לטיניים (אותה משפחה או תואמת):
- Heebo מצטמד עם **Nunito** או **Nunito Sans**
- Rubik מצטמד באופן טבעי (ל-Rubik יש גם לטינית)
- הימנעי מ-**Arial / Helvetica** ללמידת ילדים — ניטרלי מדי,
  נקרא כ-"טופס"

מידות לגילאי 7–9:
- גוף: מינימום 18–20px
- מספרי display (בעיות מתמטיקה): 56–72px
- Tap targets: ≥ 60×60px

---

## 5. פלטה מומלצת ל-Emiva

Neo-Montessori לבנות 7 + 9, עברית RTL, ממוקד-מתמטיקה:

```
--bg:         #FAF6EE   /* warm cream */
--surface:    #FFFFFF   /* cards, soft shadow */
--text:       #2B2735   /* warm dark, never pure black */
--text-muted: #6B6578   /* secondary */
--primary:    #E87A5D   /* terracotta — call to action */
--success:    #7BA881   /* sage muted — correct, progress */
--accent:     #F5C26B   /* mustard — highlights, milestones */
--indigo:     #6B8ACE   /* reveal/learning moments */
--line:       #E8E2D4   /* dividers, borders */
```

אין צבעים רוויים טהורים. אין שחור קשה. הכל ניתן לתרגום ל-Tailwind.

---

## 6. ניתוח פערים — מסך סיכום של Emiva (נכון ל-2026-04-19)

| רכיב | נוכחי | יעד Neo-Montessori |
|---|---|---|
| רקע | לבן טהור (`#fafaf7` קרוב) | קרם חמים `#FAF6EE` |
| מצב הצלחה | טקסט "80% +10%" | פיגורטיבי + נומרי (צנצנת/צמח מתמלא) |
| פונט כותרת | system-ui | Heebo 800 display |
| פונט גוף | system-ui | Rubik 400/600 |
| כפתור primary | שטוח `bg-blue-600` | Terracotta עם צל רך + bounce עדין |
| אבן דרך | ללא | Confetti / burst חלקיקים ב-80% הראשון |
| מסקוט | ללא | דמות אחת מגיבה לתוצאה |
| שפת צורה | מרובע-ישר rounded-xl | rounded-2xl/3xl, רדיוסים גדולים יותר |

---

## 7. עדיפות מימוש — 3 מהלכים ל-80% מהאפקט

1. **החלפת פלטה + טיפוגרפיה** — שינוי `globals.css` + הוספת `@fontsource/heebo` + `@fontsource/rubik`. שינוי שם של טוקני theme של Tailwind. ~שעה, ההשפעה החזותית הגבוהה ביותר.
2. **התקדמות פיגורטיבית** — רכיב SVG inline (צנצנת מתמלאת בנוזל sage / צמח גדל). מחליף את רכיב "מספר ה-%". שימוש חוזר בנושאים עתידיים. ~2–3 שעות.
3. **רגע חגיגה** — `canvas-confetti` (תלות npm זעירה, ~6KB) מופעל בחציית סף שליטה. חד-פעמי לכל אבן דרך. ~30 דק.

כל השאר (מסקוט, עיצוב צליל, ספריית תנועה) הוא שכבה 2.

---

## 8. הערות נגישות — must-haves לילדים

- **WCAG AA contrast** מינימום, גם עם פלטת פסטל. מרוסן לא
  אומר ניגודיות נמוכה.
- **Focus states גלויים** — ילדים לעתים קרובות משתמשים במקלדת בדסקטופ,
  לפעמים בטעות. Focus rings חשובים.
- **תנועה מכבדת `prefers-reduced-motion`** — חלק מהילדים
  רגישים לאנימציה.
- **אין timers / countdowns** מתחת לגיל 7 בברירת מחדל (תגובת stress).
  אופציונלי ל-8–9.
- **אין פרסומות, אין חרדת streak, אין דפוסי "חיים שאבדו".** כל
  engagement מונע-הימנעות אסור.

---

## 9. מקורות (לקריאה נוספת)

**ספרים / long-form:**
- Donald Norman, *The Design of Everyday Things* — עקרונות אוניברסליים
- Jakob Nielsen / NN/g — *Children (Ages 3–12) on the Web*
- Gerd Bergman et al., *Designing for Kids*
- Debra Levin Gelman, *Design for Kids* (Rosenfeld Media)

**מחקר שוטף:**
- מאמרי Nielsen Norman Group (חפשי "children" ב-nngroup.com)
- Sesame Workshop Research (sesameworkshop.org/what-we-do/research)
- MIT Media Lab — מאמרי Scratch (scratch.mit.edu/research)

**גלריות עיצוב / השראה:**
- Apple Design Awards (קטגוריית חינוך ילדים)
- Communication Arts — Interactive Annual
- Awwwards — קטגוריית Kids

---

*זהו מסמך חי. עדכני כשמחזור פרסים חדש או רדיזיין משמעותי
באפליקציה מוזכרת מצביעים על שינוי טרנד. העבירי ל-deprecated אם
הוחלף על ידי הפניה חדשה יותר.*
