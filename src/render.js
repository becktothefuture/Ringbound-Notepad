/**
 * 3D NOTEBOOK RENDERING SYSTEM - USER SPECIFICATION
 *
 * Implements the exact 3D notebook specification:
 * - Pages flip over the top edge and land on a growing pile toward camera
 * - Depth model: Bottom unread Z=5px, each sheet adds 4px
 * - Flip sequence: Lift & hinge (0→50%), drop & settle (50→100%)
 * - All pages in single .page-stack container, no z-index usage
 * - Transform origin: 50% 0 0 (top edge hinge)
 * - Backface visible with grey ::after pseudo-element
 * - 60fps animation at 600ms duration
 */

import { GLOBAL_CONFIG } from './config.js';
import { mapRange, clamp, lerp } from './utils.js';
import { perf } from './performance.js';
import {
  computeTransform,
  initializeDepthSystem,
  createFlipAnimation,
  calculateRingsFrontPosition,
} from './pageTransforms.js';

// Cache for performance optimization
let commentaryOverlay = null;
let lastCommentary = null;

// Typewriter effect for commentary overlay
let commentaryTypewriterTimeout = null;

function setCommentaryTextTypewriter(element, newText, typingSpeed = 24) {
  if (!element) return;
  if (commentaryTypewriterTimeout) clearTimeout(commentaryTypewriterTimeout);
  element.innerHTML = '';
  let i = 0;
  // Add delay before starting typewriter effect
  const delay = (typeof GLOBAL_CONFIG !== 'undefined' && GLOBAL_CONFIG.COMMENTARY && typeof GLOBAL_CONFIG.COMMENTARY.typewriterDelay === 'number')
    ? GLOBAL_CONFIG.COMMENTARY.typewriterDelay
    : 400;
  function typeNext() {
    element.innerHTML = newText.slice(0, i);
    i++;
    if (i <= newText.length) {
      commentaryTypewriterTimeout = setTimeout(typeNext, typingSpeed);
    } else {
      element.innerHTML = newText;
    }
  }
  commentaryTypewriterTimeout = setTimeout(typeNext, delay);
}

/**
 * Update commentary overlay with current page information
 * @param {HTMLElement} currentPage - Current page element
 */
function updateCommentary(currentPage) {
  const pixelCommentary = document.getElementById('pixel-commentary');
  if (currentPage) {
    const commentary = currentPage.dataset.commentary;
    if (commentary !== lastCommentary) {
      if (pixelCommentary) {
        setCommentaryTextTypewriter(pixelCommentary, commentary);
      }
      lastCommentary = commentary;
    }
  }
}

/**
 * Apply visibility culling for performance optimization using CSS classes
 * with smooth gradient transitions instead of hard cutoffs - PERFORMANCE OPTIMIZED
 * @param {HTMLElement} page - Page element
 * @param {number} pageIndex - Page index
 * @param {number} scrollPosition - Current scroll position
 * @returns {boolean} Whether page should be visible
 */
function shouldRenderPage(page, pageIndex, scrollPosition) {
  // Always keep cover pages and pages with tabs visible for proper tab display
  const hasTab = page.querySelector('.page-tab') !== null;
  const isCover = page.classList.contains('cover');
  const isChapterStartPage = hasTab || isCover;

  if (isChapterStartPage) {
    // Always show pages with tabs or covers - they need to maintain their z-position
    page.classList.remove('page--hidden', 'page--fading');
    page.classList.add('page--visible');
    page.style.display = 'flex';
    return true;
  }

  // For regular content pages, apply AGGRESSIVE culling for performance
  const currentPage = Math.floor(scrollPosition);
  const distance = Math.abs(pageIndex - currentPage);
  const maxDistance = GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages;
  const fadeDistance = 1; // REDUCED: More aggressive fading (was 2)

  // Calculate visibility states
  const shouldShow = distance <= maxDistance;
  const shouldFade = distance > (maxDistance - fadeDistance) && distance <= maxDistance;

  if (!shouldShow) {
    // Too far away - completely hidden with display:none for performance
    page.classList.add('page--hidden');
    page.classList.remove('page--visible', 'page--fading');
    page.style.display = 'none';
    return false;
  } else if (shouldFade) {
    // In fade zone - minimal opacity for performance
    page.classList.add('page--fading');
    page.classList.remove('page--hidden', 'page--visible');
    page.style.display = 'flex';
    const fadeProgress = (distance - (maxDistance - fadeDistance)) / fadeDistance;
    const opacity = 1.0 - (fadeProgress * 0.8); // More aggressive fading
    page.style.setProperty('--fade-opacity', Math.max(0.2, opacity).toString());
  } else {
    // Fully visible
    page.classList.add('page--visible');
    page.classList.remove('page--hidden', 'page--fading');
    page.style.display = 'flex';
  }

  return shouldShow;
}

