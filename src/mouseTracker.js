// High-performance mouse position tracker
// --------------------------------------
// Provides throttled, normalized cursor coordinates (−1 ↔ 1) relative to the viewport centre.
// Usage:
//   import { initMouseTracker } from './mouseTracker.js';
//   const mouse = initMouseTracker({ updateRate: 60 }); // fps throttling
//   mouse.subscribe(({ x, y }) => console.log(x, y));

export function initMouseTracker({ updateRate = 60 } = {}) {
  const state = { x: 0, y: 0 };
  const subs = new Set();
  let lastTime = 0;

  function notify() {
    subs.forEach(cb => cb(state));
  }

  function onPointerMove(e) {
    // Normalise cursor position to centre (-1 to 1)
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    state.x = nx;
    state.y = ny;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // RAF loop to throttle notifications
  function loop(time) {
    if (time - lastTime >= 1000 / updateRate) {
      lastTime = time;
      notify();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    subscribe(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    get position() {
      return { ...state };
    },
    setUpdateRate(fps) {
      updateRate = Math.max(1, fps);
    },
    destroy() {
      window.removeEventListener('pointermove', onPointerMove);
      subs.clear();
    },
  };
} 