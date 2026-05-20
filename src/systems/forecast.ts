// =============================================================
//  FORECAST PLANNING — Phase 15.10 of the roadmap. Shows the
//  next 3 days of weather (and lets the Tower bias accuracy).
//  Players can plan plantings around forecast.
// =============================================================

import { state } from '../state';
import { choice } from '../utils';
import type { Weather, ForecastRoot } from '../types';

const POOL: Weather[] = ['sunny', 'cloudy', 'rainy', 'windy', 'snowy'];

export function initForecast(): void {
  if (!state.forecast) {
    state.forecast = { days: [] };
    refreshForecast();
  }
}

/** Refresh forecast to cover today + next 2 days. */
export function refreshForecast(): void {
  initForecast();
  const f = state.forecast!;
  const baseDay = state.day;
  // Trim past entries.
  f.days = f.days.filter(d => d.day >= baseDay);
  // Pad to 3 days ahead.
  const seasonBias: Record<string, Weather[]> = {
    spring: ['sunny', 'rainy', 'cloudy', 'windy'],
    summer: ['sunny', 'sunny', 'cloudy', 'windy'],
    autumn: ['cloudy', 'rainy', 'windy', 'sunny'],
    winter: ['snowy', 'cloudy', 'snowy', 'sunny'],
  };
  const bias = seasonBias[state.season] ?? POOL;
  while (f.days.length < 3) {
    const day = baseDay + f.days.length;
    f.days.push({ day, weather: choice(bias) });
  }
  // Day 0 should mirror actual today's weather for honesty.
  if (f.days[0] && f.days[0].day === baseDay) {
    f.days[0].weather = state.weather;
  }
}

export function forecastDays(): Array<{ day: number; weather: Weather }> {
  initForecast();
  return state.forecast!.days.slice(0, 3);
}
