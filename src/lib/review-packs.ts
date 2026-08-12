import type { Item } from "./types";
import type { Profile } from "./profiles";
import {
  loadParentFocus,
  resolveEffectiveSkill,
  type EffectiveSkill,
} from "./parent-focus";

const ACTIVE_PACK_PREFIX = "emiva.review_pack_active.v1";

export type OffAppPackItem = {
  kind: "off_app";
  id: string;
  /** Hebrew instructions for the off-app activity (drawing, paper work, etc.). */
  prompt: string;
  /** Markdown/plain text shown after the child taps "סיימתי" so she can self-check. */
  answerReveal: string;
};

export type StandardPackItem = {
  kind: "item";
  item: Item;
};

export type PackItem = OffAppPackItem | StandardPackItem;

export type ReviewPack = {
  id: string;
  name: string;
  /** Optional human-readable hint (e.g., "אמיליה — כיתה ד'"). */
  audience?: string;
  items: PackItem[];
};

import assessmentReview2 from "@/content/review-packs/emilia-assessment-review-2.json";

/**
 * LAUNCH-PUBLIC-001 D2 — the built-in pack is one school's class-ד assessment
 * review, and its `audience` ("אמיליה") is rendered on screen. Filtering by
 * exact name match meant any family whose daughter shares that common Hebrew
 * name would be served another school's material, and two code paths
 * (`listPacks()` with no profile, and a persisted active-pack id) bypassed the
 * filter entirely.
 *
 * The pack is private home content, not product content, so it ships only when
 * explicitly enabled. The mechanism stays — future packs are unaffected.
 * Set `NEXT_PUBLIC_ENABLE_HOME_PACKS=1` in `.env.local` to use it at home.
 */
const HOME_PACKS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_HOME_PACKS === "1";

const BUILT_IN_PACKS: ReviewPack[] = HOME_PACKS_ENABLED
  ? [assessmentReview2 as unknown as ReviewPack]
  : [];

/**
 * Returns packs available to the given profile. A pack matches if its
 * `audience` equals the profile's name (case/whitespace-insensitive), or
 * has no audience set (universal). With no profile, returns all packs —
 * used by tests and tools.
 */
export function listPacks(profile?: Profile): ReviewPack[] {
  if (!profile) return BUILT_IN_PACKS;
  const target = profile.name.trim();
  return BUILT_IN_PACKS.filter(
    (p) => !p.audience || p.audience.trim() === target,
  );
}

export function getPackById(id: string): ReviewPack | null {
  return BUILT_IN_PACKS.find((p) => p.id === id) ?? null;
}

function activePackKey(profileId: string): string {
  return `${ACTIVE_PACK_PREFIX}.${profileId}`;
}

export function loadActivePackId(profileId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(activePackKey(profileId));
    if (!raw) return null;
    return getPackById(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveActivePackId(profileId: string, packId: string): void {
  if (typeof window === "undefined") return;
  if (!getPackById(packId)) return;
  window.localStorage.setItem(activePackKey(profileId), packId);
}

export function clearActivePackId(profileId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(activePackKey(profileId));
}

export type ActiveTarget =
  | { kind: "pack"; pack: ReviewPack }
  | { kind: "skill"; skill: EffectiveSkill["skill"]; source: EffectiveSkill["source"] }
  | { kind: "none" };

/**
 * Priority: active pack > parent skill focus > auto-routing.
 * Returns the unified "what does the child do next?" decision.
 */
export function resolveActiveTarget(profile: Profile): ActiveTarget {
  const packId = loadActivePackId(profile.id);
  if (packId) {
    const pack = getPackById(packId);
    if (pack) return { kind: "pack", pack };
  }
  const focus = loadParentFocus(profile.id);
  const eff = resolveEffectiveSkill(profile);
  void focus;
  if (eff.skill === null) return { kind: "none" };
  return { kind: "skill", skill: eff.skill, source: eff.source };
}
