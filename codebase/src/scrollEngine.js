/**
 * 3D NOTEBOOK SCROLL ENGINE - USER SPECIFICATION
 *
 * Handles scroll input for the 3D notebook system where each integer step triggers one flip.
 *
 * KEY CONCEPTS:
 * - Virtual Scroll: Fractional scroll values (e.g., 1.5 = halfway through page 1 flip)
 * - Integer Steps: Each whole number represents a complete page flip
 * - Input Sources: Wheel, swipe, arrow keys trigger page flips
 * - 60fps Animation: Smooth 600ms flip animations
 * - Growing Pile: Each flip moves pages toward the camera in a growing stack
 */

import { GLOBAL_CONFIG } from './config.js';
import { clamp, lerp } from './utils.js';
import { normalizeScrollPosition, shouldUseInfiniteLoop } from './infiniteLoop.js';
import { getAdaptiveMomentumConfig } from './utils.js';

/**
 * VirtualScrollEngine Class
 * Implements the specification-compliant virtual scroll system
 */
class VirtualScrollEngine {
  constructor() {
    this.scrollPosition = 0.0; // Fractional (1.5 = halfway through page 1 flip)
    this.snapThreshold = GLOBAL_CONFIG.ANIMATION.snapThreshold; // Auto-flip at threshold degrees
    this.isSnapping = false; // Prevent conflicts
    this.maxPages = 0; // Total number of pages
    this.observers = []; // Observer pattern for state changes

    // Input handling state
    this.lastY = null; // Touch tracking
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    this.scrollSensitivity = this.isMobile
      ? GLOBAL_CONFIG.ANIMATION.scrollSensitivityMobile
      : GLOBAL_CONFIG.ANIMATION.scrollSensitivity;

    // Animation state
    this.animationFrameId = null;
    this.snapTimeout = null;
    this.velocity = 0;
    this.lastScrollTime = 0;

    // Momentum system state
    this.momentumFrameId = null;
    this.momentumTimeout = null;
    this.momentumConfig = getAdaptiveMomentumConfig(GLOBAL_CONFIG.ANIMATION.momentum);
    this.isCoasting = false;
    this.lastSnapTime = 0;
    this.lastSnapTarget = 0;

    // Zoom coordination state
    this.inputPaused = false; // Pauses all input during zoom transitions

    // Wheel event handling state
    this.lastWheelTime = null;
    this.wheelAccumulator = 0;
    this.wheelLogCounter = 0;

    // Keyboard flipping state
    // Tracks the latest requested page index for reliable, fast keyboard flipping.
    // Always animates to this page, even if animation is in progress.
    this.pendingTargetPage = Math.round(this.scrollPosition); // Initialize to current scroll position

    console.log('🎯 VirtualScrollEngine initialized');
    console.log('🚀 Momentum config:', this.momentumConfig);
  }

  /**
   * Update scroll position with delta input
   * @param {number} delta - Input delta value
   */
  updateScrollPosition(delta) {
    if (this.isSnapping) return;
    
    // Skip input processing if paused for zoom
    if (this.inputPaused) {
      console.log('🎯 Scroll input paused for zoom transition');
      return;
    }

    // Abort any running momentum animation
    this.stopMomentum();

    const now = performance.now();
    const deltaTime = now - this.lastScrollTime;
    this.lastScrollTime = now;

    // Calculate velocity for physics effects
    this.velocity = deltaTime > 0 ? delta / deltaTime : 0;

    // Apply scroll delta with sensitivity
    this.scrollPosition += delta * this.scrollSensitivity;
    this.scrollPosition = Math.max(0, Math.min(this.maxPages - 1, this.scrollPosition));

    this.notifyObservers(this.scrollPosition);
    this.scheduleMomentum();
  }

  /**
   * Notify all observers of scroll state changes
   * @param {number} scrollPosition - Current scroll position
   */
  notifyObservers(scrollPosition) {
    const state = this.getScrollState();
    this.observers.forEach(callback => callback(state));
  }

