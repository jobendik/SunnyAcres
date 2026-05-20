// =============================================================
//  BEAUTIFICATION — placed decorations give the farm a passive
//  beauty score that buffs global yields.
// =============================================================

import { state } from '../state';
import { DECORATIONS } from '../data/decorations';
import { CONFIG } from '../config';

const TIER: Record<string, number> = {
  flowerbed: 0, lamppost: 0, pinwheel: 0,
  bench: 1, scarecrow: 1,
  fountain: 2, statue: 3, gazebo: 4,
};

export function beautyScore(): number {
  let s = 0;
  for (const d of state.decor) {
    if (!DECORATIONS[d.type]) continue;
    const tier = TIER[d.type] ?? 0;
    s += CONFIG.beautification.perDecorTier[tier] ?? 1;
  }
  return s;
}

/** Alias used by the contest system — same number, clearer intent. */
export function computeBeautyScore(): number {
  return beautyScore();
}

export function beautyBonus(): number {
  // 50 score → max yield bonus (10%)
  const s = beautyScore();
  return Math.min(CONFIG.beautification.yieldBonusMax, s / 50 * CONFIG.beautification.yieldBonusMax);
}

/** Tiered beauty rank for UI: "Cozy Plot" → "Legendary Acres". */
export const BEAUTY_TIERS: ReadonlyArray<{ name: string; min: number }> = [
  { name: 'Plain Field',     min: 0 },
  { name: 'Cozy Plot',       min: 25 },
  { name: 'Charming Farm',   min: 75 },
  { name: 'Sunny Homestead', min: 150 },
  { name: 'Village Favorite', min: 300 },
  { name: 'Legendary Acres', min: 500 },
];

export function beautyTier(): { name: string; pct: number; next: string | null } {
  const s = beautyScore();
  let cur = BEAUTY_TIERS[0]!;
  for (const t of BEAUTY_TIERS) if (s >= t.min) cur = t;
  const idx = BEAUTY_TIERS.indexOf(cur);
  const next = idx < BEAUTY_TIERS.length - 1 ? BEAUTY_TIERS[idx + 1]! : null;
  const pct = next ? Math.min(100, ((s - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { name: cur.name, pct, next: next?.name ?? null };
}
