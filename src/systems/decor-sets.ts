// =============================================================
//  DECORATION SETS — Phase 13 of the roadmap. Completing a set of
//  related decorations grants a small permanent farm bonus and a
//  cosmetic badge.
// =============================================================

import { state } from '../state';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import type { DecorSetsRoot } from '../types';

export interface DecorSetDef {
  id: string;
  name: string;
  emoji: string;
  members: string[];   // decoration ids that must be placed
  bonus: string;       // human-readable
}

export const DECOR_SETS: Record<string, DecorSetDef> = {
  spring_bloom:    { id: 'spring_bloom',    name: 'Spring Bloom Set',   emoji: '🌸', members: ['flowerbed', 'pinwheel'],     bonus: '+5% yield on flowers' },
  autumn_harvest:  { id: 'autumn_harvest',  name: 'Autumn Harvest Set', emoji: '🍂', members: ['scarecrow', 'lamppost'],     bonus: '-50% crow chance' },
  ranch_comfort:   { id: 'ranch_comfort',   name: 'Ranch Comfort Set',  emoji: '🐮', members: ['bench', 'flowerbed'],        bonus: '+5 animal mood' },
  weather_mage:    { id: 'weather_mage',    name: 'Weather Mage Set',   emoji: '🌦️', members: ['fountain', 'pinwheel'],      bonus: '+10% card duration' },
  village_classic: { id: 'village_classic', name: 'Village Classic',    emoji: '🏛️', members: ['statue', 'gazebo'],          bonus: '+5% visitor tips' },
};

export function initDecorSets(): void {
  if (!state.decorSets) {
    state.decorSets = { collectedSets: {} };
  }
}

/** Check which sets are completed based on placed decor. */
export function refreshSetsAndAnnounce(): void {
  initDecorSets();
  const placed = new Set(state.decor.map(d => d.type));
  for (const id of Object.keys(DECOR_SETS)) {
    const def = DECOR_SETS[id]!;
    const has = def.members.every(m => placed.has(m));
    if (has && !state.decorSets!.collectedSets[id]) {
      state.decorSets!.collectedSets[id] = true;
      track('decor_set_complete', { id });
      toast(`${def.emoji} Decor set complete: ${def.name}! ${def.bonus}`, 'gold');
    }
  }
}

export function collectedSets(): string[] {
  initDecorSets();
  return Object.keys(state.decorSets!.collectedSets);
}