  /**
   * Get current scroll state
   * @returns {Object} Current scroll state
   */
  getScrollState() {
    const page = Math.floor(this.scrollPosition);
    const progress = this.scrollPosition - page;
    const rotation = progress * 180; // 0° to 180°

    return {
      scroll: this.scrollPosition,
      page,
      progress,
      rotation,
      totalPages: this.maxPages,
      velocity: this.velocity,
      isCoasting: this.isCoasting,
      momentumEnabled: this.momentumConfig.enabled,
    };
  }

  /**
   * Add observer to scroll state changes
   * @param {Function} callback - Observer callback
   * @returns {Function} Unsubscribe function
   */
  addObserver(callback) {
    this.observers.push(callback);
    callback(this.getScrollState()); // Send initial state
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  /**
   * Set maximum number of pages
   * @param {number} maxPages - Maximum pages
   */
  setMaxPages(maxPages) {
    this.maxPages = maxPages;
    this.scrollPosition = Math.min(this.scrollPosition, maxPages - 1);
    // If page count shrinks, ensure pendingTargetPage is valid
    this.pendingTargetPage = Math.min(this.pendingTargetPage, maxPages - 1);
  }

  /**
   * Jump to specific page with animation
   * Updates pendingTargetPage for both keyboard and programmatic jumps.
   * @param {number} targetPage - Target page index
   */
  jumpToPage(targetPage) {
    // Always update pendingTargetPage, clamp to valid range
    this.pendingTargetPage = clamp(targetPage, 0, this.maxPages - 1);
    this.animateToPosition(this.pendingTargetPage);
  }

  /**
   * Animate to target position
   * @param {number} target - Target scroll position
   */
  animateToPosition(target) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const startPosition = this.scrollPosition;
    const startTime = performance.now();
    const duration = 500; // ms

    const animate = currentTime => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.scrollPosition = lerp(startPosition, target, easeProgress);
      this.notifyObservers(this.scrollPosition);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Schedule momentum animation after input stops
   */
  scheduleMomentum() {
    // Clear any existing momentum timeout
    if (this.momentumTimeout) {
      clearTimeout(this.momentumTimeout);
    }

    // Start momentum after a brief pause (40ms = ~2.4 frames at 60fps)
    this.momentumTimeout = setTimeout(() => {
      this.startMomentum();
    }, 40);
  }

  /**
   * Stop any running momentum animation
   */
  stopMomentum() {
    if (this.momentumFrameId) {
      cancelAnimationFrame(this.momentumFrameId);
      this.momentumFrameId = null;
    }
    if (this.momentumTimeout) {
      clearTimeout(this.momentumTimeout);
      this.momentumTimeout = null;
    }
    this.isCoasting = false;
  }

  /**
   * Start momentum-driven coasting animation
   */
  startMomentum() {
    if (!this.momentumConfig.enabled) {
      this.fallbackSnap();
      return;
    }

    const absVelocity = Math.abs(this.velocity);
    
    // Dead zone check: prevent unwanted flicking right after a page snap
    const timeSinceLastSnap = performance.now() - this.lastSnapTime;
    const isInDeadZone = timeSinceLastSnap < 300; // 300ms dead zone after snap
    const isLowVelocityInDeadZone = isInDeadZone && absVelocity < this.momentumConfig.deadZoneVelocity;
    
    // Allow strong force to override dead zone (intentional user action)
    const isStrongForce = absVelocity > this.momentumConfig.deadZoneVelocity * 2.0;
    
    if (isLowVelocityInDeadZone && !isStrongForce) {
      console.log(`🚫 Dead zone: ${timeSinceLastSnap.toFixed(0)}ms since snap, velocity ${absVelocity.toFixed(4)} < ${this.momentumConfig.deadZoneVelocity} (not strong enough)`);
      this.fallbackSnap();
      return;
    } else if (isInDeadZone && isStrongForce) {
      console.log(`💪 Strong force override: ${absVelocity.toFixed(4)} > ${(this.momentumConfig.deadZoneVelocity * 2.0).toFixed(4)} - allowing momentum`);
    }
    
    // If velocity is too low, snap immediately
    if (absVelocity < this.momentumConfig.minVelocity) {
      this.fallbackSnap();
      return;
    }

    console.log('🚀 Starting momentum with velocity:', this.velocity);
    
    let lastTime = performance.now();
    const startTime = lastTime;
    let currentVelocity = this.velocity;
    this.isCoasting = true;

    const step = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // Safety cap for maximum momentum duration
      if (currentTime - startTime > this.momentumConfig.maxDuration) {
        this.finishMomentum(currentVelocity);
        return;
      }

      // Apply exponential decay to velocity
      const decay = this.momentumConfig.decay;
      currentVelocity *= Math.exp(-decay * deltaTime);

      // Update scroll position
      const deltaScroll = currentVelocity * deltaTime;
      this.scrollPosition += deltaScroll;
      
      // Handle infinite loop normalization
      if (shouldUseInfiniteLoop(this.maxPages)) {
        this.scrollPosition = normalizeScrollPosition(this.scrollPosition, this.maxPages);
      } else {
        this.scrollPosition = clamp(this.scrollPosition, 0, this.maxPages - 1);
      }

      this.notifyObservers(this.scrollPosition);

      // Continue if velocity is still significant
      if (Math.abs(currentVelocity) >= this.momentumConfig.minVelocity) {
        this.momentumFrameId = requestAnimationFrame(step);
      } else {
        this.finishMomentum(currentVelocity);
      }
    };

    this.momentumFrameId = requestAnimationFrame(step);
  }

