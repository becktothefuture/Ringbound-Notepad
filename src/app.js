/*
  MAIN APPLICATION ENTRY POINT
  
  This file orchestrates the entire notepad application by:
  1. Importing all necessary modules (config, utilities, scroll engine, renderer)
  2. Setting up the DOM elements
  3. Initializing the scroll engine
  4. Connecting the scroll events to the visual renderer
  
  ARCHITECTURE OVERVIEW:
  - CONFIG: Centralized settings for all animation parameters
  - Utils: Mathematical helper functions (lerp, clamp, easing functions)
  - ScrollEngine: Handles user input (wheel, touch) and manages virtual scroll state
  - Render: Converts scroll state into visual 3D transformations
  - Debug: Conditional logging and visual debug overlay
  - InfiniteLoop: Seamless page cycling system
  
  DATA FLOW:
  User Input → ScrollEngine → State Changes → Renderer → Visual Updates
*/

// Import all required modules
import { PAGE_ANIMATION } from './config.js';            // Animation settings and parameters
// import { applyBeautifulShadow } from './utils.js';      // Mathematical utility functions  
import { initScrollEngine, subscribe } from './scrollEngine.js'; // Scroll handling system
import { renderStack } from './render.js';               // Visual rendering system
import { getInfiniteLoopDebugInfo, shouldUseInfiniteLoop } from './infiniteLoop.js'; // Infinite loop system
import { initChapters } from './chapterManager.js';
import { initMouseTracker } from './mouseTracker.js';

// Dynamic page & chapter generation
import manifest from './portfolioManifest.js';
import { createPagesFromManifest } from './portfolioLoader.js';

async function bootstrap() {
  /*
    1. Build pages from the manifest
    2. Initialise scroll engine & chapters once pages exist
  */

  // DOM references that exist regardless of pages
  const notepad = document.getElementById('notepad');
  const notepadInner = document.getElementById('notepad-inner');

  // Clear any pre-existing page markup (useful during dev when HTML still contains pages)
  notepadInner.querySelectorAll('.page').forEach((el) => el.remove());

  // Generate pages and update CHAPTERS array
  const pages = createPagesFromManifest(notepadInner, manifest);

  /* ================= SCROLL ENGINE INITIALISATION ================= */
  initScrollEngine(notepad, pages.length);
  initChapters(pages, notepad);

  /* ================= RENDER SYSTEM CONNECTION ================= */
  subscribe((state) => {
    renderStack(pages, state);
  });

  /* ======= Mouse parallax & other existing logic remains unchanged ======= */
  setupNotebookParallax(notepad, notepadInner);

  /* ================= CLICK-TO-ZOOM ================= */
  (function setupClickToZoom() {
    let zoomed = false;

    // Ensure GPU acceleration and smooth transition via CSS class
    notepad.style.willChange = 'transform';

    const overlay = document.getElementById('homepage-overlay');

    notepad.addEventListener('click', (e) => {
      // Prevent any propagation that might interfere with other handlers
      e.stopPropagation();

      zoomed = !zoomed;
      if (zoomed) {
        notepad.classList.add('notepad--zoomed');
        if (overlay) overlay.classList.add('overlay--zoomed-out');
      } else {
        notepad.classList.remove('notepad--zoomed');
        if (overlay) overlay.classList.remove('overlay--zoomed-out');
      }
    });
  })();
}

function setupNotebookParallax(notepad, notepadInner) {
  // === Configurable mouse-to-rotation mapping (from config) ===
  const {
    maxRotationX,
    maxRotationY,
    maxRotationZ,
    translateFactor,
    damp: configDamp,
    fps: parallaxFPS,
    mouseUpdateRate,
  } = PAGE_ANIMATION.parallax;

  const mouse = initMouseTracker({ updateRate: mouseUpdateRate });
  const damp = configDamp; // 0-1, lower = slower follow
  let curX = 0,
    curY = 0,
    targetX = 0,
    targetY = 0;

  let lastMouse = { x: 0, y: 0 };
  mouse.subscribe((pos) => {
    targetX = pos.x; // -1 .. 1
    targetY = pos.y; // -1 .. 1
    lastMouse = { x: pos.x, y: pos.y };
  });

  // Cache DOM references and calculations for performance
  let lastFrameTime = 0;
  const targetFPS = parallaxFPS;
  const frameInterval = 1000 / targetFPS;

  function animateNotebook(currentTime = 0) {
    // Frame rate limiting for better performance
    if (currentTime - lastFrameTime < frameInterval) {
      requestAnimationFrame(animateNotebook);
      return;
    }
    lastFrameTime = currentTime;

    // Damped interpolation toward target
    curX += (targetX - curX) * damp;
    curY += (targetY - curY) * damp;

    // Limit movement to 4% of viewport size (cache viewport calculations)
    const maxTranslateX = window.innerWidth * translateFactor;
    const maxTranslateY = window.innerHeight * translateFactor;
    const tx = curX * maxTranslateX;
    const ty = curY * maxTranslateY;

    // Map mouse position from full viewport to rotation range
    // -1 (left/top) to +1 (right/bottom) maps to -maxRotationY/X to +maxRotationY/X
    const rotY = curX * maxRotationY; // Horizontal mouse -> Y-axis rotation (left/right turn)
    const rotX = -curY * maxRotationX; // Vertical mouse -> X-axis rotation (up/down tilt)
    const rotZ = curX * maxRotationZ; // Horizontal mouse -> Z-axis rotation (roll/tilt effect)

    // --- GLOBAL NOTEBOOK OFFSET (distinct from mouse transforms) ---
    const { offsetX, offsetY, offsetZ } = PAGE_ANIMATION.global;

    // Cache transform string for performance
    const transformString = `translate3d(${offsetX + tx}px, ${offsetY + ty}px, ${offsetZ}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;

    notepadInner.style.transformOrigin = '50% 50%';
    notepadInner.style.transform = transformString;

    // Visual indicator for Z-rotation testing
    const zRotationActive = Math.abs(rotZ) > 1; // Show indicator when Z-rotation > 1 degree
    notepad.classList.toggle('notepad--z-rotating', zRotationActive);

    requestAnimationFrame(animateNotebook);
  }
  requestAnimationFrame(animateNotebook);
}

bootstrap();

// TODO: Future feature implementations
// These are placeholders for additional functionality that could be added:
// setupScrollEngine();        // Advanced scroll configurations
// renderStack();              // Alternative rendering modes  
// domManager.init();          // Dynamic content management
// videoController.init();     // Video playback synchronization 