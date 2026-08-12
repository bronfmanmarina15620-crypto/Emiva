#!/usr/bin/env node
/**
 * שופט תוכן — בקרת איכות אוטומטית למאגרי שפה.
 *
 * מדווח בלבד. לא עורך קבצים, לא חוסם. הפעלה: `npm run judge:content`.
 *
 * למה זה קיים: תוכן המאגרים נכתב על ידי מודל, והבקרה היחידה עליו היא
 * קריאה אנושית. באג כמו "שתי תשובות נכונות באותה שאלה" מעניש ילדה
 * שענתה נכון. הבדיקות כאן תופסות רק כשלים שאינם תלויים בשיקול דעת —
 * יש להם נכון ולא נכון. שאלות של התאמה לגיל נשארות לבקרה אנושית.
 *
 * דירוג קושי (D1-D5) *לא* נבדק כאן במכוון: לפי MyLevel.docx §3 ההתאמה
 * נקבעת מאחוז ההצלחה בפועל (MASTERY_TARGET=0.8), ו-`targetDifficulty`
 * גוזר רמה מהביצועים. תגית הקושי היא ניחוש-פתיחה, לא אמת שצריך לאכוף.
 *
 * ערבית: המבנה מוכן (`lang` על כל מאגר), אבל אין מאגר ערבית ואין
 * בדיקות ייעודיות לערבית. הן דורשות בקרה של דוברת מקצועית —
 * ראי tasks/BACKLOG.md.
 */
import fs from "node:fs";
import path from "node:path";

/** מאגרים שנבדקים. `lang` קובע אילו בדיקות ייחודיות לשפה רצות. */
const BANKS = [
  {
    file: "src/content/hebrew/comprehension-evelyn.json",
    kind: "comprehension",
    lang: "he",
  },
  {
    file: "src/content/hebrew/comprehension-emilia.json",
    kind: "comprehension",
    lang: "he",
  },
  {
    file: "src/content/english/vocab-evelyn.json",
    kind: "vocab",
    lang: "en",
  },
  {
    file: "src/content/english/vocab-emilia.json",
    kind: "vocab",
    lang: "en",
  },
];

/**
 * מילים אסורות לפי CLAUDE.md §טון — fixed-mindset. נבדק על טקסט
 * שהילדה רואה (הסברים, שאלות), לא על מזהי קוד.
 */
const FIXED_MINDSET = [
  "לא נכון",
  "טעית",
  "שגוי",
  "פספסת",
  "אחרי התלבטות",
  "סוף סוף",
];

/**
 * מודפס בסוף כל ריצה. "0 ממצאים" בלי המשפט הזה קל לקרוא כ"התוכן תקין",
 * וזו בדיוק האמונה המסוכנת שהבודק הזה עלול לייצר.
 */
const SCOPE_NOTE = `
מה הבדיקה הזו *לא* תופסת (דורש עין אנושית):
  · מסיח שגם הוא נכון — "idea" עם רעיון ומחשבה כשתי אפשרויות
  · תרגום שגוי — "cat" שהתשובה שלו "כלב"
  · הסבר שסותר את התשובה הנכונה
  · האם הטקסט מתאים לגיל ולילדה
הבדיקה מוודאת שהמבנה שלם, לא שהתוכן נכון.`;

// אוסף הממצאים של הריצה הנוכחית. ניתן לאיפוס דרך `judgeItems` כדי
// שהטסט יריץ בדיקות על מאגר-בזק ויקרא את התוצאה בלי לגעת בקבצים.
let findings = [];

function report(severity, bank, id, rule, detail) {
  findings.push({ severity, bank, id, rule, detail });
}

/**
 * נקודת-כניסה טהורה לבדיקה: מריץ את כל הבדיקות על מערך פריטים נתון
 * ומחזיר את הממצאים. משמש את הטסט (`judge-content.test.ts`) כדי להזריק
 * באגים ולוודא שהם נתפסים — ההוכחה שאחרת נעשית ידנית ונמחקת.
 */
