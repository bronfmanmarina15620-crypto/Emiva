import type { AddSubItem } from "./types";

export function explain(item: AddSubItem): string {
  const [a, b] = item.operands;
  return item.op === "+" ? explainAddition(a, b) : explainSubtraction(a, b);
}

function explainAddition(a: number, b: number): string {
  const result = a + b;
  const onesA = a % 10;

  if (a + b <= 10) {
    return `${a} + ${b} = ${result}. אפשר לספור קדימה: מתחילים מ־${a} ומוסיפים ${b} צעדים.`;
  }

  if (b >= 10) {
    const tensB = Math.floor(b / 10) * 10;
    const onesB = b % 10;
    const step1 = a + tensB;
    if (onesB === 0) {
      return `מוסיפים עשרות: ${a} + ${tensB} = ${result}.`;
    }
    return `בואי נפרק את ${b} ל־${tensB} ו־${onesB}. קודם ${a} + ${tensB} = ${step1}. עכשיו ${step1} + ${onesB} = ${result}.`;
  }

  if (onesA + b > 10 && onesA !== 0) {
    const toTen = 10 - onesA;
    const rest = b - toTen;
    const tenNum = a + toTen;
    return `משלימים לעשרת עגולה: ${a} + ${toTen} = ${tenNum}. נשאר להוסיף ${rest}: ${tenNum} + ${rest} = ${result}.`;
  }

  return `${a} + ${b} = ${result}. רק מוסיפים ליחידות: ${onesA} + ${b} = ${onesA + b}.`;
}

function explainSubtraction(a: number, b: number): string {
  const result = a - b;
  const onesA = a % 10;

  if (a <= 10) {
    return `${a} - ${b} = ${result}. סופרים אחורה מ־${a}, ${b} צעדים.`;
  }

  if (b >= 10) {
    const tensB = Math.floor(b / 10) * 10;
    const onesB = b % 10;
    const step1 = a - tensB;
    if (onesB === 0) {
      return `מורידים עשרות: ${a} - ${tensB} = ${result}.`;
    }
    return `מפרקים את ${b} ל־${tensB} ו־${onesB}. קודם ${a} - ${tensB} = ${step1}. עכשיו ${step1} - ${onesB} = ${result}.`;
  }

  if (b > onesA) {
    const step1 = a - onesA;
    const remaining = b - onesA;
    return `מחסרים בשני שלבים: קודם ${a} - ${onesA} = ${step1} (הגענו לעשרת). עכשיו ${step1} - ${remaining} = ${result}.`;
  }

  return `${a} - ${b} = ${result}. רק מחסרים מהיחידות: ${onesA} - ${b} = ${onesA - b}.`;
}
