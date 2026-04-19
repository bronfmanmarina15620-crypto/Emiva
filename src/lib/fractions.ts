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
  }
}
