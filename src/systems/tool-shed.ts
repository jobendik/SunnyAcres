// =============================================================
//  TOOL SHED — Phase 15.2 of the roadmap. A small upgradable
//  building that grants a flat bonus to expedition clearing speed
//  (less energy per node) and stores tool-related context.
// =============================================================

import { state } from '../state';
import { removeItem } from './inventory';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { ToolShedRoot } from '../types';

const UNLOCK_LEVEL = 10;

export function initToolShed(): void {
  if (!state.toolShed) {
    state.toolShed = { unlocked: false, bonusSpeed: 0 };
  }
}

export function unlockToolShed(): boolean {
  initToolShed();
  if (state.toolShed!.unlocked) return false;
  if (state.level < UNLOCK_LEVEL) {
    toast(`Tool Shed unlocks at level ${UNLOCK_LEVEL}.`);
    return false;
  }
  if (state.coins < 500) {
    toast('Need 500💰 to build the shed.');
    return false;
  }
  if ((state.inv['plank'] ?? 0) < 4) {
    toast('Need 4× Plank.');
    return false;
  }
  state.coins -= 500;
  removeItem('plank', 4);
  state.toolShed!.unlocked = true;
  state.toolShed!.bonusSpeed = 0.05;
  sfx.bell();
  toast('🪚 The Tool Shed is built! Expedition energy costs are slightly reduced.', 'gold');
  track('tool_shed_built');
  return true;
}

export function upgradeShed(): boolean {
  initToolShed();
  const s = state.toolShed!;
  if (!s.unlocked) return false;
  if (s.bonusSpeed >= 0.20) {
    toast('Tool Shed already at max level.');
    return false;
  }
  if (state.coins < 1500) {
    toast('Need 1500💰 to upgrade.');
    return false;
  }
  if ((state.inv['screw'] ?? 0) < 2 || (state.inv['plank'] ?? 0) < 2) {
    toast('Need 2× Screw + 2× Plank.');
    return false;
  }
  state.coins -= 1500;
  removeItem('screw', 2);
  removeItem('plank', 2);
  s.bonusSpeed = Math.min(0.20, s.bonusSpeed + 0.05);
  toast(`Tool Shed upgraded! Expedition cost bonus now ${Math.round(s.bonusSpeed * 100)}%.`, 'gold');
  track('tool_shed_upgrade');
  return true;
}

/** Energy multiplier applied to expedition node costs. */
export function expeditionEnergyMod(): number {
  initToolShed();
  return 1 - (state.toolShed?.bonusSpeed ?? 0);
}
