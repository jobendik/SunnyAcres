// =============================================================
//  VISITOR SYSTEM 2.0 — Phase 15.7 of the roadmap. Walk-on
//  visitors who request a small item in exchange for a tip.
//
//  The legacy "async visitor" who leaves an overnight gift lives
//  in `visitors.ts`. This adds *active* walking customers.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice, randi, nowSeconds, rand } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { bumpReputation } from './village';
import type { ActiveVisitor, VisitorsRootV2 } from '../types';

const UNLOCK_LEVEL = 5;
const VISITOR_LIFETIME_S = 90;
const SPAWN_MIN_S = 60 * 4;   // 4 min
const SPAWN_RAND_S = 60 * 6;  // +0..6 min

const NAMES = [
  { name: 'Tara',  emoji: '👧', desc: 'curious child', tip: 0.3 },
  { name: 'Ozzy',  emoji: '👨', desc: 'busy chef',     tip: 0.5 },
  { name: 'Bea',   emoji: '👩', desc: 'tourist',       tip: 0.7 },
  { name: 'Wes',   emoji: '👨‍🌾', desc: 'farmhand',     tip: 0.2 },
  { name: 'Lyra',  emoji: '🧝‍♀️', desc: 'merchant',     tip: 0.4 },
];

const REQUESTABLE_ITEMS = ['egg', 'milk', 'bread', 'apple', 'cookie', 'honey', 'jam', 'cheese', 'pie'];

export function initVisitorsV2(): void {
  if (!state.visitorsV2) {
    state.visitorsV2 = {
      active: [],
      nextSpawnAt: nowSeconds() + SPAWN_MIN_S,
      totalServed: 0,
    };
  }
}

function spawnVisitor(): void {
  initVisitorsV2();
  const v = state.visitorsV2!;
  if (v.active.length >= 3) return;
  const eligible = REQUESTABLE_ITEMS.filter(k => ITEMS[k]!.level <= state.level);
  if (eligible.length === 0) return;
  const itemKey = choice(eligible);
  const persona = choice(NAMES);
  const qty = 1 + randi(2);
  const baseReward = Math.floor((ITEMS[itemKey]?.sell ?? 0) * qty * 1.5);
  v.active.push({
    id: 'vv' + Date.now() + randi(1e6),
    name: persona.name,
    emoji: persona.emoji,
    itemKey,
    qty,
    reward: baseReward,
    tipChance: persona.tip,
    arrivedAt: nowSeconds(),
    expiresAt: nowSeconds() + VISITOR_LIFETIME_S,
    served: false,
  });
  track('visitor_v2_spawned', { item: itemKey, qty });
}

export function tickVisitorsV2(): void {
  if (state.level < UNLOCK_LEVEL) return;
  initVisitorsV2();
  const v = state.visitorsV2!;
  const now = nowSeconds();
  // Prune expired.
  for (let i = v.active.length - 1; i >= 0; i--) {
    if (v.active[i]!.expiresAt <= now) {
      v.active.splice(i, 1);
    }
  }
  if (now >= v.nextSpawnAt) {
    v.nextSpawnAt = now + SPAWN_MIN_S + rand(SPAWN_RAND_S);
    spawnVisitor();
  }
}

export function activeVisitors(): ActiveVisitor[] {
  initVisitorsV2();
  return state.visitorsV2!.active.slice();
}

export function serveVisitor(id: string): boolean {
  const v = state.visitorsV2; if (!v) return false;
  const visitor = v.active.find(x => x.id === id);
  if (!visitor || visitor.served) return false;
  if ((state.inv[visitor.itemKey] ?? 0) < visitor.qty) {
    sfx.error();
    toast(`Need ${visitor.qty}× ${ITEMS[visitor.itemKey]?.name}.`);
    return false;
  }
  removeItem(visitor.itemKey, visitor.qty);
  let reward = visitor.reward;
  let tipped = false;
  if (Math.random() < visitor.tipChance) {
    reward = Math.floor(reward * 1.5);
    tipped = true;
  }
  state.coins += reward;
  state.stats.earned += reward;
  addXP(Math.max(2, Math.floor(reward / 12)));
  visitor.served = true;
  v.totalServed += 1;
  bumpReputation(2);
  sfx.coin();
  toast(`${visitor.emoji} ${visitor.name}: +${reward}💰${tipped ? ' (great tip!)' : ''}`, 'gold');
  track('visitor_v2_served', { item: visitor.itemKey, reward, tipped });
  // Remove from active list shortly.
  setTimeout(() => {
    const idx = v.active.findIndex(x => x.id === id);
    if (idx >= 0) v.active.splice(idx, 1);
  }, 800);
  return true;
}

export function dismissVisitor(id: string): void {
  const v = state.visitorsV2; if (!v) return;
  const idx = v.active.findIndex(x => x.id === id);
  if (idx >= 0) v.active.splice(idx, 1);
}
