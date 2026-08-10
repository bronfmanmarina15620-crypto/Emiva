"use client";

import { useEffect, useRef, useState } from "react";
import type { EnglishPhonicsItem } from "@/lib/types";
import {
  SPEECH_RATE_DEFAULT,
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  speak,
  speakBlend,
  speechSupported,
} from "@/lib/speech";

// CORE-ENGLISH-PHONICS-001 — תצוגת פריט פוניקה.
//
// המסך הזה הוא הלב של המשימה: אווה לוחצת 🔊, שומעת, ולוחצת שוב כמה
// שהיא רוצה. המהירות בשליטתה — רעיון של Marina (2026-08-10).

type Props = {
  item: EnglishPhonicsItem;
  rate: number;
  onRateChange: (rate: number) => void;
};

export function PhonicsPrompt({ item, rate, onRateChange }: Props) {
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
  }, []);

  // ref כדי שהשמעה מושהית תקרא תמיד את המהירות העדכנית ולא ערך שנתפס
  // ברנדר קודם — זו הייתה הסיבה שהזזת הסליידר לא נשמעה.
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  function play() {
    const current = rateRef.current;
    if (item.parts && item.parts.length > 0) {
      speakBlend(item.parts, item.focus, current);
    } else if (item.say) {
      speak(item.say, current);
    }
    setPlaying(true);
    window.setTimeout(() => setPlaying(false), 600);
  }

  // השמעה אוטומטית כשהפריט מופיע — הילדה לא צריכה לדעת שצריך ללחוץ.
  useEffect(() => {
    if (!speechSupported()) return;
    const t = window.setTimeout(play, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  // בדרגות שבהן האות/המילה היא השאלה — מציגים אותה גדול.
  const showsGlyph = item.type !== "letter_name" && item.type !== "sound_to_letter";

  return (
    <div className="bg-surface rounded-3xl shadow-soft py-8 px-6 space-y-5">
      {showsGlyph && (
        <div
          dir="ltr"
          className="text-6xl md:text-7xl font-display font-extrabold text-center text-warm-dark tracking-wide"
        >
          {item.focus}
        </div>
      )}

      <div className="text-lg md:text-xl font-semibold text-center text-warm-dark leading-relaxed">
        {item.prompt}
      </div>

      {supported ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={play}
              aria-label="השמעה"
              className={`rounded-full w-24 h-24 text-5xl shadow-warm transition border-4 ${
                playing
                  ? "bg-sage border-sage-dark scale-95"
                  : "bg-sage-light border-sage hover:bg-sage hover:scale-105"
              }`}
            >
              🔊
            </button>
          </div>

          {/* dir="ltr" חובה: בתוך עמוד RTL הסליידר מתהפך, וגרירה שמאלה
              דווקא מאיצה. Marina דיווחה שאין שינוי (2026-08-10) — הסיבה
              הייתה שהכיוון הפוך והשינוי לא נשמע מיד. */}
          <div dir="ltr" className="flex items-center justify-center gap-3">
            <span className="text-sm text-warm-muted">🐢</span>
            <input
              type="range"
              min={SPEECH_RATE_MIN}
              max={SPEECH_RATE_MAX}
              step={0.05}
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              // השמעה מיד כשמשחררים — אחרת אי אפשר לשמוע מה השתנה.
              onMouseUp={play}
              onTouchEnd={play}
              onKeyUp={play}
              className="w-44 accent-terracotta"
              aria-label="מהירות ההשמעה"
            />
            <span className="text-sm text-warm-muted">🐇</span>
          </div>
          <p className="text-center text-xs text-warm-muted">
            מהירות {rate.toFixed(2)} — אפשר להזיז ולשמוע
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-warm-muted">
          הדפדפן הזה לא יודע להשמיע קול. אפשר להמשיך — מסתכלים על האותיות.
        </p>
      )}
    </div>
  );
}

export { SPEECH_RATE_DEFAULT };
