// =============================================================
//  BUILDING UPGRADES — Phase 6 of the roadmap. Per-instance
//  upgrade level for production buildings. Levels grant queue
//  slot increases and a speed multiplier.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import { removeItem } from './inventory';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { BuildingUpgradeRoot, MaterialKey } from '../types';

const MAX_LEVEL = 5;

export function initBuildingUpgrades(): void {
  if (!state.buildingUpgrades) {
    state.buildingUpgrades = { byBuildingId: {} };
  }
}

export function buildingLevel(buildingId: string): number {
  initBuildingUpgrades();
  return state.buildingUpgrades!.byBuildingId[buildingId] ?? 1;
}

export function buildingUpgradeCost(buildingId: string): { coins: number; mats: Partial<Record<MaterialKey, number>> } | null {
  const lvl = buildingLevel(buildingId);
  if (lvl >= MAX_LEVEL) return null;
  return {
    coins: 400 + lvl * 350,
    mats: {
      plank: 1 + lvl,
      screw: lvl,
      ...(lvl >= 2 ? { paint: 1 } : {}),
      ...(lvl >= 3 ? { hinge: 1 } : {}),
    },
  };
}

export function upgradeBuildingInstance(buildingId: string): boolean {
  initBuildingUpgrades();
  const cost = buildingUpgradeCost(buildingId);
  if (!cost) {
    toast('Already at max level.');
    return false;
  }
  if (state.coins < cost.coins) {
    sfx.cantAfford();
    toast(`Need ${cost.coins}💰.`);
    return false;
  }
  for (const k in cost.mats) {
    const need = cost.mats[k as MaterialKey]!;
    if ((state.inv[k] ?? 0) < need) {
      sfx.cantAfford();
      toast(`Need ${need}× ${ITEMS[k]?.name ?? k}.`);
      return false;
    }
  }
  state.coins -= cost.coins;
  for (const k in cost.mats) removeItem(k, cost.mats[k as MaterialKey]!);
  state.buildingUpgrades!.byBuildingId[buildingId] = buildingLevel(buildingId) + 1;
  sfx.bell();
  const b = state.buildings.find(x => x.id === buildingId);
  const name = b ? BUILDINGS[b.type]?.name : 'Building';
  toast(`${name} upgraded to Lv ${buildingLevel(buildingId)}!`, 'gold');
  track('building_upgraded', { buildingId, lvl: buildingLevel(buildingId) });
  return true;
}

/** Speed multiplier applied to a building's production time. */
export function buildingSpeedMod(buildingId: string): number {
  const lvl = buildingLevel(buildingId);
  // 0% / 5% / 10% / 15% / 20% / 25% reduction
  return 1 - Math.min(0.25, (lvl - 1) * 0.05);
}

/** Extra queue slots from upgrades. */
export function buildingQueueBonus(buildingId: string): number {
  const lvl = buildingLevel(buildingId);
  return Math.floor((lvl - 1) / 2);  // +1 every 2 levels
}
