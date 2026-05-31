# INSTRUCTIONS.md — CORE-ENGLISH-001

## מטא-דאטה
- task_id: CORE-ENGLISH-001
- title: אנגלית — מסלול אוצר מילים לשתי הבנות (בלי phonics, בלי קריאה)
- owner: Marina
- priority: P2 (אחרי שמסלולי המתמטיקה והעברית יציבים)
- target_branch: main
- references:
  - **MyLevel.docx §3.3** — "אנגלית" — מסלול חסר במסמך המקור עד כדי
    "Anki 300-500 שכיחים + reading A1-A2". המסמך לא מפרט word lists.
  - **CLAUDE.md §כלל UX של תרגול** — phonics לא רלוונטי כאן (Marina:
    "שתיהן ביחד — אוצר מילים").
  - **`src/lib/srs.ts`** — מנגנון SRS קיים שמתאים לאוצר מילים.

## מטרה

מסלול אנגלית ראשון לשתי הבנות: **אוצר מילים בלבד**, בלי phonics
ובלי flow קריאה. שתיהן לומדות מילים חדשות בקצב שונה — אוולין (7)
מתחילה, אמיליה (9) ברמה גבוהה יותר.

## בטווח (סליס 1)

### החלטות PM שנקבעו ב-auto-mode 2026-05-31

| החלטה | ערך | נימוק |
|---|---|---|
| גישה | אוצר מילים בלבד, בלי phonics | תשובת Marina: "שתיהן ביחד — אוצר מילים". מתאים לשתי הגילאים בלי לזלזל באוולין ובלי לשעמם את אמיליה. |
| קצב | ~50 מילים חדשות לחודש לכל ילדה | מקובל ב-Anki לילדים בגיל הזה. ~12-15 מילים בשבוע = ~2-3 ליום, סביר. |
| מאגר ראשוני | 200 מילים לכל ילדה (4 חודשים של תוכן) | מספיק לאמת את הפורמט. הרחבה כשמתקרבים לסוף. |
| בידול בין בנות | שני banks שונים: `english-evelyn.json` ו-`english-emilia.json` | רמת מילים שונה. אוולין: A1 (cat, run, big). אמיליה: A2 (decide, between, success). |
| סוג פריט | **תרגום-בחירה**: אנגלית → 4 אפשרויות עברית (ובהפך) | רב-ברירה תואם את ה-UI הקיים (`FractionItem.choice`). פשוט, אבל אפקטיבי. |
| איזון כיוון | 50/50 EN→HE ו-HE→EN | רב-כיווני בונה רטריבל חזק יותר. |
| איות / הקלדה | לא בסליס הזה | מצריך אבולוציה של ה-input. ייתכן בסליס 2. |
| אודיו | לא | אין אודיו ב-Emiva. דחיה למוצר עתידי. |
| SRS | אותו `srs.ts` הקיים | המנגנון של 5 קופסאות מתאים לאוצר מילים מצוין. |
| Mastery target | **5 פעמים נכון ברצף = יציאה מהמיומנות-של-המילה** | אבל זה מילים בודדות, לא מיומנות. נשאיר את graduation ברמת הבנק (50 מילים נכון ברצף בשתי סשנים מרווחות). |
| מסך תרגול | אותו `/session` עם אריח חדש | תומך מ-`choice` answer. שינוי מינימלי. |
| מסלול: יחסי לעברית/מתמטיקה? | **בנפרד** — לא חוסם / לא נחסם ע"י skills אחרים | אנגלית = מסלול עצמאי, ההורה מחליטה מתי להתחיל. |
| מקור רשימות המילים | **רשימת תדירות פדגוגית** — Oxford 1000 / NGSL לאנגלית | מבוסס מחקר (Nation 2006). נבחר ידנית-curated. |
| תיוג קטגוריה | יש (`category`: animals/food/family/actions/feelings/...) | עוזר לבנייה תמטית של סשנים בעתיד. |