  /**
   * Finish momentum and snap to final page(s)
   */
  finishMomentum(finalVelocity) {
    console.log('🎯 Finishing momentum with final velocity:', finalVelocity);
    
    this.stopMomentum();
    
    // Get current page state
    const currentProgress = this.scrollPosition - Math.floor(this.scrollPosition);
    
    // Calculate how many extra pages to flip based on remaining velocity
    const velocityScale = this.isMobile 
      ? this.momentumConfig.velocityToPagesMobile 
      : this.momentumConfig.velocityToPages;
    
    const extraPages = Math.round(finalVelocity * velocityScale);
    const clampedExtraPages = clamp(extraPages, -this.momentumConfig.maxExtraPages, this.momentumConfig.maxExtraPages);
    
    // Determine base target page - always complete current page if any progress made
    let basePage;
    if (currentProgress > 0.05) {
      // If we've made any meaningful progress, complete the current page turn
      basePage = Math.ceil(this.scrollPosition);
    } else if (finalVelocity > 0) {
      // Forward momentum, go to next page
      basePage = Math.ceil(this.scrollPosition);
    } else if (finalVelocity < 0) {
      // Backward momentum, go to previous page
      basePage = Math.floor(this.scrollPosition);
    } else {
      // No momentum, complete current page if progress made
      basePage = currentProgress > 0.05 ? Math.ceil(this.scrollPosition) : Math.floor(this.scrollPosition);
    }
    
    // Ensure we always have at least one page movement if velocity exists
    if (Math.abs(finalVelocity) > this.momentumConfig.minVelocity * 2 && clampedExtraPages === 0) {
      const minExtraPages = finalVelocity > 0 ? 1 : -1;
      basePage += minExtraPages;
    }
    
    // Calculate final target with momentum
    let targetPage = basePage + clampedExtraPages;
    targetPage = clamp(targetPage, 0, this.maxPages - 1);
    
    console.log(`📖 Momentum snap: pos=${this.scrollPosition.toFixed(2)}, progress=${currentProgress.toFixed(2)}, base=${basePage}, extra=${clampedExtraPages}, target=${targetPage}`);
    
    // Use dynamic duration based on distance
    const distance = Math.abs(targetPage - this.scrollPosition);
    const dynamicDuration = Math.min(
      this.momentumConfig.baseDuration + distance * this.momentumConfig.durationMultiplier,
      this.momentumConfig.maxSnapDuration
    );
    
    this.snapToPage(targetPage, dynamicDuration);
  }

