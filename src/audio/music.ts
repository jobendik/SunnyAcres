// =============================================================
//  AMBIENT MUSIC  (playlist-backed MP3 playback)
// =============================================================

import { state } from '../state';
import beforeTheDewDries from '../assets/music/Before_the_Dew_Dries.mp3';
import middayAtTheCreek from '../assets/music/Midday_at_the_Creek.mp3';
import restingTheOrchardSoil from '../assets/music/Resting_the_Orchard_Soil.mp3';
import whereTheCedarBends from '../assets/music/Where_the_Cedar_Bends.mp3';

const MUSIC_TRACKS = [
  beforeTheDewDries,
  middayAtTheCreek,
  restingTheOrchardSoil,
  whereTheCedarBends,
] as const;

let musicEl: HTMLAudioElement | null = null;
let playOrder: number[] = [];
let playOrderIndex = 0;

function shuffleTracks(previousTrackIndex?: number): number[] {
  const order = MUSIC_TRACKS.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  if (
    previousTrackIndex !== undefined &&
    order.length > 1 &&
    order[0] === previousTrackIndex
  ) {
    [order[0], order[1]] = [order[1]!, order[0]!];
  }

  return order;
}

function ensurePlaylist(): void {
  if (playOrder.length === 0) {
    playOrder = shuffleTracks();
    playOrderIndex = 0;
  }
}

function currentTrackSrc(): string {
  ensurePlaylist();
  return MUSIC_TRACKS[playOrder[playOrderIndex]!]!;
}

function advanceTrack(): void {
  ensurePlaylist();
  const previousTrackIndex = playOrder[playOrderIndex]!;
  playOrderIndex++;
  if (playOrderIndex >= playOrder.length) {
    playOrder = shuffleTracks(previousTrackIndex);
    playOrderIndex = 0;
  }
}

function ensureMusicElement(): HTMLAudioElement {
  if (musicEl) return musicEl;

  musicEl = new Audio();
  musicEl.preload = 'auto';
  musicEl.volume = 0.55;
  musicEl.addEventListener('ended', () => {
    advanceTrack();
    void playCurrentTrack();
  });

  return musicEl;
}

async function playCurrentTrack(): Promise<void> {
  if (!state.musicOn) return;

  const audio = ensureMusicElement();
  const nextTrack = currentTrackSrc();
  if (audio.getAttribute('src') !== nextTrack) {
    audio.src = nextTrack;
    audio.load();
  }

  try {
    await audio.play();
  } catch {
    // Ignore autoplay interruptions; the next user gesture re-triggers startMusic.
  }
}

export function startMusic(): void {
  void playCurrentTrack();
}

export function stopMusic(): void {
  musicEl?.pause();
}
