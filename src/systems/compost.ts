// =============================================================
//  COMPOST — Phase 15.4 of the roadmap. Convert low-value crops
//  (and the occasional withered crop) into Compost, which feeds
//  the Greenhouse, restores soil fertility, and is itself a
//  useful crafting input.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { track } from './telemetry';
import { nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { CompostRoot } from '../types';

const FERMENT_S = 60 * 30; // 30 minutes wall clock per batch
const BIN_CAP_BASE = 20;

const COMPOST_INPUTS: Record<string, number> = {
  wheat: 1, corn: 1, carrot: 1, tomato: 1, pumpkin: 2,
  strawberry: 1, sugarcane: 2, lavender: 1, blueberry: 1,
  apple: 1, pear: 1,
};

export function initCompost(): void {
  if (!state.compost) {
    state.compost = {
      bin: 0,
      binCap: BIN_CAP_BASE,
      ferment: 0,
      fermentDoneAt: 0,
    };
  }
}

export function isCompostable(itemKey: string): boolean {
  return COMPOST_INPUTS[itemKey] !== undefined;
}

export function compostValue(itemKey: string): number {
  return COMPOST_INPUTS[itemKey] ?? 0;
}

/** Toss `qty` of an item into the bin. */
export function addToCompost(itemKey: string, qty = 1): boolean {
  initCompost();
  const c = state.compost!;
  const value = compostValue(itemKey);
  if (value <= 0) {
    sfx.error();
    toast('That can\'t be composted.');
    return false;
  }
  if ((state.inv[itemKey] ?? 0) < qty) {
    sfx.error();
    toast('Not enough in inventory.');
    return false;
  }
  if (c.bin + value * qty > c.binCap) {
    toast('Compost bin is nearly full — start fermenting first.');
    return false;
  }
  removeItem(itemKey, qty);
  c.bin += value * qty;
  sfx.coin();
  toast(`+${value * qty} compost bin (${c.bin}/${c.binCap})`);
  track('compost_added', { item: itemKey, value: value * qty });
  return true;
}

export function startFermenting(): boolean {
  initCompost();
  const c = state.compost!;
  if (c.bin < 5) {
    toast('Need at least 5 in the bin to start fermenting.');
    return false;
  }
  if (c.ferment > 0) {
    toast('Already fermenting a batch — wait for it to finish.');
    return false;
  }
  c.ferment = c.bin;
  c.fermentDoneAt = nowSeconds() + FERMENT_S;
  c.bin = 0;
  sfx.bell();
  toast(`Fermenting ${c.ferment} compost (ready in 30m).`);
  return true;
}

export function isFermentReady(): boolean {
  initCompost();
  const c = state.compost!;
  return c.ferment > 0 && nowSeconds() >= c.fermentDoneAt;
}

export function collectFerment(): boolean {
  if (!isFermentReady()) return false;
  const c = state.compost!;
  const outQty = Math.max(1, Math.floor(c.ferment / 3));
  addItem('compost', outQty);
  // Bonus fertilizer for big batches.
  if (c.ferment >= 12) addItem('fertilizer', 1);
  toast(`Collected ${outQty} compost${c.ferment >= 12 ? ' + 1 fertilizer' : ''}.`, 'gold');
  track('compost_collected', { qty: outQty });
  c.ferment = 0;
  c.fermentDoneAt = 0;
  sfx.coin();
  return true;
}

export function fermentRemainingS(): number {
  initCompost();
  const c = state.compost!;
  if (c.ferment === 0) return 0;
  return Math.max(0, c.fermentDoneAt - nowSeconds());
}
