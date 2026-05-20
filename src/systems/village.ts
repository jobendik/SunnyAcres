// =============================================================
//  VILLAGE HUB — Phase 10 of the roadmap. A lightweight world
//  hub around the farm. The village has named "nodes" (Square,
//  Bakery Corner, Dock, Carpenter, Market Street, Train Station,
//  Animal Fairground, Weather Tower) that the player visits.
//
//  Each node either opens an existing panel or grants a small
//  daily reward (visit bonus). Village Reputation tracks
//  cumulative engagement and ladders unlock new nodes.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { rand, randi } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { localDayIndex } from './daily';
import type { VillageRoot } from '../types';

export interface VillageNode {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  unlockLevel: number;
  unlockReputation: number;
  opensPanel?: 'gazette' | 'boat' | 'train' | 'landmark' | 'friendship' | 'stall' | 'weather-grid' | 'club';
}

export const VILLAGE_NODES: Record<string, VillageNode> = {
  square: {
    id: 'square', name: 'Village Square', emoji: '🏛️',
    blurb: 'Daily notices and a friendly crowd.',
    unlockLevel: 1, unlockReputation: 0,
    opensPanel: 'gazette',
  },
  bakery_corner: {
    id: 'bakery_corner', name: 'Bakery Corner', emoji: '🥐',
    blurb: 'The village bakery — Maple\'s pride and joy.',
    unlockLevel: 4, unlockReputation: 0,
    opensPanel: 'friendship',
  },
  dock: {
    id: 'dock', name: 'Fisherman\'s Dock', emoji: '⚓',
    blurb: 'Boats arrive here with crates to fill.',
    unlockLevel: 9, unlockReputation: 0,
    opensPanel: 'boat',
  },
  market_street: {
    id: 'market_street', name: 'Market Street', emoji: '🛒',
    blurb: 'The town stall and traveling merchants.',
    unlockLevel: 4, unlockReputation: 0,
    opensPanel: 'stall',
  },
  tower: {
    id: 'tower', name: 'Weather Tower', emoji: '🗼',
    blurb: 'Climb the tower to study the sky.',
    unlockLevel: 5, unlockReputation: 0,
    opensPanel: 'weather-grid',
  },
  carpenter: {
    id: 'carpenter', name: 'Carpenter\'s Yard', emoji: '🪚',
    blurb: 'Where the village restoration projects begin.',
    unlockLevel: 7, unlockReputation: 0,
    opensPanel: 'landmark',
  },
  station: {
    id: 'station', name: 'Train Station', emoji: '🚉',
    blurb: 'Long-haul cargo to and from Sunny Valley.',
    unlockLevel: 13, unlockReputation: 200,
    opensPanel: 'train',
  },
  fairground: {
    id: 'fairground', name: 'Animal Fairground', emoji: '🐮',
    blurb: 'Where ranchers gather for the weekly fair.',
    unlockLevel: 8, unlockReputation: 50,
    // No panel — gives daily bonus instead.
  },
  club_hall: {
    id: 'club_hall', name: 'Club Hall', emoji: '🏆',
    blurb: 'The Sunny Acres Farming Club\'s headquarters.',
    unlockLevel: 15, unlockReputation: 300,
    opensPanel: 'club',
  },
};

const REP_TIERS = [
  { name: 'Stranger',   min: 0 },
  { name: 'Local',      min: 100 },
  { name: 'Friend',     min: 300 },
  { name: 'Hero',       min: 600 },
  { name: 'Legend',     min: 1000 },
];

export function initVillage(): void {
  if (!state.village) {
    state.village = { reputation: 0, visitedToday: {}, lastVisitDay: 0 };
  }
  // Reset daily-visit map at start of new day.
  const today = localDayIndex();
  if (state.village.lastVisitDay !== today) {
    state.village.lastVisitDay = today;
    state.village.visitedToday = {};
  }
}

export function villageReputation(): number {
  initVillage();
  return state.village!.reputation;
}

export function reputationTierName(): string {
  const r = villageReputation();
  let name = REP_TIERS[0]!.name;
  for (const t of REP_TIERS) {
    if (r >= t.min) name = t.name;
  }
  return name;
}

export function reputationTierProgress(): { name: string; pct: number; next: string | null } {
  const r = villageReputation();
  let cur = REP_TIERS[0]!;
  for (const t of REP_TIERS) if (r >= t.min) cur = t;
  const idx = REP_TIERS.indexOf(cur);
  const next = idx < REP_TIERS.length - 1 ? REP_TIERS[idx + 1]! : null;
  const pct = next ? Math.min(100, ((r - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { name: cur.name, pct, next: next?.name ?? null };
}

export function bumpReputation(amount: number): void {
  initVillage();
  state.village!.reputation = Math.max(0, state.village!.reputation + amount);
}

/** Is a node currently unlocked? */
export function isNodeUnlocked(id: string): boolean {
  const def = VILLAGE_NODES[id]; if (!def) return false;
  return state.level >= def.unlockLevel && villageReputation() >= def.unlockReputation;
}

/** Has node been visited today? */
export function isNodeVisitedToday(id: string): boolean {
  initVillage();
  return !!state.village!.visitedToday[id];
}

/** Visit a node — collect the daily bonus once per day, then return
 *  the panel id to open (if any). */
export function visitNode(id: string): { opensPanel?: string; gained?: string } {
  initVillage();
  const def = VILLAGE_NODES[id];
  if (!def) return {};
  if (!isNodeUnlocked(id)) {
    sfx.error();
    toast(def.unlockReputation > 0 ? `Need reputation ${def.unlockReputation} — keep helping the village.` : `Unlocks at level ${def.unlockLevel}.`);
    return {};
  }
  let gained = '';
  if (!state.village!.visitedToday[id]) {
    state.village!.visitedToday[id] = true;
    bumpReputation(2);
    // Small bonus.
    if (id === 'fairground') {
      addItem('feed', 2 + randi(3));
      gained = '+2-4 feed';
    } else if (id === 'square') {
      const c = 20 + randi(40);
      state.coins += c;
      state.stats.earned += c;
      gained = `+${c}💰`;
    } else if (Math.random() < 0.4) {
      // 40% chance of XP/tip.
      const xp = 4 + randi(6);
      addXP(xp);
      gained = `+${xp} XP`;
    }
    if (gained) {
      sfx.coin();
      toast(`${def.emoji} ${def.name} — ${gained}`, 'gold');
      track('village_node_visited', { id, gained });
    } else {
      toast(`${def.emoji} You visit ${def.name}. (+2 rep)`, 'gold');
      track('village_node_visited', { id });
    }
  }
  return { opensPanel: def.opensPanel, gained };
}

/** Convenience hook for other systems to record village engagement. */
export function recordVillageEngagement(reason: string): void {
  initVillage();
  let amt = 0;
  switch (reason) {
    case 'order':              amt = 2; break;
    case 'help_request':       amt = 3; break;
    case 'landmark_stage':     amt = 8; break;
    case 'boat_full':          amt = 5; break;
    case 'train_return':       amt = 3; break;
    case 'festival_full':      amt = 10; break;
    case 'club_milestone':     amt = 6; break;
  }
  if (amt > 0) bumpReputation(amt);
}
