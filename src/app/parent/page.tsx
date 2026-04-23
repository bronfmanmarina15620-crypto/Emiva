"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  clearPin,
  hasPinSet,
  isValidPin,
  makeMathGate,
  PIN_RULES,
  setPin,
  verifyPin,
  type MathGateChallenge,
} from "@/lib/parent-auth";

type Mode = "loading" | "setup" | "login" | "math_gate" | "locked";

const LOCKOUT_MS = 5 * 60 * 1000;
const LOCKOUT_KEY = "emiva.parent_lockout_until.v1";

function isLockedOut(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LOCKOUT_KEY);
  if (!raw) return 0;
  const until = Number(raw);
  if (!Number.isFinite(until) || until < Date.now()) return 0;
  return until;
}

function setLockout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LOCKOUT_KEY,
    String(Date.now() + LOCKOUT_MS),
  );
}

function clearLockout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCKOUT_KEY);
}

export default function ParentEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [pin, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [gate, setGate] = useState<MathGateChallenge | null>(null);
  const [gateAnswer, setGateAnswer] = useState("");
  const [lockedUntil, setLockedUntil] = useState<number>(0);

  useEffect(() => {
    const until = isLockedOut();
    if (until > 0) {
      setLockedUntil(until);
      setMode("locked");
      return;
    }
    setMode(hasPinSet() ? "login" : "setup");
  }, []);

  useEffect(() => {
    if (mode !== "locked") return;
    const id = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        clearLockout();
        setMode(hasPinSet() ? "login" : "setup");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode, lockedUntil]);

  const remainingLockSec = useMemo(
    () => Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)),
    [lockedUntil],
  );

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!isValidPin(pin)) {
      setErrorMsg(
        `הקוד חייב להיות ${PIN_RULES.minLen}–${PIN_RULES.maxLen} ספרות.`,
      );
      return;
    }
    if (pin !== pinConfirm) {
      setErrorMsg("הקודים לא תואמים. נסי שוב.");
      return;
    }
    await setPin(pin);
    setPinInput("");
    setPinConfirm("");
    router.push("/parent/dashboard");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const ok = await verifyPin(pin);
    if (ok) {
      setPinInput("");
      setFailCount(0);
      router.push("/parent/dashboard");
      return;
    }
    const next = failCount + 1;
    setFailCount(next);
    setPinInput("");
    if (next >= 3) {
      setGate(makeMathGate());
      setMode("math_gate");
    } else {
      setErrorMsg(`קוד לא נכון. ${3 - next} ניסיונות נותרו.`);
    }
  }

  function handleGate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (gate === null) return;
    const n = Number(gateAnswer);
    if (!Number.isFinite(n) || n !== gate.answer) {
      setLockout();
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setMode("locked");
      return;
    }
    clearPin();
    setFailCount(0);
    setGateAnswer("");
    setMode("setup");
    setErrorMsg("הקוד אופס. אפשר להגדיר קוד חדש.");
  }

  if (mode === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-warm-muted">טוען…</p>
      </main>
    );
  }

  if (mode === "locked") {
    const mm = Math.floor(remainingLockSec / 60);
    const ss = String(remainingLockSec % 60).padStart(2, "0");
    return (
      <main className="flex min-h-screen items-center justify-center p-8 bg-cream">
        <div className="max-w-md w-full bg-surface rounded-3xl shadow-soft p-8 text-center space-y-4">
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            האזור נעול זמנית
          </h1>
          <p className="text-warm-muted">
            ננסה שוב בעוד {mm}:{ss}.
          </p>
          <Link href="/" className="inline-block text-warm-muted underline">
            חזרה לדף הבית
          </Link>
        </div>
      </main>
    );
  }

  const title =
    mode === "setup"
      ? "הגדרת קוד להורה"
      : mode === "login"
        ? "כניסת הורה"
        : "שאלת אימות";

  return (
    <main className="flex min-h-screen items-center justify-center p-8 bg-cream">
      <div className="max-w-md w-full bg-surface rounded-3xl shadow-soft p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-extrabold text-warm-dark">
            {title}
          </h1>
          <p className="text-sm text-warm-muted">
            אל תפתחי את הדף הזה כשהילדה ליד המסך.
          </p>
        </div>

        {mode === "setup" && (
          <form onSubmit={handleSetup} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm text-warm-dark">
                קוד חדש ({PIN_RULES.minLen}–{PIN_RULES.maxLen} ספרות)
              </span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pin}
                onChange={(e) =>
                  setPinInput(e.target.value.replace(/\D/g, "").slice(0, PIN_RULES.maxLen))
                }
                className="w-full rounded-2xl border border-warm-line px-4 py-3 text-lg text-center tracking-widest"
                maxLength={PIN_RULES.maxLen}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-warm-dark">אימות</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pinConfirm}
                onChange={(e) =>
                  setPinConfirm(
                    e.target.value.replace(/\D/g, "").slice(0, PIN_RULES.maxLen),
                  )
                }
                className="w-full rounded-2xl border border-warm-line px-4 py-3 text-lg text-center tracking-widest"
                maxLength={PIN_RULES.maxLen}
                required
              />
            </label>
            {errorMsg && (
              <p className="text-sm text-terracotta-dark">{errorMsg}</p>
            )}
            <button
              type="submit"
              className="w-full bg-terracotta text-white py-3 rounded-2xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
            >
              שמרי קוד
            </button>
          </form>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm text-warm-dark">קוד הורה</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) =>
                  setPinInput(e.target.value.replace(/\D/g, "").slice(0, PIN_RULES.maxLen))
                }
                className="w-full rounded-2xl border border-warm-line px-4 py-3 text-lg text-center tracking-widest"
                maxLength={PIN_RULES.maxLen}
                autoFocus
                required
              />
            </label>
            {errorMsg && (
              <p className="text-sm text-terracotta-dark">{errorMsg}</p>
            )}
            <button
              type="submit"
              className="w-full bg-terracotta text-white py-3 rounded-2xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
            >
              כניסה
            </button>
          </form>
        )}

        {mode === "math_gate" && gate !== null && (
          <form onSubmit={handleGate} className="space-y-4">
            <p className="text-sm text-warm-muted">
              ניסיונות הקוד נגמרו. פתרי את התרגיל כדי לאפס את הקוד:
            </p>
            <div className="text-center text-3xl font-display font-extrabold text-warm-dark">
              {gate.a} × {gate.b} = ?
            </div>
            <input
              type="number"
              inputMode="numeric"
              value={gateAnswer}
              onChange={(e) => setGateAnswer(e.target.value)}
              className="w-full rounded-2xl border border-warm-line px-4 py-3 text-lg text-center"
              autoFocus
              required
            />
            {errorMsg && (
              <p className="text-sm text-terracotta-dark">{errorMsg}</p>
            )}
            <button
              type="submit"
              className="w-full bg-terracotta text-white py-3 rounded-2xl font-semibold shadow-warm hover:bg-terracotta-dark transition"
            >
              בדוק ואפס קוד
            </button>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-warm-muted hover:text-terracotta underline"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </main>
  );
}