/**
 * MAIN RENDERING FUNCTION
 *
 * Implements state-driven rendering with physically accurate transformations.
 * Converts scroll state into 3D page positions following specification requirements.
 *
 * @param {HTMLElement[]} pages - Array of page elements
 * @param {Object} scrollState - Current scroll state from VirtualScrollEngine
 */
export function render(pages, scrollState) {
  perf.startRender();

  if (!pages || pages.length === 0) {
    perf.endRender();
    return;
  }

  const { scroll, totalPages, velocity } = scrollState;
  const pageCount = pages.length;

  // Update commentary for current page
  const currentPageIndex = Math.round(scroll);
  const currentPage = pages[clamp(currentPageIndex, 0, pageCount - 1)];
  updateCommentary(currentPage);

  // Render each page with state-driven transforms
  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];

    // Performance optimization: visibility culling
    if (!shouldRenderPage(page, i, scroll)) {
      continue;
    }

    // Calculate transform using specification physics
    const transformData = computeTransform(i, scroll, pageCount);

    // Update new page shadow overlay based on page ABOVE flipping
    updatePageShadow(page, i, scroll);

    // Buffer page contents to optimize performance while all pages are visible
    updatePageContentVisibility(page, i, scroll);

    // Apply flip-specific content visibility
    applyFlipContentVisibility(page, i, scroll);

    // Apply transforms with clean CSS approach
    applyPageTransform(page, transformData);

    // Update backface shadow animation based on page rotation
    updateBackfaceShadowAnimation(page, i, scroll);
  }

  // Update ring rotations based on overall flip progress (throttled for performance)
  updateRingRotations(scroll, pageCount);

  perf.endRender();
}

/**
 * Apply transformation to page element with proper GPU acceleration
 * @param {HTMLElement} page - Page element
 * @param {Object} transformData - Transform and filter properties
 */
function applyPageTransform(page, transformData) {
  const style = page.style;

  // Apply transforms and filters
  if (typeof transformData === 'string') {
    style.transform = transformData;
    style.filter = 'none';
  } else {
    style.transform = transformData.transform;
    style.filter = transformData.filter;
  }

  // Ensure GPU acceleration is enabled
  if (!page.classList.contains('gpu-accelerated')) {
    page.classList.add('gpu-accelerated');
  }
}

/**
 * Update the custom .page-shadow overlay based on the flip progress
 * of the PAGE ABOVE this one.
 *
 * Requirements:
 * 1. Shadow moves in perfect sync with page rotation (no CSS transitions)
 * 2. Uses exponential curve for realistic slower movement as page rotates
 * 3. Completes movement when the page above reaches 120° rotation
 * 4. Gradient is angled 10° toward bottom-left for realism
 *
 * @param {HTMLElement} page        The current page element
 * @param {number}      pageIndex   Index of this page in the overall array
 * @param {number}      scrollPos   Current scroll position (fractional)
 */
