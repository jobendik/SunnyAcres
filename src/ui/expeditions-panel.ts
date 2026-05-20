// =============================================================
//  EXPEDITIONS PANEL — map list, node-by-node clearing, energy.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { openModal } from './modal';
import {
  initExpeditions, regenerateEnergy, currentEnergy, maxEnergy,
  activeMap, pickMap, clearNode, eatForEnergy,
} from '../systems/expeditions';

export function openExpeditionsPanel(): void {
  initExpeditions();
  regenerateEnergy();
  const maps = Object.values(state.expeditions?.maps ?? {});
  if (maps.length === 0) {
    openModal('🗺️ Expeditions', null);
    document.getElementById('modal-tabs')!.innerHTML = '';
    document.getElementById('modal-body')!.innerHTML = `
      <div style="text-align:center;padding:24px">
        <h3>🗺️ Expeditions</h3>
        <p>Unlocks at Level 20 — unlocks more maps as you clear the Forest Edge plot, level up further, etc.</p>
      </div>`;
    return;
  }
  const tabs = maps.map(m => ({
    key: m.id,
    label: `${m.emoji} ${m.name.split(' ')[0]}`,
    render: (body: HTMLElement): void => renderMap(body, m.id),
  }));
  openModal('🗺️ Expeditions', tabs, maps[0]!.id);
}

function renderMap(body: HTMLElement, id: string): void {
  const map = state.expeditions?.maps[id]; if (!map) return;
  const energyBar = `<div style="margin:8px 0"><b>Energy: ${currentEnergy()} / ${maxEnergy()} ⚡</b>
    <div class="landmark-bar"><div class="landmark-fill" style="width:${(currentEnergy() / maxEnergy()) * 100}%"></div></div></div>`;
  const nodes = map.nodes.map(n => {
    const enabled = !n.completed && currentEnergy() >= n.costEnergy &&
      (!n.costItems || Object.entries(n.costItems).every(([k, v]) => (state.inv[k] ?? 0) >= v));
    const cost = `${n.costEnergy}⚡${n.costItems ? ` + ${Object.entries(n.costItems).map(([k, v]) => `${v} ${ITEMS[k]?.name ?? k}`).join(', ')}` : ''}`;
    const reward = `+${n.rewardCoins}💰 +${n.rewardXp}XP${n.rewardItems ? ', ' + Object.entries(n.rewardItems).map(([k, v]) => `${v} ${ITEMS[k]?.name ?? k}`).join(', ') : ''}`;
    return `<div class="landmark-req ${n.completed ? 'done' : ''}">
      <span style="font-size:20px">${nodeIcon(n.kind)}</span>
      <div class="landmark-req-name">${n.label}<br><small>${reward}</small></div>
      <div class="landmark-req-progress">${cost}</div>
      ${n.completed ? '<span class="landmark-req-tick">✓</span>' :
        `<button class="btn small primary" data-node="${n.id}" ${enabled ? '' : 'disabled'}>Clear</button>`}
    </div>`;
  }).join('');
  const foodButtons = ['bread', 'cookie', 'honey', 'smoothie', 'cake', 'pie']
    .filter(k => (state.inv[k] ?? 0) > 0)
    .map(k => `<button class="btn small" data-eat="${k}">+${k}</button>`).join(' ');
  body.innerHTML = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${map.emoji}</div>
        <div class="landmark-meta">
          <h3>${map.name}</h3>
          <p>Clear all nodes for a completion bonus.</p>
        </div>
      </div>
      ${energyBar}
      ${foodButtons ? `<div style="margin:6px 0"><small>Eat for energy:</small> ${foodButtons}</div>` : ''}
      <div class="landmark-reqs">${nodes}</div>
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-node]').forEach(b =>
    b.addEventListener('click', () => { pickMap(id); clearNode(id, b.dataset.node!); renderMap(body, id); }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-eat]').forEach(b =>
    b.addEventListener('click', () => { eatForEnergy(b.dataset.eat!); renderMap(body, id); }),
  );
}

function nodeIcon(kind: string): string {
  switch (kind) {
    case 'clear':  return '🪵';
    case 'chest':  return '🧰';
    case 'gather': return '🌿';
    case 'repair': return '🛠️';
    case 'fish':   return '🎣';
    case 'puzzle': return '🧩';
    default:       return '❓';
  }
}
