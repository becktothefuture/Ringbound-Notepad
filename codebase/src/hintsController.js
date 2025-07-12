// hintsController.js - manage static overlay hints and input lock
import { resumeContext } from './audioManager.js';

export function initializeHintsController(scrollEngine) {
  const overlay = document.getElementById('overlay-hints');
  if (!overlay) return;

  // When preloader completes, ensure overlay visible
  function onPreloaderComplete() {
    overlay.classList.add('overlay--hints--visible');
    if (scrollEngine && scrollEngine.pauseInput) scrollEngine.pauseInput();
  }
  document.addEventListener('preloader:complete', onPreloaderComplete, { once: true });

  overlay.addEventListener('click', () => {
    // fade out
    overlay.classList.remove('overlay--hints--visible');
    overlay.classList.add('overlay--hints--hidden');

    // enable audio
    resumeContext();

    // resume input after transition
    setTimeout(() => {
      if (scrollEngine && scrollEngine.resumeInput) scrollEngine.resumeInput();
      overlay.remove();
    }, 400);
  });
} 