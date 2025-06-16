/**
 * SCROLL ENGINE SYSTEM
 * 
 * This module handles all user input (mouse wheel, touch) and converts it into
 * a virtual scroll state that drives the page animations.
 * 
 * KEY CONCEPTS:
 * - Virtual Scroll: Instead of using real page scrolling, we maintain our own scroll value
 * - Continuous Scroll: Scroll values can be fractional (e.g., 1.5 = halfway through page 1)
 * - Input Normalization: Different input types (wheel, touch) are converted to the same format
 * - Animation Timing: Smooth animations when snapping to page boundaries
 * - Observer Pattern: Other systems subscribe to scroll changes
 * - Infinite Loop: Seamless cycling through pages when enabled
 */

import { PAGE_ANIMATION } from './config.js';
import { clamp } from './utils.js';
import { debug } from './debug.js';
import { normalizeScrollPosition, shouldUseInfiniteLoop } from './infiniteLoop.js';

// Device-specific optimizations
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const hasHighRefreshRate = window.screen && window.screen.availWidth > 1920;
const scrollSensitivity = PAGE_ANIMATION.misc.scrollSensitivity * (isMobile ? 1.5 : 1) * (hasHighRefreshRate ? 0.8 : 1);

// === INTERNAL STATE ===
// These variables maintain the current state of the scroll system

/**
 * Current virtual scroll position
 * - Integer part = current page index (0, 1, 2, etc.)
 * - Fractional part = progress through that page's flip (0.0 to 0.99)
 * - Example: scroll = 1.5 means halfway through flipping page 1
 * - For infinite loop: can be any value, wraps around page count
 */
let scroll = 0;

/**
 * Total number of pages in the notepad
 * Used for infinite loop calculations and scroll bounds
 */
let totalPages = 0;

/**
 * Array of callback functions that get notified when scroll changes
 * Other systems (like the renderer) subscribe to these updates
 */
let listeners = [];

/**
 * Timer for delayed page snapping
 * When user stops scrolling, we wait briefly then snap to nearest page
 */
let snapTimeout = null;

/**
 * Animation frame ID for smooth scroll animations
 * Used to cancel animations if new input is received
 */
let animationFrameId = null;

/**
 * State flag to prevent new scroll animations while one is already in progress.
 * This enforces a "one page at a time" scroll behavior.
 */
let isAnimating = false;

let snapAnimationFrameId = null;
let isSnapAnimating = false;
let snapAnimationCancel = null;

// === OBSERVER PATTERN FUNCTIONS ===

/**
 * Notify all subscribed listeners of scroll state changes
 * Called whenever the scroll value changes
 * Optimized to prevent excessive notifications
 */
let lastNotifiedScroll = -1;
const SCROLL_THRESHOLD = 0.001; // Minimum change required to notify

function notify() {
  // Only notify if scroll changed significantly to prevent excessive renders
  if (Math.abs(scroll - lastNotifiedScroll) > SCROLL_THRESHOLD) {
    lastNotifiedScroll = scroll;
    listeners.forEach(fn => fn(getState()));
  }
}

/**
 * Get current scroll state object
 * Converts raw scroll value into useful animation data
 * 
 * @returns {Object} Current scroll state containing:
 *   - scroll: Raw scroll value (e.g., 1.5)
 *   - page: Current page index (e.g., 1)  
 *   - progress: Progress through current page flip (e.g., 0.5)
 *   - rotation: Current rotation angle in degrees (e.g., 135°)
 *   - totalPages: Total number of pages available
 */
export function getState() {
  const page = Math.floor(scroll);              // Which page we're on (0, 1, 2...)
  const progress = scroll - page;               // How far through the flip (0.0 to 0.99)
  return {
    scroll,                                     // Raw scroll value
    page,                                       // Current page index
    progress,                                   // Flip progress (0-1)
    rotation: progress * PAGE_ANIMATION.flip.maxAngle,     // Rotation angle in degrees
    totalPages                                  // Total pages for infinite loop calculations
  };
}

/**
 * Jumps directly to a target page with a smooth animation.
 * Used for chapter navigation.
 * @param {number} targetPage - The page index to jump to.
 */
export function jumpToPage(targetPage) {
  const target = applyScrollBounds(targetPage);
  animateJumpTo(target);
}

/**
 * Subscribe to scroll state changes
 * Allows other systems to react to scroll updates
 * 
 * @param {Function} fn - Callback function to call on scroll changes
 * @returns {Function} Unsubscribe function to remove the listener
 */
export function subscribe(fn) {
  listeners.push(fn);
  fn(getState()); // Send initial state immediately
  return () => {
    listeners = listeners.filter(l => l !== fn); // Return unsubscribe function
  };
}

// === SCROLL BOUNDS MANAGEMENT ===

