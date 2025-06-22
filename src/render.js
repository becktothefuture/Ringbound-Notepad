/**
 * STATE-DRIVEN RENDERING SYSTEM
 * 
 * This module implements the specification-compliant 3D transformation pipeline.
 * It converts scroll state into visual 3D transformations based on realistic
 * notebook physics and state-driven rendering principles.
 * 
 * RENDERING PHILOSOPHY:
 * - State-driven: All visual properties calculated as pure functions of scroll position
 * - Realistic Physics: Based on real notebook mechanics and arc motion
 * - Performance-First: GPU acceleration and visibility culling
 * - Z-Index Management: Proper stacking for realistic visual depth
 */

import { GLOBAL_CONFIG } from './config.js';
import { mapRange, clamp, lerp } from './utils.js';
import { perf } from './performance.js';
import { computeTransform } from './pageTransforms.js';

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
  const relativePos = scrollPosition - pageIndex;
  const maxVisible = GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages;
  
  // Hide pages that are too far in the past or future
  const isPast = relativePos < -maxVisible - 1;
  const isFuture = relativePos > maxVisible + 1;
  
  if (isPast || isFuture) {
    page.classList.remove('page--visible');
    page.classList.add('page--hidden');
    return false;
  }
  
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
    
    // Apply transforms with clean CSS approach
    applyPageTransform(page, transformString);
  }
  
  perf.endRender();
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
 * Initialize CSS custom properties from configuration
 * Sets up 3D perspective and responsive layout settings
 */
export function initializeRenderingContext() {
  const root = document.documentElement;
  
  // Apply 3D perspective settings
  root.style.setProperty('--perspective-distance', `${GLOBAL_CONFIG.SCENE.perspective}px`);
  root.style.setProperty('--perspective-origin-x', GLOBAL_CONFIG.SCENE.perspectiveOriginX);
  root.style.setProperty('--perspective-origin-y', GLOBAL_CONFIG.SCENE.perspectiveOriginY);
  
  // Apply responsive layout settings
  root.style.setProperty('--page-aspect-ratio', GLOBAL_CONFIG.LAYOUT.pageAspectRatio);
  root.style.setProperty('--safe-zone-height', `${GLOBAL_CONFIG.LAYOUT.safeZoneHeight}px`);
  
  // Apply transform origin settings
  root.style.setProperty('--page-rotation-origin-x', GLOBAL_CONFIG.SCENE.transformOriginX);
  root.style.setProperty('--page-rotation-origin-y', GLOBAL_CONFIG.SCENE.transformOriginY);
  
  console.log('🎭 Rendering context initialized with 4:3 aspect ratio and responsive design');
}

/**
 * Create render pipeline for state-driven updates
 * @param {HTMLElement[]} pages - Page elements
 * @returns {Function} Render function that accepts scroll state
 */
export function createRenderPipeline(pages) {
  return (scrollState) => render(pages, scrollState);
}