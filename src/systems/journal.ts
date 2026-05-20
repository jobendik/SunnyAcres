// =============================================================
//  FARM JOURNAL — Phase 15.14 of the roadmap. A scrapbook of
//  milestones: first harvest, first chicken, first boat full, etc.
//  Entries are written by other systems via addJournalEntry().
// =============================================================

import { state } from '../state';
import { nowSeconds } from '../utils';
import { track } from './telemetry';
import type { JournalEntry, JournalRoot } from '../types';

const MAX_ENTRIES = 60;

export function initJournal(): void {
  if (!state.journal) {
    state.journal = { entries: [], flags: {} };
  }
}

/** Add an entry. Flag-keyed to fire only once. */
export function addJournalEntry(entry: { id: string; title: string; body: string; icon: string }): void {
  initJournal();
  const j = state.journal!;
  if (j.flags[entry.id]) return;
  j.flags[entry.id] = true;
  const e: JournalEntry = {
    id: entry.id,
    at: nowSeconds(),
    title: entry.title,
    body: entry.body,
    icon: entry.icon,
  };
  j.entries.push(e);
  if (j.entries.length > MAX_ENTRIES) j.entries.shift();
  track('journal_entry', { id: entry.id });
}

export function recentJournal(limit = 12): JournalEntry[] {
  initJournal();
  return state.journal!.entries.slice().reverse().slice(0, limit);
}

/** Convenience hooks for common milestones. Safe to call repeatedly. */
export function checkMilestones(): void {
  if (state.stats.harvested >= 1) {
    addJournalEntry({
      id: 'first_harvest', icon: '🌾',
      title: 'First Harvest!', body: 'You harvested your first crop. The barn smells like fresh wheat.',
    });
  }
  if (state.stats.ordersFulfilled >= 1) {
    addJournalEntry({
      id: 'first_order', icon: '🚚',
      title: 'First Delivery', body: 'A grateful villager waved as your first order rolled into town.',
    });
  }
  if (state.stats.ordersFulfilled >= 10) {
    addJournalEntry({
      id: 'ten_orders', icon: '📋',
      title: 'Order Number 10', body: 'Word is spreading — Sunny Acres delivers.',
    });
  }
  if (state.stats.fishCaught >= 1) {
    addJournalEntry({
      id: 'first_fish', icon: '🐟',
      title: 'First Catch', body: 'You hooked your first fish! Finn approves.',
    });
  }
  if (state.stats.produced >= 1) {
    addJournalEntry({
      id: 'first_produce', icon: '🥖',
      title: 'First Production', body: 'You crafted your first finished good. The chain is open.',
    });
  }
  if ((state.weatherGrid?.activations.length ?? 0) >= 1) {
    addJournalEntry({
      id: 'first_card', icon: '🌦️',
      title: 'Sky Whisper', body: 'You cast your first Weather Card. The clouds bent to your will.',
    });
  }
  if (state.level >= 10) {
    addJournalEntry({
      id: 'level_10', icon: '✨',
      title: 'Level 10', body: 'Sunny Acres feels like a real farm now.',
    });
  }
  if (state.level >= 20) {
    addJournalEntry({
      id: 'level_20', icon: '🌟',
      title: 'Level 20', body: 'Other farmers come to you for advice. The Club is calling.',
    });
  }
}