function updatePageShadow(page, pageIndex, scrollPos) {
  const shadowEl = page.querySelector('.page-shadow');
  if (!shadowEl) return;

  // No shadow logic for cover pages – they don't need dynamic shadows
  if (page.classList.contains('cover')) {
    shadowEl.style.opacity = '0';
    return;
  }

  const pageAboveIndex = pageIndex - 1;

  if (pageAboveIndex < 0) {
    // Top-most page has no page above
    shadowEl.style.opacity = '0';
    return;
  }

  // Calculate rotation progress of page ABOVE (0 → 1, where 1 = 180°)
  const rotationProgress = clamp(scrollPos - pageAboveIndex, 0, 1);
  const rotationDegrees = rotationProgress * 180; // 0° to 180°

  // PERFORMANCE OPTIMIZATION: Cache shadow state for pages far from flip zone
  const rel = scrollPos - pageIndex;
  if (Math.abs(rel) > 1.1) {
    // Page is far from flip zone - use cached shadow state if available
    if (shadowEl.dataset.cachedTransform && shadowEl.dataset.cachedOpacity) {
      shadowEl.style.transform = shadowEl.dataset.cachedTransform;
      shadowEl.style.opacity = shadowEl.dataset.cachedOpacity;
      return;
    }
  }

  const flipLimitDegrees = GLOBAL_CONFIG.SHADOW.flipLimitDeg; // 120°
  
  if (rotationDegrees >= flipLimitDegrees) {
    // After 120° rotation, shadow has completed its movement
    // Pre-calculate final values for performance
    const shadowConfig = GLOBAL_CONFIG.SHADOW;
    const finalSkewX = shadowConfig.maxSkew; // Maximum skew at completion (-45°)
    const finalScaleY = shadowConfig.minHeightScale; // Minimum height at completion (0%)
    const finalOpacity = shadowConfig.endOpacity; // End opacity (0.5)
    shadowEl.style.opacity = finalOpacity;
    shadowEl.style.transform = `skewX(${finalSkewX}deg) scaleY(${finalScaleY}) translateZ(2px)`;
    return;
  }

  // Calculate exponential movement progress (0 → 1 over 0° → 120°)
  const normalizedProgress = rotationDegrees / flipLimitDegrees; // 0 to 1
  const exponentialCurve = GLOBAL_CONFIG.SHADOW.exponentialCurve; // 2.5
  
  // Apply exponential curve: slower movement initially, faster as page rotates more
  const exponentialProgress = Math.pow(normalizedProgress, exponentialCurve);

  // Pre-calculate shadow config values for performance
  const shadowConfig = GLOBAL_CONFIG.SHADOW;
  
  // Calculate skewing (0° to maxSkew as page rotates) - now goes to -45°
  const skewX = exponentialProgress * shadowConfig.maxSkew; // 0° to -45°
  
  // Calculate height scaling (100% to minHeightScale as page rotates) - now goes to 0%
  const scaleY = 1 - (exponentialProgress * (1 - shadowConfig.minHeightScale)); // 1.0 to 0.0

  // Performance optimization: hide shadow when completely scaled down
  if (scaleY <= 0.01) {
    shadowEl.style.opacity = '0';
    return;
  }
  
  // Calculate opacity based on flip progress (startOpacity → endOpacity)
  const startOpacity = shadowConfig.startOpacity; // 1.0
  const endOpacity = shadowConfig.endOpacity; // 0.5
  const currentOpacity = startOpacity - (exponentialProgress * (startOpacity - endOpacity));
  
  shadowEl.style.opacity = currentOpacity;
  // Apply skewing and height scaling with top-left anchor
  const transform = `skewX(${skewX}deg) scaleY(${scaleY}) translateZ(2px)`;
  shadowEl.style.transform = transform;
  
  // PERFORMANCE OPTIMIZATION: Cache the transform for pages far from flip zone
  if (Math.abs(scrollPos - pageIndex) > 1.1) {
    shadowEl.dataset.cachedTransform = transform;
    shadowEl.dataset.cachedOpacity = currentOpacity.toString();
  }
}

/**
 * Initialize the 3D notebook system
 * Sets up depth model, 3D perspective, and page container
 */