/**
 * Apply appropriate scroll bounds based on infinite loop setting
 * @param {number} newScroll - New scroll value to constrain
 * @returns {number} Constrained scroll value
 */
function applyScrollBounds(newScroll) {
  if (shouldUseInfiniteLoop(totalPages)) {
    // For infinite loop, normalize but don't clamp
    return normalizeScrollPosition(newScroll, totalPages);
  } else {
    // For standard mode, clamp to page bounds
    return clamp(newScroll, 0, Math.max(0, totalPages - 1));
  }
}

// === INPUT HANDLING ===

/**
 * Handle mouse wheel events
 * Converts wheel delta into virtual scroll movement
 * 
 * @param {WheelEvent} e - Mouse wheel event
 */
let lastY = null; // For touch tracking
function onWheel(e) {
  interruptSnapAnimation();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  const oldScroll = scroll;
  scroll += e.deltaY * scrollSensitivity / 100;
  scroll = applyScrollBounds(scroll);
  debug.log(`Wheel event: deltaY=${e.deltaY}, scroll: ${oldScroll.toFixed(3)} → ${scroll.toFixed(3)}`);
  notify();
  scheduleSnapIfNeeded();
}

/**
 * Handle touch start events
 * Records initial touch position for delta calculation
 * 
 * @param {TouchEvent} e - Touch start event
 */
function onTouchStart(e) {
  if (e.touches.length === 1) {
    lastY = e.touches[0].clientY; // Remember starting Y position
    debug.log(`Touch start at Y=${lastY}`);
  }
}

/**
 * Handle touch move events  
 * Converts touch movement into virtual scroll movement
 * 
 * @param {TouchEvent} e - Touch move event
 */
function onTouchMove(e) {
  if (e.touches.length === 1 && lastY !== null) {
    interruptSnapAnimation();
    const dy = lastY - e.touches[0].clientY;
    lastY = e.touches[0].clientY;
    const oldScroll = scroll;
    scroll += dy * scrollSensitivity / 100;
    scroll = applyScrollBounds(scroll);
    debug.log(`Touch move: dy=${dy}, scroll: ${oldScroll.toFixed(3)} → ${scroll.toFixed(3)}`);
    notify();
    scheduleSnapIfNeeded();
  }
}

/**
 * Handle touch end events
 * Determines if a swipe occurred and triggers a page turn.
 * @param {TouchEvent} e - Touch end event
 */
function onTouchEnd(e) {
  if (isAnimating || lastY === null) {
    return; // Ignore if animating or no start position
  }

  const endY = e.changedTouches[0].clientY;
  const deltaY = endY - lastY; // Positive = swipe up
  const SWIPE_THRESHOLD = 50; // Minimum pixels for a valid swipe

  let direction = 0;
  if (deltaY > SWIPE_THRESHOLD) {
    direction = 1; // Swipe Up -> Next Page
  } else if (deltaY < -SWIPE_THRESHOLD) {
    direction = -1; // Swipe Down -> Previous Page
  }

  if (direction !== 0) {
    isAnimating = true;
    const currentPage = Math.round(scroll);
    let target = currentPage + direction;
    target = applyScrollBounds(target);
    debug.log(`Swipe event: direction=${direction}, snapping from ${scroll.toFixed(2)} to ${target}`);
    animateScrollTo(target);
  }

  // Reset touch tracking
  lastY = null;
}

/**
 * Handle touch cancel events
 */
function onTouchCancel() {
  // Reset touch tracking
  lastY = null;
}

// === PAGE SNAPPING LOGIC ===

/**
 * Animate scroll to a specific target page
 * @param {number} target - The target page index to animate to
 */
function animateScrollTo(target) {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  
  const start = scroll;
  const distance = target - start;
  
  // If we're already at the target, unlock and exit
  if (Math.abs(distance) < 0.001) {
    isAnimating = false;
    return;
  }

  const duration = PAGE_ANIMATION.flip.speed;
  const easing = PAGE_ANIMATION.flip.easing;
  let startTime = null;

  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    scroll = start + distance * easing(progress);
    notify();

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step);
    } else {
      // Animation complete
      scroll = target; // Ensure we end exactly at the target
      notify();
      isAnimating = false; // Unlock for next input
      animationFrameId = null;
      debug.log(`Animation complete. Scroll is now ${scroll}. Input unlocked.`);
    }
  }
  
  animationFrameId = requestAnimationFrame(step);
}

function scheduleSnapIfNeeded() {
  if (snapTimeout) clearTimeout(snapTimeout);
  if (isAnimating || isSnapAnimating) return;
  snapTimeout = setTimeout(() => {
    snapTimeout = null;
    maybeSnapToPage();
  }, PAGE_ANIMATION.snap.delay);
}

