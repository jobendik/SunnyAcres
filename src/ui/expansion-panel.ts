// =============================================================
//  EXPANSION PANEL — list of plots, unlock buttons, obstacle list.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { openModal } from './modal';
import {
  PLOTS, initExpansion, plotState, unlockPlot, clearObstacle,
  obstacleTool, obstacleLabel, obstacleEmoji, plotProgress, isPlotClearing, isPlotClaimed,
} from '../systems/expansion';

export function openExpansionPanel(): void {
  initExpansion();
  const ids = Object.keys(PLOTS);
  const tabs = ids.map(id => ({
    key: id,
    label: `${PLOTS[id]!.emoji} ${PLOTS[id]!.name.split(' ')[0]}`,
    render: (body: HTMLElement): void => renderPlot(body, id),
  }));
  openModal('🌄 Land Expansion', tabs, ids[0]);
}

function renderPlot(body: HTMLElement, id: string): void {
  const def = PLOTS[id]!;
  const p = plotState(id);
  if (!p) { body.innerHTML = ''; return; }

  let html = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${def.emoji}</div>
        <div class="landmark-meta">
          <h3>${def.name}</h3>
          <p style="margin:0;color:#5a4028">${def.blurb}</p>
          <p style="margin:4px 0;font-size:12px;color:#7a5828">Reward: <b>${def.rewardSummary}</b></p>
        </div>
      </div>
  `;

  if (p.status === 'locked') {
    html += `<p style="text-align:center;padding:16px"><b>Unlocks at Level ${def.unlockLevel}</b></p>`;
  } else if (p.status === 'unlockable') {
    const matList = Object.entries(def.unlockMaterials).map(([k, v]) => {
      const have = state.inv[k] ?? 0;
      const ok = have >= v!;
      return `<span style="color:${ok ? '#3a8020' : '#a02828'}">${v}× ${ITEMS[k]?.name ?? k} (${have})</span>`;
    }).join(' · ');
    const enabled = state.coins >= def.unlockCost && Object.entries(def.unlockMaterials).every(([k, v]) => (state.inv[k] ?? 0) >= v!);
    html += `
      <div class="landmark-reqs">
        Cost: <b>${def.unlockCost}💰</b> + ${matList}
      </div>
      <button class="btn primary" id="unlock-btn" ${enabled ? '' : 'disabled'}>Buy this plot</button>
    `;
  } else if (p.status === 'clearing') {
    const prog = plotProgress(id);
    html += `<p style="text-align:center"><b>Clearing: ${prog.done}/${prog.total}</b></p>`;
    html += `<div class="landmark-reqs">`;
    for (const ob of p.obstacles) {
      const tool = obstacleTool(ob.kind);
      const haveTool = (state.inv[tool] ?? 0) > 0;
      html += `<div class="landmark-req ${ob.cleared ? 'done' : ''}">
        <span style="font-size:20px">${obstacleEmoji(ob.kind)}</span>
        <div class="landmark-req-name">${obstacleLabel(ob.kind)}</div>
        <div class="landmark-req-progress">Tool: ${ITEMS[tool]?.name ?? tool}</div>
        ${ob.cleared ? '<span class="landmark-req-tick">✓</span>' :
          `<button class="btn small primary" data-clear="${ob.id}" ${haveTool ? '' : 'disabled'}>${haveTool ? 'Clear' : 'No tool'}</button>`
        }
      </div>`;
    }
    html += `</div>`;
  } else { // unlocked
    html += `<p style="text-align:center;color:#3a8020;padding:16px"><b>✓ Claimed!</b></p>`;
  }
  html += '</div>';
  body.innerHTML = html;
  const u = document.getElementById('unlock-btn');
  if (u) u.addEventListener('click', () => { unlockPlot(id); renderPlot(body, id); });
  body.querySelectorAll<HTMLButtonElement>('button[data-clear]').forEach(btn =>
    btn.addEventListener('click', () => {
      clearObstacle(id, btn.dataset.clear!);
      renderPlot(body, id);
    }),
  );
}
