/**
 * RENDERING SYSTEM
 * 
 * This module converts scroll state into visual 3D transformations.
 * It's the heart of the animation system, calculating position, rotation,
 * opacity, blur, and shadow effects for each page.
 * 
 * RENDERING PHILOSOPHY:
 * - Pure functional approach: Input state → Output visual properties
 * - Continuous positioning: Every page's appearance is calculated from its exact position
 * - No discrete states: Smooth interpolation between all visual properties
 * - Performance focused: Direct DOM manipulation with hardware-accelerated properties
 * - Infinite Loop Support: Seamless cycling through pages when enabled
 */

import { PAGE_ANIMATION } from './config.js';
import { mapRange } from './utils.js';
import { debug } from './debug.js';
import { 
  calculateInfiniteRelativePosition, 
  shouldUseInfiniteLoop,
  getInfiniteLoopDebugInfo 
} from './infiniteLoop.js';
import { perf } from './performance.js';
// import { CHAPTERS } from './chapters.js'; // TODO: Implement chapter-based styling  // TODO: Implement chapter-based styling if needed
  // const chapterStartPages = CHAPTERS.map(c => c.page);

// Frame counter for debug output - using module scope
const state = {
  frameCount: 0
};

// Cache the commentary overlay element and last shown commentary
let commentaryOverlay = null;
let lastCommentary = null;

/**
 * Updates the layered shadow effect based on notepad tilt
 * @param {number} tiltAngle - Current tilt angle of the notepad
 */
function updateLayeredShadow(tiltAngle) {
  const shadowElement = document.querySelector('.notebook__layered-shadow');
  if (!shadowElement) return;
  
  // Convert tilt angle to shadow offset (max ±20px)
  const maxOffset = 20;
  const offset = mapRange(tiltAngle, -30, 30, -maxOffset, maxOffset);
  
  // Update the CSS variable for shadow x-offset
  document.documentElement.style.setProperty('--shadow-x-offset', `${offset}px`);
}

/**
 * MAIN RENDERING FUNCTION
 * 
 * Calculates and applies all visual styles for every page based on scroll state.
 * This function uses a "continuous position" model where every page's appearance
 * is a direct function of its float-based position in the stack (e.g., page 2.5).
 * 
 * For infinite loop mode, pages can appear at multiple virtual positions to create
 * seamless cycling through the notepad.
 * 
 * COORDINATE SYSTEM REMINDER:
 * - X: Left(-) / Right(+) 
 * - Y: Up(-) / Down(+) in screen space
 * - Z: Away(-) / Toward viewer(+)
 * - RotateX: Tip backward(-) / forward(+)
 * 
 * @param {HTMLElement[]} pages - Array of all page DOM elements
 * @param {Object} scrollState - Current scroll state from scroll engine
 */
