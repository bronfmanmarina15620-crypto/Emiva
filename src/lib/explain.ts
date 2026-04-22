import type { AddSubItem, DivisionItem, MultItem } from "./types";

export function explain(item: AddSubItem | MultItem | DivisionItem): string {
  const [a, b] = item.operands;
  if (item.op === "+") return explainAddition(a, b);
  if (item.op === "-") return explainSubtraction(a, b);
  if (item.op === "*") return explainMultiplication(a, b);
  return explainDivision(a, b);
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

function explainMultiplication(a: number, b: number): string {
  const result = a * b;
  const [times, unit] = a <= b ? [a, b] : [b, a];

  if (a === 2 || b === 2) {
    const x = a === 2 ? b : a;
    return `${a} × ${b} = ${result}. פי 2 = כופלים את עצמו: ${x} + ${x} = ${result}.`;
  }

  if (a === 10 || b === 10) {
    const x = a === 10 ? b : a;
    return `${a} × ${b} = ${result}. פי 10 = מוסיפים 0 ל־${x} ומקבלים ${result}.`;
  }

  if (a === 5 || b === 5) {
    const x = a === 5 ? b : a;
    return `${a} × ${b} = ${result}. פי 5 = חצי מפי 10. ${x} × 10 = ${x * 10}, חצי מזה = ${result}.`;
  }

  if (a === 9 || b === 9) {
    const x = a === 9 ? b : a;
    return `${a} × ${b} = ${result}. טריק של פי 9: ${x} × 10 - ${x} = ${x * 10} - ${x} = ${result}.`;
  }

  const stops = Array.from({ length: times }, (_, i) => unit * (i + 1));
  const shown = stops.length <= 5 ? stops.join(", ") : stops.slice(0, 4).join(", ") + ", ...";
  return `${a} × ${b} = ${result}. ${times} קבוצות של ${unit}. סופרים: ${shown}.`;
}

function explainDivision(a: number, b: number): string {
  const result = a / b;
  const verification = `${b} × ${result} = ${a}`;

  if (a < 100) {
    return `${a} ÷ ${b} = ${result}. כמה פעמים ${b} נכנס ב-${a}? ${result} פעמים. בודקים: ${verification}.`;
  }

  const hundreds = Math.floor(a / 100);
  const rest = a - hundreds * 100;
  const firstDigits = hundreds >= b ? hundreds : Math.floor(a / 10);
  const firstStep = Math.floor(firstDigits / b);
  const firstRemainder = firstDigits - firstStep * b;

  if (firstRemainder === 0 && a % 10 === 0) {
    return `${a} ÷ ${b} = ${result}. חילוק ארוך: ${firstDigits} ÷ ${b} = ${firstStep}, ואז מצרפים את ה-0. בודקים: ${verification}.`;
  }

  return `${a} ÷ ${b} = ${result}. חילוק ארוך: מתחילים מהספרות הגדולות, רואים כמה פעמים ${b} נכנס. בודקים הפוך: ${verification}.`;
}
