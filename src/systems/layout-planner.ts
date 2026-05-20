// =============================================================
//  FARM LAYOUT PLANNER — Phase 15.11 of the roadmap. Lightweight
//  "edit mode" that highlights adjacency and lets the player
//  pick up and move decorations. (Buildings remain anchored so
//  we don't have to relocate pen animals.)
// =============================================================

import { state } from '../state';
import { TILE } from '../constants';
import { track } from './telemetry';
import { toast } from '../ui/toasts';

let planning = false;

export function isPlanning(): boolean {
  return planning;
}

export function togglePlanner(): boolean {
  planning = !planning;
  track('layout_planner_toggled', { on: planning });
  toast(planning ? '🛠️ Layout mode ON — tap decor to pick up.' : '🛠️ Layout mode OFF.');
  return planning;
}

/** Picks up the decoration at (gx, gy) — returns its type for relocation. */
export function pickUpDecorAt(gx: number, gy: number): string | null {
  if (!planning) return null;
  const idx = state.decor.findIndex(d => Math.floor(d.x / TILE) === gx && Math.floor(d.y / TILE) === gy);
  if (idx < 0) return null;
  const d = state.decor.splice(idx, 1)[0]!;
  // Refund-free in planner mode.
  state.inv[d.type] = (state.inv[d.type] ?? 0); // we don't refund — just clear placement
  toast(`Picked up ${d.type}`);
  return d.type;
}