export function renderStack(pages, scrollState) {
  // Cache frequently accessed values
  const { stack, flip, loop } = PAGE_ANIMATION;
  
  const { scroll, totalPages, velocity } = scrollState;
  const pageCount = pages.length;
  const infiniteLoop = shouldUseInfiniteLoop(totalPages);
  
  // Calculate tilt and update shadow
  const tiltAngle = Math.min(Math.max(velocity * -0.5, -30), 30);
  updateLayeredShadow(tiltAngle);

  // Update commentary overlay based on current page
  // Use Math.round to get the actual current page, handling both forward and backward scrolling
  const currentPageIndex = Math.round(scroll);
  // Handle infinite loop wrapping
  const wrappedIndex = infiniteLoop ? 
    ((currentPageIndex % pageCount) + pageCount) % pageCount : 
    Math.max(0, Math.min(currentPageIndex, pageCount - 1));
  
  const currentPage = pages[wrappedIndex];
  
  // Lazy initialize commentary overlay
  if (!commentaryOverlay) {
    commentaryOverlay = document.getElementById('commentary-overlay');
  }
  
  if (currentPage && commentaryOverlay) {
    const commentary = currentPage.dataset.commentary;
    // Only update if commentary has changed
    if (commentary !== lastCommentary) {
      commentaryOverlay.textContent = commentary;
      if (commentary) {
        commentaryOverlay.classList.add('visible');
      } else {
        commentaryOverlay.classList.remove('visible');
      }
      lastCommentary = commentary;
    }
  }

  // Optimize debug output - only log every 60 frames in debug mode
  if (PAGE_ANIMATION.misc.debug && (++state.frameCount % 60 === 0)) {
    debug.group('Render Frame (every 60th)', () => {
      debug.log(`Scroll: ${scroll.toFixed(2)}, Infinite: ${infiniteLoop}`);
      if (infiniteLoop) {
        const loopInfo = getInfiniteLoopDebugInfo(scroll, totalPages);
        debug.log(`Loop cycle: ${loopInfo.cycle}, position: ${loopInfo.cyclePosition.toFixed(2)}`);
      }
    });
  }

  // Pre-calculate visibility range to avoid repeated calculations
  const visibilityRange = infiniteLoop ? stack.visibleDepth + loop.buffer : stack.visibleDepth;
  const bufferRange = -loop.buffer;

  // === OPTIMIZED RENDERING LOOP ===
  // Process each page individually based on its relative position
  
  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];
    
    // Calculate this page's relative position using infinite loop logic
    // rel = 0: This is the top page (currently flipping)
    // rel = 1: This is the next page (ready to flip)  
    // rel = 2+: This page is in the stack behind
    // rel < 0: This page has been flipped past (hidden)
    
    let rel;
    if (infiniteLoop) {
      // Use infinite loop calculation for seamless cycling
      rel = calculateInfiniteRelativePosition(i, totalPages, scroll);
    } else {
      // Standard calculation for bounded mode
      rel = i - scroll;
    }

    // Initialize all visual properties
    let opacity = 1;          // Page transparency (0-1)
    let angle = 0;           // X-axis rotation in degrees
    let z = 0;               // Z-axis position (depth)
    let y = 0;               // Y-axis position (vertical)
    let blur = 0;            // Blur filter amount (px)
    let backfaceAlpha = 0; // Alpha for the back side of flipping pages
    let backfaceBlur = 0; // blur px
    let shadowOverlay = 0;   // Shadow cast on pages below

    // Optimize debug logging - only for specific pages when needed
    if (PAGE_ANIMATION.misc.debug && state.frameCount % 60 === 0 && i < 3) {
      debug.log(`Page ${i}: rel=${rel.toFixed(2)}`);
    }

    // === VISIBILITY CHECK ===
    // Only render pages that are currently visible
    // For infinite loop, this range is expanded to handle cycling
    
    // Optimized visibility check with pre-calculated ranges
    const isInVisibleRange = rel >= bufferRange && rel < visibilityRange;

    if (isInVisibleRange) {
      // === PHASE 1: PAGES IN THE STACK ===
      // These pages are waiting their turn, stacked behind the current page
      if (rel >= 1) {
        const displayRel = rel;
        angle = mapRange(stack.visibleDepth, 1, flip.startRotationX, flip.readyRotationX, displayRel);
        z = mapRange(stack.visibleDepth - 1, 1, stack.startZ, flip.readyZ, displayRel);
        y = mapRange(stack.visibleDepth - 1, 1, stack.startY, flip.readyY, displayRel);
        // Apply smooth separation for pages in the stack
        z -= (displayRel - 1) * stack.depthUnit;
        opacity = mapRange(stack.opacityFade[0], stack.opacityFade[1], 0, 1, displayRel);
        opacity = Math.max(0, opacity);
        backfaceAlpha = 0;
      } else {
        // === PHASE 2: THE FLIPPING PAGE ===
        // This is the top page that's currently being flipped
        
        // Implement dead zone (stick) before rotation begins
        const stickFraction = (stack.stickPixels || 0) / 100;
        const t = Math.max(0, 1 - rel);
        if (t < stickFraction) {
          // Stick: no rotation yet
          angle = flip.readyRotationX;
          y = flip.readyY;
          z = flip.readyZ;
        } else {
          // After stick, start rotation as usual, remap t to [0,1]
          const tAdj = (t - stickFraction) / (1 - stickFraction);
          angle = flip.readyRotationX + (tAdj * flip.maxAngle);
          y = flip.readyY; // Keep y-position constant during the flip
          z = mapRange(0, 1, flip.readyZ, stack.startZ, tAdj);
        }
        
        // === FADE AND BLUR EFFECTS ===
        // As page rotates past certain angle, it becomes edge-on and hard to see
        
        if (angle > flip.fadeStart) {
          // Progressive fade-out as page becomes edge-on
          opacity = mapRange(flip.fadeStart, flip.fadeEnd, 1, 0, angle);
          
          // Motion blur effect for realism
          blur = mapRange(flip.fadeStart, flip.fadeEnd, 0, flip.blurMax, angle);
        }

        // === BACKFACE EFFECT ===
        // Show solid back side when page is rotated enough to see through
        // Remove any dynamic opacity/blur for backface
        page.style.setProperty('--backface-color', 'linear-gradient(to bottom, red 0%, #8B0000 100%)');
        
        // No shadows on the actively flipping page
        shadowOverlay = 0;
      }

      // === SHADOW OVERLAY SYSTEM ===
      // Pages in the stack are in shadow by default. The shadow fades as the page
      // above it is turned, revealing the page below.
      // Apply dynamic shadow only to pages deeper in the stack.
      // The first stacked page (rel === 1) should have no overlay so its image is visible.
      const shadowCfg = PAGE_ANIMATION.effects.shadow;
      if (rel > 1) {
        // This page is in the stack.
        const pageAboveRel = rel - 1;
        // Calculate the angle of the page directly above this one.
        const pageAboveProgress = Math.max(0, 1 - pageAboveRel);
        const pageAboveAngle = flip.readyRotationX + (pageAboveProgress * flip.maxAngle);
        // The shadow on the current page fades out as the page above rotates.
        // Shadow is full when page above is flat (angle=0), and gone when it's vertical (angle=90).
        shadowOverlay = mapRange(
          shadowCfg.fadeStartAngle, 
          shadowCfg.fadeEndAngle, 
          shadowCfg.startOpacity, 
          shadowCfg.endOpacity, 
          pageAboveAngle
        );
        shadowOverlay = Math.max(0, shadowOverlay); // Ensure it doesn't go negative
      } else {
        shadowOverlay = 0;
      }
      // Set shadow color and blur as CSS variables
      page.style.setProperty('--shadow-color', shadowCfg.color);
      page.style.setProperty('--shadow-blur', shadowCfg.blur.enabled ? `${shadowOverlay * shadowCfg.blur.maxBlur}px` : '0px');

      // === PAGE BACKDROP FADE ===
      let backdropOpacity = 1;
      if (rel <= 1) {
        backdropOpacity = 1;
      } else if (rel > 0.5 && rel <= 1.5) {
        backdropOpacity = 1.5 - rel;
      } else {
        backdropOpacity = 0;
      }
      page.style.setProperty('--backdrop-opacity', backdropOpacity);

      // === APPLY ALL VISUAL PROPERTIES ===
      // Batch DOM operations for better performance
      const style = page.style;
      // Set rotation origin as CSS variables (cached at module level for performance)
      style.setProperty('--page-rotation-origin-x', flip.rotationOriginX);
      style.setProperty('--page-rotation-origin-y', flip.rotationOriginY);
      // Set CSS custom properties for visual effects
      style.setProperty('--shadow-overlay', shadowOverlay);
      // Apply 3D transform (hardware accelerated)
      style.transform = `translate3d(0, ${y}px, ${z}px) rotateX(${angle}deg)`;
      // Apply visual effects
      style.opacity = opacity;
      style.filter = blur > 0 ? `blur(${blur}px)` : '';
      // === OPTIMIZED CONTENT VISIBILITY ===
      // Cache content element reference to avoid repeated queries
      const content = page.querySelector('.page-content');
      if (content) {
        content.style.opacity = 1;
        // Keep blur logic if needed, or remove if you want no blur at all:
        // content.style.filter = '';
      }
      
      // Layout and visibility (batch these operations)
      style.visibility = 'visible';
      style.zIndex = rel <= 1 ? 200 : 100 - Math.floor(rel);
      style.display = 'flex';

    } else {
      // === HIDDEN PAGES OPTIMIZATION ===
      // Batch DOM operations for hidden pages and avoid unnecessary work
      
      const style = page.style;
      
      // Early exit if already hidden to prevent redundant operations
      if (style.display === 'none') continue;
      
      style.visibility = 'hidden';
      style.zIndex = 0;
      style.display = 'none';
      
      // Reset all effects for hidden pages (batch operations)
      style.setProperty('--shadow-overlay', 0);
    }
  }
  
  // End performance monitoring
  perf.endRender();
}

