// =============================================================
//  WEATHER CARD FUSION — Phase 15.9 of the roadmap. Players
//  collect Weather Fragments (from balloon, expeditions, plot
//  clearing) and fuse them into existing or new cards.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { removeItem } from './inventory';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { WEATHER_CARDS } from '../data/weather-cards';
import type { CardFusionRoot } from '../types';

const FUSION_RECIPES: Array<{ in: string[]; out: string; cost: number }> = [
  // Each entry: combine 2 cards (by id) and fragments to "fuse" into a stronger one.
  { in: ['rainmaker', 'bountiful'], out: 'bloom_shower',     cost: 6 },
  { in: ['sunbeam',   'marketwind'], out: 'harvest_sale',    cost: 8 },
  { in: ['breeze',    'serenity'],   out: 'pasture_blessing', cost: 6 },
  { in: ['hightide',  'thunderhead'], out: 'rare_catch_night', cost: 8 },
];

export function initCardFusion(): void {
  if (!state.cardFusion) {
    state.cardFusion = { fragments: 0, fusedCards: [] };
  }
}

/** Convenience: how many fragments are in the inventory? */
export function fragmentCount(): number {
  return state.inv['fragment'] ?? 0;
}

export function availableRecipes(): Array<{ in: string[]; out: string; cost: number; outName: string }> {
  initCardFusion();
  const cards = state.weatherGrid?.ownedCards ?? [];
  return FUSION_RECIPES
    .filter(r => r.in.every(id => cards.includes(id)))
    .map(r => ({
      ...r,
      outName: WEATHER_CARDS[r.out]?.name ?? r.out,
    }));
}

/** Attempt a fusion. Returns true on success. */
export function fuseCards(recipeIdx: number): boolean {
  initCardFusion();
  const list = availableRecipes();
  const r = list[recipeIdx];
  if (!r) return false;
  if ((state.inv['fragment'] ?? 0) < r.cost) {
    sfx.cantAfford();
    toast(`Need ${r.cost} fragments — you have ${fragmentCount()}.`);
    return false;
  }
  const wg = state.weatherGrid; if (!wg) return false;
  removeItem('fragment', r.cost);
  // Consume input cards (one-time fusion).
  for (const id of r.in) {
    const idx = wg.ownedCards.indexOf(id);
    if (idx >= 0) wg.ownedCards.splice(idx, 1);
  }
  if (!wg.ownedCards.includes(r.out)) wg.ownedCards.push(r.out);
  state.cardFusion!.fusedCards.push(r.out);
  sfx.bell();
  toast(`✨ Fused new Weather Card: ${WEATHER_CARDS[r.out]?.name ?? r.out}!`, 'gold');
  track('card_fused', { out: r.out });
  return true;
}