export function initializeRenderingContext(totalPages = 0) {
  const root = document.documentElement;

  // Apply 3D perspective settings from config
  root.style.setProperty('--perspective-distance', `${GLOBAL_CONFIG.SCENE.perspective}px`);
  root.style.setProperty('--perspective-origin-x', GLOBAL_CONFIG.SCENE.perspectiveOriginX);
  root.style.setProperty('--perspective-origin-y', GLOBAL_CONFIG.SCENE.perspectiveOriginY);

  console.log('🎯 Perspective settings applied:', {
    distance: `${GLOBAL_CONFIG.SCENE.perspective}px`,
    originX: GLOBAL_CONFIG.SCENE.perspectiveOriginX,
    originY: GLOBAL_CONFIG.SCENE.perspectiveOriginY,
  });

  console.log('🔗 Rings settings applied:', {
    perspective: `${GLOBAL_CONFIG.RINGS.perspective}px`,
    offsetY: `${GLOBAL_CONFIG.RINGS.offsetY}%`,
    rotationRange: `${GLOBAL_CONFIG.RINGS.rotationUnflipped}° to ${GLOBAL_CONFIG.RINGS.rotationFlipped}°`,
  });

  // Apply responsive layout settings
  root.style.setProperty('--page-aspect-ratio', GLOBAL_CONFIG.LAYOUT.pageAspectRatio);
  root.style.setProperty('--safe-zone-height', `${GLOBAL_CONFIG.LAYOUT.safeZoneHeight}px`);

  // Apply transform origin settings from config
  root.style.setProperty('--transform-origin-x', GLOBAL_CONFIG.SCENE.transformOriginX);
  root.style.setProperty('--transform-origin-y', GLOBAL_CONFIG.SCENE.transformOriginY);

  // Apply rings settings from config - NEW INDIVIDUAL RING CONTROL
  const ringsCfg = GLOBAL_CONFIG.RINGS;
  
  // Front ring settings
  root.style.setProperty('--rings-front-offset-z', `${ringsCfg.front.offsetZ}px`);
  root.style.setProperty('--rings-front-offset-y', `${ringsCfg.front.offsetY}%`);
  root.style.setProperty('--rings-front-scale-x', ringsCfg.front.scaleX);
  root.style.setProperty('--rings-front-scale-y', ringsCfg.front.scaleY);
  root.style.setProperty('--rings-front-rotation-unflipped', `${ringsCfg.front.rotationUnflipped}deg`);
  root.style.setProperty('--rings-front-rotation-flipped', `${ringsCfg.front.rotationFlipped}deg`);
  
  // Back ring settings  
  root.style.setProperty('--rings-back-offset-z', `${ringsCfg.back.offsetZ}px`);
  root.style.setProperty('--rings-back-offset-y', `${ringsCfg.back.offsetY}%`);
  root.style.setProperty('--rings-back-scale-x', ringsCfg.back.scaleX);
  root.style.setProperty('--rings-back-scale-y', ringsCfg.back.scaleY);
  root.style.setProperty('--rings-back-rotation-unflipped', `${ringsCfg.back.rotationUnflipped}deg`);
  root.style.setProperty('--rings-back-rotation-flipped', `${ringsCfg.back.rotationFlipped}deg`);
  
  // Shared animation settings
  root.style.setProperty('--rings-perspective', `${ringsCfg.perspective}px`);
  root.style.setProperty('--rings-y-unflipped', `${ringsCfg.yPositionUnflipped}%`);
  root.style.setProperty('--rings-y-flipped', `${ringsCfg.yPositionFlipped}%`);
  
  // Legacy compatibility (deprecated)
  root.style.setProperty('--rings-offset-y', `${ringsCfg.offsetY}%`);
  root.style.setProperty('--rings-scale-x', ringsCfg.scaleX);
  root.style.setProperty('--rings-scale-y', ringsCfg.scaleY);

  // Apply page shadow settings from config
  const shadowCfg = GLOBAL_CONFIG.SHADOW;
  root.style.setProperty('--page-shadow-start', shadowCfg.gradientStart);
  root.style.setProperty('--page-shadow-mid', shadowCfg.gradientMid);
  root.style.setProperty('--page-shadow-end', shadowCfg.gradientEnd);
  root.style.setProperty('--page-shadow-angle', `${shadowCfg.gradientAngle}deg`);
  root.style.setProperty('--shadow-mid-stop', `${shadowCfg.gradientMidStop}%`);

  // Apply backface settings from config
  const backfaceCfg = GLOBAL_CONFIG.BACKFACE;
  root.style.setProperty('--backface-color', backfaceCfg.color);
  if (backfaceCfg.gradient) {
    root.style.setProperty('--backface-gradient', backfaceCfg.gradient);
  }
  if (backfaceCfg.texture) {
    root.style.setProperty('--backface-texture', `url('${backfaceCfg.texture}')`);
  }

  // Apply backface shadow gradient settings
  const shadowGradientCfg = backfaceCfg.shadowGradient;
  if (shadowGradientCfg.enabled) {
    const gradient = `linear-gradient(${shadowGradientCfg.direction}, ${shadowGradientCfg.startColor} ${shadowGradientCfg.startPosition}, ${shadowGradientCfg.endColor} ${shadowGradientCfg.endPosition})`;
    root.style.setProperty('--backface-shadow-gradient', gradient);
    root.style.setProperty('--backface-shadow-enabled', '1');
  } else {
    root.style.setProperty('--backface-shadow-enabled', '0');
  }

  // Initialize the 3D notebook depth system
  if (totalPages > 0) {
    initializeDepthSystem(totalPages);

    // Calculate and set dynamic rings front position
    const ringsFrontZ = calculateRingsFrontPosition(totalPages);
    root.style.setProperty('--rings-front-position', `${ringsFrontZ}px`);
  }

  // Initialize ring rotations
  initializeRingRotations();

  // Verify perspective is properly applied to all 3D elements
  verifyPerspectiveApplication();

  console.log('🎯 3D Notebook system initialized:', {
    totalPages,
    bottomUnreadZ: GLOBAL_CONFIG.DEPTH.bottomUnreadZ,
    spacingZ: GLOBAL_CONFIG.DEPTH.spacingZ,
    liftHeight: GLOBAL_CONFIG.DEPTH.liftHeight,
    duration: GLOBAL_CONFIG.ANIMATION.duration,
    ringRotationRange: `${GLOBAL_CONFIG.RINGS.rotationUnflipped}° to ${GLOBAL_CONFIG.RINGS.rotationFlipped}°`,
  });
}

