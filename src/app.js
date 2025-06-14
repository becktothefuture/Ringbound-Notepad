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
import { clamp, lerp, mapRange, applyBeautifulShadow, applyBeautifulDropShadow } from './utils.js';      // Mathematical utility functions  
import { initScrollEngine, subscribe } from './scrollEngine.js'; // Scroll handling system
import { renderStack } from './render.js';               // Visual rendering system
import { debug, debugOverlay } from './debug.js';       // Debug system
import { getInfiniteLoopDebugInfo, shouldUseInfiniteLoop } from './infiniteLoop.js'; // Infinite loop system
import { initChapters } from './chapterManager.js';
import { initMouseTracker } from './mouseTracker.js';

// Placeholder imports for future features (currently not implemented)
// import { domManager } from './domManager.js';         // Future: Dynamic DOM manipulation
// import { videoController } from './videoController.js'; // Future: Video content management

/*
  DOM ELEMENT SETUP
  Get references to the main notepad container and all page elements.
  These will be manipulated by the rendering system.
*/
const notepad = document.getElementById('notepad');      // Perspective container
const notepadInner = document.getElementById('notepad-inner'); // Main 3D transform target
const pages = Array.from(notepadInner.querySelectorAll('.page')); // All page elements as array

/*
  AUTOMATIC RING POSITIONING (Z-DEPTH)
  -----------------------------------
  Places the <div class="rings"> element halfway between the Z position of the
  first (top) page and the last visible page in the stack. This keeps the rings
  visually centred through the depth of the notebook regardless of how many
  pages are configured to be visible.
*/
const rings = notepad.querySelector('.rings');
if (rings) {
  const { stack, flip } = PAGE_ANIMATION;
  // Approximate Z of the deepest visible page.
  const bottomZ = stack.startZ - (stack.visibleDepth - 1) * stack.depthUnit;
  // Mid-point between front (0) and back of the stack.
  const middleZ = (flip.readyZ + bottomZ) / 2;
  rings.style.transform = `translateZ(${middleZ}px)`;
  // Ensure the rings participate in 3D space
  rings.style.transformStyle = 'preserve-3d';
}

/*
  SCROLL ENGINE INITIALIZATION
  Set up the scroll handling system that:
  - Listens for mouse wheel and touch events on the notepad
  - Converts physical scroll/swipe into virtual scroll position
  - Manages animation timing and page snapping
  - Provides scroll state to other systems
  - Handles infinite loop bounds and wrapping
*/
debug.log('Initializing scroll engine...');
debug.log(`Found ${pages.length} pages`);
debug.log(`Infinite loop enabled: ${shouldUseInfiniteLoop(pages.length)}`);

// Initialize scroll engine with page count for infinite loop calculations
initScrollEngine(notepad, pages.length);
initChapters(pages, notepad);

/*
  RENDER SYSTEM CONNECTION
  Subscribe to scroll state changes and update the visual appearance.
  
  HOW IT WORKS:
  1. User scrolls or swipes on the notepad
  2. ScrollEngine calculates new virtual scroll position
  3. ScrollEngine notifies all subscribers (including this renderer)
  4. renderStack() function receives the new scroll state
  5. renderStack() calculates 3D transforms for each page
  6. Visual changes are applied to the DOM
  
  The subscription pattern allows multiple systems to react to scroll changes
  without tight coupling between modules.
*/
subscribe(state => {
  // Pass all pages and current scroll state to the renderer
  renderStack(pages, state);
  
  // Update debug overlay with current state and infinite loop info
  const debugInfo = {
    scroll: state.scroll,
    page: state.page,
    progress: state.progress,
    rotation: state.rotation
  };
  
  // Add infinite loop debug information
  if (shouldUseInfiniteLoop(pages.length)) {
    const loopInfo = getInfiniteLoopDebugInfo(state.scroll, pages.length);
    debugInfo.cycle = loopInfo.cycle;
    debugInfo.cyclePosition = loopInfo.cyclePosition;
  }
  
  debugOverlay.update(debugInfo);
});

/* ================= MOUSE-DRIVEN NOTEBOOK PARALLAX ================= */
// === Configurable mouse-to-rotation mapping ===
let maxRotationY = 10; // degrees, left/right
let maxRotationX = 10; // degrees, up/down

