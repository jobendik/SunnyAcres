// =============================================================
//  FRIEND CODES — Phase 15.20 of the roadmap. Architecture-only:
//  generates a stable code for this save and stores added codes.
//  No actual networking; this is here so future multiplayer can
//  drop into the existing UX without a refactor.
// =============================================================

import { state } from '../state';
import { randi } from '../utils';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import type { FriendCodeRoot } from '../types';

function generateCode(): string {
  const a = String.fromCharCode(65 + randi(26));
  const b = String.fromCharCode(65 + randi(26));
  const n = String(1000 + randi(9000));
  return `${a}${b}-${n}`;
}

export function initFriendCodes(): void {
  if (!state.friendCodes) {
    state.friendCodes = {
      myCode: generateCode(),
      added: [],
    };
  }
}

export function myFriendCode(): string {
  initFriendCodes();
  return state.friendCodes!.myCode;
}

export function addFriendCode(code: string, name = 'Friend'): boolean {
  initFriendCodes();
  if (!/^[A-Z]{2}-\d{4}$/.test(code)) {
    toast('Code format should be AB-1234');
    return false;
  }
  if (state.friendCodes!.added.some(f => f.code === code)) {
    toast('Already added.');
    return false;
  }
  state.friendCodes!.added.push({ code, name, addedAt: Date.now() });
  track('friend_code_added', { code });
  toast(`Added friend ${name} (${code}).`, 'gold');
  return true;
}

export function listFriends(): Array<{ code: string; name: string; addedAt: number }> {
  initFriendCodes();
  return state.friendCodes!.added.slice();
}