/**
 * Create render pipeline for state-driven updates
 * @param {HTMLElement[]} pages - Page elements
 * @returns {Function} Render function that accepts scroll state
 */
export function createRenderPipeline(pages) {
  return scrollState => render(pages, scrollState);
}

/**
 * Update rings position based on current page count - SAFARI COMPATIBLE
 * @param {number} totalPages - Total number of pages
 */
export function updateRingsPosition(totalPages) {
  console.log(`🔗 updateRingsPosition called with totalPages: ${totalPages}`);

  if (totalPages > 0) {
    const root = document.documentElement;
    const ringsCfg = GLOBAL_CONFIG.RINGS;
    
    // Calculate front ring position dynamically
    const ringsFrontZ = calculateRingsFrontPosition(totalPages) + ringsCfg.front.offsetZ;

    // Set CSS variables for both rings (as backup)
    root.style.setProperty('--rings-front-position', `${ringsFrontZ}px`);
    root.style.setProperty('--rings-back-position', `${ringsCfg.back.offsetZ}px`);

    // Verify the variables were set
    const frontValue = getComputedStyle(root).getPropertyValue('--rings-front-position');
    const backValue = getComputedStyle(root).getPropertyValue('--rings-back-position');

    console.log(`🔗 Rings position updated for ${totalPages} pages:`);
    console.log(`  - Front ring: ${ringsFrontZ}px (CSS: ${frontValue})`);
    console.log(`  - Back ring: ${ringsCfg.back.offsetZ}px (CSS: ${backValue})`);

    // Force style recalculation on ring elements with explicit values for Safari
    const frontRings = document.querySelectorAll('.rings--front');
    const backRings = document.querySelectorAll('.rings--back');
    
    frontRings.forEach(ring => {
      // Use explicit Z value instead of CSS variable for Safari compatibility
      ring.style.transform = `translateZ(${ringsFrontZ}px) translateY(${ringsCfg.yPositionUnflipped}%) scaleX(${ringsCfg.front.scaleX}) scaleY(${ringsCfg.front.scaleY}) rotateX(${ringsCfg.front.rotationUnflipped}deg)`;
      ring.style.opacity = '1';
      ring.style.display = 'block';
    });
    
    backRings.forEach(ring => {
      // Use explicit Z value for back ring
      ring.style.transform = `translateZ(${ringsCfg.back.offsetZ}px) translateY(${ringsCfg.yPositionUnflipped}%) scaleX(${ringsCfg.back.scaleX}) scaleY(${ringsCfg.back.scaleY}) rotateX(${ringsCfg.back.rotationUnflipped}deg)`;
      ring.style.opacity = '0.8';
      ring.style.display = 'block';
    });
  } else {
    console.warn(`🔗 Cannot update rings position: totalPages is ${totalPages}`);
  }
}

/**
 * Show/hide heavy page-content elements based on scroll proximity - PERFORMANCE OPTIMIZED
 * @param {HTMLElement} page - Page element
 * @param {number} pageIndex - Index of the page
 * @param {number} scrollPosition - Current scroll position
 */