export function judgeItems(items, cfg, bankName = "test-bank") {
  findings = [];
  try {
    checkBankLevel(bankName, items, cfg);
  } catch (err) {
    report("error", bankName, "—", "checker-crash", `בדיקת המאגר קרסה: ${err.message}`);
  }
  for (const item of items) {
    try {
      if (cfg.kind === "comprehension") checkComprehension(bankName, item);
      else checkVocab(bankName, item);
    } catch (err) {
      report("error", bankName, item?.id ?? "—", "checker-crash",
        `הבדיקה קרסה על הפריט: ${err.message}`);
    }
  }
  return findings;
}

/**
 * מנרמל מחרוזת להשוואה: רווחים כפולים, סימני פיסוק בשוליים, ורישיות
 * (משמעותית לאנגלית בלבד — לעברית אין רישיות). ניקוד *אינו* מוסר;
 * המאגרים אינם מנוקדים.
 */
function norm(s) {
  return String(s)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[.,!?:;"'()]+|[.,!?:;"'()]+$/g, "")
    .toLowerCase();
}

/** ערך טקסטואלי תקין — לא null/undefined/מספר/אובייקט. */
function isText(v) {
  return typeof v === "string";
}

/**
 * בדיקות שחלות על כל שאלה מרובת-ברירה, בכל שפה ובכל סוג מאגר.
 * אלה הכשלים שהופכים פריט ל"בלתי-פתיר נכון".
 */
function checkChoiceBlock(bank, id, label, correct, options) {
  if (!Array.isArray(options)) {
    report("error", bank, id, "bad-options", `${label}: options אינו מערך`);
    return;
  }
  // ערך שאינו מחרוזת (null, מספר) היה עובר בשקט דרך norm() כ-"null".
  options.forEach((o, i) => {
    if (!isText(o)) {
      report("error", bank, id, "non-text-option",
        `${label}: אפשרות ${i + 1} אינה טקסט (${JSON.stringify(o)})`);
    }
  });
  if (!isText(correct)) {
    report("error", bank, id, "non-text-correct",
      `${label}: התשובה הנכונה אינה טקסט (${JSON.stringify(correct)})`);
    return;
  }

  const normCorrect = norm(correct);
  const normOptions = options.map(norm);

  // התשובה הנכונה חייבת להופיע באפשרויות — אחרת אין דרך לענות נכון.
  if (!normOptions.includes(normCorrect)) {
    report("error", bank, id, "correct-not-in-options",
      `${label}: התשובה "${correct}" לא נמצאת ברשימת האפשרויות`);
  }

  // אפשרות כפולה: מצמצמת בפועל את מספר הבחירות, ואם היא הנכונה —
  // יש שתי תשובות נכונות והילדה נענשת על בחירה נכונה.
  const seen = new Map();
  for (let i = 0; i < normOptions.length; i++) {
    const o = normOptions[i];
    if (seen.has(o)) {
      const severity = o === normCorrect ? "error" : "warn";
      report(severity, bank, id, "duplicate-option",
        `${label}: האפשרות "${options[i]}" מופיעה פעמיים` +
        (o === normCorrect ? " — וזו התשובה הנכונה (שתי תשובות נכונות)" : ""));
    }
    seen.set(o, i);
  }

  // אפשרות ריקה — פריט שבור.
  for (let i = 0; i < options.length; i++) {
    if (norm(options[i]) === "") {
      report("error", bank, id, "empty-option", `${label}: אפשרות ${i + 1} ריקה`);
    }
  }

  if (options.length !== 4) {
    report("warn", bank, id, "option-count",
      `${label}: ${options.length} אפשרויות במקום 4`);
  }
}

/**
 * בדיקות ייחודיות לקטעי הבנת הנקרא.
 *
 * כיול 2026-07-21 — כלל שנוסה ונדחה: "אפשר לענות בלי לקרוא את הקטע".
 * נוסה פעמיים, בשתי גרסאות — חפיפת מילים בין השאלה לקטע (34 ממצאים),
 * ואז בין האפשרויות לקטע (31 ממצאים). בשתיהן כל דגימה שנבדקה ידנית
 * הייתה שאלה *תקינה*: "מה המסר של הסיפור?" (הסקה), "מה הפירוש של
 * 'הקלה'?" (אוצר מילים בהקשר), "מתי הם מטיילים?" (תשובה "בבוקר" מול
 * קטע שכתוב בו "כל בוקר" — נטייה שונה, אותה מילה).
 *
 * הכשל אינו בסף אלא בהנחה: חפיפה מילולית אינה מודדת הישענות על הקטע.
 * שאלות הסקה ואוצר-מילים — בדיוק הדרגות הגבוהות שהמאגר בנוי סביבן —
 * לעולם אינן מצטטות ממנו. הכלל היה מעניש את התוכן הטוב ביותר.
 *
 * לזהות "אפשר לענות בלי לקרוא" באמת נדרשת הבנת משמעות, לא התאמת
 * מחרוזות. זה נשאר לבקרה אנושית עד שיהיה מנגנון שיודע לעשות זאת.
 */
function checkComprehension(bank, item) {
  // כבר דווח ב-checkBankLevel; כאן רק נמנעים מקריסה.
  if (!item || typeof item !== "object") return;

  const id = item.id ?? "(חסר id)";

  if (!isText(item.text) || norm(item.text) === "") {
    report("error", bank, id, "empty-text", "אין טקסט לקטע");
    return;
  }
  if (!Array.isArray(item.questions) || item.questions.length !== 2) {
    report("error", bank, id, "question-count",
      `${item.questions?.length ?? 0} שאלות במקום 2`);
    return;
  }

  item.questions.forEach((q, qi) => {
    const label = `שאלה ${qi + 1}`;

    if (q === null || typeof q !== "object") {
      report("error", bank, id, "bad-question", `${label}: אינה אובייקט`);
      return;
    }
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) {
      report("error", bank, id, "bad-correct-index",
        `${label}: correctIndex לא תקין (${q.correctIndex})`);
      return;
    }
    const options = q.options ?? [];
    const correct = options[q.correctIndex];
    if (correct === undefined) {
      report("error", bank, id, "correct-index-out-of-range",
        `${label}: correctIndex=${q.correctIndex} אבל יש ${options.length} אפשרויות`);
      return;
    }

    checkChoiceBlock(bank, id, label, correct, options);

    // מנומק ב-CLAUDE.md §כלל UX: חשיפה תמיד מלווה בהסבר מבוסס-שיטה.
    if (!q.explanation || norm(q.explanation) === "") {
      report("error", bank, id, "missing-explanation", `${label}: אין הסבר`);
    }

    // אין כאן בדיקת "אפשר לענות בלי לקרוא". נוסתה ונדחתה — ראי הערת
    // הכיול מעל `checkComprehension`.

    // נסרק על כל טקסט שהילדה רואה, לא רק על ההסבר. בטקסט סיפורי ביטוי
    // כזה יכול להיות לגיטימי ("היא הבינה שחשבה לא נכון") — לכן warn
    // בטקסט ו-error בהסבר, שהוא פידבק ישיר אליה.
    const inQuestion = [q.question, ...(Array.isArray(q.options) ? q.options : [])];
    for (const phrase of FIXED_MINDSET) {
      if (isText(q.explanation) && q.explanation.includes(phrase)) {
        report("error", bank, id, "fixed-mindset",
          `${label}: ההסבר מכיל ביטוי אסור "${phrase}"`);
      }
      for (const field of inQuestion) {
        if (isText(field) && field.includes(phrase)) {
          report("warn", bank, id, "fixed-mindset-text",
            `${label}: הביטוי "${phrase}" מופיע בשאלה או באפשרויות`);
        }
      }
    }
  });

  for (const phrase of FIXED_MINDSET) {
    if (isText(item.text) && item.text.includes(phrase)) {
      report("warn", bank, id, "fixed-mindset-text",
        `הביטוי "${phrase}" מופיע בגוף הקטע — לבדוק אם זה נרטיב או פנייה לילדה`);
    }
  }
}