/**
 * MAIN RENDERING FUNCTION
 * 
 * Calculates and applies all visual styles for every page based on scroll state.
 * This function uses a "continuous position" model where every page's appearance
 * is a direct function of its float-based position in the stack (e.g., page 2.5).
 * 
 * For infinite loop mode, pages can appear at multiple virtual positions to create
 * seamless cycling through the notepad.
 * 
 * COORDINATE SYSTEM REMINDER:
 * - X: Left(-) / Right(+) 
 * - Y: Up(-) / Down(+) in screen space
 * - Z: Away(-) / Toward viewer(+)
 * - RotateX: Tip backward(-) / forward(+)
 * 
 * @param {HTMLElement[]} pages - Array of all page DOM elements
 * @param {Object} scrollState - Current scroll state from scroll engine
 */
// Cache frequently accessed values
const { stack, flip, loop } = PAGE_ANIMATION;

export function render(pages, scrollState) {
  perf.mark('render-start');
  
  const { scroll, totalPages } = scrollState;
  const pageCount = pages.length;
  const infiniteLoop = shouldUseInfiniteLoop(totalPages);

  // Optimize debug output - only log every 60 frames in debug mode
  if (PAGE_ANIMATION.misc.debug && (++state.frameCount % 60 === 0)) {
    debug.group('Render Frame (every 60th)', () => {
      debug.log(`Scroll: ${scroll.toFixed(2)}, Infinite: ${infiniteLoop}`);
      if (infiniteLoop) {
        const loopInfo = getInfiniteLoopDebugInfo(scroll, totalPages);
        debug.log(`Loop cycle: ${loopInfo.cycle}, position: ${loopInfo.cyclePosition.toFixed(2)}`);
      }
    });
  }

  // Pre-calculate visibility range to avoid repeated calculations
  const visibilityRange = infiniteLoop ? stack.visibleDepth + loop.buffer : stack.visibleDepth;
  const bufferRange = -loop.buffer;

  // Calculate the overall tilt based on scroll velocity
  const tiltAngle = Math.min(Math.max(scrollState.velocity * -0.5, -30), 30);
  
  // Update shadow effect
  updateLayeredShadow(tiltAngle);

  // === OPTIMIZED RENDERING LOOP ===
  // Process each page individually based on its relative position
  
  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];
    
    // Calculate this page's relative position using infinite loop logic
    // rel = 0: This is the top page (currently flipping)
    // rel = 1: This is the next page (ready to flip)  
    // rel = 2+: This page is in the stack behind
    // rel < 0: This page has been flipped past (hidden)
    
    let rel;
    if (infiniteLoop) {
      // Use infinite loop calculation for seamless cycling
      rel = calculateInfiniteRelativePosition(i, totalPages, scroll);
    } else {
      // Standard calculation for bounded mode
      rel = i - scroll;
    }

    // Initialize all visual properties
    let opacity = 1;          // Page transparency (0-1)
    let angle = 0;           // X-axis rotation in degrees
    let z = 0;               // Z-axis position (depth)
    let y = 0;               // Y-axis position (vertical)
    let blur = 0;            // Blur filter amount (px)
    let backfaceAlpha = 0; // Alpha for the back side of flipping pages
    let backfaceBlur = 0; // blur px
    let shadowOverlay = 0;   // Shadow cast on pages below

    // Optimize debug logging - only for specific pages when needed
    if (PAGE_ANIMATION.misc.debug && state.frameCount % 60 === 0 && i < 3) {
      debug.log(`Page ${i}: rel=${rel.toFixed(2)}`);
    }

    // === VISIBILITY CHECK ===
    // Only render pages that are currently visible
    // For infinite loop, this range is expanded to handle cycling
    
    // Optimized visibility check with pre-calculated ranges
    const isInVisibleRange = rel >= bufferRange && rel < visibilityRange;

    if (isInVisibleRange) {
      // === PHASE 1: PAGES IN THE STACK ===
      // These pages are waiting their turn, stacked behind the current page
      if (rel >= 1) {
        const displayRel = rel;
        angle = mapRange(stack.visibleDepth, 1, flip.startRotationX, flip.readyRotationX, displayRel);
        z = mapRange(stack.visibleDepth - 1, 1, stack.startZ, flip.readyZ, displayRel);
        y = mapRange(stack.visibleDepth - 1, 1, stack.startY, flip.readyY, displayRel);
        // Apply smooth separation for pages in the stack
        z -= (displayRel - 1) * stack.depthUnit;
        opacity = mapRange(stack.opacityFade[0], stack.opacityFade[1], 0, 1, displayRel);
        opacity = Math.max(0, opacity);
        backfaceAlpha = 0;
      } else {
        // === PHASE 2: THE FLIPPING PAGE ===
        // This is the top page that's currently being flipped
        
        // Implement dead zone (stick) before rotation begins
        const stickFraction = (stack.stickPixels || 0) / 100;
        const t = Math.max(0, 1 - rel);
        if (t < stickFraction) {
          // Stick: no rotation yet
          angle = flip.readyRotationX;
          y = flip.readyY;
          z = flip.readyZ;
        } else {
          // After stick, start rotation as usual, remap t to [0,1]
          const tAdj = (t - stickFraction) / (1 - stickFraction);
          angle = flip.readyRotationX + (tAdj * flip.maxAngle);
          y = flip.readyY; // Keep y-position constant during the flip
          z = mapRange(0, 1, flip.readyZ, stack.startZ, tAdj);
        }
        
        // === FADE AND BLUR EFFECTS ===
        // As page rotates past certain angle, it becomes edge-on and hard to see
        
        if (angle > flip.fadeStart) {
          // Progressive fade-out as page becomes edge-on
          opacity = mapRange(flip.fadeStart, flip.fadeEnd, 1, 0, angle);
          
          // Motion blur effect for realism
          blur = mapRange(flip.fadeStart, flip.fadeEnd, 0, flip.blurMax, angle);
        }

        // === BACKFACE EFFECT ===
        // Show solid back side when page is rotated enough to see through
        // Remove any dynamic opacity/blur for backface
        page.style.setProperty('--backface-color', 'linear-gradient(to bottom, red 0%, #8B0000 100%)');
        
        // No shadows on the actively flipping page
        shadowOverlay = 0;
      }

      // === SHADOW OVERLAY SYSTEM ===
      // Pages in the stack are in shadow by default. The shadow fades as the page
      // above it is turned, revealing the page below.
      // Apply dynamic shadow only to pages deeper in the stack.
      // The first stacked page (rel === 1) should have no overlay so its image is visible.
      const shadowCfg = PAGE_ANIMATION.effects.shadow;
      if (rel > 1) {
        // This page is in the stack.
        const pageAboveRel = rel - 1;
        // Calculate the angle of the page directly above this one.
        const pageAboveProgress = Math.max(0, 1 - pageAboveRel);
        const pageAboveAngle = flip.readyRotationX + (pageAboveProgress * flip.maxAngle);
        // The shadow on the current page fades out as the page above rotates.
        // Shadow is full when page above is flat (angle=0), and gone when it's vertical (angle=90).
        shadowOverlay = mapRange(
          shadowCfg.fadeStartAngle, 
          shadowCfg.fadeEndAngle, 
          shadowCfg.startOpacity, 
          shadowCfg.endOpacity, 
          pageAboveAngle
        );
        shadowOverlay = Math.max(0, shadowOverlay); // Ensure it doesn't go negative
      } else {
        shadowOverlay = 0;
      }
      // Set shadow color and blur as CSS variables
      page.style.setProperty('--shadow-color', shadowCfg.color);
      page.style.setProperty('--shadow-blur', shadowCfg.blur.enabled ? `${shadowOverlay * shadowCfg.blur.maxBlur}px` : '0px');

      // === PAGE BACKDROP FADE ===
      let backdropOpacity = 1;
      if (rel <= 0.5) {
        backdropOpacity = 1;
      } else if (rel > 0.5 && rel <= 1.5) {
        backdropOpacity = 1.5 - rel;
      } else {
        backdropOpacity = 0;
      }
      page.style.setProperty('--backdrop-opacity', backdropOpacity);

      // === APPLY ALL VISUAL PROPERTIES ===
      // Batch DOM operations for better performance
      const style = page.style;
      // Set rotation origin as CSS variables (cached at module level for performance)
      style.setProperty('--page-rotation-origin-x', flip.rotationOriginX);
      style.setProperty('--page-rotation-origin-y', flip.rotationOriginY);
      // Set CSS custom properties for visual effects
      style.setProperty('--shadow-overlay', shadowOverlay);
      // Apply 3D transform (hardware accelerated)
      style.transform = `translate3d(0, ${y}px, ${z}px) rotateX(${angle}deg)`;
      // Apply visual effects
      style.opacity = opacity;
      style.filter = blur > 0 ? `blur(${blur}px)` : '';
      // === OPTIMIZED CONTENT VISIBILITY ===
      // Cache content element reference to avoid repeated queries
      const content = page.querySelector('.page-content');
      if (content) {
        content.style.opacity = 1;
        // Keep blur logic if needed, or remove if you want no blur at all:
        // content.style.filter = '';
      }
      
      // Layout and visibility (batch these operations)
      style.visibility = 'visible';
      style.zIndex = rel <= 1 ? 200 : 100 - Math.floor(rel);
      style.display = 'flex';

    } else {
      // === HIDDEN PAGES OPTIMIZATION ===
      // Batch DOM operations for hidden pages and avoid unnecessary work
      
      const style = page.style;
      
      // Early exit if already hidden to prevent redundant operations
      if (style.display === 'none') continue;
      
      style.visibility = 'hidden';
      style.zIndex = 0;
      style.display = 'none';
      
      // Reset all effects for hidden pages (batch operations)
      style.setProperty('--shadow-overlay', 0);
    }
  }
  
  perf.mark('render-end');
  perf.measure('render');
}