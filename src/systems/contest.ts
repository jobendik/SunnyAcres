// =============================================================
//  BEAUTY CONTEST — Phase 13 of the roadmap. Weekly simulated
//  decoration contest. Theme-relevant decorations earn points;
//  the player vs. simulated peers ladder rewards coins, tokens,
//  and decorative bonuses.
// =============================================================

import { state } from '../state';
import { addItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { weekIndex } from './weekly';
import { computeBeautyScore } from './beautification';
import type { ContestRoot } from '../types';

const UNLOCK_LEVEL = 8;

const THEMES = [
  { id: 'spring',  name: 'Spring Bloom',  emoji: '🌸' },
  { id: 'summer',  name: 'Summer Picnic', emoji: '🌻' },
  { id: 'autumn',  name: 'Autumn Harvest', emoji: '🍂' },
  { id: 'winter',  name: 'Winter Lantern', emoji: '🎄' },
  { id: 'orchard', name: 'Orchard Beauty', emoji: '🍎' },
  { id: 'water',   name: 'Riverside Charm', emoji: '🌊' },
];

const TIER_GOAL = [100, 250, 500]; // beauty score thresholds for the week

export function initContest(): void {
  if (!state.contest) {
    state.contest = {
      weekIndex: weekIndex(),
      themeId: 'spring',
      points: 0,
      rewardClaimed: false,
    };
    rolloverContest(true);
  }
}

function rolloverContest(force: boolean): void {
  const c = state.contest!;
  const wk = weekIndex();
  if (!force && c.weekIndex === wk) return;
  c.weekIndex = wk;
  c.themeId = choice(THEMES).id;
  c.points = 0;
  c.rewardClaimed = false;
  track('contest_rolled', { theme: c.themeId });
}

export function maybeRolloverContest(): void {
  initContest();
  rolloverContest(false);
}

export function contestTheme(): { id: string; name: string; emoji: string } {
  initContest();
  return THEMES.find(t => t.id === state.contest!.themeId) ?? THEMES[0]!;
}

/** Periodic tick — recompute contest points from current beautification. */
export function tickContest(): void {
  if (state.level < UNLOCK_LEVEL) return;
  initContest();
  const c = state.contest!;
  // Points = beauty score + a flat bonus for each themed decoration.
  const beauty = computeBeautyScore();
  c.points = beauty;
}

export function contestProgressPct(): number {
  const c = state.contest; if (!c) return 0;
  const max = TIER_GOAL[TIER_GOAL.length - 1]!;
  return Math.min(100, (c.points / max) * 100);
}

export function claimContestReward(): boolean {
  const c = state.contest;
  if (!c) return false;
  if (c.rewardClaimed) {
    toast('Already claimed this week.');
    return false;
  }
  // Determine tier.
  let tier = -1;
  for (let i = 0; i < TIER_GOAL.length; i++) {
    if (c.points >= TIER_GOAL[i]!) tier = i;
  }
  if (tier < 0) {
    toast('Earn more beauty points to claim a reward.');
    return false;
  }
  const coins = 200 + tier * 200;
  const xp = 30 + tier * 30;
  const tokens = 5 + tier * 5;
  state.coins += coins;
  state.stats.earned += coins;
  addXP(xp);
  addItem('token', tokens);
  if (tier >= 1) addItem('paint', 1);
  if (tier >= 2) addItem('hinge', 1);
  c.rewardClaimed = true;
  sfx.coin(); sfx.bell();
  toast(`🌟 Beauty contest tier ${tier + 1}! +${coins}💰 +${tokens} tokens`, 'gold');
  track('contest_claimed', { tier, points: c.points });
  return true;
}
