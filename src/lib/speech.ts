// CORE-ENGLISH-PHONICS-001 — הקראת אנגלית דרך הדפדפן.
//
// MyLevel.docx §3.3 דורש "קריאה קולית". Marina אינה דוברת אנגלית
// ("רק מילים בודדות", 2026-08-10), ולכן ההקראה חייבת להגיע מהמכשיר —
// אחרת הבנות ילמדו הגייה לא מדויקת, וזה קשה מאוד לתקן אחר כך.
//
// Web Speech API: מובנה בדפדפן, בלי עלות, בלי רשת, בלי קבצי-שמע.

export const SPEECH_RATE_MIN = 0.4;
export const SPEECH_RATE_MAX = 1.0;
// ברירת-מחדל שנבחרה בבדיקת-אוזן של Marina (2026-08-10).
export const SPEECH_RATE_DEFAULT = 0.7;

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return SPEECH_RATE_DEFAULT;
  return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate));
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^en-(US|GB)/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}

export function cancelSpeech(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

function utterance(text: string, rate: number): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = clampRate(rate);
  const voice = pickEnglishVoice();
  if (voice) u.voice = voice;
  return u;
}

/** אמירה בודדת. מבטלת הקראה קודמת כדי שלחיצות מהירות לא יצטברו. */
export function speak(text: string, rate = SPEECH_RATE_DEFAULT): void {
  if (!speechSupported() || !text.trim()) return;
  cancelSpeech();
  window.speechSynthesis.speak(utterance(text, rate));
}

/**
 * צליל של אות, בשיטה שMarina בחרה (2026-08-10): צליל + מילת-עוגן.
 *
 * `speak("mmm")` נכשל — המנוע מנסה לבטא את זה כמילה. `"m. mat"` נותן
 * את הצליל ואז מדגים אותו במילה, וזו גם השיטה הפדגוגית המקובלת.
 */
export function speakLetterSound(
  letter: string,
  anchorWord: string,
  rate = SPEECH_RATE_DEFAULT,
): void {
  speak(`${letter}. ${anchorWord}`, rate);
}

/**
 * פירוק מילה לצלילים ואז חיבור: c … a … t … cat.
 *
 * זה לב הפוניקה — הרגע שבו הילדה שומעת אותיות הופכות למילה.
 * החלקים נאמרים לאט יותר מהמילה השלמה, כדי שהחיבור יבלוט.
 */
export function speakBlend(
  parts: readonly string[],
  whole: string,
  rate = SPEECH_RATE_DEFAULT,
): void {
  if (!speechSupported()) return;
  cancelSpeech();
  const partRate = clampRate(rate - 0.15);
  for (const part of parts) {
    window.speechSynthesis.speak(utterance(part, partRate));
  }
  window.speechSynthesis.speak(utterance(whole, rate));
}
