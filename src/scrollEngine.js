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

/**
 * VirtualScrollEngine Class
 * Implements the specification-compliant virtual scroll system
 */
class VirtualScrollEngine {
  constructor() {
    this.scrollPosition = 0.0;       // Fractional (1.5 = 50% through page 1)
    this.snapThreshold = GLOBAL_CONFIG.ANIMATION.snapThreshold; // Auto-flip at threshold degrees
    this.isSnapping = false;         // Prevent conflicts
    this.maxPages = 0;              // Total number of pages
    this.observers = [];            // Observer pattern for state changes
    
    // Input handling state
    this.lastY = null;              // Touch tracking
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.scrollSensitivity = this.isMobile ? 
      GLOBAL_CONFIG.ANIMATION.scrollSensitivityMobile : 
      GLOBAL_CONFIG.ANIMATION.scrollSensitivity;
    
    // Animation state
    this.animationFrameId = null;
    this.snapTimeout = null;
    this.velocity = 0;
    this.lastScrollTime = 0;
    
    console.log('🎯 VirtualScrollEngine initialized');
  }
  
  /**
   * Update scroll position with delta input
   * @param {number} delta - Input delta value
   */
  updateScrollPosition(delta) {
    if (this.isSnapping) return;
    
    const now = performance.now();
    const deltaTime = now - this.lastScrollTime;
    this.lastScrollTime = now;
    
    // Calculate velocity for physics effects
    this.velocity = deltaTime > 0 ? delta / deltaTime : 0;
    
    // Apply scroll delta with sensitivity
    this.scrollPosition += delta * this.scrollSensitivity;
    this.scrollPosition = Math.max(0, Math.min(this.maxPages - 1, this.scrollPosition));
    
    this.notifyObservers(this.scrollPosition);
    this.scheduleSnapIfNeeded();
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
      velocity: this.velocity
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
  }
  
  /**
   * Jump to specific page with animation
   * @param {number} targetPage - Target page index
   */
  jumpToPage(targetPage) {
    const target = clamp(targetPage, 0, this.maxPages - 1);
    this.animateToPosition(target);
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
    
    const animate = (currentTime) => {
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
   * Schedule snap animation if needed
   */
  scheduleSnapIfNeeded() {
    if (this.snapTimeout) {
      clearTimeout(this.snapTimeout);
    }
    
    this.snapTimeout = setTimeout(() => {
      this.maybeSnapToPage();
    }, 150); // Delay before snapping
  }
  
  /**
   * Check if snapping is needed and execute
   */
  maybeSnapToPage() {
    const state = this.getScrollState();
    const rotationDegrees = state.rotation;
    
    if (rotationDegrees >= this.snapThreshold) {
      // Snap forward to complete the flip
      const targetPage = Math.ceil(this.scrollPosition);
      this.snapToPage(targetPage);
    } else if (state.progress > 0.1) {
      // Snap back to current page if we're past 10% but below threshold
      const targetPage = Math.floor(this.scrollPosition);
      this.snapToPage(targetPage);
    }
  }
  
  /**
   * Snap to specific page
   * @param {number} targetPage - Target page to snap to
   */
  snapToPage(targetPage) {
    this.isSnapping = true;
    const target = clamp(targetPage, 0, this.maxPages - 1);
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    const startPosition = this.scrollPosition;
    const startTime = performance.now();
    const duration = GLOBAL_CONFIG.ANIMATION.snapDuration;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing for snap
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      
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
    this.updateScrollPosition(event.deltaY / 100);
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
  }
  
  /**
   * Initialize event listeners
   * @param {HTMLElement} container - Container element
   */
  initializeEventListeners(container) {
    // Wheel events - bind to entire document so users can scroll anywhere
    document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    
    // Touch events - bind to entire document for mobile scrolling anywhere
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          this.jumpToPage(Math.floor(this.scrollPosition));
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          this.jumpToPage(Math.floor(this.scrollPosition) + 1);
          break;
      }
    });
    
    console.log('🎮 VirtualScrollEngine event listeners initialized (document-wide)');
  }
}

// Legacy compatibility exports
let engineInstance = null;

export function initScrollEngine(container, pageCount = 0) {
  engineInstance = new VirtualScrollEngine();
  engineInstance.setMaxPages(pageCount);
  engineInstance.initializeEventListeners(container);
  return engineInstance;
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
    import('./render.js').then(module => {
      module.updateRingsPosition(newPageCount);
    }).catch(err => {
      console.warn('Could not update rings position:', err);
    });
  }
}

// Export the class for direct instantiation
export { VirtualScrollEngine };