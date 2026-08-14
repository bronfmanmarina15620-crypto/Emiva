import { describe, expect, it } from "vitest";
import {
  advanceLevel,
  nextDesiredContext,
  selectNextItem,
  type DesiredContext,
} from "@/lib/adaptive";
import { emptyMastery } from "@/lib/mastery";
import type { Difficulty, Item, MasteryState } from "@/lib/types";
import multBank from "@/content/math/multiplication.json";
import addSubBank from "@/content/math/add-sub-100.json";

/**
 * BL-018 — סשן של 15 פריטים לא מרגיש כמו פריט אחד חוזר.
 *
 * מקור: מישה (משתמש חיצוני, בן ~9) —
 * *"בתוך 15 השאלות הוא מחזיק משימות מאותו סוג, וזה קצת משעמם אם
 * זו לא הרמה הנכונה."*
 *
 * **"משעמם" הוא סימפטום, לא טעם.** ילדה שמקבלת 15 פריטים שנראים
 * אותו דבר מפסיקה להשקיע, והמערכת קוראת את הירידה כחוסר-שליטה —
 * כלומר הזיהום עובר לאות ההתאמה עצמו.
 *
 * **למה סשן שלם ולא קריאה בודדת:** מונוטוניות היא תכונה של
 * ה**רצף**, לא של הצעד. בדיקה שקוראת ל-`selectNextItem` פעם אחת
 * לעולם לא תראה אותה. לכן הבדיקה מריצה את אותו לולאה שמריץ
 * `session/page.tsx` — בחירה → ניסיון → `advanceLevel`.
 */

const SESSION_LENGTH = 15;

/**
 * הספים נקבעו **מהמדידה, לא מהאצבע** — 2,000 סשנים לכל מצב
 * (5 נקודות-פתיחה × הצלחה/כישלון × 200 זרעים):
 *
 * | מצב | רצף-הקשר מקסימלי | פריטי-כסף בסשן |
 * |---|---|---|
 * | יחס-הקשרים פעיל | **6** | 9 תמיד |
 * | יחס-הקשרים כבוי | **12** | 1–9 (ממוצע 5.1) |
 *
 * שני המספרים מתארים את אותה תקלה משתי זוויות. **פריטי-הכסף הוא
 * המדד החד יותר:** עם היחס הוא נעול על 9, בלעדיו הוא צונח עד 1 —
 * כלומר יש סשנים עם **פריט-כסף בודד מתוך 15**.
 *
 * **הערת-כנות על הסף 8:** מדגם ראשון של 6 זרעים הראה מקסימום 6 גם
 * בלי היחס, ולכן בדיקת-התיעוד למטה נכשלה בהתחלה. הסריקה הרחבה היא
 * שהראתה שהזנב מגיע ל-12 — כלומר המדגם היה קטן מדי, לא הממצא שגוי.
 * לכן בדיקת-התיעוד רצה על **200 זרעים**, לא על 6.
 *
 * רצף-הדרגה נמדד 7 בשני המצבים — כלומר הדרגה **אינה** הבעיה
 * (בניגוד להשערה המקורית ב-BACKLOG). הסף כאן הוא רשת-ביטחון
 * נגד רגרסיה עתידית, לא תיאור של תקלה קיימת.
 */
/**
 * **תיקון אחרי סקירת-קוד (2026-08-14) — הספים היו רופפים מכדי
 * להיכשל אי-פעם.** סבוטאז' מלא (ניטרול היחס) הפיל **בדיקה אחת
 * מתוך שש**; שתי הבדיקות שנקראות על שם התקלה נשארו ירוקות, כי
 * הסף 8 יושב מעל המקסימום הנמדד גם במצב השבור (6 עם היחס,
 * ו-`MIN_MONEY=5` השאיר פער של 4 פריטים לשחיקה שקטה).
 *
 * הספים כאן צמודים למדידה בפועל (6,000 סשנים לכל מצב: 5
 * נקודות-פתיחה × הצלחה/כישלון × 3 ערכי-`sessionCount` × 200
 * זרעים), עם שוליים של 1 בלבד:
 */