  /**
   * Fallback snap for when momentum is disabled or velocity is too low
   */
  fallbackSnap() {
    const state = this.getScrollState();
    const rotationDegrees = state.rotation;
    const currentProgress = state.progress;

    // Always complete the page turn if any progress has been made
    // This ensures pages never get stuck halfway
    if (currentProgress > 0.05) {
      // Any meaningful progress (>5%) commits to completing the flip
      const targetPage = Math.ceil(this.scrollPosition);
      console.log(`📖 Fallback snap forward: ${this.scrollPosition} → ${targetPage} (${currentProgress.toFixed(2)} progress)`);
      this.snapToPage(targetPage);
    } else {
      // Only snap back if we're at the very beginning of a page
      const targetPage = Math.floor(this.scrollPosition);
      console.log(`📖 Fallback snap back: ${this.scrollPosition} → ${targetPage} (minimal progress)`);
      this.snapToPage(targetPage);
    }
  }

  /**
   * Snap to specific page
   * @param {number} targetPage - Target page to snap to
   * @param {number} customDuration - Optional custom duration for the snap
   */
  snapToPage(targetPage, customDuration = null) {
    this.isSnapping = true;
    const target = clamp(targetPage, 0, this.maxPages - 1);

    // Record snap timing for dead zone logic
    this.lastSnapTime = performance.now();
    this.lastSnapTarget = target;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const startPosition = this.scrollPosition;
    const startTime = performance.now();
    const duration = customDuration || GLOBAL_CONFIG.ANIMATION.snapDuration;
    const distance = Math.abs(target - startPosition);

    const animate = currentTime => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use different easing based on distance (momentum vs regular snap)
      let easeProgress;
      if (distance > 1.5) {
        // Long momentum flip: ease-in-out cubic for smooth feel
        easeProgress = progress < 0.5 
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      } else {
        // Short snap: quadratic ease-out for quick settling
        easeProgress = 1 - Math.pow(1 - progress, 2);
      }

      this.scrollPosition = lerp(startPosition, target, easeProgress);
      this.notifyObservers(this.scrollPosition);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
        this.isSnapping = false;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Handle wheel events
   * @param {WheelEvent} event - Wheel event
   */
  handleWheel(event) {
    event.preventDefault();
    
    // Calculate wheel velocity with proper scaling
    const wheelDelta = event.deltaY / 100;
    
    // For wheel events, we need to simulate velocity since they're discrete
    // Use a time-based approach to estimate scroll "speed"
    const now = performance.now();
    const timeSinceLastWheel = now - (this.lastWheelTime || now);
    this.lastWheelTime = now;
    
    // Detect rapid wheel sequences (flicks)
    const isRapidSequence = timeSinceLastWheel < 150; // Increased window for flick detection
    
    if (isRapidSequence) {
      this.wheelAccumulator += Math.abs(wheelDelta);
    } else {
      this.wheelAccumulator = Math.abs(wheelDelta);
    }
    
    // Boost velocity for rapid wheel sequences (flicks)
    const velocityBoost = isRapidSequence && this.wheelAccumulator > 0.5 ? 2.0 : 1.0;
    const adjustedDelta = wheelDelta * velocityBoost;
    
    // PERFORMANCE OPTIMIZATION: Only log every 10th wheel event to reduce console spam
    if (!this.wheelLogCounter) this.wheelLogCounter = 0;
    this.wheelLogCounter++;
    if (this.wheelLogCounter % 10 === 0) {
      console.log(`🎯 Wheel: delta=${wheelDelta.toFixed(3)}, rapid=${isRapidSequence}, accumulator=${this.wheelAccumulator.toFixed(3)}, boost=${velocityBoost} [${this.wheelLogCounter} events]`);
    }
    
    this.updateScrollPosition(adjustedDelta);
  }

  /**
   * Handle touch start
   * @param {TouchEvent} event - Touch event
   */
  handleTouchStart(event) {
    if (event.touches.length === 1) {
      this.lastY = event.touches[0].clientY;
    }
  }

  /**
   * Handle touch move
   * @param {TouchEvent} event - Touch event
   */
  handleTouchMove(event) {
    if (event.touches.length === 1 && this.lastY !== null) {
      event.preventDefault();
      const currentY = event.touches[0].clientY;
      const delta = (this.lastY - currentY) * 3; // Multiply for natural feel
      this.lastY = currentY;
      this.updateScrollPosition(delta / 100);
    }
  }

  /**
   * Handle touch end
   * @param {TouchEvent} event - Touch event
   */
  handleTouchEnd(event) {
    this.lastY = null;
    // Trigger momentum when user lifts finger
    if (this.velocity !== 0) {
      this.scheduleMomentum();
    }
  }

  /**
   * Initialize event listeners
   * @param {HTMLElement} container - Container element
   */
  initializeEventListeners(container) {
    // Wheel events - bind to entire document so users can scroll anywhere
    document.addEventListener('wheel', e => this.handleWheel(e), { passive: false });

    // Touch events - bind to entire document for mobile scrolling anywhere
    document.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: true });
    document.addEventListener('touchmove', e => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', e => this.handleTouchEnd(e), { passive: true });

    // Keyboard events
    // Reliable, fast flipping: each key press increments/decrements pendingTargetPage and animates to it.
    document.addEventListener('keydown', e => {
      let handled = false;
      // Guard: fallback to current page if pendingTargetPage is NaN
      const safePending = (typeof this.pendingTargetPage === 'number' && !isNaN(this.pendingTargetPage))
        ? this.pendingTargetPage
        : Math.round(this.scrollPosition);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.jumpToPage(safePending - 1);
        handled = true;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        this.jumpToPage(safePending + 1);
        handled = true;
      }
      // Optionally: prevent key repeat from browser if needed
      // if (handled) e.stopPropagation();
    });

