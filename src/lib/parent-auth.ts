const PIN_HASH_KEY = "emiva.parent_pin_hash.v1";
const PIN_MIN_LEN = 4;
const PIN_MAX_LEN = 6;

export const PIN_RULES = { minLen: PIN_MIN_LEN, maxLen: PIN_MAX_LEN };

export function isValidPin(pin: string): boolean {
  if (pin.length < PIN_MIN_LEN || pin.length > PIN_MAX_LEN) return false;
  return /^\d+$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasPinSet(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PIN_HASH_KEY) !== null;
}

export async function setPin(pin: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isValidPin(pin)) throw new Error("invalid_pin");
  const h = await hashPin(pin);
  window.localStorage.setItem(PIN_HASH_KEY, h);
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(PIN_HASH_KEY);
  if (stored === null) return false;
  const h = await hashPin(pin);
  return h === stored;
}

export function clearPin(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PIN_HASH_KEY);
}

export type MathGateChallenge = { a: number; b: number; answer: number };

export function makeMathGate(rand: () => number = Math.random): MathGateChallenge {
  const a = 11 + Math.floor(rand() * 89);
  const b = 2 + Math.floor(rand() * 8);
  return { a, b, answer: a * b };
}
