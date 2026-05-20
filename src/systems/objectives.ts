// =============================================================
//  OBJECTIVE RAIL — the "what should I do next?" brain.
//
//  Ranks 1–4 highest-value actions across every implemented system.
//  Priorities (rough scale):
//    100  — return gift, time-critical claim
//     85+ — claim/collect (free coins waiting)
//     70+ — about to expire, missed window
//     60+ — collectables that take 1 tap
//     45+ — productive but no urgency
//     30+ — exploration / decoration / late-game advice
//
//  Every entry has a stable text + actionId + optional payload so the
//  rail UI can dispatch a tap to the right system.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { ITEMS } from '../data/items';
import { nowSeconds } from '../utils';
import { cropStage, isWilting } from './crops';
import { canClaimStreak, timedClaimReady } from './daily';
import { canSpin } from './wheel';
import { getTreeStage } from './trees';
import { penFeedLevel } from './pens';
import { isFermentReady } from './compost';

export interface ObjectiveSuggestion {
  text: string;
  icon: string;
  priority: number;
  actionId?: string;
  payload?: Record<string, string | number>;
}

/** Helper: count entries cheaply across the 2D grid (one pass). */
function gridScan(): { wilting: boolean; readyCrops: number; emptyPlowed: number } {
  let wilting = false;
  let readyCrops = 0;
  let emptyPlowed = 0;
  for (const row of state.grid) {
    for (const t of row) {
      if (t.crop) {
        if (cropStage(t) === 3) readyCrops++;
        else if (isWilting(t)) wilting = true;
      } else if (t.type === 'plowed') {
        emptyPlowed++;
      }
    }
  }
  return { wilting, readyCrops, emptyPlowed };
}

