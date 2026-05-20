// =============================================================
//  LIVE EVENTS PANEL — current event progress + event shop.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import { initLiveEvent, tickLiveEvent, currentLiveEvent, liveEventProgressPct, EVENT_SHOP, buyEventShopItem } from '../systems/live-events';

export function openLiveEventsPanel(): void {
  initLiveEvent();
  tickLiveEvent();
  openModal('🎉 Events', [
    { key: 'event', label: 'Active', render: renderEvent },
    { key: 'shop',  label: 'Event Shop', render: renderShop },
  ], 'event');
}

function renderEvent(body: HTMLElement): void {
  const def = currentLiveEvent();
  const e = state.liveEvent!;
  if (!def) {
    body.innerHTML = '<p>No active event. Check back soon!</p>';
    return;
  }
  const rewards = def.rewards.map((r, i) => {
    const claimed = e.rewardsClaimed.includes(i);
    return `<div class="landmark-req ${claimed ? 'done' : ''}">
      <div class="landmark-req-name">${r.label}</div>
      <div class="landmark-req-progress">${r.pts} pts</div>
      <div class="landmark-req-have">+${r.coins}💰 +${r.tokens}🎟️${r.material ? ` + 1 ${ITEMS[r.material]?.name}` : ''}</div>
      ${claimed ? '<span class="landmark-req-tick">✓</span>' : ''}
    </div>`;
  }).join('');
  const rules = def.pointRules.map(r => {
    const item = r.itemKey ? ITEMS[r.itemKey]?.name ?? r.itemKey : '';
    return `<li>${prettyAction(r.actionId)}${item ? ` ${item}` : ''}: +${r.points} pts</li>`;
  }).join('');
  body.innerHTML = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${def.emoji}</div>
        <div class="landmark-meta">
          <h3>${def.name}</h3>
          <p>${def.blurb}</p>
        </div>
      </div>
      <p><b>Your points: ${e.points}</b> · Tokens: ${e.tokens}🎟️</p>
      <div class="landmark-bar"><div class="landmark-fill" style="width:${liveEventProgressPct()}%"></div></div>
      <p style="margin:12px 0"><b>Rewards</b></p>
      <div class="landmark-reqs">${rewards}</div>
      <p style="margin:12px 0"><b>How to earn points</b></p>
      <ul style="margin:0;padding-left:20px">${rules}</ul>
    </div>
  `;
}

function prettyAction(id: string): string {
  switch (id) {
    case 'produce':         return 'Produce';
    case 'harvest':         return 'Harvest';
    case 'sell':            return 'Sell';
    case 'order_contains':  return 'Order with';
    case 'fish_caught':     return 'Catch fish';
    case 'animal_produce':  return 'Animal produce';
    case 'tree_harvest':    return 'Harvest tree';
    case 'card_cast':       return 'Cast a Weather Card';
    default:                return id;
  }
}

function renderShop(body: HTMLElement): void {
  const e = state.liveEvent!;
  const list = EVENT_SHOP.map((it, i) => {
    const enabled = e.tokens >= it.costTokens;
    return `<div class="landmark-req">
      <img class="ico" src="${sprites.item[it.itemKey]?.toDataURL() ?? ''}">
      <div class="landmark-req-name">${it.qty}× ${ITEMS[it.itemKey]?.name ?? it.itemKey}</div>
      <div class="landmark-req-progress">${it.costTokens}🎟️</div>
      <button class="btn small primary" data-buy="${i}" ${enabled ? '' : 'disabled'}>Buy</button>
    </div>`;
  }).join('');
  body.innerHTML = `
    <p><b>Festival Tokens: ${e.tokens}🎟️</b></p>
    <div class="landmark-reqs">${list}</div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-buy]').forEach(b =>
    b.addEventListener('click', () => { buyEventShopItem(parseInt(b.dataset.buy!, 10)); renderShop(body); }),
  );
}
