// =============================================================
//  FESTIVAL CART PANEL — themed weekly deliveries.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import {
  initFestivalCart, maybeRolloverCart, festivalCartTheme,
  deliverToCart, cartProgressPct, timeUntilNextCart,
} from '../systems/festival-cart';
import { formatDuration } from '../systems/timer';

export function openFestivalCartPanel(): void {
  initFestivalCart();
  maybeRolloverCart();
  openModal('🎪 Festival Cart', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render();
}

function render(): void {
  const body = document.getElementById('modal-body')!;
  const c = state.festivalCart;
  if (!c || !c.unlocked) {
    body.innerHTML = `<div style="text-align:center;padding:24px"><h3>🎪 Festival Cart</h3><p>Unlocks at Level 6.</p></div>`;
    return;
  }
  const t = festivalCartTheme();
  const pct = cartProgressPct();
  const remaining = formatDuration(timeUntilNextCart());
  const reqHtml = c.requests.map(r => {
    const delivered = c.delivered[r.itemKey] ?? 0;
    const have = state.inv[r.itemKey] ?? 0;
    const room = r.qty - delivered;
    return `<div class="landmark-req ${delivered >= r.qty ? 'done' : ''}">
      <img class="ico" src="${sprites.item[r.itemKey]?.toDataURL() ?? ''}">
      <div class="landmark-req-name">${ITEMS[r.itemKey]?.name ?? r.itemKey}</div>
      <div class="landmark-req-progress">${delivered} / ${r.qty}</div>
      <div class="landmark-req-have">(barn: ${have})</div>
      ${room <= 0 ? '<span class="landmark-req-tick">✓</span>' :
        `<button class="btn small" data-deliver="${r.itemKey}" ${have > 0 ? '' : 'disabled'}>+1</button>
         <button class="btn small primary" data-deliver-all="${r.itemKey}" ${have > 0 ? '' : 'disabled'}>All</button>`}
    </div>`;
  }).join('');
  body.innerHTML = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${t.emoji}</div>
        <div class="landmark-meta">
          <h3>${t.name}</h3>
          <p>${remaining} until next theme.</p>
          <p style="font-size:11px">Each delivery earns Festival Tokens + bonus reward at 100%.</p>
        </div>
      </div>
      <div class="landmark-bar"><div class="landmark-fill" style="width:${pct}%"></div></div>
      <div class="landmark-reqs">${reqHtml}</div>
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-deliver]').forEach(b =>
    b.addEventListener('click', () => { deliverToCart(b.dataset.deliver!, 1); render(); }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-deliver-all]').forEach(b =>
    b.addEventListener('click', () => {
      const it = b.dataset.deliverAll!;
      const have = state.inv[it] ?? 0;
      deliverToCart(it, have);
      render();
    }),
  );
}