export function rankObjectives(): ObjectiveSuggestion[] {
  const out: ObjectiveSuggestion[] = [];
  const now = nowSeconds();

  // -------- Tier 1: Direct claims (highest priority) --------

  if (state.daily?.pendingReturnGift && state.daily.pendingReturnGift.coins > 0 && !state.daily.returnGiftClaimed) {
    out.push({
      text: `Claim return gift (+${state.daily.pendingReturnGift.coins}💰)`,
      icon: '🎁', priority: 100, actionId: 'claimReturn',
    });
  }
  if (state.daily && canClaimStreak()) {
    out.push({
      text: `Claim daily streak (Day ${state.daily.streak})`,
      icon: '🔥', priority: 96, actionId: 'claimStreak',
    });
  }
  if (canSpin()) {
    out.push({
      text: 'Spin the Daily Wheel',
      icon: '🎡', priority: 94, actionId: 'openWheel',
    });
  }
  if (state.daily && timedClaimReady()) {
    out.push({
      text: 'Claim timed reward',
      icon: '⏱️', priority: 92, actionId: 'claimTimed',
    });
  }
  if (state.daily) {
    for (const c of state.daily.challenges) {
      if (c.complete && !c.claimed) {
        out.push({
          text: `Claim "${c.desc}"`,
          icon: '✅', priority: 88, actionId: 'claimChallenge',
          payload: { id: c.id },
        });
      }
    }
  }
  for (const q of state.quests) {
    if (q.complete) {
      out.push({
        text: `Claim quest: ${q.desc}`,
        icon: '⭐', priority: 87, actionId: 'claimQuest',
        payload: { id: q.id },
      });
    }
  }

  // -------- Tier 2: Time-sensitive / expiring --------

  // Train returned with rewards.
  if (state.train?.status === 'returned') {
    out.push({
      text: 'Collect rewards from the train',
      icon: '🚂', priority: 89, actionId: 'openTrain',
    });
  }

  // Balloon active — surface time pressure.
  if (state.balloon?.active) {
    const leaves = Math.max(0, state.balloon.leavesAt - now);
    const mins = Math.ceil(leaves / 60);
    out.push({
      text: leaves > 0
        ? `Balloon leaves in ${mins}m — premium deal!`
        : 'Balloon is leaving — last chance!',
      icon: '🎈', priority: leaves < 600 ? 86 : 78, actionId: 'openBalloon',
    });
  }

  // Boat: about to depart with crates still empty.
  if (state.boat?.unlocked && state.boat.state === 'docked') {
    const leaves = Math.max(0, state.boat.departsAt - now);
    const remaining = state.boat.crates.reduce(
      (s, c) => s + Math.max(0, c.needed - c.filled), 0,
    );
    if (remaining > 0 && leaves < 60 * 30) {
      out.push({
        text: `Boat leaves in ${Math.ceil(leaves / 60)}m — fill ${remaining} more`,
        icon: '⛵', priority: 84, actionId: 'openBoat',
      });
    } else if (remaining > 0) {
      out.push({
        text: `Boat docked — ${remaining} crate units to fill`,
        icon: '⛵', priority: 58, actionId: 'openBoat',
      });
    }
  }

  // Contracts close to expiring.
  if (state.contracts) {
    for (const c of state.contracts.active) {
      const left = Math.max(0, c.expiresAt - now);
      // Check if completable from inventory.
      let allReady = true;
      for (const k in c.items) {
        const need = c.items[k]! - (c.delivered[k] ?? 0);
        if (need > 0 && (state.inv[k] ?? 0) < need) { allReady = false; break; }
      }
      if (allReady) {
        out.push({
          text: 'Deliver completed contract',
          icon: '📜', priority: 83, actionId: 'openContracts',
        });
      } else if (left > 0 && left < 60 * 60 * 4) {
        // <4h left, surface urgency.
        out.push({
          text: `Contract expires in ${Math.ceil(left / 3600)}h`,
          icon: '⏰', priority: 80, actionId: 'openContracts',
        });
      }
    }
  }

  // Visitors V2 — about to leave with money on the table.
  if (state.visitorsV2) {
    for (const v of state.visitorsV2.active) {
      if (v.served) continue;
      const left = Math.max(0, v.expiresAt - now);
      if ((state.inv[v.itemKey] ?? 0) >= v.qty) {
        out.push({
          text: `${v.emoji} ${v.name} wants ${v.qty}× ${ITEMS[v.itemKey]?.name ?? v.itemKey}`,
          icon: '👋', priority: 81, actionId: 'serveVisitor',
          payload: { id: v.id },
        });
      } else if (left < 30) {
        out.push({
          text: `${v.name} is about to leave!`,
          icon: '⌛', priority: 75, actionId: 'visitor',
        });
      }
    }
  }

  // -------- Tier 3: Sold/finished — one-tap collects --------

  // Market stall sold items.
  if (state.marketStall?.slots.length) {
    const soldQty = state.marketStall.slots.filter(s => s.status === 'sold').length;
    if (soldQty > 0) {
      out.push({
        text: `Collect ${soldQty} sold item${soldQty > 1 ? 's' : ''} from Stall`,
        icon: '🛒', priority: 86, actionId: 'openStall',
      });
    }
  }

  // Festival Cart — all requests completable.
  if (state.festivalCart?.unlocked) {
    const c = state.festivalCart;
    let canFinish = true;
    let anyDeliverable = false;
    for (const r of c.requests) {
      const need = r.qty - (c.delivered[r.itemKey] ?? 0);
      if (need <= 0) continue;
      if ((state.inv[r.itemKey] ?? 0) >= need) anyDeliverable = true;
      if ((state.inv[r.itemKey] ?? 0) < need) canFinish = false;
    }
    if (canFinish && !c.rewardClaimed) {
      out.push({
        text: 'Finish the Festival Cart for the bonus',
        icon: '🎪', priority: 82, actionId: 'openCart',
      });
    } else if (anyDeliverable && !c.rewardClaimed) {
      out.push({
        text: 'Deliver to the Festival Cart',
        icon: '🎪', priority: 60, actionId: 'openCart',
      });
    }
  }

  // Compost — fermented batch ready.
  if (isFermentReady()) {
    out.push({
      text: 'Compost batch is ready',
      icon: '♻️', priority: 75, actionId: 'compost',
    });
  }

  // Greenhouse slots ready.
  if (state.greenhouse?.unlocked) {
    const ready = state.greenhouse.slots.filter(s => now >= s.doneAt).length;
    if (ready > 0) {
      out.push({
        text: `Harvest ${ready} from Greenhouse`,
        icon: '🌱', priority: 73, actionId: 'greenhouse',
      });
    }
  }

  // Gazette help request the player can fulfill today.
  if (state.gazette?.helpRequests.length) {
    for (const hr of state.gazette.helpRequests) {
      if (hr.done) continue;
      if ((state.inv[hr.itemKey] ?? 0) >= hr.qty) {
        out.push({
          text: `Help: deliver ${hr.qty}× ${ITEMS[hr.itemKey]?.name ?? hr.itemKey}`,
          icon: '📰', priority: 72, actionId: 'openGazette',
        });
        break;
      }
    }
  }

  // Order fulfillable from inventory.
  for (const o of state.orders) {
    let ok = true;
    for (const k in o.items) if ((state.inv[k] ?? 0) < o.items[k]!) { ok = false; break; }
    if (ok) {
      out.push({
        text: `Deliver order (+${o.reward}💰)`,
        icon: '📦', priority: 80, actionId: 'fulfillOrder',
        payload: { id: o.id },
      });
    }
  }

  // -------- Tier 4: Active farm state --------

  const grid = gridScan();
  if (grid.wilting) {
    out.push({
      text: 'Save wilting crops!',
      icon: '⚠️', priority: 79, actionId: 'wilting',
    });
  }
  if (grid.readyCrops > 0) {
    out.push({
      text: `Harvest ${grid.readyCrops} ready crop${grid.readyCrops > 1 ? 's' : ''}`,
      icon: '🌾', priority: 70, actionId: 'harvest',
    });
  }

  // Hungry pens / ready pen produce.
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'pen') continue;
    const animals = state.penAnimals[b.id] ?? [];
    if (animals.length === 0) continue;
    if (penFeedLevel(b.id) < 25) {
      out.push({
        text: `Feed ${def.name} (low feed!)`,
        icon: '🍽️', priority: 76, actionId: 'feedPen',
        payload: { id: b.id },
      });
    }
    const aniDef = ANIMALS[def.animal!]!;
    let n = 0;
    for (const a of animals) {
      if (now - a.lastProduced >= aniDef.produceTime) n++;
    }
    if (n > 0) {
      out.push({
        text: `Collect ${n} ${ITEMS[aniDef.produces]!.name}`,
        icon: '🥚', priority: 65, actionId: 'pen',
        payload: { id: b.id },
      });
    }
  }

  // Production: done jobs and idle factories.
  let firstIdleBuilding: string | null = null;
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'production') continue;
    const q = state.prodQueues[b.id] ?? [];
    let doneCount = 0;
    for (const j of q) if (j.doneAt <= now) doneCount++;
    if (doneCount > 0) {
      out.push({
        text: `Collect ${doneCount} from ${def.name}`,
        icon: '🏭', priority: 62, actionId: 'production',
        payload: { id: b.id },
      });
    }
    if (q.length === 0 && !firstIdleBuilding) firstIdleBuilding = b.id;
  }
  if (firstIdleBuilding) {
    const def = BUILDINGS[state.buildings.find(b => b.id === firstIdleBuilding)!.type]!;
    out.push({
      text: `Queue jobs in ${def.name}`,
      icon: '⚙️', priority: 40, actionId: 'queueProduction',
      payload: { id: firstIdleBuilding },
    });
  }

  // Orchard.
  let orchardReady = 0;
  for (const tr of state.trees) {
    if (getTreeStage(tr) === 3) orchardReady++;
  }
  if (orchardReady > 0) {
    out.push({
      text: `Harvest ${orchardReady} fruit tree${orchardReady > 1 ? 's' : ''}`,
      icon: '🍎', priority: 55, actionId: 'tree',
    });
  }

  // -------- Tier 5: Progressive systems --------

  // Weather Grid charge with slotted cards — ready to cast.
  if (state.weatherGrid?.unlocked) {
    const g = state.weatherGrid;
    const slotted = g.slots.filter(Boolean).length;
    const active = g.activations.some(a => a.until > now);
    if (slotted > 0 && g.charges > 0 && !active) {
      out.push({
        text: `Cast Weather Grid (${g.charges} charges)`,
        icon: '🌦️', priority: 58, actionId: 'openWeatherGrid',
      });
    }
  }

  // Expedition energy full.
  if (state.expeditions?.unlocked) {
    if (state.expeditions.energy >= state.expeditions.energyMax) {
      out.push({
        text: 'Expedition energy is full — go explore',
        icon: '🗺️', priority: 56, actionId: 'openExpeditions',
      });
    }
  }

  // Expansion plot unlockable / clearable obstacles.
  if (state.expansion) {
    for (const id in state.expansion.plots) {
      const p = state.expansion.plots[id]!;
      if (p.status === 'unlockable') {
        out.push({
          text: 'Unlock a new plot of land',
          icon: '🌄', priority: 54, actionId: 'openExpansion',
        });
        break;
      }
    }
    for (const id in state.expansion.plots) {
      const p = state.expansion.plots[id]!;
      if (p.status === 'clearing') {
        const left = p.obstacles.filter(o => !o.cleared).length;
        if (left > 0) {
          out.push({
            text: `Clear ${left} obstacle${left > 1 ? 's' : ''} in a new plot`,
            icon: '🪓', priority: 48, actionId: 'openExpansion',
          });
          break;
        }
      }
    }
  }

  // Build prompts: only relevant when system is not yet established.
  if (state.level >= 2 && !state.buildings.some(b => BUILDINGS[b.type]!.kind === 'production')) {
    out.push({
      text: 'Build your first production building',
      icon: '🔨', priority: 67, actionId: 'openBuild',
    });
  }
  if (state.level >= 3 && !state.buildings.some(b => BUILDINGS[b.type]!.kind === 'pen')) {
    out.push({
      text: 'Build an animal pen',
      icon: '🐔', priority: 45, actionId: 'openBuild',
    });
  }
  if (state.level >= 3 && !state.buildings.some(b => b.type === 'fishingdock')) {
    out.push({
      text: 'Build a fishing dock by the lake',
      icon: '🎣', priority: 42, actionId: 'openBuild',
    });
  }

  // Empty plowed plots — only suggest once nothing more pressing exists.
  if (grid.emptyPlowed > 0) {
    out.push({
      text: `Plant ${grid.emptyPlowed} empty plot${grid.emptyPlowed > 1 ? 's' : ''}`,
      icon: '🌱', priority: 35, actionId: 'plant',
    });
  }

  // -------- Sort + de-dupe by actionId+payload+text so identical
  //          suggestions don't fill the rail. Then take top 4.
  out.sort((a, b) => b.priority - a.priority);
  const seen = new Set<string>();
  const top: ObjectiveSuggestion[] = [];
  for (const s of out) {
    const key = `${s.actionId ?? ''}|${s.payload?.id ?? ''}|${s.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    top.push(s);
    if (top.length >= 4) break;
  }
  return top;
}