    console.log('🎮 VirtualScrollEngine event listeners initialized (document-wide)');
  }

  /**
   * Pause scroll input (used during zoom transitions)
   */
  pauseInput() {
    this.inputPaused = true;
    console.log('⏸️ Scroll input paused');
  }

  /**
   * Resume scroll input (used after zoom transitions)
   */
  resumeInput() {
    this.inputPaused = false;
    console.log('▶️ Scroll input resumed');
  }
}



export function subscribe(callback) {
  if (!engineInstance) throw new Error('ScrollEngine not initialized');
  return engineInstance.addObserver(callback);
}

export function getState() {
  if (!engineInstance) throw new Error('ScrollEngine not initialized');
  return engineInstance.getScrollState();
}

export function jumpToPage(targetPage) {
  if (!engineInstance) throw new Error('ScrollEngine not initialized');
  engineInstance.jumpToPage(targetPage);
}

export function updatePageCount(newPageCount) {
  if (!engineInstance) throw new Error('ScrollEngine not initialized');
  engineInstance.setMaxPages(newPageCount);

  // Update rings position when page count changes
  // Note: Dynamic import to avoid circular dependency
  if (typeof window !== 'undefined') {
    import('./render.js')
      .then(module => {
        module.updateRingsPosition(newPageCount);
      })
      .catch(err => {
        console.warn('Could not update rings position:', err);
      });
  }
}

// Export the class for direct instantiation
export { VirtualScrollEngine };
