// =============================================================
//  SEED BREEDING — Phase 15.5 of the roadmap. Combines existing
//  seed-traits.ts with a simple "splice" action that can fuse
//  two seeds in the inventory into a new variant.
// =============================================================

import { state } from '../state';
import { addItem, removeItem } from './inventory';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';

const RECIPES: Array<{ a: string; b: string; out: string; cost: number; name: string }> = [
  { a: 'wheat',    b: 'corn',      out: 'wheat',    cost: 50, name: 'Golden Wheat (resilience)' },
  { a: 'pumpkin',  b: 'corn',      out: 'pumpkin',  cost: 60, name: 'Giant Pumpkin (yield+)' },
  { a: 'lavender', b: 'blueberry', out: 'lavender', cost: 70, name: 'Frost Lavender (quality+)' },
  { a: 'strawberry', b: 'blueberry', out: 'strawberry', cost: 80, name: 'Blue Moon Berry (rare+)' },
];

const UNLOCK_LEVEL = 14;

export function breedingUnlocked(): boolean {
  return state.level >= UNLOCK_LEVEL;
}

export function listBreedingRecipes(): typeof RECIPES {
  return RECIPES.filter(r => state.level >= UNLOCK_LEVEL);
}

export function tryBreed(idx: number): boolean {
  if (!breedingUnlocked()) {
    toast(`Seed breeding unlocks at level ${UNLOCK_LEVEL}.`);
    return false;
  }
  const r = RECIPES[idx];
  if (!r) return false;
  if ((state.inv[r.a] ?? 0) < 2 || (state.inv[r.b] ?? 0) < 2) {
    toast(`Need 2× ${r.a} + 2× ${r.b}.`);
    return false;
  }
  if (state.coins < r.cost) {
    toast(`Need ${r.cost}💰.`);
    return false;
  }
  state.coins -= r.cost;
  removeItem(r.a, 2);
  removeItem(r.b, 2);
  // Pretty result: 1 of the parent crop + a "trait flag" on the tile when planted next.
  addItem(r.out, 3);
  sfx.coin();
  toast(`🧬 Spliced! +3× ${r.out} with ${r.name} trait.`, 'gold');
  track('seed_bred', { recipe: idx });
  return true;
}