/**
 * **מה שהבדיקה הזאת באמת שווה — בכנות.**
 *
 * נמדד: 6 עם היחס, 12 בלעדיו. אבל הזנב הארוך נדיר (~2%), ועל
 * מדגם-הזרעים של השומר עצמו (90 סשנים) המקסימום **במצב השבור
 * הוא גם 6**. כלומר שום סף-רצף אינו יכול להבחין כאן בין תקין
 * לשבור, וסף 7 היה סתם מסתיר את זה.
 *
 * הסף 6 נבחר כדי שהבדיקה תישאר **הדוקה** (כל חריגה מעל הנמדד
 * נופלת), אבל **הגלאי האמיתי של התקלה הוא בדיקת-האיזון**
 * (`MIN_MONEY_WHEN_RATIO_ON`), והיא היחידה שנכשלת בסבוטאז'.
 * זה נכתב כאן במפורש כדי שאיש לא יסיק שיש כאן כיסוי כפול.
 */
const MAX_CONTEXT_RUN = 6;
/** נמדד 9 עם היחס, 10 בלעדיו — פער של 1 בלבד, ולכן הבדיקה הזאת
 *  היא **רשת-ביטחון נגד רגרסיה עתידית ולא גלאי-תקלה**. זה נאמר
 *  כאן במפורש כדי שאיש לא יסיק ממנה שהדרגה מכוסה. */
const MAX_LEVEL_RUN = 9;
/** נמדד: **תמיד בדיוק 9** כשהיחס פעיל, ו-1–9 בלעדיו. הסף הוא 9
 *  ולא 5 — כל ערך נמוך יותר מרשה ליחס להישחק בשקט. */
const MIN_MONEY_WHEN_RATIO_ON = 9;

type Ctx = "money" | "plain";

/** **עותק מדויק של `session/page.tsx:170`, כולל תנאי ה-`explanation`.**
 *  סקירת-קוד תפסה שהשמטתו זהה היום אך נשברת בשקט ברגע שיתווסף
 *  פריט-כסף בלי הסבר: הבדיקה הייתה סופרת אותו ככסף בעוד המוצר
 *  סופר אותו כרגיל, והשומר היה מודד מציאות אחרת מזו של הילדה. */
function isMoneyItem(item: Item): boolean {
  return (
    "context" in item &&
    item.context === "money" &&
    typeof (item as { explanation?: string }).explanation === "string"
  );
}

/** מריץ סשן שלם דרך הסלקטור האמיתי, במדויק כמו `session/page.tsx`:
 *  מונים לחלון של 5 שמתאפסים יחד (שורות 332–336 שם). */
function runSession(opts: {
  items: readonly Item[];
  startLevel: Difficulty;
  correct: boolean;
  seed: number;
  ratioOn: boolean;
  /** כמה סשנים כבר היו. `0` = פעם ראשונה אי-פעם; ערך גדול מייצג
   *  ילדה חוזרת, ואז ל-staleness יש משמעות בבחירה. בלי זה נבדק
   *  רק סשן-ראשון — ודווקא אמיליה החוזרת נשארה לא-מכוסה. */
  sessionCount?: number;
}): { levels: Difficulty[]; contexts: Ctx[] } {
  let state: MasteryState = {
    ...emptyMastery("multiplication"),
    level: opts.startLevel,
    levelMeasured: true,
    sessionCount: opts.sessionCount ?? 0,
  };
  const used = new Set<string>();
  const levels: Difficulty[] = [];
  const contexts: Ctx[] = [];
  let money = 0;
  let plain = 0;

  // מחולל דטרמיניסטי: בדיקה מהבהבת מאמנת להתעלמות (הלקח מ-BL-002).
  let seed = opts.seed;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let n = 0; n < SESSION_LENGTH; n++) {
    const desired: DesiredContext | undefined = opts.ratioOn
      ? nextDesiredContext(money, plain)
      : undefined;
    // `startingLevel` מועבר כמו בפרודקשן. בלעדיו תרחיש BL-017
    // ("מחפשים אתגר" → פתיחה בתקרה) לא נבדק כלל, למרות שהוא
    // מוזכר בהערה למטה — נתפס בסקירת-קוד.
    const item = selectNextItem(
      state,
      opts.items,
      used,
      rand,
      desired,
      false,
      0,
      opts.startLevel,
    );
    if (!item) break;
    used.add(item.id);
    levels.push(item.difficulty);

    if (isMoneyItem(item)) {
      contexts.push("money");
      money++;
    } else {
      contexts.push("plain");
      plain++;
    }
    if (money + plain >= 5) {
      money = 0;
      plain = 0;
    }

    state = {
      ...state,
      attempts: [
        ...state.attempts,
        { itemId: item.id, correct: opts.correct, attemptNumber: 1, at: n },
      ],
      itemLastSeen: { ...state.itemLastSeen, [item.id]: state.sessionCount },
    } as MasteryState;
    state = advanceLevel(state, opts.startLevel);
  }

  return { levels, contexts };
}

