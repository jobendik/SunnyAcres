// =============================================================
//  FARM REPUTATION — Phase 15.8 of the roadmap. An aggregate
//  long-term score that combines orders, market sales, beauty
//  score, village reputation, club contribution, and event
//  participation. Tiered for HUD display and a few light bonuses.
// =============================================================

import { state } from '../state';
import { beautyScore } from './beautification';
import { villageReputation } from './village';
import type { ReputationRoot } from '../types';

const TIERS = [
  { name: 'Unknown Farm',   min: 0 },
  { name: 'Local Favorite', min: 500 },
  { name: 'Sunny Supplier', min: 2000 },
  { name: 'Village Hero',   min: 5000 },
  { name: 'Legendary Acres', min: 12000 },
];

export function initReputation(): void {
  if (!state.reputation) {
    state.reputation = { score: 0, tier: 0, lastUpdate: 0 };
  }
}

export function computeReputation(): number {
  const orders = state.stats.ordersFulfilled * 8;
  const sold = state.stats.sold * 1;
  const beauty = beautyScore() * 2;
  const village = villageReputation() * 2;
  const club = state.club?.totalContribution ? state.club.totalContribution * 1 : 0;
  const stallSales = state.marketStall?.lifetimeSales ?? 0;
  const eventsDone = (state.liveEvent?.history.length ?? 0) * 100;
  return orders + sold + beauty + village + club + stallSales + eventsDone;
}

export function refreshReputation(): void {
  initReputation();
  const r = state.reputation!;
  r.score = computeReputation();
  let tier = 0;
  for (let i = 0; i < TIERS.length; i++) if (r.score >= TIERS[i]!.min) tier = i;
  r.tier = tier;
}

export function repTier(): { name: string; pct: number; next: string | null } {
  refreshReputation();
  const r = state.reputation!;
  const cur = TIERS[r.tier]!;
  const next = r.tier < TIERS.length - 1 ? TIERS[r.tier + 1]! : null;
  const pct = next ? Math.min(100, ((r.score - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { name: cur.name, pct, next: next?.name ?? null };
}

/** Light global bonus: 1% extra coin per tier above 0, capped at +5%. */
export function reputationCoinBonus(): number {
  refreshReputation();
  return Math.min(0.05, state.reputation!.tier * 0.01);
}
