import type { FractionItem } from "./types";

export function gcd(a: number, b: number): number {
  const x = Math.abs(Math.trunc(a));
  const y = Math.abs(Math.trunc(b));
  if (y === 0) return x || 1;
  return gcd(y, x % y);
}

export function reduce(num: number, den: number): { num: number; den: number } {
  if (den === 0) return { num, den };
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

export function formatFraction(num: number, den: number): string {
  return `${num}/${den}`;
}

export function parseFraction(
  raw: string,
): { num: number; den: number } | null {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (!m) return null;
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return { num, den };
}

/**
 * Parse mixed-number input. Accepts "W N/D" (space between whole and fraction)
 * or "W-N/D" / just "N/D" (improper fraction; whole = 0). Returns null on bad input.
 */
export function parseMixed(
  raw: string,
): { whole: number; num: number; den: number } | null {
  const trimmed = raw.trim();
  const mixed = trimmed.match(/^(-?\d+)[\s\-]+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0)
      return null;
    return { whole, num, den };
  }
  const frac = parseFraction(trimmed);
  if (frac) return { whole: 0, num: frac.num, den: frac.den };
  const wholeOnly = trimmed.match(/^(-?\d+)$/);
  if (wholeOnly) {
    const whole = Number(wholeOnly[1]);
    if (!Number.isFinite(whole)) return null;
    return { whole, num: 0, den: 1 };
  }
  return null;
}

/**
 * Compare two mixed-number values, allowing equivalent forms.
 * 4 6/10 == 4 3/5 == 23/5 (improper). Uses common denominator.
 */
export function mixedEqual(
  a: { whole: number; num: number; den: number },
  b: { whole: number; num: number; den: number },
): boolean {
  // Convert to (num * sign, den), folding the whole into the numerator.
  const aSign = a.whole < 0 ? -1 : 1;
  const bSign = b.whole < 0 ? -1 : 1;
  const aImproper = {
    num: aSign * (Math.abs(a.whole) * a.den + a.num),
    den: a.den,
  };
  const bImproper = {
    num: bSign * (Math.abs(b.whole) * b.den + b.num),
    den: b.den,
  };
  return fractionsEqual(aImproper, bImproper);
}

export function fractionsEqual(
  a: { num: number; den: number },
  b: { num: number; den: number },
): boolean {
  const ra = reduce(a.num, a.den);
  const rb = reduce(b.num, b.den);
  return ra.num === rb.num && ra.den === rb.den;
}

export function isCorrect(item: FractionItem, userInput: string): boolean {
  const trimmed = userInput.trim();
  if (trimmed === "") return false;

  switch (item.answer.kind) {
    case "choice":
      return trimmed === item.answer.correct;

    case "numeric": {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return false;
      return n === item.answer.correct;
    }

    case "fraction": {
      const parsed = parseFraction(trimmed);
      if (!parsed) return false;
      return fractionsEqual(parsed, {
        num: item.answer.num,
        den: item.answer.den,
      });
    }

    case "mixed": {
      const parsed = parseMixed(trimmed);
      if (!parsed) return false;
      return mixedEqual(parsed, {
        whole: item.answer.whole,
        num: item.answer.num,
        den: item.answer.den,
      });
    }
  }
}
