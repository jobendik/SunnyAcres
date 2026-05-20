// =============================================================
//  WEATHER HAZARDS — Phase 15.19 of the roadmap. Mild, readable
//  hazards (storm/heat/frost) that the player can prepare for.
//  Hazards are surfaced via the Gazette forecast and applied as
//  small modifiers; preparation items remove them.
// =============================================================

import { state } from '../state';
import { addItem } from './inventory';
import { nowSeconds } from '../utils';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import type { HazardsRoot } from '../types';

export interface HazardDef {
  id: string;
  name: string;
  emoji: string;
  trigger: 'storm' | 'snowy' | 'sunny';
  prepFlag: 'heater' | 'cover' | 'irrigation';
  prepLabel: string;
  desc: string;
  effect: { growthMod?: number; moodMod?: number };
}

export const HAZARDS: HazardDef[] = [
  { id: 'frost',     name: 'Frost Risk',  emoji: '❄️', trigger: 'snowy', prepFlag: 'heater',     prepLabel: 'Barn Heater', desc: 'Snow could damage delicate crops without a heater.',     effect: { growthMod: -0.15, moodMod: -10 } },
  { id: 'heatwave',  name: 'Heat Wave',   emoji: '🔥', trigger: 'sunny', prepFlag: 'irrigation', prepLabel: 'Irrigation',  desc: 'Hot days drain soil moisture without irrigation.',         effect: { growthMod: -0.10 } },
  { id: 'thunder',   name: 'Stormy Day',  emoji: '⛈️', trigger: 'storm', prepFlag: 'cover',      prepLabel: 'Crop Cover',  desc: 'Storms knock down unprotected crops.',                     effect: { growthMod: -0.20, moodMod: -15 } },
];

const PREP_COST: Record<'heater' | 'cover' | 'irrigation', { coins: number; material: string }> = {
  heater:     { coins: 300, material: 'plank' },
  cover:      { coins: 250, material: 'tarp' },
  irrigation: { coins: 400, material: 'rope' },
};

export function initHazards(): void {
  if (!state.hazards) {
    state.hazards = { active: [], preparedFlags: {} };
  }
}

export function buyPreparation(flag: 'heater' | 'cover' | 'irrigation'): boolean {
  initHazards();
  if (state.hazards!.preparedFlags[flag]) {
    toast('Already prepared.');
    return false;
  }
  const cost = PREP_COST[flag];
  if (state.coins < cost.coins) {
    toast(`Need ${cost.coins}💰.`);
    return false;
  }
  if ((state.inv[cost.material] ?? 0) < 1) {
    toast(`Need 1× ${cost.material}.`);
    return false;
  }
  state.coins -= cost.coins;
  // We don't use removeItem to avoid circular import.
  state.inv[cost.material] = (state.inv[cost.material] ?? 0) - 1;
  if (state.inv[cost.material]! <= 0) delete state.inv[cost.material];
  state.hazards!.preparedFlags[flag] = true;
  toast(`Prepared: ${flag}! Future hazards will be mitigated.`, 'gold');
  track('hazard_prepared', { flag });
  return true;
}

/** Compute the active hazard modifier for the current weather. */
export function currentHazardMod(): { growth: number; mood: number } {
  initHazards();
  let g = 0, m = 0;
  for (const h of HAZARDS) {
    if (h.trigger !== state.weather) continue;
    if (state.hazards!.preparedFlags[h.prepFlag]) continue; // mitigated
    g += h.effect.growthMod ?? 0;
    m += h.effect.moodMod ?? 0;
  }
  return { growth: g, mood: m };
}

/** Hazards the player should know about based on current weather. */
export function activeHazards(): HazardDef[] {
  return HAZARDS.filter(h =>
    h.trigger === state.weather && !state.hazards?.preparedFlags[h.prepFlag],
  );
}