function maybeSnapToPage() {
  if (isAnimating || isSnapAnimating) return;
  const state = getState();
  const { scroll, rotation } = state;
  const page = Math.floor(scroll);
  const progress = scroll - page;
  // If already at a page, do nothing
  if (progress === 0) return;
  // Snap direction: forward if rotation >= threshold, else backward
  const snapForward = rotation >= PAGE_ANIMATION.snap.threshold;
  let target = snapForward ? page + 1 : page;
  target = applyScrollBounds(target);
  animateSnapTo(target);
}

function animateSnapTo(target) {
  if (snapAnimationFrameId) cancelAnimationFrame(snapAnimationFrameId);
  isSnapAnimating = true;
  const start = scroll;
  const distance = target - start;
  if (distance === 0) {
    isSnapAnimating = false;
    return;
  }
  const duration = PAGE_ANIMATION.snap.duration;
  const easing = PAGE_ANIMATION.snap.easing;
  let startTime = null;

  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    scroll = start + distance * easing(progress);
    notify();
    if (progress < 1) {
      snapAnimationFrameId = requestAnimationFrame(step);
    } else {
      scroll = target;
      notify();
      isSnapAnimating = false;
      snapAnimationFrameId = null;
      debug.log('Snap animation complete.');
      return;
    }
  }
  snapAnimationCancel = () => {
    isSnapAnimating = false;
    if (snapAnimationFrameId) cancelAnimationFrame(snapAnimationFrameId);
    snapAnimationFrameId = null;
  };
  snapAnimationFrameId = requestAnimationFrame(step);
}

// Interrupt snap animation on user input
function interruptSnapAnimation() {
  if (isSnapAnimating && snapAnimationCancel) {
    snapAnimationCancel();
    debug.log('Snap animation interrupted by user input.');
  }
}

function animateJumpTo(target) {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  isAnimating = true;

  const start = scroll;
  const distance = target - start;

  if (Math.abs(distance) < 0.001) {
    isAnimating = false;
    return;
  }

  const duration = PAGE_ANIMATION.jump.duration;
  const easing = PAGE_ANIMATION.jump.easing;
  let startTime = null;

  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    scroll = start + distance * easing(progress);
    notify();

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step);
    } else {
      scroll = target;
      notify();
      isAnimating = false;
      animationFrameId = null;
    }
  }

  animationFrameId = requestAnimationFrame(step);
}

// === CLICK-TO-TURN FUNCTIONALITY ===

/**
 * Handle click events to advance pages
 * If a page is currently flipping, complete the flip
 * Otherwise, advance to the next page
 */
function onPageClick(e) {
  // Only handle clicks on pages or page content
  const clickedPage = e.target.closest('.page');
  if (!clickedPage) {
    return; // Not clicking on a page, ignore
  }
  
  // Prevent default click behavior
  e.preventDefault();
  e.stopPropagation();
  
  debug.log('Page click detected, advancing page...');
  
  // Get current scroll state
  const state = getState();
  const { page, progress } = state;
  
  // Determine target page
  let targetPage;
  
  if (progress > 0.01) {
    // Page is currently flipping - complete the flip
    targetPage = page + 1;
    debug.log(`Completing flip from page ${page} to ${page + 1}`);
  } else {
    // Page is stable - advance to next page
    targetPage = page + 1;
    debug.log(`Advancing from page ${page} to ${page + 1}`);
  }
  
  // Apply bounds and animate to target
  targetPage = applyScrollBounds(targetPage);
  
  // Interrupt any current animations
  interruptSnapAnimation();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    isAnimating = false;
    animationFrameId = null;
  }
  
  // Animate to target page
  animateScrollTo(targetPage);
}

// === INITIALIZATION ===

/**
 * Initialize the scroll engine on a specific container element
 * Sets up all event listeners for mouse and touch input
 * 
 * @param {HTMLElement} container - Element to attach scroll listeners to
 * @param {number} pageCount - Total number of pages for bounds calculation
 */
export function initScrollEngine(container, pageCount = 0) {
  debug.log('Initializing scroll engine with container:', container);
  debug.log(`Total pages: ${pageCount}, Infinite loop: ${shouldUseInfiniteLoop(pageCount)}`);
  // Store page count for scroll bounds
  totalPages = pageCount;
  // Mouse wheel events
  document.addEventListener('wheel', onWheel, { passive: true });
  // Touch events for mobile/tablet support
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchCancel, { passive: true });
  
  // Click-to-turn functionality removed; click now reserved for notebook zoom handled in app.js
  
  debug.log('Scroll engine event listeners attached to document');
  // Note: { passive: true } allows us to preventDefault() if needed
  // This prevents the page from scrolling normally while using the notepad
}

/**
 * Update the total page count (useful for dynamic content)
 * @param {number} newPageCount - New total page count
 */
export function updatePageCount(newPageCount) {
  totalPages = newPageCount;
  debug.log(`Page count updated to ${newPageCount}`);
  
  // Reapply bounds with new page count
  scroll = applyScrollBounds(scroll);
  notify();
}