### תוכן

**`src/content/english/vocab-evelyn.json`** (חדש, תיקייה חדשה
`src/content/english/`) — 50 מילים לפתיחה (תוספת חודשית של 50):
- **D1** (10 מילים) — חפצים בסיסיים: cat, dog, book, car, ball, house,
  tree, water, sun, moon.
- **D2** (10) — פעלים בסיסיים: run, jump, eat, sleep, see, play, sing,
  read, write, walk.
- **D3** (10) — תכונות: big, small, hot, cold, red, blue, happy, sad,
  fast, slow.
- **D4** (10) — משפחה ומקומות: mother, father, sister, brother, school,
  park, kitchen, bedroom, friend, teacher.
- **D5** (10) — מספרים וזמן: one, two, three, day, night, today,
  morning, hour, time, week.

**`src/content/english/vocab-emilia.json`** (חדש) — 50 מילים:
- **D1** — שמות עצם מופשטים: idea, time, problem, answer, place,
  reason, group, world, year, family.
- **D2** — פעלים: understand, choose, follow, decide, succeed, build,
  learn, teach, change, create.
- **D3** — תכונות: difficult, important, interesting, possible, careful,
  honest, kind, brave, quiet, wise.
- **D4** — צירופי מילים: between, however, because, although, instead,
  during, often, suddenly, together, especially.
- **D5** — מילים אקדמיות: imagine, suggest, describe, compare,
  remember, prefer, recognize, mention, prepare, succeed.

לכל פריט:
```json
{
  "id": "eve-001",
  "skill": "english_vocab",
  "difficulty": 1,
  "type": "en_to_he" | "he_to_en",
  "category": "animals" | "actions" | "...",
  "prompt": "What does 'cat' mean?",
  "answer": { "kind": "choice", "correct": "חתול", "options": ["חתול","כלב","חסה","שולחן"] }
}
```

קונבנציית מזהים: `eve-NNN` (Evelyn vocab), `emi-NNN` (Emilia vocab).

### קוד

- **`src/lib/types.ts`:**
  - `Skill` += `"english_vocab"`.
  - טיפוס חדש `EnglishVocabItem`:
    ```ts
    export type EnglishVocabItem = {
      id: string;
      skill: "english_vocab";
      difficulty: Difficulty;
      type: "en_to_he" | "he_to_en";
      category: string;
      prompt: string;
      answer: { kind: "choice"; correct: string; options: string[] };
    };
    ```
  - `Item` union += `EnglishVocabItem`.
- **`src/lib/items.ts`:** `isItemCorrect` — branch חדש לטיפוס.
- **`src/app/session/page.tsx`:** `bankForSkill("english_vocab")`
  מבחין לפי גיל הפרופיל (כמו `hebrew_comprehension` ב-Emilia task).
- **`src/lib/profiles.ts`:** `allowedSkillsForAge(7-8)` += `"english_vocab"`;
  `allowedSkillsForAge(9-10)` += `"english_vocab"`. (משאירים אנגלית
  כסוף המסלול לשתי הבנות.)
- **`src/lib/parent-focus.ts`:** הוספת ל-`ALL_SKILLS`,
  `SKILL_SUBJECT["english_vocab"] = "english"` (תת-תחום חדש!), עדכון
  `Subject` type ב-`SUBJECT_HEBREW`.
- **`src/lib/parent-dashboard.ts`:** `SKILL_HEBREW["english_vocab"] = "אוצר מילים באנגלית"`.

### UI

- אותו מסך תרגול. רינדור הטיפוס: prompt באנגלית + 4 כפתורי אופציה
  בעברית (או הפוך).
- אם הקרי `type === "en_to_he"`: prompt באנגלית, options בעברית.
  אחרת: prompt בעברית, options באנגלית.
- כיוון טקסט: prompt באנגלית = LTR; כפתורים = RTL לעברית, LTR לאנגלית.

### טסטים