function longestRun<T>(xs: readonly T[]): number {
  let best = 0;
  let cur = 0;
  let prev: T | undefined;
  for (const x of xs) {
    cur = x === prev ? cur + 1 : 1;
    prev = x;
    if (cur > best) best = cur;
  }
  return best;
}

const BANKS: ReadonlyArray<[string, readonly Item[]]> = [
  ["multiplication", multBank as unknown as readonly Item[]],
  ["add_sub_100", addSubBank as unknown as readonly Item[]],
];

/** נקודות-הפתיחה כוללות את שני הקצוות **בכוונה**: הקצה העליון הוא
 *  מה שילדה עם *"מחפשים אתגר"* (BL-017) מקבלת, והתחתון הוא מי
 *  שמתקשה. אלה המצבים שבהם יש הכי פחות לאן לזוז. */
const SCENARIOS: ReadonlyArray<{ start: Difficulty; correct: boolean }> = [
  { start: 1, correct: true },
  { start: 1, correct: false },
  { start: 3, correct: true },
  { start: 5, correct: true },
  { start: 5, correct: false },
];

const SEEDS = [1, 7, 13, 29, 101, 977];

/** `0` = סשן ראשון אי-פעם; `3`/`10` = ילדה חוזרת, שאצלה
 *  ל-staleness יש משמעות. בלי הציר הזה נבדק רק היום הראשון. */
const SESSION_COUNTS = [0, 3, 10];

