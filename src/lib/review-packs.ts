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

/**
 * LAUNCH-PUBLIC-001 D2 — built-in packs are loaded from a **gitignored**
 * private folder, not imported directly.
 *
 * The pack that existed here was one school's class-ד assessment review,
 * labelled with a specific child's name which renders on screen. Filtering by
 * exact name match served it to any family whose daughter shares that common
 * Hebrew name, and two code paths bypassed the filter entirely.
 *
 * ⚠️ **A runtime flag was not enough, and the build proved it.** The first fix
 * kept `import ... from "…/emilia-assessment-review-2.json"` behind an
 * `if (FLAG)`. Inspecting the production bundle showed the pack's full
 * content — child's name and all questions — shipped to every visitor anyway:
 * a static import is bundled regardless of the surrounding condition, so the
 * flag hid it from the UI while leaving it downloadable.
 *
 * `require.context` reads the directory at build time and yields nothing when
 * it is empty, so in a public build there is simply nothing to ship.
 */
import { PRIVATE_PACKS } from "@/content/review-packs/private";

const BUILT_IN_PACKS: ReviewPack[] = (PRIVATE_PACKS as ReviewPack[]).filter(
  (p) => !!p && typeof p.id === "string",
);

/**
 * Registers a pack at runtime. **Tests only** — the pack mechanism has to stay
 * covered even though no pack ships publicly (the private folder is empty in a
 * clean clone), and tests must not depend on one machine's private content.
 */
export function __registerPackForTests(pack: ReviewPack): void {
  if (!BUILT_IN_PACKS.some((p) => p.id === pack.id)) BUILT_IN_PACKS.push(pack);
}

/** Tests only — restores the empty public state. */
export function __clearPacksForTests(): void {
  BUILT_IN_PACKS.length = 0;
}

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
