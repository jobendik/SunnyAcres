// =============================================================
//  CLUB PANEL — Farming Club status, members, milestones.
// =============================================================

import { state } from '../state';
import { openModal } from './modal';
import { initClub, maybeRolloverClub, clubTheme, clubProgressPct, clubPlayerSharePct } from '../systems/club';

export function openClubPanel(): void {
  initClub();
  maybeRolloverClub();
  openModal('🏆 Farming Club', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render();
}

function render(): void {
  const body = document.getElementById('modal-body')!;
  const c = state.club;
  if (!c || !c.unlocked) {
    body.innerHTML = `<div style="text-align:center;padding:24px"><h3>🏆 Farming Club</h3><p>Unlocks at Level 15.</p></div>`;
    return;
  }
  const t = clubTheme();
  const pct = clubProgressPct();
  const share = clubPlayerSharePct();
  const milestones = [25, 50, 75, 100].map((m, i) => {
    const claimed = c.milestonesClaimed.includes(i);
    return `<div class="landmark-req ${claimed ? 'done' : ''}"><div class="landmark-req-name">${m}%</div>${claimed ? '<span class="landmark-req-tick">✓</span>' : ''}</div>`;
  }).join('');
  const members = c.members.map(m => `<div style="display:flex;justify-content:space-between;padding:4px 0">
    <span>${m.emoji} ${m.name}${m.isSimulated ? ' <small>(sim)</small>' : ''}</span>
    <span>${m.contribution} pts</span>
  </div>`).join('');
  body.innerHTML = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${t.emoji}</div>
        <div class="landmark-meta">
          <h3>${t.name} · Lv ${c.level}${c.bannerCount > 0 ? ` · ${'🏆'.repeat(Math.min(5, c.bannerCount))}` : ''}</h3>
          <p>Goal: ${c.goal} pts · Your share: ${Math.round(share)}%</p>
        </div>
      </div>
      <div class="landmark-bar"><div class="landmark-fill" style="width:${pct}%"></div></div>
      <p style="margin:8px 0"><b>Milestones</b></p>
      <div class="landmark-reqs">${milestones}</div>
      <p style="margin:12px 0"><b>Members</b></p>
      ${members}
      <p class="landmark-rewards">Help via: harvest, fishing, baking, fishing, animals, casting cards — depending on theme.</p>
    </div>
  `;
}