/** בדיקות ייחודיות למאגר אוצר מילים. */
function checkVocab(bank, item) {
  // כבר דווח ב-checkBankLevel; כאן רק נמנעים מקריסה.
  if (!item || typeof item !== "object") return;

  const id = item.id ?? "(חסר id)";
  const answer = item.answer && typeof item.answer === "object" ? item.answer : {};
  const options = answer.options ?? [];

  if (answer.kind !== "choice") {
    report("error", bank, id, "bad-answer-kind", `answer.kind=${answer.kind}`);
    return;
  }
  checkChoiceBlock(bank, id, "פריט", answer.correct, options);

  if (!item.prompt || norm(item.prompt) === "") {
    report("error", bank, id, "empty-prompt", "אין שאלה לפריט");
  }

  // CORE-ENGLISH-VOCAB-EXPLAIN-001 — אותה אכיפה שכבר קיימת ב-checkComp.
  // הפער הזה הוא בדיוק מה שאיפשר ל-200 פריטים לחיות בלי הסבר: הבודק
  // בדק מבנה, לא לימוד. כלל הפדגוגיה: חשיפה תמיד מלווה בשיטה.
  if (!item.explanation || norm(item.explanation) === "") {
    report("error", bank, id, "missing-explanation", "אין הסבר לפריט");
  }

  for (const phrase of FIXED_MINDSET) {
    if (isText(item.explanation) && item.explanation.includes(phrase)) {
      report("error", bank, id, "fixed-mindset",
        `ההסבר מכיל ביטוי אסור "${phrase}"`);
    }
  }
}