describe("BL-018 — סשן מגוון, לא 15 פעמים אותו דבר", () => {
  for (const [bankName, items] of BANKS) {
    it(`${bankName}: אף סשן אינו נעול על הקשר אחד`, () => {
      const failures: string[] = [];
      for (const sc of SCENARIOS) {
        for (const seed of SEEDS) {
          for (const sessionCount of SESSION_COUNTS) {
            const { contexts } = runSession({
              items,
              startLevel: sc.start,
              correct: sc.correct,
              seed,
              ratioOn: true,
              sessionCount,
            });
            const run = longestRun(contexts);
            if (run > MAX_CONTEXT_RUN) {
              failures.push(
                `start=${sc.start} correct=${sc.correct} seed=${seed} n=${sessionCount}: רצף-הקשר ${run} — ${contexts.join(",")}`,
              );
            }
          }
        }
      }
      expect(failures, `סשנים שנעולים על אותה עטיפה:\n${failures.join("\n")}`).toEqual([]);
    });

    it(`${bankName}: אף סשן אינו נעול על דרגה אחת`, () => {
      const failures: string[] = [];
      for (const sc of SCENARIOS) {
        for (const seed of SEEDS) {
          for (const sessionCount of SESSION_COUNTS) {
            const { levels } = runSession({
              items,
              startLevel: sc.start,
              correct: sc.correct,
              seed,
              ratioOn: true,
              sessionCount,
            });
            const run = longestRun(levels);
            if (run > MAX_LEVEL_RUN) {
              failures.push(
                `start=${sc.start} correct=${sc.correct} seed=${seed} n=${sessionCount}: רצף-דרגה ${run} — ${levels.join(",")}`,
              );
            }
          }
        }
      }
      expect(failures, `סשנים שנעולים על אותה דרגה:\n${failures.join("\n")}`).toEqual([]);
    });
  }

  it("כשהיחס פעיל — כל סשן מאוזן בין שתי העטיפות", () => {
    const failures: string[] = [];
    for (const [bankName, items] of BANKS) {
      for (const sc of SCENARIOS) {
        for (const seed of SEEDS) {
          for (const sessionCount of SESSION_COUNTS) {
            const { contexts } = runSession({
              items,
              startLevel: sc.start,
              correct: sc.correct,
              seed,
              ratioOn: true,
              sessionCount,
            });
            const money = contexts.filter((c) => c === "money").length;
            const plain = contexts.length - money;
            if (money < MIN_MONEY_WHEN_RATIO_ON || plain < 2) {
              failures.push(
                `${bankName} start=${sc.start} seed=${seed} n=${sessionCount}: money=${money} plain=${plain}`,
              );
            }
          }
        }
      }
    }
    expect(failures, `סשנים לא מאוזנים:\n${failures.join("\n")}`).toEqual([]);
  });

  /**
   * **הממצא של BL-018, מקובע כבדיקה.**
   *
   * `moneyRatioApplies` (`session/page.tsx:151`) מחזיר `false` לכל
   * גיל שאינו 7–8, ולכן **אמיליה בת ה-9 רצה בדיוק במצב הזה**:
   * `desiredContext: undefined`, וההקשר נבחר כתופעת-לוואי של
   * staleness בלבד.
   *
   * הבדיקה הזאת מתעדת שהמצב הזה **מייצר בפועל** סשן לא-מאוזן —
   * כלומר היא ההוכחה שהתקלה קיימת, ולא הערכה.
   *
   * **היא בודקת את המנגנון, לא את המדיניות** (תוקן בסקירת-קוד
   * 2026-08-14): הגרסה הראשונה קבעה שהתקלה *חייבת* להתקיים, ולכן
   * התיקון המתוכנן — הרחבת היחס לגיל 9 — היה צובע אותה באדום,
   * כלומר השומר היה מעניש את מי שמתקן. הניסוח כאן שואל במקום זאת
   * *"האם יחס-ההקשרים הוא זה שמייצר את האיזון?"*, וזה נשאר נכון
   * גם אחרי שהיחס יורחב לכל הגילאים.
   */
  it("המנגנון: בלי יחס-ההקשרים אין איזון (המצב של אמיליה, גיל 9)", () => {
    for (const [bankName, items] of BANKS) {
      const moneyCounts: number[] = [];
      // 200 זרעים ולא 6: הזנב הארוך מופיע ב~2% מהסשנים, ומדגם קטן
      // מפספס אותו — בדיוק מה שקרה בניסיון הראשון (ראי ההערה למעלה).
      for (const sc of SCENARIOS) {
        for (let seed = 1; seed <= 200; seed++) {
          const { contexts } = runSession({
            items,
            startLevel: sc.start,
            correct: sc.correct,
            seed,
            ratioOn: false,
          });
          moneyCounts.push(contexts.filter((c) => c === "money").length);
        }
      }
      // המדד החד: בלי היחס יש סשנים עם כמעט רק עטיפה אחת.
      expect(
        Math.min(...moneyCounts),
        `${bankName}: בלי יחס-ההקשרים היה צפוי סשן לא-מאוזן, אך המינימום שנמדד הוא ${Math.min(...moneyCounts)}. אם האיזון מגיע היום ממקור אחר — יש לעדכן את הבדיקה ואת parent-guide.`,
      ).toBeLessThan(MIN_MONEY_WHEN_RATIO_ON);
    }
  });
});
