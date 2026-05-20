// =============================================================
//  FESTIVAL CART — Phase 4 of the roadmap. A weekly themed cart
//  that appears each week with a rotating theme (baking, orchard,
//  ranching, fishing, craft). Delivering themed goods earns
//  Festival Tokens (the live-event currency) and XP.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice, randi, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { weekIndex } from './weekly';
import type { FestivalCartRoot, BalloonRequest } from '../types';

const UNLOCK_LEVEL = 6;

const THEMES: Record<string, { name: string; emoji: string; items: string[] }> = {
  baking:   { name: 'Baking Bonanza',  emoji: '🥐', items: ['bread', 'flour', 'cookie', 'cake', 'pie', 'butter'] },
  orchard:  { name: 'Orchard Week',    emoji: '🍎', items: ['apple', 'pear', 'juice', 'jam', 'pie'] },
  ranching: { name: 'Ranchers Week',   emoji: '🐮', items: ['milk', 'egg', 'cheese', 'wool', 'bacon', 'yogurt'] },
  fishing:  { name: 'Fishing Festival', emoji: '🎣', items: ['bluefish', 'trout', 'goldfish', 'bread'] },
  craft:    { name: 'Craft Carnival',  emoji: '🧵', items: ['cloth', 'candle', 'perfume', 'honey'] },
  harvest:  { name: 'Harvest Hustle',  emoji: '🌽', items: ['wheat', 'corn', 'carrot', 'tomato', 'pumpkin'] },
};
const THEME_IDS = Object.keys(THEMES);

const WEEK_S = 7 * 24 * 60 * 60;

export function initFestivalCart(): void {
  if (!state.festivalCart) {
    state.festivalCart = {
      unlocked: state.level >= UNLOCK_LEVEL,
      themeId: 'baking',
      weekIndex: weekIndex(),
      requests: [],
      delivered: {},
      points: 0,
      pointGoal: 0,
      rewardClaimed: false,
      endsAt: nowSeconds() + WEEK_S,
    };
    rolloverCart(true);
  }
  // Unlock once eligible.
  if (!state.festivalCart.unlocked && state.level >= UNLOCK_LEVEL) {
    state.festivalCart.unlocked = true;
    rolloverCart(true);
    toast('🎪 The Festival Cart now rolls through every week! Tap to see what they need.', 'gold');
  }
}

function rolloverCart(force: boolean): void {
  const c = state.festivalCart!;
  const wk = weekIndex();
  if (!force && c.weekIndex === wk) return;
  c.weekIndex = wk;
  c.themeId = choice(THEME_IDS);
  const theme = THEMES[c.themeId]!;
  const eligible = theme.items.filter(k => ITEMS[k] && ITEMS[k]!.level <= state.level);
  const pickFrom = eligible.length > 0 ? eligible : theme.items.slice();
  const count = Math.min(4, 2 + randi(2));
  const seen = new Set<string>();
  const reqs: BalloonRequest[] = [];
  for (let i = 0; i < count; i++) {
    let k = choice(pickFrom);
    let tries = 0;
    while (seen.has(k) && tries < 5) { k = choice(pickFrom); tries++; }
    seen.add(k);
    reqs.push({ itemKey: k, qty: 3 + randi(5) });
  }
  c.requests = reqs;
  c.delivered = {};
  c.points = 0;
  c.pointGoal = reqs.reduce((s, r) => s + r.qty, 0);
  c.rewardClaimed = false;
  c.endsAt = nowSeconds() + WEEK_S;
  track('festival_cart_rolled', { theme: c.themeId });
}

export function maybeRolloverCart(): void {
  initFestivalCart();
  rolloverCart(false);
}

export function festivalCartTheme(): { id: string; name: string; emoji: string } {
  initFestivalCart();
  const t = THEMES[state.festivalCart!.themeId]!;
  return { id: state.festivalCart!.themeId, name: t.name, emoji: t.emoji };
}

/** Try to deliver `qty` of `itemKey`. Excess auto-truncates. */
export function deliverToCart(itemKey: string, qty: number): boolean {
  const c = state.festivalCart;
  if (!c || !c.unlocked) return false;
  const req = c.requests.find(r => r.itemKey === itemKey);
  if (!req) return false;
  const have = state.inv[itemKey] ?? 0;
  const already = c.delivered[itemKey] ?? 0;
  const room = req.qty - already;
  const give = Math.min(qty, room, have);
  if (give <= 0) {
    sfx.error();
    toast(room <= 0 ? 'Already fulfilled.' : 'Not enough in inventory.');
    return false;
  }
  removeItem(itemKey, give);
  c.delivered[itemKey] = already + give;
  c.points += give;
  // Reward per unit: 1 token, +small coins, +small XP.
  addItem('token', give);
  const coinReward = give * (ITEMS[itemKey]?.sell ?? 0);
  state.coins += coinReward;
  state.stats.earned += coinReward;
  addXP(give * 2);
  sfx.order();
  track('festival_cart_delivered', { itemKey, give });
  // Full reward at completion.
  if (c.points >= c.pointGoal && !c.rewardClaimed) {
    claimFestivalReward();
  }
  return true;
}

function claimFestivalReward(): void {
  const c = state.festivalCart!;
  if (c.rewardClaimed) return;
  c.rewardClaimed = true;
  const bonus = 200 + state.level * 25;
  state.coins += bonus;
  state.stats.earned += bonus;
  addItem('token', 10);
  // Bonus material for full cart.
  addItem('paint', 1);
  toast(`🎪 Festival Cart full! +${bonus}💰 + 10 Festival Tokens + 1 Paint!`, 'gold');
  track('festival_cart_completed', { theme: c.themeId });
}

export function cartProgressPct(): number {
  const c = state.festivalCart;
  if (!c || c.pointGoal === 0) return 0;
  return Math.min(100, (c.points / c.pointGoal) * 100);
}

export function timeUntilNextCart(): number {
  const c = state.festivalCart;
  if (!c) return WEEK_S;
  return Math.max(0, c.endsAt - nowSeconds());
}
