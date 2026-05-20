// =============================================================
//  EXPEDITIONS & ENERGY — Phases 11 & 12 of the roadmap.
//
//  Optional exploration side content. Each map is a small graph of
//  nodes the player solves by spending Energy + items. Energy
//  only applies to expeditions — core farming remains free.
//
//  Energy regenerates 1 / 3 minutes (capped at 50). Players can
//  also restore energy by eating produced goods (bread/smoothie/
//  pie/honey/cookie/cake).
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice, randi, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { isPlotClaimed } from './expansion';
import { localDayIndex } from './daily';
import { expeditionEnergyMod } from './tool-shed';
import type { ExpeditionsRoot, ExpeditionMap, ExpeditionNode } from '../types';

const UNLOCK_LEVEL = 20;
const ENERGY_CAP = 50;
const ENERGY_REGEN_S = 180; // 3 min per energy
const DAILY_ENERGY_BONUS = 25;

const FOOD_ENERGY: Record<string, number> = {
  bread: 3, smoothie: 6, pie: 10, honey: 4, cookie: 3, cake: 8,
};

// ---- Map templates ----

interface MapDef {
  id: string;
  name: string;
  emoji: string;
  unlockLevel: number;
  blurb: string;
  // Function returns 4-6 nodes when the map is created.
  build: () => ExpeditionNode[];
}

function mkNode(
  id: string,
  kind: ExpeditionNode['kind'],
  label: string,
  costEnergy: number,
  reward: { coins: number; xp: number; items?: Record<string, number> },
  costItems?: Record<string, number>,
): ExpeditionNode {
  return {
    id, kind, label, costEnergy,
    costItems,
    rewardCoins: reward.coins,
    rewardXp: reward.xp,
    rewardItems: reward.items,
    completed: false,
  };
}

export const MAPS: Record<string, MapDef> = {
  forest_clearing: {
    id: 'forest_clearing', name: 'Forest Clearing', emoji: '🌲',
    unlockLevel: 16, blurb: 'A mossy glade behind the eastern fence.',
    build: () => [
      mkNode('n1', 'clear',  'Bramble Wall',  6, { coins: 80,  xp: 12 }, { axe: 1 }),
      mkNode('n2', 'chest',  'Mossy Chest',   8, { coins: 150, xp: 18, items: { fragment: 2, plank: 1 } }),
      mkNode('n3', 'gather', 'Wild Herbs',    5, { coins: 60,  xp: 10, items: { lavender: 2 } }),
      mkNode('n4', 'clear',  'Fallen Tree',   7, { coins: 100, xp: 15, items: { plank: 2 } }, { saw: 1 }),
      mkNode('n5', 'repair', 'Old Hut',      10, { coins: 250, xp: 30, items: { hinge: 1 } }, { nail: 3, plank: 2 }),
    ],
  },
  misty_lake: {
    id: 'misty_lake', name: 'Misty Lake', emoji: '🌫️',
    unlockLevel: 18, blurb: 'A foggy lake where strange fish bite at dawn.',
    build: () => [
      mkNode('n1', 'fish',   'Lake Edge',     5, { coins: 70, xp: 12, items: { bluefish: 2 } }, { worm: 2 }),
      mkNode('n2', 'fish',   'Deep Spot',     8, { coins: 140, xp: 20, items: { trout: 1 } }, { fly: 2 }),
      mkNode('n3', 'gather', 'Boat Wreck',    6, { coins: 110, xp: 14, items: { plank: 2, rope: 1 } }),
      mkNode('n4', 'puzzle', 'Lake Spirit',  10, { coins: 300, xp: 35, items: { fragment: 3 } }),
    ],
  },
  storm_valley: {
    id: 'storm_valley', name: 'Storm Valley', emoji: '⛈️',
    unlockLevel: 22, blurb: 'A high mountain valley where storms collect.',
    build: () => [
      mkNode('n1', 'clear',  'Lightning Path', 7, { coins: 90,  xp: 14 }, { pickaxe: 1 }),
      mkNode('n2', 'gather', 'Ozone Pool',     6, { coins: 80,  xp: 12, items: { fragment: 1 } }),
      mkNode('n3', 'chest',  'Storm Cache',    9, { coins: 220, xp: 25, items: { fragment: 3, paint: 1 } }),
      mkNode('n4', 'puzzle', 'Tower Glyphs',  12, { coins: 400, xp: 50, items: { fragment: 5 } }),
    ],
  },
  festival_island: {
    id: 'festival_island', name: 'Festival Island', emoji: '🎉',
    unlockLevel: 20, blurb: 'A limited-time island reserved for festival fun.',
    build: () => [
      mkNode('n1', 'gather', 'Lantern Beach',  5, { coins: 100, xp: 12, items: { token: 5 } }),
      mkNode('n2', 'gather', 'Sweet Stand',    6, { coins: 120, xp: 14, items: { honey: 1 } }),
      mkNode('n3', 'chest',  'Fireworks Cache', 8, { coins: 220, xp: 24, items: { token: 10 } }),
      mkNode('n4', 'puzzle', 'Festival Tent', 12, { coins: 350, xp: 40, items: { token: 20, paint: 1 } }),
    ],
  },
  old_orchard_expedition: {
    id: 'old_orchard_expedition', name: 'Old Orchard Restoration', emoji: '🍂',
    unlockLevel: 17, blurb: 'Help restore the orchard you cleared earlier.',
    build: () => [
      mkNode('n1', 'clear',  'Tangled Roots',  6, { coins: 80,  xp: 10 }, { saw: 1 }),
      mkNode('n2', 'gather', 'Fruit Stash',    5, { coins: 90,  xp: 12, items: { apple: 3 } }),
      mkNode('n3', 'repair', 'Old Fence',      8, { coins: 200, xp: 22, items: { rope: 2 } }, { plank: 2, nail: 2 }),
      mkNode('n4', 'chest',  'Pear Hoard',     7, { coins: 160, xp: 18, items: { pear: 3, fragment: 1 } }),
    ],
  },
};

