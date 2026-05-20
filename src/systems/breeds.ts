// =============================================================
//  ANIMAL BREEDS — Phase 15.6 of the roadmap. Each pen building
//  can house a specific breed that grants a small modifier.
// =============================================================

import { state } from '../state';
import { track } from './telemetry';
import type { AnimalBreedRoot } from '../types';

export interface BreedDef {
  id: string;
  name: string;
  parent: string;            // ANIMALS key it refines (e.g. 'chicken')
  speedMod: number;          // produceTime multiplier (lower = faster)
  yieldMod: number;          // additional yield chance
  unlockLevel: number;
  emoji: string;
}

export const BREEDS: Record<string, BreedDef> = {
  basic_chicken:    { id: 'basic_chicken',    name: 'Basic Hen',     parent: 'chicken', speedMod: 1.00, yieldMod: 0.00, unlockLevel: 3, emoji: '🐔' },
  speckled_chicken: { id: 'speckled_chicken', name: 'Speckled Hen',  parent: 'chicken', speedMod: 0.92, yieldMod: 0.05, unlockLevel: 7, emoji: '🐓' },
  golden_hen:       { id: 'golden_hen',       name: 'Golden Hen',    parent: 'chicken', speedMod: 0.85, yieldMod: 0.15, unlockLevel: 12, emoji: '🌟' },
  basic_cow:        { id: 'basic_cow',        name: 'Holstein',      parent: 'cow',     speedMod: 1.00, yieldMod: 0.00, unlockLevel: 4, emoji: '🐄' },
  jersey_cow:       { id: 'jersey_cow',       name: 'Jersey Cow',    parent: 'cow',     speedMod: 0.90, yieldMod: 0.10, unlockLevel: 9, emoji: '🐮' },
  basic_sheep:      { id: 'basic_sheep',      name: 'Suffolk Sheep', parent: 'sheep',   speedMod: 1.00, yieldMod: 0.00, unlockLevel: 6, emoji: '🐑' },
  merino_sheep:     { id: 'merino_sheep',     name: 'Merino Sheep',  parent: 'sheep',   speedMod: 0.92, yieldMod: 0.08, unlockLevel: 11, emoji: '🐏' },
  basic_pig:        { id: 'basic_pig',        name: 'Berkshire Pig', parent: 'pig',     speedMod: 1.00, yieldMod: 0.00, unlockLevel: 8, emoji: '🐖' },
  basic_goat:       { id: 'basic_goat',       name: 'Alpine Goat',   parent: 'goat',    speedMod: 1.00, yieldMod: 0.00, unlockLevel: 5, emoji: '🐐' },
};

export function initBreeds(): void {
  if (!state.breeds) {
    state.breeds = { byPen: {}, unlocked: { basic_chicken: true, basic_cow: true, basic_sheep: true, basic_pig: true, basic_goat: true } };
  }
  // Auto-unlock all basic breeds.
  for (const id of Object.keys(BREEDS)) {
    const b = BREEDS[id]!;
    if (b.id.startsWith('basic_')) state.breeds!.unlocked[id] = true;
    if (state.level >= b.unlockLevel) state.breeds!.unlocked[id] = true;
  }
}

export function penBreed(buildingId: string): BreedDef | null {
  initBreeds();
  const id = state.breeds!.byPen[buildingId];
  return id ? BREEDS[id] ?? null : null;
}

export function setPenBreed(buildingId: string, breedId: string): boolean {
  initBreeds();
  const b = BREEDS[breedId];
  if (!b) return false;
  if (!state.breeds!.unlocked[breedId]) return false;
  state.breeds!.byPen[buildingId] = breedId;
  track('breed_set', { buildingId, breedId });
  return true;
}

/** Modifier helpers used by pen production. */
export function breedSpeedMod(buildingId: string): number {
  return penBreed(buildingId)?.speedMod ?? 1;
}
export function breedYieldChance(buildingId: string): number {
  return penBreed(buildingId)?.yieldMod ?? 0;
}

export function breedsForParent(animal: string): BreedDef[] {
  return Object.values(BREEDS).filter(b => b.parent === animal);
}
