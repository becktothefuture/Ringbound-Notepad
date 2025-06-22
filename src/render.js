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
  calculateRingsFrontPosition
} from './pageTransforms.js';

// Cache for performance optimization
let commentaryOverlay = null;
let lastCommentary = null;

/**
 * Update commentary overlay with current page information
 * @param {HTMLElement} currentPage - Current page element
 */
function updateCommentary(currentPage) {
  if (!commentaryOverlay) {
    commentaryOverlay = document.getElementById('commentary-overlay');
  }
  
  const pixelCommentary = document.getElementById('pixel-commentary');
  
  if (currentPage) {
    const commentary = currentPage.dataset.commentary;
    if (commentary !== lastCommentary) {
      if (commentaryOverlay) {
        commentaryOverlay.textContent = commentary;
        commentaryOverlay.classList.toggle('visible', !!commentary);
      }
      
      if (pixelCommentary) {
        pixelCommentary.textContent = commentary || 'No commentary available';
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
  // Always render all pages; visibility controlled at content level
  page.classList.remove('page--hidden');
  page.classList.add('page--visible');
  return true;
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
    const transformString = computeTransform(i, scroll, pageCount);
    
    // Apply dynamic shadow classes based on page above
    applyDynamicShadow(page, i, scroll);
    
    // Buffer page contents to optimize performance while all pages are visible
    updatePageContentVisibility(page, i, scroll);
    
    // Apply transforms with clean CSS approach
    applyPageTransform(page, transformString);
  }
  
  perf.endRender();
}

/**
 * Apply dynamic shadow classes based on the status of the page above
 * @param {HTMLElement} page - Page element
 * @param {number} pageIndex - Index of this page
 * @param {number} scrollPosition - Current scroll position
 */
function applyDynamicShadow(page, pageIndex, scrollPosition) {
  // Don't apply shadows to covers
  if (page.classList.contains('cover')) {
    return;
  }
  
  // Check if there's a page above this one that affects its shadow
  const pageAboveIndex = pageIndex - 1;
  
  if (pageAboveIndex < 0) {
    // This is the top page, no shadow reduction needed
    page.classList.remove('shadow-reduced', 'shadow-hidden');
    return;
  }
  
  // Calculate how much the page above has flipped
  const pageAboveProgress = scrollPosition - pageAboveIndex;
  
  if (pageAboveProgress <= 0) {
    // Page above hasn't started flipping yet, full shadow
    page.classList.remove('shadow-reduced', 'shadow-hidden');
  } else if (pageAboveProgress < 1) {
    // Page above is currently flipping, reduce shadow
    page.classList.add('shadow-reduced');
    page.classList.remove('shadow-hidden');
  } else {
    // Page above has been fully flipped, hide shadow almost completely
    page.classList.remove('shadow-reduced');
    page.classList.add('shadow-hidden');
  }
}

/**
 * Apply transformation to page element with proper GPU acceleration
 * @param {HTMLElement} page - Page element
 * @param {Object} transform - Transform properties
 */
function applyPageTransform(page, transformString) {
  const style = page.style;
  
  // Apply transforms
  style.transform = transformString;
  
  // Ensure GPU acceleration is enabled
  if (!page.classList.contains('gpu-accelerated')) {
    page.classList.add('gpu-accelerated');
  }
}

/**
 * Initialize the 3D notebook system
 * Sets up depth model, 3D perspective, and page container
 */
export function initializeRenderingContext(totalPages = 0) {
  const root = document.documentElement;
  
  // Apply 3D perspective settings
  root.style.setProperty('--perspective-distance', `${GLOBAL_CONFIG.SCENE.perspective}px`);
  root.style.setProperty('--perspective-origin-x', GLOBAL_CONFIG.SCENE.perspectiveOriginX);
  root.style.setProperty('--perspective-origin-y', GLOBAL_CONFIG.SCENE.perspectiveOriginY);
  
  // Apply responsive layout settings
  root.style.setProperty('--page-aspect-ratio', GLOBAL_CONFIG.LAYOUT.pageAspectRatio);
  root.style.setProperty('--safe-zone-height', `${GLOBAL_CONFIG.LAYOUT.safeZoneHeight}px`);
  
  // Initialize the 3D notebook depth system
  if (totalPages > 0) {
    initializeDepthSystem(totalPages);
    
    // Calculate and set dynamic rings front position
    const ringsFrontZ = calculateRingsFrontPosition(totalPages);
    root.style.setProperty('--rings-front-position', `${ringsFrontZ}px`);
  }
  
  console.log('🎯 3D Notebook system initialized:', {
    totalPages,
    bottomUnreadZ: GLOBAL_CONFIG.DEPTH.bottomUnreadZ,
    spacingZ: GLOBAL_CONFIG.DEPTH.spacingZ,
    liftHeight: GLOBAL_CONFIG.DEPTH.liftHeight,
    duration: GLOBAL_CONFIG.ANIMATION.duration
  });
}

/**
 * Create render pipeline for state-driven updates
 * @param {HTMLElement[]} pages - Page elements
 * @returns {Function} Render function that accepts scroll state
 */
export function createRenderPipeline(pages) {
  return (scrollState) => render(pages, scrollState);
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
  const contentEl = page.querySelector('.page-content');
  if (!contentEl) return;

  const relativePos = scrollPosition - pageIndex;
  const maxBuffer = GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages;

  if (relativePos < -maxBuffer || relativePos > maxBuffer) {
    // Too far from viewport – hide heavy content
    contentEl.classList.add('page-content--hidden');
  } else {
    contentEl.classList.remove('page-content--hidden');
  }
}