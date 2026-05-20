// =============================================================
//  BULK ACTIONS — Phase 15.12 of the roadmap. Late-game quality
//  of life. Unlocked at level 12+. Provides single-call helpers
//  to plant, harvest, and collect across the whole farm.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import { addItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';

const UNLOCK_LEVEL = 12;

export function bulkActionsUnlocked(): boolean {
  return state.level >= UNLOCK_LEVEL;
}

/** Plant the currently-selected seed on every plowed-and-empty tile. */
export function bulkPlantSelected(): number {
  if (!bulkActionsUnlocked()) { toast('Bulk actions unlock at level 12.'); return 0; }
  const seed = state.selectedSeed;
  const def = CROPS[seed];
  if (!def) return 0;
  let planted = 0;
  for (const row of state.grid) {
    for (const t of row) {
      if (t.type !== 'plowed' || t.crop || t.building) continue;
      if (state.coins < def.seedCost) break;
      state.coins -= def.seedCost;
      t.crop = seed;
      t.plantedAt = nowSeconds();
      state.stats.planted += 1;
      planted += 1;
    }
  }
  if (planted > 0) {
    sfx.order();
    toast(`🌱 Bulk plant: ${planted}× ${ITEMS[def.item]?.name ?? seed}`);
    track('bulk_plant', { qty: planted, seed });
  } else {
    toast('No empty plowed tiles to plant on.');
  }
  return planted;
}

/** Harvest all ready crops. Returns how many were harvested. */
export function bulkHarvestReady(): number {
  if (!bulkActionsUnlocked()) { toast('Bulk actions unlock at level 12.'); return 0; }
  const now = nowSeconds();
  let n = 0;
  for (const row of state.grid) {
    for (const t of row) {
      if (!t.crop) continue;
      const def = CROPS[t.crop]; if (!def) continue;
      const grown = now - t.plantedAt >= def.grow;
      if (!grown) continue;
      const yieldQty = def.yieldMin + Math.floor(Math.random() * (def.yieldMax - def.yieldMin + 1));
      addItem(def.item, yieldQty);
      addXP(def.xp);
      state.stats.harvested += yieldQty;
      t.crop = null;
      t.plantedAt = 0;
      n += 1;
    }
  }
  if (n > 0) {
    sfx.coin();
    toast(`🌾 Bulk harvest: ${n} tiles.`);
    track('bulk_harvest', { qty: n });
  } else {
    toast('Nothing is ready yet.');
  }
  return n;
}

/** Claim all completed production jobs across all buildings. */
export function bulkClaimProduction(): number {
  if (!bulkActionsUnlocked()) { toast('Bulk actions unlock at level 12.'); return 0; }
  const now = nowSeconds();
  let total = 0;
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]; if (!def || def.kind !== 'production') continue;
    const q = state.prodQueues[b.id]; if (!q) continue;
    for (let i = q.length - 1; i >= 0; i--) {
      const job = q[i]!;
      if (job.doneAt > now) continue;
      const recipe = def.recipes?.[job.recipeIdx]; if (!recipe) continue;
      for (const k in recipe.out) addItem(k, recipe.out[k]!);
      addXP(recipe.xp);
      state.stats.produced += 1;
      for (const k in recipe.out) state.stats.itemsProduced[k] = (state.stats.itemsProduced[k] ?? 0) + recipe.out[k]!;
      q.splice(i, 1);
      total += 1;
    }
  }
  if (total > 0) {
    sfx.coin();
    toast(`🏭 Claimed ${total} finished items.`);
    track('bulk_claim_production', { qty: total });
  } else {
    toast('No finished production to claim.');
  }
  return total;
}