export function initExpeditions(): void {
  if (!state.expeditions) {
    state.expeditions = {
      unlocked: state.level >= UNLOCK_LEVEL,
      energy: ENERGY_CAP,
      energyMax: ENERGY_CAP,
      energyLastRegen: nowSeconds(),
      activeMapId: null,
      maps: {},
      dailyBonusDay: 0,
    };
  }
  if (!state.expeditions.unlocked && state.level >= UNLOCK_LEVEL) {
    state.expeditions.unlocked = true;
    toast('🗺️ Expeditions unlocked! Spend Energy + tools to explore new lands.', 'gold');
    track('expeditions_unlocked');
  }
  // Build any missing maps that the player has unlocked.
  for (const id of Object.keys(MAPS)) {
    const def = MAPS[id]!;
    if (state.level >= def.unlockLevel && !state.expeditions.maps[id]) {
      // Forest Clearing also requires the forest_edge plot.
      if (id === 'forest_clearing' && !isPlotClaimed('forest_edge')) continue;
      state.expeditions.maps[id] = {
        id, name: def.name, emoji: def.emoji,
        unlockLevel: def.unlockLevel,
        nodes: def.build(),
        expiresAt: 0,
      };
    }
  }
}

/** Regenerate energy over time. Call from main tick. */
export function regenerateEnergy(): void {
  const e = state.expeditions; if (!e) return;
  if (e.energy >= e.energyMax) {
    e.energyLastRegen = nowSeconds();
    return;
  }
  const elapsed = nowSeconds() - e.energyLastRegen;
  const tickGain = Math.floor(elapsed / ENERGY_REGEN_S);
  if (tickGain > 0) {
    e.energy = Math.min(e.energyMax, e.energy + tickGain);
    e.energyLastRegen += tickGain * ENERGY_REGEN_S;
  }
}

/** Daily energy bonus. Called from daily tick. */
export function maybeDailyEnergyBonus(): void {
  const e = state.expeditions; if (!e) return;
  const today = localDayIndex();
  if (e.dailyBonusDay !== today) {
    e.dailyBonusDay = today;
    if (e.unlocked) {
      e.energy = Math.min(e.energyMax, e.energy + DAILY_ENERGY_BONUS);
      track('energy_daily_bonus');
    }
  }
}