// For debug overlay
let lastMouse = { x: 0, y: 0 };

const mouse = initMouseTracker({ updateRate: 60 }); // adjustable FPS
const damp = 0.075; // 0-1, lower = slower follow
let curX = 0, curY = 0, targetX = 0, targetY = 0;

mouse.subscribe(pos => {
  targetX = pos.x; // -1 .. 1
  targetY = pos.y; // -1 .. 1
  lastMouse = { x: pos.x, y: pos.y };
});

function animateNotebook() {
  // Damped interpolation toward target
  curX += (targetX - curX) * damp;
  curY += (targetY - curY) * damp;

  // Limit movement to 4% of viewport size
  const maxTranslateX = window.innerWidth * 0.04;
  const maxTranslateY = window.innerHeight * 0.04;
  const tx = curX * maxTranslateX;
  const ty = curY * maxTranslateY;

  // Map mouse position from full viewport to rotation range
  // -1 (left/top) to +1 (right/bottom) maps to -maxRotationY/X to +maxRotationY/X
  const rotY = curX * maxRotationY;
  const rotX = -curY * maxRotationX;

  notepadInner.style.transformOrigin = '50% 50%';
  notepadInner.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateY(${rotY}deg) rotateX(${rotX}deg)`;

  requestAnimationFrame(animateNotebook);
}
requestAnimationFrame(animateNotebook);

// === Debug overlay: show mouse position and rotation config ===
debugOverlay.update = (function(orig) {
  return function(info) {
    orig.call(this, {
      ...info,
      mouseX: lastMouse.x.toFixed(3),
      mouseY: lastMouse.y.toFixed(3),
      maxRotationY,
      maxRotationX
    });
  };
})(debugOverlay.update);

// Ensure debug panel is visible
if (typeof debug !== 'undefined' && debugOverlay && debugOverlay.show) {
  debugOverlay.show();
}

// TODO: Future feature implementations
// These are placeholders for additional functionality that could be added:
// setupScrollEngine();        // Advanced scroll configurations
// renderStack();              // Alternative rendering modes  
// domManager.init();          // Dynamic content management
// videoController.init();     // Video playback synchronization

// Debug information for development
debug.log('Notepad initialized with', pages.length, 'pages.');
debug.log('Debug mode is active. Press Ctrl+D to toggle debug overlay.');
debug.log('Configuration:', PAGE_ANIMATION);

// Show infinite loop status
if (PAGE_ANIMATION.loop.infinite) {
  debug.log('🔄 Infinite loop mode enabled - pages will cycle seamlessly');
} else {
  debug.log('📝 Standard mode - scrolling stops at last page');
}

window.addEventListener('DOMContentLoaded', () => {
  const notepad = document.getElementById('notepad');
  if (notepad) {
    applyBeautifulDropShadow(notepad, {
      layers: 6,
      color: '0,0,0',
      opacity: 0.16,
      blurBase: 24,
      blurStep: 12,
      offsetX: 0,
      offsetY: 24,
    });
  }
}); 

// ===================== PAGE IMAGE INITIALISATION =====================
// Dynamically assigns a background image to each .page-content element
// based on the data-deck-number attribute on its parent .page. This
// guarantees that the correct image is applied even if the CSS mapping
// is incomplete or overridden elsewhere.
(function assignPageImages() {
  pages.forEach(page => {
    const deckNumberRaw = page.dataset.deckNumber;
    if (!deckNumberRaw) return;

    // Ensure the deck number is always two digits ("1" -> "01")
    const deckNumber = deckNumberRaw.toString().padStart(2, '0');

    // Build URL-encoded filename to avoid problems with spaces
    const fileName = `Deck ${deckNumber}.jpg`;
    const encodedFileName = encodeURIComponent(fileName).replace(/%20/g, ' ');
    const imgPath = `assets/portfolio-pages/${encodedFileName}`;

    const contentEl = page.querySelector('.page-content');
    if (contentEl) {
      contentEl.style.backgroundImage = `url('${imgPath}')`;

      // Preload the image and warn if it fails (helps debugging)
      const img = new Image();
      img.src = page.baseURI.replace(/\/[^/]*$/, '/') + imgPath;
      img.onerror = () => console.warn(`⚠️ Image not found: ${imgPath}`);
    }
  });
})(); 