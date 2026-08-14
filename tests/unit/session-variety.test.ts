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
const MAX_CONTEXT_RUN = 8;
const MAX_LEVEL_RUN = 9;
/** מינימום פריטי-כסף בסשן כשהיחס פעיל. נמדד: תמיד בדיוק 9. */
const MIN_MONEY_WHEN_RATIO_ON = 5;

type Ctx = "money" | "plain";

function isMoneyItem(item: Item): boolean {
  return "context" in item && item.context === "money";
}

/** מריץ סשן שלם דרך הסלקטור האמיתי, במדויק כמו `session/page.tsx`:
 *  מונים לחלון של 5 שמתאפסים יחד (שורות 332–336 שם). */
function runSession(opts: {
  items: readonly Item[];
  startLevel: Difficulty;
  correct: boolean;
  seed: number;
  ratioOn: boolean;
}): { levels: Difficulty[]; contexts: Ctx[] } {
  let state: MasteryState = {
    ...emptyMastery("multiplication"),
    level: opts.startLevel,
    levelMeasured: true,
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
    const item = selectNextItem(state, opts.items, used, rand, desired);
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
    state = advanceLevel(state);
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

describe("BL-018 — סשן מגוון, לא 15 פעמים אותו דבר", () => {
  for (const [bankName, items] of BANKS) {
    it(`${bankName}: אף סשן אינו נעול על הקשר אחד`, () => {
      const failures: string[] = [];
      for (const sc of SCENARIOS) {
        for (const seed of SEEDS) {
          const { contexts } = runSession({
            items,
            startLevel: sc.start,
            correct: sc.correct,
            seed,
            ratioOn: true,
          });
          const run = longestRun(contexts);
          if (run > MAX_CONTEXT_RUN) {
            failures.push(
              `start=${sc.start} correct=${sc.correct} seed=${seed}: רצף-הקשר ${run} — ${contexts.join(",")}`,
            );
          }
        }
      }
      expect(failures, `סשנים שנעולים על אותה עטיפה:\n${failures.join("\n")}`).toEqual([]);
    });

    it(`${bankName}: אף סשן אינו נעול על דרגה אחת`, () => {
      const failures: string[] = [];
      for (const sc of SCENARIOS) {
        for (const seed of SEEDS) {
          const { levels } = runSession({
            items,
            startLevel: sc.start,
            correct: sc.correct,
            seed,
            ratioOn: true,
          });
          const run = longestRun(levels);
          if (run > MAX_LEVEL_RUN) {
            failures.push(
              `start=${sc.start} correct=${sc.correct} seed=${seed}: רצף-דרגה ${run} — ${levels.join(",")}`,
            );
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
          const { contexts } = runSession({
            items,
            startLevel: sc.start,
            correct: sc.correct,
            seed,
            ratioOn: true,
          });
          const money = contexts.filter((c) => c === "money").length;
          const plain = contexts.length - money;
          if (money < MIN_MONEY_WHEN_RATIO_ON || plain < 2) {
            failures.push(`${bankName} start=${sc.start} seed=${seed}: money=${money} plain=${plain}`);
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
   * הבדיקה הזאת מתעדת שהמצב הזה **מייצר בפועל** רצף ארוך מהסף —
   * כלומר היא ההוכחה שהתקלה קיימת, ולא הערכה. אם מישהו ירחיב את
   * היחס לכל הגילאים, הבדיקה תיכשל ותדרוש למחוק אותה **במודע**,
   * יחד עם עדכון `parent-guide`.
   */
  it("תיעוד-תקלה: בלי יחס-הקשרים נוצר רצף ארוך מהסף (המצב של אמיליה, גיל 9)", () => {
    const runs: number[] = [];
    const moneyCounts: number[] = [];
    // 200 זרעים ולא 6: הזנב הארוך מופיע ב~2% מהסשנים, ומדגם קטן
    // מפספס אותו — בדיוק מה שקרה בניסיון הראשון (ראי ההערה למעלה).
    for (const sc of SCENARIOS) {
      for (let seed = 1; seed <= 200; seed++) {
        const { contexts } = runSession({
          items: multBank as unknown as readonly Item[],
          startLevel: sc.start,
          correct: sc.correct,
          seed,
          ratioOn: false,
        });
        runs.push(longestRun(contexts));
        moneyCounts.push(contexts.filter((c) => c === "money").length);
      }
    }
    const worst = Math.max(...runs);
    expect(
      worst,
      `כשהיחס כבוי נמדד רצף-הקשר מקסימלי של ${worst}. אם זה ירד מתחת לסף — היחס הורחב, ויש לעדכן את הבדיקה ואת parent-guide.`,
    ).toBeGreaterThan(MAX_CONTEXT_RUN);
    // המדד החד: יש סשנים עם פריט-כסף בודד מתוך 15.
    expect(
      Math.min(...moneyCounts),
      "כשהיחס כבוי, סשן יכול להגיש כמעט רק עטיפה אחת.",
    ).toBeLessThan(MIN_MONEY_WHEN_RATIO_ON);
  });
});
