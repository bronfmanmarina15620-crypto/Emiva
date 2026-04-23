# INSTRUCTIONS.md — UI-NEO-MONTESSORI-001

## מטא-דאטה של משימה
- task_id: UI-NEO-MONTESSORI-001
- title: עיצוב Neo-Montessori — פלטה, טיפוגרפיה, התקדמות פיגורטיבית, חגיגת אבן-דרך
- owner: Marina
- priority: P1
- target_branch: feat/ui-neo-montessori-001
- references:
  - [docs/design/children-ed-ui-research.md](../../docs/design/children-ed-ui-research.md) §5–7

## מטרה

להחליף את ה-UI הקליני הדיפולטי באסתטיקת Neo-Montessori לפי מסמך
המחקר: פלטה חמה, טיפוגרפיה עברית ידידותית, התקדמות פיגורטיבית
(צנצנת במקום % גולמי), חגיגה חד-פעמית ב-80% שליטה.

## בטווח
- Palette tokens ב-`globals.css` + `tailwind.config.ts` (cream, terracotta, sage, mustard, warm-dark, warm-indigo, warm-line).
- Heebo 400/600/800 + Rubik 400/600 דרך `next/font/google`.
- `src/components/MasteryJar.tsx` — SVG של צנצנת שמתמלאת בנוזל sage, תווית % למטה.
- תלות `canvas-confetti` + חגיגה חד-פעמית בחציית `MASTERY_TARGET`.
- הפעלת tokens על: `src/app/page.tsx`, `src/app/session/page.tsx`.
- כיבוד `prefers-reduced-motion` ל-confetti.

## מחוץ לטווח
- מסקוט / איור דמות.
- עיצוב סאונד.
- אנימציות Lottie / Framer Motion מעבר ל-confetti.
- עיצוב מחדש של מיקרו-layouts של retry/correct/reveal מעבר להחלפת צבע.
- טיפוגרפיה לספרות מתמטיות (טאסק נפרד אם נדרש).

## תוצרים
1. פלטה חדשה חיה על מסכי בית + סשן.
2. עברית מוצגת ב-Heebo (כותרות) + Rubik (גוף).
3. קומפוננטת `MasteryJar` בשימוש בדף הסיכום.
4. Confetti יורה בדיוק פעם אחת לכל חציה מ-< 80% ל-≥ 80%.
5. כל הטסטים הקיימים עדיין עוברים.
6. Typecheck + lint + build נקיים.

## ולידציה
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- ידני: הפעלת dev server, השלמת סשן עם ≥ 80% → confetti יורה. השלמת סשן שני (כבר ב-80%) → ללא confetti. החלפת "reduce motion" במערכת ההפעלה → ללא confetti בכל מקרה.
- ויזואלי: מסכי בית + סשן + סיכום מוצגים ב-cream/terracotta/sage, ללא `bg-blue-600` או לבן חד שנשאר.

## אילוצים
- ללא מסקוט לעת עתה (מחוץ לטווח — שמור משמעת).
- ללא תלויות runtime חדשות מעבר ל-`canvas-confetti` (קטנה, ~6KB).
- טסטים ב-`tests/unit/` שכבר ירוקים חייבים להישאר ירוקים.

## הגדרת DoD
- כל התוצרים נשלחו.
- ולידציה רצה ודווחה.
- לא נגרמה רגרסיה בפריטי backlog (backlog evals עדיין עוברים).
- אם כלל כלשהו דורש קידום ל-CLAUDE.md (לדוגמה "תמיד לכבד reduced-motion"), הציעי בנפרד.
