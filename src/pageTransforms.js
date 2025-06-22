/*
 * 3D NOTEBOOK PAGE TRANSFORMS – User Specification v2.0
 * ====================================================
 * 
 * Implements the exact 3D notebook specification:
 * - Pages flip over the top edge and land on a growing pile toward camera
 * - Depth model: Bottom unread Z=5px, each sheet adds 4px
 * - Flip sequence: Lift & hinge (0→50%), drop & settle (50→100%)
 * - All pages in single .page-stack container, no z-index usage
 * - Transform origin: 50% 0 0 (top edge hinge)
 * - Backface visible with grey ::after pseudo-element
 */

import { GLOBAL_CONFIG } from './config.js';
import { clamp } from './utils.js';

// User specification constants
const BOTTOM_UNREAD_Z = GLOBAL_CONFIG.DEPTH.bottomUnreadZ;  // 5px
const SPACING_Z = GLOBAL_CONFIG.DEPTH.spacingZ;             // 4px
const LIFT_HEIGHT = GLOBAL_CONFIG.DEPTH.liftHeight;         // 30px
const DURATION = GLOBAL_CONFIG.ANIMATION.duration;          // 600ms

// Track the next landing Z position for flipped pages
let nextLandingZ = 0;

/**
 * Initialize the depth system for a given number of pages
 * @param {number} totalPages - Total number of pages
 */
export function initializeDepthSystem(totalPages) {
  // Calculate initial nextLandingZ: current top unread depth + 4px
  // For 200 pages: bottom at 5px, top at 5 + (199 * 4) = 801px
  // So nextLandingZ = 801 + 4 = 805px
  const topUnreadZ = BOTTOM_UNREAD_Z + (totalPages - 1) * SPACING_Z;
  nextLandingZ = topUnreadZ + SPACING_Z;
  
  console.log(`🎯 Depth system initialized: ${totalPages} pages, nextLandingZ: ${nextLandingZ}px`);
}

/**
 * Get the resting Z depth for an unread page
 * @param {number} pageIndex - Page index (0-based)
 * @param {number} totalPages - Total number of pages
 * @returns {number} Z depth in pixels
 */
export function getUnreadDepth(pageIndex, totalPages) {
  // Bottom unread sheet: Z = 5px
  // Every unread sheet above it: Z = 5px + 4px × index
  const indexFromBottom = totalPages - 1 - pageIndex;
  return BOTTOM_UNREAD_Z + indexFromBottom * SPACING_Z;
}

/**
 * Get the next landing Z position for a flipped page
 * @returns {number} Z depth in pixels
 */
export function getNextLandingZ() {
  return nextLandingZ;
}

/**
 * Increment the landing Z for the next flip
 */
export function incrementLandingZ() {
  nextLandingZ += SPACING_Z;
}

/**
 * Get landing depth for a flipped page so the read stack grows toward camera.
 * Formula: bottomUnreadZ + (totalPages + pageIndex) * spacingZ
 *  - When pageIndex = 0 (first flipped) it lands exactly one spacing above
 *    the top unread page ( topUnreadZ + spacingZ )
 *  - Each subsequent page lands one spacing above the previous flipped page.
 * @param {number} pageIndex
 * @param {number} totalPages
 * @returns {number}
 */
function getLandingDepth(pageIndex, totalPages) {
  return BOTTOM_UNREAD_Z + pageIndex * SPACING_Z;
}

/**
 * Compute the 3D transform for a page during flip animation
 * Implements the exact user specification:
 * 1. Start: translateZ(Zrest) rotateX(0deg)
 * 2. Lift & hinge (0→50%): translateZ(Zrest + 30px) rotateX(-90deg) cubic-bezier(.55,.05,.67,.19)
 * 3. Drop & settle (50→100%): translateZ(nextLandingZ) rotateX(-180deg) cubic-bezier(.25,.46,.45,.94)
 * 
 * @param {number} pageIndex - Page index
 * @param {number} scrollPosition - Current scroll position (can be fractional)
 * @param {number} totalPages - Total number of pages
 * @returns {string} Transform string
 */
