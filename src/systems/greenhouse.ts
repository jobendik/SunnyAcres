// =============================================================
//  GREENHOUSE — Phase 7 landmark + Phase 15.3 system. Once the
//  Greenhouse landmark is built, the player can plant crops here
//  regardless of season. Greenhouse slots take Compost or
//  Fertilizer as fuel and have a small quality bonus.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { GreenhouseRoot } from '../types';

const BASE_CAP = 4;

export function initGreenhouse(): void {
  if (!state.greenhouse) {
    state.greenhouse = { unlocked: false, slots: [], cap: BASE_CAP };
  }
}

/** Called by landmark system when Greenhouse stage completes. */
export function unlockGreenhouse(): void {
  initGreenhouse();
  if (!state.greenhouse!.unlocked) {
    state.greenhouse!.unlocked = true;
    toast('🌱 The Greenhouse is open! Plant any crop, any season.', 'gold');
    track('greenhouse_unlocked');
  }
}

export function greenhouseSlots(): number {
  initGreenhouse();
  return state.greenhouse!.cap;
}

export function plantInGreenhouse(cropKey: string): boolean {
  initGreenhouse();
  const g = state.greenhouse!;
  if (!g.unlocked) {
    toast('Build the Greenhouse landmark first.');
    return false;
  }
  if (g.slots.length >= g.cap) {
    toast('All greenhouse slots are taken.');
    return false;
  }
  const def = CROPS[cropKey];
  if (!def) return false;
  if (state.level < def.level) {
    toast(`Need level ${def.level} for ${ITEMS[def.item]?.name ?? cropKey}.`);
    return false;
  }
  if (state.coins < def.seedCost) {
    sfx.cantAfford();
    toast(`Need ${def.seedCost}💰 for seeds.`);
    return false;
  }
  // Compost OR Fertilizer fuel.
  const usingCompost = (state.inv['compost'] ?? 0) > 0;
  if (!usingCompost && (state.inv['fertilizer'] ?? 0) === 0) {
    toast('Need 1 compost or fertilizer to plant.');
    return false;
  }
  state.coins -= def.seedCost;
  if (usingCompost) removeItem('compost', 1); else removeItem('fertilizer', 1);
  const now = nowSeconds();
  // Greenhouse grows 25% faster.
  g.slots.push({ cropKey, plantedAt: now, doneAt: now + Math.floor(def.grow * 0.75) });
  sfx.order();
  track('greenhouse_planted', { crop: cropKey });
  return true;
}

export function tickGreenhouseUI(): void {
  // No-op; render reads doneAt directly.
}

export function harvestGreenhouse(idx: number): boolean {
  initGreenhouse();
  const g = state.greenhouse!;
  const slot = g.slots[idx];
  if (!slot) return false;
  if (nowSeconds() < slot.doneAt) {
    toast('Not ready yet.');
    return false;
  }
  const def = CROPS[slot.cropKey];
  if (!def) return false;
  // Yield + small quality boost.
  const yieldQty = def.yieldMin + Math.floor(Math.random() * (def.yieldMax - def.yieldMin + 1)) + 1;
  addItem(def.item, yieldQty);
  addXP(def.xp);
  state.stats.harvested += yieldQty;
  g.slots.splice(idx, 1);
  sfx.coin();
  toast(`🌱 Greenhouse: ${yieldQty}× ${ITEMS[def.item]?.name}`, 'gold');
  track('greenhouse_harvested', { crop: slot.cropKey, qty: yieldQty });
  return true;
}
