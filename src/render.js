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
    page.classList.remove('page--hidden');
    page.classList.add('page--visible');
    page.style.display = 'flex';
    return true;
  }

  // For regular content pages, apply aggressive culling
  const currentPage = Math.floor(scrollPosition);
  const distance = Math.abs(pageIndex - currentPage);
  const maxDistance = GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages;

  const shouldShow = distance <= maxDistance;

  if (shouldShow) {
    page.classList.remove('page--hidden');
    page.classList.add('page--visible');
    page.style.display = 'flex';
  } else {
    page.classList.add('page--hidden');
    page.classList.remove('page--visible');
    page.style.display = 'none';
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

  // Update ring rotations based on overall flip progress
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

  const flipLimitDegrees = GLOBAL_CONFIG.SHADOW.flipLimitDeg; // 120°
  
  if (rotationDegrees >= flipLimitDegrees) {
    // After 120° rotation, shadow has completed its movement
    // Pre-calculate final values for performance
    const shadowConfig = GLOBAL_CONFIG.SHADOW;
    const finalSkewX = shadowConfig.maxSkew; // Maximum skew at completion (-45°)
    const finalScaleY = shadowConfig.minHeightScale; // Minimum height at completion (0%)
    shadowEl.style.opacity = '1';
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
  
  shadowEl.style.opacity = '1';
  // Apply skewing and height scaling with top-left anchor
  shadowEl.style.transform = `skewX(${skewX}deg) scaleY(${scaleY}) translateZ(2px)`;
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

  // Apply rings settings from config
  root.style.setProperty('--rings-perspective', `${GLOBAL_CONFIG.RINGS.perspective}px`);
  root.style.setProperty('--rings-offset-y', `${GLOBAL_CONFIG.RINGS.offsetY}%`);
  root.style.setProperty('--rings-y-unflipped', `${GLOBAL_CONFIG.RINGS.yPositionUnflipped}%`);
  root.style.setProperty('--rings-y-flipped', `${GLOBAL_CONFIG.RINGS.yPositionFlipped}%`);
  root.style.setProperty('--rings-scale-x', GLOBAL_CONFIG.RINGS.scaleX);
  root.style.setProperty('--rings-scale-y', GLOBAL_CONFIG.RINGS.scaleY);

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
 * Update rings position based on current page count
 * @param {number} totalPages - Total number of pages
 */
export function updateRingsPosition(totalPages) {
  console.log(`🔗 updateRingsPosition called with totalPages: ${totalPages}`);

  if (totalPages > 0) {
    const root = document.documentElement;
    const ringsFrontZ = calculateRingsFrontPosition(totalPages);

    // Set the CSS variable
    root.style.setProperty('--rings-front-position', `${ringsFrontZ}px`);

    // Verify the variable was set
    const computedValue = getComputedStyle(root).getPropertyValue('--rings-front-position');

    console.log(`🔗 Rings position updated for ${totalPages} pages:`);
    console.log(`  - Calculated: ${ringsFrontZ}px`);
    console.log(`  - CSS Variable Set: ${computedValue}`);

    // Force a style recalculation on rings elements
    const ringsElements = document.querySelectorAll('.rings--front');
    ringsElements.forEach(ring => {
      ring.style.transform = `translateZ(var(--rings-front-position))`;
    });
  } else {
    console.warn(`🔗 Cannot update rings position: totalPages is ${totalPages}`);
  }
}

/**
 * Show/hide heavy page-content elements (images/videos) based on scroll proximity
 * while keeping page shells visible at all times.
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

  // For pages with tabs or covers, use a larger buffer since they're always visible
  // but still hide their content when far away for performance
  const maxBuffer =
    hasTab || isCover
      ? GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages * 2
      : GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages;

  if (Math.abs(relativePos) > maxBuffer) {
    // Too far from viewport – hide heavy content
    contentEl.classList.add('page-content--hidden');
  } else {
    contentEl.classList.remove('page-content--hidden');
  }
}

/**
 * Apply flip-specific content visibility to prevent showing image backs during flip
 * @param {HTMLElement} page - Page element
 * @param {number} pageIndex - Index of this page
 * @param {number} scrollPosition - Current scroll position
 */
function applyFlipContentVisibility(page, pageIndex, scrollPosition) {
  const relativePos = scrollPosition - pageIndex;
  const pageFront = page.querySelector('.page-front');
  const pageContent = page.querySelector('.page-front .page-content');

  if (!pageContent || !pageFront) return;

  // If this page is currently flipping (relative position between 0 and 1)
  if (relativePos >= 0 && relativePos <= 1) {
    const rotationProgress = relativePos; // 0 to 1
    const rotationDegrees = rotationProgress * 180; // 0 to 180 degrees

    // Start fading out content at 45 degrees, completely hidden by 60 degrees
    if (rotationDegrees >= 60) {
      // Completely hidden - content invisible from 60° onwards
      page.classList.add('page--showing-backface');
      pageFront.style.opacity = '0';
    } else if (rotationDegrees >= 45) {
      // Gradual fade from 45° to 60° (opacity goes from 1 to 0)
      page.classList.remove('page--showing-backface');
      const fadeProgress = (rotationDegrees - 45) / 15; // 0 to 1 over 15 degrees
      const opacity = 1 - fadeProgress;
      pageFront.style.opacity = Math.max(0, opacity).toString();
    } else {
      // Fully visible - showing front side
      page.classList.remove('page--showing-backface');
      pageFront.style.opacity = '1';
    }
  } else if (relativePos > 1) {
    // Page has been completely flipped (showing backside permanently)
    page.classList.add('page--showing-backface');
    pageFront.style.opacity = '0';
  } else {
    // Page hasn't started flipping yet (showing front side)
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

/**
 * Update ring rotations and Y position based on overall flip progress
 * @param {number} scrollPosition - Current scroll position
 * @param {number} totalPages - Total number of pages
 */
function updateRingRotations(scrollPosition, totalPages) {
  // Calculate overall flip progress (0 = all unflipped, 1 = all flipped)
  const overallProgress = Math.min(Math.max(scrollPosition / totalPages, 0), 1);
  
  // Interpolate rotation based on config settings
  const startRotation = GLOBAL_CONFIG.RINGS.rotationUnflipped;
  const endRotation = GLOBAL_CONFIG.RINGS.rotationFlipped;
  const currentRotation = startRotation + (endRotation - startRotation) * overallProgress;

  // Interpolate Y position based on config settings
  const startYPosition = GLOBAL_CONFIG.RINGS.yPositionUnflipped;
  const endYPosition = GLOBAL_CONFIG.RINGS.yPositionFlipped;
  const currentYPosition = startYPosition + (endYPosition - startYPosition) * overallProgress;

  // Get constant scale values from config
  const scaleX = GLOBAL_CONFIG.RINGS.scaleX;
  const scaleY = GLOBAL_CONFIG.RINGS.scaleY;

  // Apply rotations, Y position, and scale to individual ring elements
  const frontRing = document.querySelector('.rings--front');
  const backRing = document.querySelector('.rings--back');

  if (frontRing) {
    // Maintain the existing translateZ, add rotation, Y position, and separate X/Y scaling
    frontRing.style.transform = `translateZ(var(--rings-front-position)) translateY(${currentYPosition}%) scaleX(${scaleX}) scaleY(${scaleY}) rotateX(${currentRotation}deg)`;
  }

  if (backRing) {
    // Maintain the existing translateZ, add rotation, Y position, and separate X/Y scaling
    backRing.style.transform = `translateZ(-10px) translateY(${currentYPosition}%) scaleX(${scaleX}) scaleY(${scaleY}) rotateX(${currentRotation}deg)`;
  }

  // Debug logging
  if (scrollPosition % 1 === 0) {
    // Only log on integer scroll positions to reduce spam
    console.log(
      `🔗 Ring update: rotation ${currentRotation.toFixed(1)}° | Y position ${currentYPosition.toFixed(1)}% (progress: ${(overallProgress * 100).toFixed(1)}%)`
    );
  }
}

/**
 * Initialize ring rotations, Y position, and scale to their default state (unflipped)
 */
function initializeRingRotations() {
  const frontRing = document.querySelector('.rings--front');
  const backRing = document.querySelector('.rings--back');
  const initialRotation = GLOBAL_CONFIG.RINGS.rotationUnflipped;
  const initialYPosition = GLOBAL_CONFIG.RINGS.yPositionUnflipped;
  const scaleX = GLOBAL_CONFIG.RINGS.scaleX;
  const scaleY = GLOBAL_CONFIG.RINGS.scaleY;

  if (frontRing) {
    frontRing.style.transform = `translateZ(var(--rings-front-position)) translateY(${initialYPosition}%) scaleX(${scaleX}) scaleY(${scaleY}) rotateX(${initialRotation}deg)`;
  }

  if (backRing) {
    backRing.style.transform = `translateZ(-10px) translateY(${initialYPosition}%) scaleX(${scaleX}) scaleY(${scaleY}) rotateX(${initialRotation}deg)`;
  }

  console.log(
    `🔗 Rings initialized at: ${initialRotation}° rotation, ${initialYPosition}% Y position, scaleX(${scaleX}) scaleY(${scaleY}) (unflipped state)`
  );
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
    let shadowOpacity = shadowConfig.maxOpacity;
    
    if (rotationDegrees >= shadowConfig.fadeStartAngle && rotationDegrees <= shadowConfig.fadeEndAngle) {
      // Calculate fade progress within the specified angle range
      const fadeRange = shadowConfig.fadeEndAngle - shadowConfig.fadeStartAngle;
      const fadeProgress = (rotationDegrees - shadowConfig.fadeStartAngle) / fadeRange;
      
      // Interpolate between max and min opacity
      shadowOpacity = shadowConfig.maxOpacity - (fadeProgress * (shadowConfig.maxOpacity - shadowConfig.minOpacity));
    } else if (rotationDegrees > shadowConfig.fadeEndAngle) {
      shadowOpacity = shadowConfig.minOpacity;
    }

    // Apply the calculated opacity to the pseudo-element via CSS custom property
    backfaceEl.style.setProperty('--backface-shadow-opacity', shadowOpacity.toString());
  } else if (relativePos > 1) {
    // Page has been completely flipped - use minimum opacity
    backfaceEl.style.setProperty('--backface-shadow-opacity', shadowConfig.minOpacity.toString());
  } else {
    // Page hasn't started flipping yet - use maximum opacity
    backfaceEl.style.setProperty('--backface-shadow-opacity', shadowConfig.maxOpacity.toString());
  }
}