/** Use a food item to restore energy. */
export function eatForEnergy(itemKey: string): boolean {
  const gain = FOOD_ENERGY[itemKey];
  if (!gain) {
    sfx.error();
    toast('You can\'t eat that for energy.');
    return false;
  }
  if ((state.inv[itemKey] ?? 0) < 1) {
    sfx.error();
    toast(`No ${ITEMS[itemKey]?.name} in your barn.`);
    return false;
  }
  const e = state.expeditions!;
  if (e.energy >= e.energyMax) {
    toast('Energy already full!');
    return false;
  }
  removeItem(itemKey, 1);
  e.energy = Math.min(e.energyMax, e.energy + gain);
  sfx.coin();
  toast(`+${gain} ⚡ from ${ITEMS[itemKey]?.name}`, 'gold');
  track('energy_refilled', { source: itemKey, amount: gain });
  return true;
}

export function currentEnergy(): number {
  return state.expeditions?.energy ?? 0;
}
export function maxEnergy(): number {
  return state.expeditions?.energyMax ?? ENERGY_CAP;
}

export function activeMap(): ExpeditionMap | null {
  const e = state.expeditions;
  if (!e || !e.activeMapId) return null;
  return e.maps[e.activeMapId] ?? null;
}

export function pickMap(mapId: string): boolean {
  const e = state.expeditions; if (!e) return false;
  if (!e.maps[mapId]) return false;
  e.activeMapId = mapId;
  track('expedition_started', { mapId });
  return true;
}

/** Resolve a node — spend energy + items, gain rewards, mark complete. */
export function clearNode(mapId: string, nodeId: string): boolean {
  const e = state.expeditions; if (!e) return false;
  const map = e.maps[mapId]; if (!map) return false;
  const node = map.nodes.find(n => n.id === nodeId);
  if (!node || node.completed) return false;
  const actualEnergy = Math.max(1, Math.ceil(node.costEnergy * expeditionEnergyMod()));
  if (e.energy < actualEnergy) {
    sfx.error();
    toast(`Need ${actualEnergy} ⚡ energy. You have ${e.energy}.`);
    return false;
  }
  if (node.costItems) {
    for (const k in node.costItems) {
      if ((state.inv[k] ?? 0) < node.costItems[k]!) {
        sfx.error();
        toast(`Need ${node.costItems[k]}× ${ITEMS[k]?.name ?? k}.`);
        return false;
      }
    }
  }
  // Spend.
  e.energy -= actualEnergy;
  track('energy_spent', { amount: actualEnergy });
  if (node.costItems) for (const k in node.costItems) removeItem(k, node.costItems[k]!);
  // Reward.
  state.coins += node.rewardCoins;
  state.stats.earned += node.rewardCoins;
  addXP(node.rewardXp);
  if (node.rewardItems) {
    for (const k in node.rewardItems) addItem(k, node.rewardItems[k]!);
  }
  node.completed = true;
  sfx.coin();
  toast(`${map.emoji} ${node.label} cleared! +${node.rewardCoins}💰 +${node.rewardXp}XP`, 'gold');
  track('expedition_node_cleared', { mapId, kind: node.kind });
  // All nodes done?
  if (map.nodes.every(n => n.completed)) {
    // Big bonus, then regenerate the map after a day.
    const bonus = 300 + randi(200);
    state.coins += bonus;
    state.stats.earned += bonus;
    addItem('fragment', 3);
    track('expedition_completed', { mapId });
    toast(`🎉 Expedition complete: ${map.name}! +${bonus}💰 + 3 fragments`, 'gold');
    // Regenerate nodes for next time.
    setTimeout(() => {
      const def = MAPS[mapId];
      if (def && state.expeditions?.maps[mapId]) {
        state.expeditions.maps[mapId]!.nodes = def.build();
      }
    }, 1500);
    e.activeMapId = null;
  }
  return true;
}
