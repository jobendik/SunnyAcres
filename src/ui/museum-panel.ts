// =============================================================
//  MUSEUM / COLLECTION HALL — Phase 15.15. Aggregates discovery
//  data and shows a row per category.
// =============================================================

import { state } from '../state';
import { openModal } from './modal';

interface Pane { key: string; label: string; emoji: string; count: () => { have: number; total: number }; }

const PANES: Pane[] = [
  { key: 'crops', label: 'Crops', emoji: '🌾',
    count: () => ({
      have: Object.keys(state.collection?.discovered.crops ?? {}).length,
      total: 11,
    }),
  },
  { key: 'fish', label: 'Fish', emoji: '🐟',
    count: () => ({
      have: Object.keys(state.collection?.discovered.fish ?? {}).length,
      total: 3,
    }),
  },
  { key: 'animals', label: 'Animals', emoji: '🐮',
    count: () => ({
      have: Object.keys(state.collection?.discovered.animals ?? {}).length,
      total: 6,
    }),
  },
  { key: 'recipes', label: 'Recipes', emoji: '📖',
    count: () => ({
      have: Object.keys(state.stats.itemsProduced ?? {}).length,
      total: 22,
    }),
  },
  { key: 'cards', label: 'Weather Cards', emoji: '🌦️',
    count: () => ({
      have: (state.weatherGrid?.ownedCards ?? []).length,
      total: 14,
    }),
  },
  { key: 'fused_cards', label: 'Fused Cards', emoji: '✨',
    count: () => ({
      have: (state.cardFusion?.fusedCards ?? []).length,
      total: 4,
    }),
  },
];

export function openMuseum(): void {
  openModal('🏛️ Collection Hall', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  const html = PANES.map(p => {
    const { have, total } = p.count();
    const pct = total > 0 ? Math.round((have / total) * 100) : 0;
    return `<div class="landmark-req" style="padding:10px">
      <span style="font-size:24px">${p.emoji}</span>
      <div class="landmark-req-name">${p.label}</div>
      <div class="landmark-req-progress">${have} / ${total} (${pct}%)</div>
    </div>`;
  }).join('');
  body.innerHTML = `
    <h3>Collection Hall</h3>
    <p>A quiet exhibit of everything you've found at Sunny Acres.</p>
    ${html}
  `;
}
