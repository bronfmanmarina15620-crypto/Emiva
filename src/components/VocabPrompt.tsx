"use client";

import { useEffect, useRef, useState } from "react";
import type { EnglishVocabItem } from "@/lib/types";
import {
  cancelSpeech,
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  speak,
  speechSupported,
  voicesReady,
} from "@/lib/speech";

// CORE-ENGLISH-VOCAB-READALOUD-001 — הקראת שאלות אוצר-המילים.
//
// 50 מתוך 100 הפריטים של אווה שואלים "What does 'cat' mean?" — שאלה
// **כתובה באנגלית**, לילדה שרק לומדת לקרוא אנגלית. זו אותה משפחת-כשל
// שהניעה את משימת הפוניקה: גם ניחוש נכון לא מלמד, כי היא לא קראה.
//
// Marina הכריעה (2026-08-11): מנגנון מובנה שהבת לוחצת ושומעת — לא
// הורה שמקריא. הנימוק זהה לזה של הפוניקה: Marina אינה דוברת אנגלית,
// והקראה של הורה שאינו דובר מלמדת הגייה לא מדויקת.

/**
 * המילה הנלמדת בתוך המרכאות: `What does 'cat' mean?` → `cat`.
 *
 * מוקראת המילה בלבד ולא המשפט כולו — `what`, `does` ו-`mean` הן
 * מילות-עזר שאווה לא צריכה, והן מטביעות את המילה שכן.
 */
export function wordFromPrompt(prompt: string): string | null {
  const m = prompt.match(/'([^']+)'/);
  return m?.[1] ?? null;
}

type Props = {
  item: EnglishVocabItem;
  rate: number;
  onRateChange: (rate: number) => void;
};

export function VocabPrompt({ item, rate, onRateChange }: Props) {
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
  }, []);

  // ref כדי שהשמעה מושהית תקרא תמיד את המהירות העדכנית ולא ערך
  // שנתפס ברנדר קודם — הלקח מהסליידר של הפוניקה.
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const flashRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (flashRef.current !== null) window.clearTimeout(flashRef.current);
      cancelSpeech();
    };
  }, []);

  // ניקוי גם במעבר בין פריטים: הקראה איטית שעדיין רצה כשהסשן מתקדם
  // הייתה נשפכת לפריט הבא.
  useEffect(() => cancelSpeech, [item.id]);

  // **הכלל המרכזי:** מקריאים רק כשהשאלה באנגלית.
  //
  // ב-`he_to_en` השאלה עברית ("מה זה 'בית' באנגלית?") והתשובה היא
  // המילה האנגלית שהבת צריכה **להפיק בעצמה**. הקראה שם מוסרת את
  // התשובה — בדיוק הבאג של `decode` שנתפס בסקירת הפוניקה.
  const isEnPrompt = item.type === "en_to_he";
  const word = isEnPrompt ? wordFromPrompt(item.prompt) : null;
  const hasAudio = Boolean(word);

  function play() {
    if (!word) return;
    speak(word, rateRef.current);
    setPlaying(true);
    if (flashRef.current !== null) window.clearTimeout(flashRef.current);
    flashRef.current = window.setTimeout(() => setPlaying(false), 600);
  }

  // בלי השמעה אוטומטית, בכוונה. בפוניקה היא נחוצה כי הצליל *הוא*
  // השאלה; כאן המילה כתובה על המסך, והבת אמורה קודם לנסות לקרוא
  // אותה בעצמה. הכפתור הוא עזרה שהיא מבקשת, לא תחליף לקריאה.
  useEffect(() => {
    if (!speechSupported() || !hasAudio) return;
    // מחממים את רשימת הקולות כדי שהלחיצה הראשונה לא תיתקל ברשימה
    // ריקה ותיפול לקול העברי של המערכת.
    void voicesReady();
  }, [item.id, hasAudio]);

  return (
    <div className="bg-surface rounded-3xl shadow-soft py-10 px-6 space-y-5">
      <div
        dir={isEnPrompt ? "ltr" : "rtl"}
        className={`text-3xl md:text-4xl font-display font-extrabold text-center text-warm-dark ${isEnPrompt ? "" : "leading-relaxed"}`}
      >
        {item.prompt}
      </div>

      {supported && hasAudio && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={play}
              aria-label="השמעת המילה"
              className={`rounded-full w-20 h-20 text-4xl shadow-warm transition border-4 ${
                playing
                  ? "bg-sage border-sage-dark scale-95"
                  : "bg-sage-light border-sage hover:bg-sage hover:scale-105"
              }`}
            >
              🔊
            </button>
          </div>

          {/* dir="ltr" חובה: בעמוד RTL רכיב range מתהפך וגרירה שמאלה
              דווקא מאיצה (Marina, 2026-08-10). */}
          <div dir="ltr" className="flex items-center justify-center gap-3">
            <span className="text-sm text-warm-muted">🐢</span>
            <input
              type="range"
              min={SPEECH_RATE_MIN}
              max={SPEECH_RATE_MAX}
              step={0.05}
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              onMouseUp={play}
              onTouchEnd={play}
              onKeyUp={play}
              className="w-44 accent-terracotta"
              aria-label="מהירות ההשמעה"
            />
            <span className="text-sm text-warm-muted">🐇</span>
          </div>
        </div>
      )}

      {!supported && hasAudio && (
        <p className="text-center text-sm text-warm-muted">
          הדפדפן הזה לא יודע להשמיע קול. אפשר להמשיך — מסתכלים על המילה.
        </p>
      )}
    </div>
  );
}