function updatePageContentVisibility(page, pageIndex, scrollPosition) {
  const contentEl = page.querySelector('.page-front .page-content');
  if (!contentEl) return;

  const relativePos = scrollPosition - pageIndex;
  const hasTab = page.querySelector('.page-tab') !== null;
  const isCover = page.classList.contains('cover');

  // PERFORMANCE: More aggressive content hiding
  const maxBuffer = 
    (hasTab || isCover) 
      ? GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages * 1.5 // Reduced multiplier (was 2.5)
      : GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages * 1.0; // Reduced multiplier (was 1.5)
  
  const fadeBuffer = maxBuffer * 0.6; // More aggressive fade start (was 0.8)

  const distance = Math.abs(relativePos);

  if (distance > maxBuffer) {
    // Too far from viewport – use display:none for maximum performance
    contentEl.classList.add('page-content--hidden');
    contentEl.classList.remove('page-content--fading');
  } else if (distance > fadeBuffer) {
    // In fade zone - more aggressive fading
    contentEl.classList.remove('page-content--hidden');
    contentEl.classList.add('page-content--fading');
    const fadeProgress = (distance - fadeBuffer) / (maxBuffer - fadeBuffer);
    const opacity = 1.0 - (fadeProgress * 0.9); // More aggressive fade (was 0.8)
    contentEl.style.setProperty('--content-fade-opacity', Math.max(0.1, opacity).toString());
  } else {
    // Fully visible content
    contentEl.classList.remove('page-content--hidden', 'page-content--fading');
    contentEl.style.removeProperty('--content-fade-opacity');
  }
}

/**
 * Apply flip-specific content visibility - KEEP PAGES VISIBLE AT OPACITY 1
 * @param {HTMLElement} page - Page element
 * @param {number} pageIndex - Index of this page
 * @param {number} scrollPosition - Current scroll position
 */
function applyFlipContentVisibility(page, pageIndex, scrollPosition) {
  const relativePos = scrollPosition - pageIndex;
  const pageFront = page.querySelector('.page-front');

  if (!pageFront) return;

  // Don't interfere with page culling - only apply flip visibility for visible pages
  if (page.classList.contains('page--hidden')) {
    return;
  }

  // If this page is currently flipping (relative position between 0 and 1)
  if (relativePos >= 0 && relativePos <= 1) {
    const rotationProgress = relativePos; // 0 to 1
    const rotationDegrees = rotationProgress * 180; // 0 to 180 degrees

    // FIXED: Keep pages visible at opacity 1 throughout the flip
    // Only switch content visibility when we're showing the backface (after 90°)
    if (rotationDegrees >= 90) {
      // Show backface content, hide front content for performance
      page.classList.add('page--showing-backface');
    } else {
      // Show front content
      page.classList.remove('page--showing-backface');
    }
    
    // CRITICAL: Always keep the page itself at full opacity
    pageFront.style.opacity = '1';
  } else {
    // Not flipping - ensure front is visible
    page.classList.remove('page--showing-backface');
    pageFront.style.opacity = '1';
  }
}

/**
 * Verify that perspective settings from config are properly applied to all 3D elements
 */
function verifyPerspectiveApplication() {
  const root = document.documentElement;

  // Get computed CSS values
  const computedStyle = getComputedStyle(root);
  const perspectiveDistance = computedStyle.getPropertyValue('--perspective-distance').trim();
  const perspectiveOriginX = computedStyle.getPropertyValue('--perspective-origin-x').trim();
  const perspectiveOriginY = computedStyle.getPropertyValue('--perspective-origin-y').trim();
  const transformOriginX = computedStyle.getPropertyValue('--transform-origin-x').trim();
  const transformOriginY = computedStyle.getPropertyValue('--transform-origin-y').trim();

  console.log('🔍 Perspective verification:', {
    cssVariables: {
      perspectiveDistance,
      perspectiveOriginX,
      perspectiveOriginY,
      transformOriginX,
      transformOriginY,
    },
    configValues: {
      perspective: GLOBAL_CONFIG.SCENE.perspective + 'px',
      perspectiveOriginX: GLOBAL_CONFIG.SCENE.perspectiveOriginX,
      perspectiveOriginY: GLOBAL_CONFIG.SCENE.perspectiveOriginY,
      transformOriginX: GLOBAL_CONFIG.SCENE.transformOriginX,
      transformOriginY: GLOBAL_CONFIG.SCENE.transformOriginY,
    },
  });

  // Check critical 3D elements
  const criticalElements = ['.notebook', '.notebook-inner', '#notebook', '.page-stack', '.page'];

  criticalElements.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      const style = getComputedStyle(element);
      const perspective = style.perspective;
      const perspectiveOrigin = style.perspectiveOrigin;
      const transformStyle = style.transformStyle;

      console.log(`🎯 ${selector}:`, {
        perspective,
        perspectiveOrigin,
        transformStyle,
      });
    }
  });
}

