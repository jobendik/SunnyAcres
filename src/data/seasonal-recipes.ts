// =============================================================
//  SEASONAL RECIPES — Phase 15.18 of the roadmap. Each season,
//  certain production buildings unlock a limited-time recipe.
//  These layer onto the existing recipe lists.
// =============================================================

import type { Recipe } from '../types';
import type { Season } from '../types';

export interface SeasonalRecipeDef {
  buildingType: string;
  recipe: Recipe & { displayName: string };
  season: Season;
}

export const SEASONAL_RECIPES: SeasonalRecipeDef[] = [
  // Spring
  { buildingType: 'apiary',
    recipe: { in: { honey: 1, blueberry: 2 }, out: { jam: 1 }, time: 60, xp: 14, displayName: 'Spring Honey Jam' },
    season: 'spring' },
  // Summer
  { buildingType: 'smoothiebar',
    recipe: { in: { strawberry: 3, blueberry: 1 }, out: { smoothie: 2 }, time: 70, xp: 14, displayName: 'Summer Berry Smoothie' },
    season: 'summer' },
  // Autumn
  { buildingType: 'bakery',
    recipe: { in: { pumpkin: 2, flour: 2, sugar: 1 }, out: { pie: 1 }, time: 90, xp: 22, displayName: 'Pumpkin Pie' },
    season: 'autumn' },
  { buildingType: 'juicer',
    recipe: { in: { apple: 3, sugar: 1 }, out: { jam: 1 }, time: 65, xp: 16, displayName: 'Autumn Apple Jam' },
    season: 'autumn' },
  // Winter
  { buildingType: 'bakery',
    recipe: { in: { milk: 2, sugar: 1 }, out: { cookie: 2 }, time: 70, xp: 18, displayName: 'Winter Cocoa Cookies' },
    season: 'winter' },
  { buildingType: 'candleshop',
    recipe: { in: { honey: 2, wool: 1 }, out: { candle: 3 }, time: 90, xp: 24, displayName: 'Snowberry Candle' },
    season: 'winter' },
];

/** Get the seasonal recipes available for a building right now. */
export function seasonalRecipesFor(buildingType: string, season: Season): SeasonalRecipeDef[] {
  return SEASONAL_RECIPES.filter(r => r.buildingType === buildingType && r.season === season);
}