- **`tests/unit/english-vocab-bank.test.ts`** (חדש):
  - גודל ≥ 50 פריטים לכל בנק.
  - 5 דרגות, ≥ 10 פריטים בכל דרגה.
  - 50/50 EN→HE / HE→EN (±10%).
  - מזהים ייחודיים, prefix נכון לכל בת.
  - כל פריט: 4 אפשרויות, `correct` ב-`options`, `correctIndex` תקין.
  - אין מילה כפולה באותו בנק (אותה אנגלית פעמיים).
  - אין חפיפה מילים בין בנק eve ו-emi (D1 של אמיליה ≠ D1 של אוולין).
- **`tests/unit/items.test.ts`** הרחבה.
- **`tests/unit/profiles.test.ts`** הרחבה.
- **`tests/ui/parent-dashboard-page.test.tsx`**: שתי הבנות רואות
  "אוצר מילים באנגלית" כאריח חדש.

### מסמכים

- **`docs/parent-guide.md`** — סעיף חדש "מסלולים זמינים" שמתעד
  שיש 3 תחומים: מתמטיקה, עברית, אנגלית.

## מחוץ לטווח (סליסים עתידיים)

- **CORE-ENGLISH-002**: phonics לאוולין אם הסליס הראשון מצליח אבל
  היא לא מצליחה להמשיך לבד.
- **קריאה ראשונה**: Anki-style + פסקאות קצרות עם מילים שכבר נלמדו.
- **איות באנגלית**: input typing במקום בחירה.
- **אודיו**: הקראה לכל מילה. דורש קבצי mp3 או TTS.
- **מדידה חיצונית**: סליס 2 של מדידה.

## ולידציה נדרשת

- `npm run typecheck` נקי.
- `npm run lint` נקי.
- `npm test` ירוק. סף: **491 → ≥ 525 עוברות.**
- `npm run build` מצליח.

**ידני (פר ילדה):**
1. פרופיל → דשבורד → "אוצר מילים באנגלית" מופיע.
2. סשן → פריט EN→HE: "What does 'cat' mean?" + 4 אפשרויות בעברית.
3. בחירה נכונה → ✓ + מעבר. בחירה לא נכונה → "נסי שוב" + retry.
4. אחרי 3 ניסיונות שגויים → reveal: "התשובה: חתול" + אין הסבר CPA
   (זה אוצר מילים, אין הסבר אלגוריתמי).

## DoD

- [ ] `vocab-evelyn.json` עם 50 מילים.
- [ ] `vocab-emilia.json` עם 50 מילים.
- [ ] `Skill` + `EnglishVocabItem` בטיפוסים.
- [ ] חיווט מלא: items, session, profiles, parent-focus, parent-dashboard.
- [ ] טסטי יחידה + UI ירוקים.
- [ ] CHANGELOG + ROADMAP.

## סיכונים ומיטיגציות

| סיכון | מיטיגציה |
|---|---|
| בלי אודיו = ההגייה לא תיבנה | נדון בסליס 2. v1 = recognition בלבד. |
| הילדה תזכור את האפשרות הנכונה ולא את המילה | מנגנון SRS עם 5 קופסאות + רב-כיווני (EN→HE + HE→EN). |
| 50 מילים לחודש = ייגמר תוך 4 חודשים | תוספת מתוכננת לכל בת בכל חודש: 50 חדשות. |
| אמיליה תשתעמם מ-A1 ואוולין מ-A2 | מאגרים נפרדים לחלוטין. |
| ההורה תאלץ לבחור באיזה skill לעבוד | parent-focus כבר מטפל בזה. |

## Handoff

- **PM → Eng:** מאושר ב-auto-mode 2026-05-31.
- **המלצה:** לחלק לשני PRים — תשתית (types + UI + tests ריקים) ואחריו
  התוכן (50+50 מילים). תוכן מילים זקוק לבקרת איכות בעברית של Marina.
