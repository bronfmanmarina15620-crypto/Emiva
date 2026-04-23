"use client";

import { useState } from "react";

export type FeelingRating = "happy" | "ok" | "hard";

export function FeelingPrompt({
  onRate,
}: {
  onRate: (rating: FeelingRating) => void;
}) {
  const [rated, setRated] = useState<FeelingRating | null>(null);

  function choose(rating: FeelingRating) {
    if (rated !== null) return;
    setRated(rating);
    onRate(rating);
  }

  if (rated !== null) {
    return <div className="text-sm text-warm-muted">תודה ששיתפת 💛</div>;
  }

  return (
    <div className="bg-surface rounded-3xl shadow-soft p-5 space-y-3">
      <p className="text-warm-dark font-semibold">איך היה לך היום?</p>
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => choose("happy")}
          className="flex-1 flex flex-col items-center gap-1 rounded-2xl bg-sage-soft border border-sage hover:shadow-warm py-4 transition"
          aria-label="כיף"
        >
          <span className="text-4xl">😊</span>
          <span className="text-xs text-warm-dark">כיף</span>
        </button>
        <button
          type="button"
          onClick={() => choose("ok")}
          className="flex-1 flex flex-col items-center gap-1 rounded-2xl bg-mustard-soft border border-mustard hover:shadow-warm py-4 transition"
          aria-label="בסדר"
        >
          <span className="text-4xl">😐</span>
          <span className="text-xs text-warm-dark">בסדר</span>
        </button>
        <button
          type="button"
          onClick={() => choose("hard")}
          className="flex-1 flex flex-col items-center gap-1 rounded-2xl bg-warm-indigo-soft border border-warm-indigo hover:shadow-warm py-4 transition"
          aria-label="קשה"
        >
          <span className="text-4xl">😟</span>
          <span className="text-xs text-warm-dark">קשה</span>
        </button>
      </div>
    </div>
  );
}
