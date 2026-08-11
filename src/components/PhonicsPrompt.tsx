"use client";

import { useEffect, useRef, useState } from "react";
import type { EnglishPhonicsItem } from "@/lib/types";
import {
  cancelSpeech,
  SPEECH_RATE_DEFAULT,
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  speak,
  speakBlend,
  speechSupported,
  voicesReady,
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

  // ה-timeout של הבהוב הכפתור נשמר ומנוקה, אחרת הוא יורה אחרי unmount
  // או מכבה את ההדגשה של הפריט הבא.
  const flashRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (flashRef.current !== null) window.clearTimeout(flashRef.current);
      // עוצרים גם את תור-הדיבור: הקראה איטית שעדיין רצה כשהסשן מתקדם
      // הייתה נשפכת לפריט הבא — ובפריט "איזו אות" עלולה להכריז עליה.
      cancelSpeech();
    };
  }, []);

  // אותו ניקוי גם במעבר בין פריטים, לא רק ב-unmount.
  useEffect(() => cancelSpeech, [item.id]);

  // ב-decode הבת אמורה **לקרוא** את המילה, ולכן המחשב לא מקריא אותה —
  // לא אוטומטית ולא בלחיצה.
  //
  // באג שנתפס בסקירה השנייה (2026-08-10): חסימת ה-autoplay לבדה לא
  // הספיקה. `play()` בדק `item.parts` תחילה, וכל 36 פריטי ה-decode של
  // אמיליה נושאים `parts` — לחיצה אחת השמיעה "rab. bit. rabbit",
  // כלומר את התשובה. היא הייתה בוחרת משמעות בלי לקרוא ומקבלת קרדיט
  // שליטה על ניסיון ראשון. בדיוק ה-false mastery שהמשימה נועדה לתקן.
  const isDecode = item.type === "decode";
  const autoPlays = !isDecode;
  const hasAudio = !isDecode && Boolean(item.say || item.parts?.length);

  function play() {
    if (!hasAudio) return;
    const current = rateRef.current;
    if (item.parts && item.parts.length > 0) {
      speakBlend(item.parts, item.focus, current);
    } else if (item.say) {
      speak(item.say, current);
    }
    setPlaying(true);
    if (flashRef.current !== null) window.clearTimeout(flashRef.current);
    flashRef.current = window.setTimeout(() => setPlaying(false), 600);
  }

  // השמעה אוטומטית כשהפריט מופיע — הילדה לא צריכה לדעת שצריך ללחוץ.
  // מלבד decode, שם השמעה מראש הופכת קריאה לשמיעה.
  useEffect(() => {
    if (!speechSupported() || !autoPlays) return;
    let cancelled = false;
    // ממתינים שהקולות ייטענו — אחרת בטעינה קרה נבחר קול המערכת
    // (עברי) והמילה נהגית שגוי.
    const t = window.setTimeout(() => {
      voicesReady().then(() => {
        if (!cancelled) play();
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, autoPlays]);

  // מציגים את הגליף רק כשהוא *לא* התשובה.
  //
  // באג שנתפס בסקירה (2026-08-10): `blend` הציג את `focus` — שהוא
  // בדיוק `answer.correct` — מעל השאלה "איזו מילה יצאה?". הילדה
  // התאימה צורות במקום לחבר צלילים, וקיבלה קרדיט שליטה על כלום.
  // זה בדיוק ה-false mastery שהמשימה הזאת נועדה לתקן.
  // ב-decode המילה עצמה היא השאלה (התשובה היא המשמעות בעברית), ולכן
  // היא מוצגת. בשאר הדרגות מסתירים גליף שהוא-הוא התשובה.
  const glyphIsAnswer = item.focus === item.answer.correct;
  const showsGlyph =
    item.type === "decode" ||
    (item.type !== "letter_name" &&
      item.type !== "sound_to_letter" &&
      !glyphIsAnswer);

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

      {supported && hasAudio ? (
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
      ) : isDecode ? (
        <p className="text-center text-sm text-warm-muted">
          את קוראת את המילה בעצמך — אין השמעה בשלב הזה.
        </p>
      ) : (
        <p className="text-center text-sm text-warm-muted">
          הדפדפן הזה לא יודע להשמיע קול. אפשר להמשיך — מסתכלים על האותיות.
        </p>
      )}
    </div>
  );
}

export { SPEECH_RATE_DEFAULT };
