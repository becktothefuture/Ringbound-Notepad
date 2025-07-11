// AudioManager – minimal global SFX helper for LockedPortfolio and future use
// ------------------------------------------------------------
// Handles: pre-loading OGG files, resuming AudioContext on first user gesture,
//          and playing short, latency-free sound effects.
// The module purposely avoids any external dependencies so it can load early.

import { GLOBAL_CONFIG } from './config.js';

// Path mapping – can be extended easily.
const SOUND_PATHS = {
  digit: new URL('./assets/sounds/digit.ogg', import.meta.url).pathname,
  error: new URL('./assets/sounds/error.ogg', import.meta.url).pathname,
  unlock: new URL('./assets/sounds/unlock.ogg', import.meta.url).pathname,
};

// WebAudio context (created lazily to avoid autoplay restrictions)
const ctx = new (window.AudioContext || window.webkitAudioContext)();
let isContextUnlocked = false;

// Decoded buffers cache
const BUFFERS = {};
const pendingPlays = [];

// Debug helper – namespacing logs for clarity
function log(...args) {
  if (GLOBAL_CONFIG?.DEBUG?.audio) console.log('%c🎵 Audio', 'color:orange', ...args);
}

// Fetch & decode all sounds in parallel
async function loadBuffers() {
  const entries = Object.entries(SOUND_PATHS);
  await Promise.all(
    entries.map(async ([key, url]) => {
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        BUFFERS[key] = await ctx.decodeAudioData(arrayBuffer);
        log(`Loaded sound: ${key}`);
        // Flush any queued plays for this id
        pendingPlays
          .filter(req => req.id === key)
          .forEach(req => {
            play(req.id);
            pendingPlays.splice(pendingPlays.indexOf(req), 1);
          });
      } catch (err) {
        console.warn(`AudioManager: failed to load ${key} (${url})`, err);
      }
    })
  );
}

// Kick off preload ASAP (no await – fire & forget)
loadBuffers();

// Public API --------------------------------------------------
export function resumeContext() {
  if (isContextUnlocked) return; // Already resumed
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => log('AudioContext resumed'));
  }
  isContextUnlocked = true;
}

export function play(id) {
  if (!isContextUnlocked) return; // Must call resumeContext() first.
  const buffer = BUFFERS[id];
  if (!buffer) {
    log(`Buffer ${id} not ready`);
    pendingPlays.push({ id });
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

// Convenience helpers for debugging
export function isUnlocked() {
  return isContextUnlocked;
}

export function debugBuffers() {
  console.table(
    Object.keys(SOUND_PATHS).map(key => ({ key, loaded: !!BUFFERS[key] }))
  );
} 