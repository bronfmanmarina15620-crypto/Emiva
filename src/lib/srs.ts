import type { ItemSrsState, MasteryState } from "./types";
import { SRS_INTERVALS } from "./types";

export function initSrs(): ItemSrsState {
  return { box: 1, sessionsUntilDue: SRS_INTERVALS[1] };
}

export function updateSrs(
  prev: ItemSrsState | undefined,
  correct: boolean,
): ItemSrsState {
  const current = prev ?? initSrs();
  const nextBox = correct
    ? (Math.min(5, current.box + 1) as ItemSrsState["box"])
    : 1;
  return { box: nextBox, sessionsUntilDue: SRS_INTERVALS[nextBox] };
}

export function applySrsUpdate(
  state: MasteryState,
  itemId: string,
  correct: boolean,
): MasteryState {
  const srs = { ...state.srs, [itemId]: updateSrs(state.srs[itemId], correct) };
  return { ...state, srs };
}

export function decaySrsForNewSession(state: MasteryState): MasteryState {
  const srs: Record<string, ItemSrsState> = {};
  for (const [id, item] of Object.entries(state.srs)) {
    srs[id] = {
      box: item.box,
      sessionsUntilDue: Math.max(0, item.sessionsUntilDue - 1),
    };
  }
  return { ...state, srs };
}

export function isDue(state: MasteryState, itemId: string): boolean {
  const s = state.srs[itemId];
  if (!s) return true;
  return s.sessionsUntilDue <= 0;
}