/** בדיקות ברמת המאגר כולו — כפילויות שלא נראות בפריט בודד. */
function checkBankLevel(bank, items, cfg) {
  const byId = new Map();
  for (const item of items) {
    if (item === null || typeof item !== "object") {
      report("error", bank, "—", "bad-item", `פריט שאינו אובייקט: ${JSON.stringify(item)}`);
      continue;
    }
    const id = item.id;
    if (!id) {
      report("error", bank, "(חסר id)", "missing-id", "פריט בלי מזהה");
      continue;
    }
    if (byId.has(id)) {
      report("error", bank, id, "duplicate-id", "מזהה מופיע יותר מפעם אחת");
    }
    byId.set(id, item);
  }

  // הטיית-מיקום: התשובה הנכונה מרוכזת במקום קבוע. נתפס 2026-08-06
  // באנגלית (99/100 ראשונות) וב-2026-08-11 בעברית ובשברים (11 מ-18
  // במבחן החיצוני). הערבוב בזמן-ריצה מגן על הילדה, אבל מאגר מוטה
  // שובר כל ניתוח שמסתכל על הנתונים הגולמיים ומשאיר את המוצר
  // תלוי-לגמרי בשכבת-התצוגה. ראי tests/unit/option-order.test.ts.
  {
    const counts = {};
    let n = 0;
    const record = (idx) => {
      if (idx < 0) return;
      counts[idx] = (counts[idx] ?? 0) + 1;
      n++;
    };
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const a = item.answer;
      if (a?.options && a.correct !== undefined) {
        record(a.options.indexOf(a.correct));
      }
      for (const q of item.questions ?? []) {
        if (!q?.options) continue;
        if (typeof q.correctIndex === "number") record(q.correctIndex);
        else if (q.correct !== undefined) record(q.options.indexOf(q.correct));
      }
    }
    if (n >= 8) {
      const top = Math.max(...Object.values(counts));
      const slot = Object.keys(counts).find((k) => counts[k] === top);
      if (top / n >= 0.5) {
        report("error", bank, "—", "answer-position-bias",
          `${top} מתוך ${n} מהתשובות הנכונות במקום ${Number(slot) + 1} — ` +
          `ילדה שלוחצת שם קבוע "שולטת" בלי לדעת`);
      }
    }
  }

  if (cfg.kind === "vocab") {
    // אותה מילה פעמיים במאגר = הילדה מתרגלת פחות מילים ממה שנדמה.
    const byPrompt = new Map();
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const key = norm(item.prompt ?? "");
      if (key && byPrompt.has(key)) {
        report("warn", bank, item.id, "duplicate-word",
          `אותה שאלה כמו ${byPrompt.get(key)}: "${item.prompt}"`);
      }
      byPrompt.set(key, item.id);
    }
  }

  if (cfg.kind === "comprehension") {
    // טקסט כפול = הילדה קוראת קטע שכבר פתרה; זה שינון, לא הבנה.
    const byText = new Map();
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      // הושווה על הטקסט המלא: קיצוץ ל-120 תווים רק היה מייצר התנגשויות
      // שווא בין קטעים שנבדלים בהמשכם.
      const key = norm(item?.text ?? "");
      if (key && byText.has(key)) {
        report("error", bank, item.id, "duplicate-text",
          `הקטע זהה ל-${byText.get(key)}`);
      }
      byText.set(key, item.id);
    }

    // נושא חוזר — רך בכוונה. חזרה על נושא אינה באג, אבל ריכוז גבוה
    // מצמצם את המגוון שהמאגר אמור לתת.
    const byTopic = new Map();
    for (const item of items) {
      if (!item || typeof item !== "object" || !item.topic) continue;
      byTopic.set(item.topic, (byTopic.get(item.topic) ?? 0) + 1);
    }
    for (const [topic, count] of byTopic) {
      if (count >= 3) {
        report("warn", bank, "—", "topic-repetition",
          `הנושא "${topic}" חוזר ב-${count} קטעים`);
      }
    }
  }
}

