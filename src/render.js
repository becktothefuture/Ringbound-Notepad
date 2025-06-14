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
import { CHAPTERS } from './chapters.js';

const chapterStartPages = CHAPTERS.map(c => c.page);

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
  const { scroll, totalPages } = scrollState;
  
  // Extract configuration values for easier access
  const { 
    stack,
    flip,
    ROTATE_MAX,              // Maximum rotation angle (270°)
    FADE_START,              // Angle where fade begins (200°)
    FADE_END,                // Angle where fade completes (270°)
    SHADOW_MAX_OPACITY,      // Max shadow opacity on pages below
    SHADOW_FADE_START_ANGLE, // Angle where shadow starts fading
    SHADOW_FADE_END_ANGLE    // Angle where shadow is fully gone
  } = PAGE_ANIMATION;
  
  const pageCount = pages.length;
  const infiniteLoop = shouldUseInfiniteLoop(totalPages);

  // Debug output to track current state
  debug.group('Render Frame', () => {
    debug.log(`Scroll: ${scroll.toFixed(2)}, Infinite: ${infiniteLoop}`);
    if (infiniteLoop) {
      const loopInfo = getInfiniteLoopDebugInfo(scroll, totalPages);
      debug.log(`Loop cycle: ${loopInfo.cycle}, position: ${loopInfo.cyclePosition.toFixed(2)}`);
    }
  });

  // === MAIN RENDERING LOOP ===
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

    debug.log(`Page ${i}: rel=${rel.toFixed(2)}`);

    // === VISIBILITY CHECK ===
    // Only render pages that are currently visible
    // For infinite loop, this range is expanded to handle cycling
    
    const visibilityRange = infiniteLoop ? stack.visibleDepth + PAGE_ANIMATION.loop.buffer : stack.visibleDepth;
    const isChapterStart = chapterStartPages.includes(i);
    const isInVisibleRange = rel >= -PAGE_ANIMATION.loop.buffer && rel < visibilityRange;

    if (isInVisibleRange) {
      // === PHASE 1: PAGES IN THE STACK ===
      // These pages are waiting their turn, stacked behind the current page
      if (rel >= 1) {
        let displayRel = rel;
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
        let t = Math.max(0, 1 - rel);
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
        // Show dark back side when page is rotated enough to see through
        if (angle > PAGE_ANIMATION.backface.fadeStartAngle) {
          backfaceAlpha = mapRange(
            PAGE_ANIMATION.backface.fadeStartAngle,
            PAGE_ANIMATION.backface.fadeEndAngle,
            PAGE_ANIMATION.backface.startOpacity,
            PAGE_ANIMATION.backface.endOpacity,
            angle
          );
          backfaceBlur = backfaceAlpha * 4; // up to 4px blur
        } else {
          backfaceAlpha = 0; // Hidden before it starts turning
          backfaceBlur = 0;
        }
        
        // No shadows on the actively flipping page
        shadowOverlay = 0;
      }

      // === SHADOW OVERLAY SYSTEM ===
      // Pages in the stack are in shadow by default. The shadow fades as the page
      // above it is turned, revealing the page below.
      
      // Apply dynamic shadow only to pages deeper in the stack.
      // The first stacked page (rel === 1) should have no overlay so its image is visible.
      if (rel > 1) {
        // This page is in the stack.
        const pageAboveRel = rel - 1;
        
        // Calculate the angle of the page directly above this one.
        const pageAboveProgress = Math.max(0, 1 - pageAboveRel);
        const pageAboveAngle = flip.readyRotationX + (pageAboveProgress * flip.maxAngle);
        
        // The shadow on the current page fades out as the page above rotates.
        // Shadow is full when page above is flat (angle=0), and gone when it's vertical (angle=90).
        shadowOverlay = mapRange(
          PAGE_ANIMATION.shadow.fadeStartAngle, 
          PAGE_ANIMATION.shadow.fadeEndAngle, 
          PAGE_ANIMATION.shadow.maxOpacity, 
          0, 
          pageAboveAngle
        );
        shadowOverlay = Math.max(0, shadowOverlay); // Ensure it doesn't go negative.

        debug.log(`*** STACK SHADOW *** Page ${i}: rel=${rel.toFixed(2)}, pageAboveAngle=${pageAboveAngle.toFixed(1)}°, shadow=${shadowOverlay.toFixed(2)}`);

      } else {
        // The currently flipping page does not have a shadow overlay on itself.
        shadowOverlay = 0;
      }

      // Set the rotation origin as a CSS variable for each page
      page.style.setProperty('--page-rotation-origin-x', flip.rotationOriginX);
      page.style.setProperty('--page-rotation-origin-y', flip.rotationOriginY);

      // === APPLY ALL VISUAL PROPERTIES ===
      // Set CSS custom properties and styles for this page
      page.style.setProperty('--backface-alpha', backfaceAlpha);
      page.style.setProperty('--backface-blur', `${backfaceBlur}px`);
      page.style.setProperty('--shadow-overlay', shadowOverlay);
      
      // 3D transform: Always apply Y and Z for all pages
      page.style.transform = `translate3d(0, ${y}px, ${z}px) rotateX(${angle}deg)`;
      
      // Visual effects
      page.style.opacity = opacity;
      page.style.filter = `blur(${blur}px)`;
      
      // === FRONT CONTENT VISIBILITY ===
      // Hide the page-content (image) when the page back is facing the viewer (>90deg)
      const content = page.querySelector('.page-content');
      if (content) {
        content.style.opacity = angle > 90 ? 0 : 1;
      }
      
      // Layout and visibility
      page.style.visibility = 'visible';
      page.style.zIndex = rel <= 1 ? 200 : 100 - Math.floor(rel); // Higher z-index for pages closer to top
      page.style.display = 'flex';

    } else {
      // === HIDDEN PAGES ===
      // Pages that are outside the visible range
      
      page.style.visibility = 'hidden';
      page.style.zIndex = 0;
      page.style.display = 'none';
      
      // Reset all effects for hidden pages
      page.style.setProperty('--shadow-overlay', 0);
      page.style.setProperty('--backface-alpha', 0);
      page.style.setProperty('--backface-blur', '0px');
    }
  }
} 