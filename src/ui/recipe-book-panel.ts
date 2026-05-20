// =============================================================
//  RECIPE BOOK — Phase 15.1. Reads all production recipes from
//  data/buildings.ts and presents them with unlock level + chain.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import { sprites } from '../sprites';
import { openModal } from './modal';

export function openRecipeBook(): void {
  const buildings = Object.keys(BUILDINGS).filter(k => BUILDINGS[k]!.kind === 'production');
  const tabs = buildings.map(k => ({
    key: k,
    label: `${BUILDINGS[k]!.name.split(' ')[0]}`,
    render: (body: HTMLElement) => renderBuilding(body, k),
  }));
  openModal('📖 Recipe Book', tabs, buildings[0]);
}

function renderBuilding(body: HTMLElement, buildingKey: string): void {
  const def = BUILDINGS[buildingKey]!;
  const recs = def.recipes ?? [];
  let html = `<h3>${def.name}</h3><p><small>Unlocks at Level ${def.level}.</small></p>`;
  if (recs.length === 0) {
    html += '<p>No recipes.</p>';
  }
  for (const r of recs) {
    const lvl = r.lvl ?? def.level;
    const locked = state.level < lvl;
    const inList = Object.entries(r.in).map(([k, v]) => `<span>${v}× <img class="ico-mini" src="${sprites.item[k]?.toDataURL() ?? ''}">${ITEMS[k]?.name ?? k}</span>`).join(' + ');
    const outList = Object.entries(r.out).map(([k, v]) => `<span>${v}× <img class="ico-mini" src="${sprites.item[k]?.toDataURL() ?? ''}"><b>${ITEMS[k]?.name ?? k}</b></span>`).join(', ');
    html += `<div class="landmark-req ${locked ? '' : 'done'}" style="margin-bottom:6px">
      <div class="landmark-req-name">${inList} → ${outList}</div>
      <div class="landmark-req-progress">${r.time}s · ${r.xp}XP${locked ? ` · 🔒 Lv ${lvl}` : ''}</div>
    </div>`;
  }
  body.innerHTML = html;
}