/** מריץ את השופט על הקבצים האמיתיים ומדפיס דוח. CLI בלבד. */
function main() {
  findings = [];
  let scanned = 0;
  for (const cfg of BANKS) {
    const full = path.resolve(cfg.file);
    if (!fs.existsSync(full)) {
      report("error", cfg.file, "—", "missing-bank", "הקובץ לא נמצא");
      continue;
    }

    let items;
    try {
      items = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (err) {
      report("error", cfg.file, "—", "bad-json", `JSON שבור: ${err.message}`);
      continue;
    }
    if (!Array.isArray(items)) {
      report("error", cfg.file, "—", "bad-shape", "הקובץ אינו מערך");
      continue;
    }

    // judgeItems מאפס את findings — לכן צוברים לכל מאגר ומצרפים.
    const bankFindings = judgeItems(items, cfg, path.basename(cfg.file));
    fileFindings.push(...bankFindings);
    scanned += items.length;
  }

  const errors = fileFindings.filter((f) => f.severity === "error");
  const warns = fileFindings.filter((f) => f.severity === "warn");

  console.log(`פריטים שנסרקו: ${scanned}`);
  console.log(`שגיאות: ${errors.length} · לבדיקה: ${warns.length}\n`);

  if (fileFindings.length === 0) {
    console.log("לא נמצאו ממצאים.");
    console.log(SCOPE_NOTE);
    return 0;
  }

  for (const group of [errors, warns]) {
    if (group.length === 0) continue;
    const title = group === errors
      ? "🔴 שגיאות — כשל ברור, לא תלוי שיקול דעת"
      : "🟡 לבדיקה — סימן, לא הוכחה. דורש עין אנושית";
    console.log(`${title}\n`);
    for (const f of group) {
      console.log(`- [${f.rule}] ${f.bank} · ${f.id}`);
      console.log(`  ${f.detail}\n`);
    }
  }

  console.log(SCOPE_NOTE);

  // מדווח בלבד: מחזיר 0 גם כשיש ממצאים. חריג: קריסה של הבודק מחזירה
  // 1 — "0 ממצאים" חייב להיות ראיה לבדיקה שרצה, לא לבדיקה שמתה בשקט.
  return fileFindings.some((f) => f.rule === "checker-crash") ? 1 : 0;
}

// רץ רק בהפעלה ישירה (`node scripts/judge-content.mjs`), לא ב-import
// מהטסט. `fileFindings` מקומי כדי לא להתנגש עם איפוס `findings`.
const fileFindings = [];
const isDirectRun = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("judge-content.mjs");
if (isDirectRun) {
  process.exit(main());
}
