// =============================================================
//  OBJECTIVE RAIL — top-of-screen "next best action" hints.
//  Pulses gently, taps run the suggested action when feasible.
//  Now covers every implemented system (boat, train, balloon,
//  cart, contracts, expeditions, expansion, etc.) by routing
//  actionId → the right open*Panel.
// =============================================================

import { state } from '../state';
import { rankObjectives, type ObjectiveSuggestion } from '../systems/objectives';
import { feedPen } from '../systems/pens';
import { fulfillOrder } from '../systems/orders';
import { claimQuest } from '../systems/quests';
import { claimDailyChallenge, claimStreak, claimTimedReward, claimReturnGift } from '../systems/daily';
import { serveVisitor } from '../systems/visitors-v2';
import { collectFerment } from '../systems/compost';
import { openBuildMenu } from './build-menu';
import { setTool } from './tools';
import { openProductionPanel } from './production-panel';
import { openPenPanel } from './pen-panel';
import { openWheel } from './wheel-panel';
import { openMarketStall } from './market-stall-panel';
import { openBoatPanel } from './boat-panel';
import { openTrainPanel } from './train-panel';
import { openBalloonPanel } from './balloon-panel';
import { openFestivalCartPanel } from './festival-cart-panel';
import { openGazette } from './gazette-panel';
import { openExpansionPanel } from './expansion-panel';
import { openWeatherGrid } from './weather-grid-panel';
import { openExpeditionsPanel } from './expeditions-panel';
import { openMarket } from './market-panel';

let lastSig = '';

function clickById(id: string): void {
  const el = document.getElementById(id);
  if (el) el.click();
}

function actOn(s: ObjectiveSuggestion): void {
  switch (s.actionId) {
    case 'claimReturn':    claimReturnGift(); break;
    case 'claimStreak':    claimStreak(); break;
    case 'claimTimed':     claimTimedReward(); break;
    case 'openWheel':      openWheel(); break;
    case 'claimChallenge': claimDailyChallenge(String(s.payload?.id ?? ''), false); break;
    case 'claimQuest':     claimQuest(String(s.payload?.id ?? '')); break;
    case 'fulfillOrder':   fulfillOrder(String(s.payload?.id ?? '')); break;
    case 'harvest':        setTool('hand'); break;
    case 'wilting':        setTool('hand'); break;
    case 'plant':          setTool('seed'); break;
    case 'openBuild':      openBuildMenu(); break;
    case 'openStall':      openMarketStall(); break;
    case 'openBoat':       openBoatPanel(); break;
    case 'openTrain':      openTrainPanel(); break;
    case 'openBalloon':    openBalloonPanel(); break;
    case 'openCart':       openFestivalCartPanel(); break;
    case 'openGazette':    openGazette(); break;
    case 'openExpansion':  openExpansionPanel(); break;
    case 'openWeatherGrid': openWeatherGrid(); break;
    case 'openExpeditions': openExpeditionsPanel(); break;
    case 'openContracts':  openMarket(); break;
    case 'serveVisitor': {
      // visitors-v2 has no DOM panel — just attempt to serve.
      const id = String(s.payload?.id ?? '');
      if (id) serveVisitor(id);
      break;
    }
    case 'visitor':        break; // expiring — no panel; rail surfaces a heads-up only
    case 'compost':        collectFerment(); break;
    case 'greenhouse':
      // Greenhouse lives inside the Landmarks panel today; route there.
      clickById('open-landmark');
      break;
    case 'feedPen': {
      const id = String(s.payload?.id ?? '');
      const b = state.buildings.find(x => x.id === id);
      if (b) feedPen(b.id, 10);
      break;
    }
    case 'pen': {
      const id = String(s.payload?.id ?? '');
      const b = state.buildings.find(x => x.id === id);
      if (b) openPenPanel(b);
      break;
    }
    case 'production':
    case 'queueProduction': {
      const id = String(s.payload?.id ?? '');
      const b = state.buildings.find(x => x.id === id);
      if (b) openProductionPanel(b);
      break;
    }
    case 'tree': setTool('hand'); break;
  }
}

export function renderObjectiveRail(): void {
  const list = rankObjectives();
  const top = list[0];
  const root = document.getElementById('objective-rail');
  if (!root) return;
  if (!top) {
    if (lastSig !== '') {
      lastSig = '';
      root.innerHTML = '<span class="obj-icon">✨</span><span class="obj-text">Explore! Plant, build, fish, or open the menu.</span>';
    }
    return;
  }
  // Signature now includes the top 3 entries so the rail refreshes when
  // a higher-priority objective replaces a lower one.
  const sig = list.slice(0, 3).map(s => s.text + (s.payload?.id ?? '')).join('|');
  if (sig === lastSig) return;
  lastSig = sig;
  // Build out HTML — primary on left, secondary chips on right
  const rest = list.slice(1, 3);
  root.innerHTML = `
    <button class="obj-primary" id="obj-primary">
      <span class="obj-icon">${top.icon}</span>
      <span class="obj-text">${top.text}</span>
    </button>
    ${rest.length ? `<div class="obj-rest">
      ${rest.map((s, i) => `<button class="obj-chip" data-i="${i}"><span>${s.icon}</span><span>${s.text}</span></button>`).join('')}
    </div>` : ''}
  `;
  const p = document.getElementById('obj-primary');
  if (p) p.addEventListener('click', () => actOn(top));
  root.querySelectorAll<HTMLButtonElement>('button.obj-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i!, 10);
      const s = rest[i];
      if (s) actOn(s);
    });
  });
}