// Performance optimization: Ring update throttling
let ringUpdateCounter = 0;

/**
 * Update ring rotations and Y position based on overall flip progress - DISABLED FOR SAFARI
 * @param {number} scrollPosition - Current scroll position
 * @param {number} totalPages - Total number of pages
 */
function updateRingRotations(scrollPosition, totalPages) {
  // PERFORMANCE OPTIMIZATION: Throttle ring updates to every 2nd frame
  ringUpdateCounter++;
  if (ringUpdateCounter % 2 !== 0) {
    return;
  }
  
  // DISABLED: Keep rings in their CSS-defined positions for Safari compatibility
  // The rings will maintain their static positioning defined in CSS
  
  const overallProgress = Math.min(Math.max(scrollPosition / totalPages, 0), 1);
  
  // Only log progress, don't modify transforms
  if (scrollPosition % 10 === 0) {
    console.log(`🔗 Ring progress: ${(overallProgress * 100).toFixed(1)}% (transforms disabled for Safari compatibility)`);
  }
}

/**
 * Initialize ring rotations, Y position, and scale to their default state - DISABLED FOR SAFARI
 */
function initializeRingRotations() {
  // DISABLED: Let CSS handle all ring positioning for Safari compatibility
  // Rings will use their static CSS transforms only
  
  console.log('🔗 Ring initialization disabled - using CSS-only positioning for Safari compatibility');
}

/**
 * Update backface shadow animation based on page rotation
 * @param {HTMLElement} page - Page element
 * @param {number} pageIndex - Index of this page
 * @param {number} scrollPosition - Current scroll position
 */
function updateBackfaceShadowAnimation(page, pageIndex, scrollPosition) {
  const backfaceEl = page.querySelector('.page-back');
  if (!backfaceEl) return;

  const shadowConfig = GLOBAL_CONFIG.BACKFACE.shadowGradient.animation;
  if (!shadowConfig.enabled) return;

  const relativePos = scrollPosition - pageIndex;
  
  // Only animate during flip (relative position between 0 and 1)
  if (relativePos >= 0 && relativePos <= 1) {
    const rotationProgress = relativePos; // 0 to 1
    const rotationDegrees = rotationProgress * 180; // 0 to 180 degrees

    // Calculate opacity based on rotation angle
    let shadowOpacity = shadowConfig.startOpacity;
    
    if (rotationDegrees >= shadowConfig.fadeStartAngle && rotationDegrees <= shadowConfig.fadeEndAngle) {
      // Calculate fade progress within the specified angle range
      const fadeRange = shadowConfig.fadeEndAngle - shadowConfig.fadeStartAngle;
      const fadeProgress = (rotationDegrees - shadowConfig.fadeStartAngle) / fadeRange;
      
      // Interpolate between start and end opacity
      shadowOpacity = shadowConfig.startOpacity - (fadeProgress * (shadowConfig.startOpacity - shadowConfig.endOpacity));
    } else if (rotationDegrees > shadowConfig.fadeEndAngle) {
      shadowOpacity = shadowConfig.endOpacity;
    }

    // Apply the calculated opacity to the pseudo-element via CSS custom property
    backfaceEl.style.setProperty('--backface-shadow-opacity', shadowOpacity.toString());
  } else if (relativePos > 1) {
    // Page has been completely flipped - use end opacity
    backfaceEl.style.setProperty('--backface-shadow-opacity', shadowConfig.endOpacity.toString());
  } else {
    // Page hasn't started flipping yet - use start opacity
    backfaceEl.style.setProperty('--backface-shadow-opacity', shadowConfig.startOpacity.toString());
  }
}
