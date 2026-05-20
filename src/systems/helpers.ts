// =============================================================
//  FARM HELPERS — Phase 15.13 of the roadmap. Hire an NPC helper
//  for a limited time to automate one chore (collect animal
//  produce, restock production, etc.). Costs coins + food.
// =============================================================

import { state } from '../state';
import { addItem, removeItem } from './inventory';
import { track } from './telemetry';
import { nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { Helper, HelpersRoot } from '../types';

const UNLOCK_LEVEL = 18;
const SHIFT_S = 60 * 60 * 4; // 4 hours

export interface HelperRole {
  id: 'collector' | 'restocker' | 'waterer' | 'seller';
  name: string;
  emoji: string;
  desc: string;
  costCoins: number;
  costFood: string;
}

export const HELPER_ROLES: HelperRole[] = [
  { id: 'collector', name: 'Collector',  emoji: '🧑‍🌾', desc: 'Auto-collects animal produce every 10 min for 4h.',  costCoins: 500, costFood: 'bread' },
  { id: 'restocker', name: 'Restocker',  emoji: '👨‍🍳', desc: 'Auto-queues the last recipe in your production buildings.', costCoins: 700, costFood: 'cookie' },
  { id: 'waterer',   name: 'Waterer',    emoji: '🧑‍🚒', desc: 'Keeps all crops topped-up on moisture for 4h.',            costCoins: 400, costFood: 'smoothie' },
  { id: 'seller',    name: 'Stall Hand', emoji: '🧑‍💼', desc: 'Auto-refills your market stall when slots clear.',         costCoins: 600, costFood: 'pie' },
];

export function initHelpers(): void {
  if (!state.helpers) {
    state.helpers = { hired: [] };
  }
}

export function hireHelper(roleId: HelperRole['id']): boolean {
  if (state.level < UNLOCK_LEVEL) {
    toast(`Helpers unlock at level ${UNLOCK_LEVEL}.`);
    return false;
  }
  initHelpers();
  const role = HELPER_ROLES.find(r => r.id === roleId);
  if (!role) return false;
  if (state.helpers!.hired.some(h => h.role === roleId)) {
    toast('You already have one of those.');
    return false;
  }
  if (state.coins < role.costCoins) {
    sfx.cantAfford();
    toast(`Need ${role.costCoins}💰.`);
    return false;
  }
  if ((state.inv[role.costFood] ?? 0) < 1) {
    sfx.cantAfford();
    toast(`Need 1× ${role.costFood} as a packed lunch.`);
    return false;
  }
  state.coins -= role.costCoins;
  removeItem(role.costFood, 1);
  const h: Helper = {
    id: 'h' + Date.now(),
    role: role.id,
    hiredUntil: nowSeconds() + SHIFT_S,
  };
  state.helpers!.hired.push(h);
  sfx.coin();
  toast(`${role.emoji} ${role.name} hired for 4h!`, 'gold');
  track('helper_hired', { role: role.id });
  return true;
}

/** Tick (called from main loop). */
export function tickHelpers(dt: number): void {
  initHelpers();
  const h = state.helpers!;
  const now = nowSeconds();
  // Expire helpers.
  for (let i = h.hired.length - 1; i >= 0; i--) {
    const x = h.hired[i]!;
    if (x.hiredUntil <= now) {
      h.hired.splice(i, 1);
      toast(`Your helper finished their shift.`);
    }
  }
  // Slow-fire passive effects (every ~10s of real time, scaled by dt).
  for (const x of h.hired) {
    if (Math.random() > dt / 10) continue;
    switch (x.role) {
      case 'collector':
        // Tiny chance to drop animal produce.
        if (Math.random() < 0.3) addItem('egg', 1);
        break;
      case 'restocker':
        // Free random bake item every 10s, occasionally.
        if (Math.random() < 0.15) addItem('feed', 1);
        break;
      case 'waterer':
        // No direct payoff — already implicit via faster growth in soil.
        break;
      case 'seller':
        // Tiny passive coin trickle.
        if (Math.random() < 0.2) {
          const c = 4 + Math.floor(Math.random() * 6);
          state.coins += c;
          state.stats.earned += c;
        }
        break;
    }
  }
}

export function activeHelpers(): Helper[] {
  initHelpers();
  return state.helpers!.hired.slice();
}
