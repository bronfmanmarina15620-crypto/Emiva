/**
 * Eval for BACKLOG item BL-001 — feedback-messages variant pool size.
 *
 * Fails when: variants are too few given expected daily exposures.
 * Failure = trigger fired = time to expand `src/lib/feedback-messages.ts`.
 *
 * Threshold: at least 2× the worst-case consecutive retries in a day.
 */
import { describe, expect, it } from "vitest";
import {
  correctMessage,
  retryMessage,
  revealIntro,
} from "@/lib/feedback-messages";

// Floor: absolute minimum variants per pool. Below this, a pool feels robotic
// even with zero daily usage. When real usage data arrives, raise the floor.
// Bump timeline: after first month of real usage, raise to 5. After 3 months, 8.
const REQUIRED_MIN = 3;

function countVariants(
  fn: (...args: never[]) => string,
  probe: () => string,
): number {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) seen.add(probe());
  void fn;
  return seen.size;
}

describe("BL-001: feedback variant pool size", () => {
  it(`retry (not last) — ≥ ${REQUIRED_MIN} variants`, () => {
    const count = countVariants(retryMessage, () =>
      retryMessage(2, Math.random),
    );
    expect(count).toBeGreaterThanOrEqual(REQUIRED_MIN);
  });

  it(`retry (last attempt) — ≥ ${REQUIRED_MIN} variants`, () => {
    const count = countVariants(retryMessage, () =>
      retryMessage(1, Math.random),
    );
    expect(count).toBeGreaterThanOrEqual(REQUIRED_MIN);
  });

  it(`correct (first try) — ≥ ${REQUIRED_MIN} variants`, () => {
    const count = countVariants(correctMessage, () =>
      correctMessage(true, Math.random),
    );
    expect(count).toBeGreaterThanOrEqual(REQUIRED_MIN);
  });

  it(`correct (after retry) — ≥ ${REQUIRED_MIN} variants`, () => {
    const count = countVariants(correctMessage, () =>
      correctMessage(false, Math.random),
    );
    expect(count).toBeGreaterThanOrEqual(REQUIRED_MIN);
  });

  it(`reveal intro — ≥ ${REQUIRED_MIN} variants`, () => {
    const count = countVariants(revealIntro, () => revealIntro(Math.random));
    expect(count).toBeGreaterThanOrEqual(REQUIRED_MIN);
  });
});