export function computeTransform(pageIndex, scrollPosition, totalPages) {
  const currentPageFloat = scrollPosition;
  const rel = currentPageFloat - pageIndex;  // Relative position
  
  // Determine if this page is flipping
  if (rel >= 0 && rel <= 1) {
    // This page is currently flipping
    return computeFlipTransform(pageIndex, rel, totalPages);
  } else if (rel < 0) {
    // Page hasn't been reached yet - unread stack
    const restingZ = getUnreadDepth(pageIndex, totalPages);
    return `translateZ(${restingZ}px) rotateX(0deg)`;
  } else {
    // Page has been flipped - read stack
    // Use deterministic landing depth so read stack grows cleanly
    const flippedZ = getLandingDepth(pageIndex, totalPages);
    return `translateZ(${flippedZ}px) rotateX(180deg)`;
  }
}

/**
 * Compute transform for a page that is currently flipping
 * @param {number} pageIndex - Page index
 * @param {number} progress - Flip progress (0-1)
 * @param {number} totalPages - Total number of pages
 * @returns {string} Transform string
 */
function computeFlipTransform(pageIndex, progress, totalPages) {
  const restingZ = getUnreadDepth(pageIndex, totalPages);
  const targetZ = getLandingDepth(pageIndex, totalPages);
  
  if (progress <= 0.5) {
    // Phase 1: Lift & hinge (0 → 50%)
    // Animate to translateZ(Zrest + 30px) rotateX(90deg) - flip OVER the top edge
    const phaseProgress = progress * 2; // Convert 0-0.5 to 0-1
    
    const z = restingZ + (LIFT_HEIGHT * phaseProgress);
    const rotX = 90 * phaseProgress; // Positive rotation = flip forward over top edge
    
    return `translateZ(${z}px) rotateX(${rotX}deg)`;
  } else {
    // Phase 2: Drop & settle (50 → 100%)
    // Animate to translateZ(nextLandingZ) rotateX(180deg) - complete the flip over
    const phaseProgress = (progress - 0.5) * 2; // Convert 0.5-1 to 0-1
    
    const startZ = restingZ + LIFT_HEIGHT;
    const z = startZ + (targetZ - startZ) * phaseProgress;
    const rotX = 90 + (90 * phaseProgress); // 90 to 180 degrees
    
    return `translateZ(${z}px) rotateX(${rotX}deg)`;
  }
}

/**
 * Create a CSS animation for a complete page flip
 * @param {HTMLElement} pageElement - The page element to animate
 * @param {number} pageIndex - Page index
 * @param {number} totalPages - Total number of pages
 * @returns {Animation} Web Animations API animation
 */
export function createFlipAnimation(pageElement, pageIndex, totalPages) {
  const restingZ = getUnreadDepth(pageIndex, totalPages);
  const targetZ = getLandingDepth(pageIndex, totalPages);
  
  const keyframes = [
    {
      offset: 0,
      transform: `translateZ(${restingZ}px) rotateX(0deg)`,
      easing: GLOBAL_CONFIG.ANIMATION.easing.liftHinge
    },
    {
      offset: 0.5,
      transform: `translateZ(${restingZ + LIFT_HEIGHT}px) rotateX(90deg)`,
      easing: GLOBAL_CONFIG.ANIMATION.easing.dropSettle
    },
    {
      offset: 1,
      transform: `translateZ(${targetZ}px) rotateX(180deg)`
    }
  ];
  
  const animation = pageElement.animate(keyframes, {
    duration: DURATION,
    fill: 'forwards'
  });
  
  // No need to adjust global nextLandingZ – landing depth is deterministic
   
  return animation;
}

/**
 * Reset the depth system (useful for reinitializing)
 */
export function resetDepthSystem() {
  nextLandingZ = 0;
}

/**
 * Calculate the dynamic rings front position, 10px above the highest possible page
 * @param {number} totalPages - Total number of pages
 * @returns {number} Z position for rings front in pixels
 */
export function calculateRingsFrontPosition(totalPages) {
  // Calculate the highest possible page position during animation
  // This occurs when the top page (index 0) is lifted during flip
  const topPageRestingZ = getUnreadDepth(0, totalPages);
  const highestPagePosition = topPageRestingZ + LIFT_HEIGHT;
  
  // Position rings 10px above the highest page
  const ringsFrontZ = highestPagePosition + 10;
  
  console.log(`🔗 Rings front positioned at: ${ringsFrontZ}px (topPage: ${topPageRestingZ}px + lift: ${LIFT_HEIGHT}px + clearance: 10px)`);
  
  return ringsFrontZ;
} 