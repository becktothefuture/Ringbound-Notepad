/**
 * ZOOM MANAGER - NOTEBOOK FOCUS SYSTEM
 * 
 * Handles zooming in/out of the notebook with smooth transitions.
 * Coordinates with scroll engine to prevent conflicts during zoom animations.
 * 
 * ZOOM STATES:
 * - Default: 80% scale (overview mode)
 * - Focused: 100% scale (detail mode)
 * 
 * COORDINATION:
 * - Pauses scroll input during zoom transitions
 * - Resumes scroll after configurable delay
 * - Maintains scroll position across zoom changes
 */

import { GLOBAL_CONFIG } from './config.js';

class ZoomManager {
  constructor() {
    this.isZoomed = false; // Current zoom state
    this.isTransitioning = false; // Prevents multiple simultaneous transitions
    this.scrollEngine = null; // Reference to scroll engine for coordination
    this.notebook = null; // Reference to notebook element
    this.container = null; // Reference to click container
    
    // Configuration from global config
    this.config = GLOBAL_CONFIG.ZOOM;
    
    console.log('🔍 ZoomManager initialized');
    console.log('🔍 Click anywhere on the background to toggle zoom (80% ⟷ 100%)');
  }

  /**
   * Initialize zoom system with required references
   * @param {HTMLElement} notebook - Notebook element to zoom
   * @param {HTMLElement} container - Container element for click detection
   * @param {VirtualScrollEngine} scrollEngine - Scroll engine for coordination
   */
  initialize(notebook, container, scrollEngine) {
    this.notebook = notebook;
    this.container = container;
    this.scrollEngine = scrollEngine;
    
    if (!this.notebook) {
      console.error('❌ ZoomManager: Notebook element not found');
      return;
    }
    
    this.setupEventListeners();
    this.applyCSSConfiguration();
    this.applyDefaultZoom();
    
    console.log('🔍 ZoomManager initialized with notebook:', this.notebook.id, this.notebook.className);
    console.log('🔍 Container for click detection:', this.container === document.body ? 'document.body' : this.container);
  }

  /**
   * Apply configuration values to CSS variables
   */
  applyCSSConfiguration() {
    const root = document.documentElement;
    
    // Apply notebook zoom settings
    root.style.setProperty('--notebook-zoom-scale', this.config.defaultScale);
    root.style.setProperty('--notebook-zoom-focused-scale', this.config.focusedScale);
    root.style.setProperty('--zoom-duration', `${this.config.transitionDuration}ms`);
    root.style.setProperty('--zoom-easing', this.config.transitionEasing);
    
    // Apply background zoom settings
    root.style.setProperty('--background-zoom-scale', this.config.background.defaultScale);
    root.style.setProperty('--background-zoom-focused-scale', this.config.background.focusedScale);
    
    console.log('🔍 CSS variables updated from config:');
    console.log(`   Notebook: ${this.config.defaultScale} → ${this.config.focusedScale}`);
    console.log(`   Background: ${this.config.background.defaultScale} → ${this.config.background.focusedScale}`);
    console.log(`   Duration: ${this.config.transitionDuration}ms`);
  }

  /**
   * Apply the default zoom state (80% scale)
   */
  applyDefaultZoom() {
    if (!this.notebook) return;
    
    this.notebook.classList.remove('notebook--focused');
    document.body.classList.remove('zoom-focused');
    // Update container cursor for visual feedback
    if (this.container) {
      this.container.classList.remove('zoom-focused');
    }
    this.isZoomed = false;
    
    console.log('🔍 Applied default zoom (80% scale)');
  }

  /**
   * Toggle between zoomed and default states
   */
  toggleZoom() {
    if (this.isTransitioning) {
      console.log('🔍 Zoom transition in progress, ignoring toggle');
      return;
    }

    if (this.isZoomed) {
      this.zoomOut();
    } else {
      this.zoomIn();
    }
  }

  /**
   * Zoom in to focused state (100% scale)
   */
  zoomIn() {
    if (this.isZoomed || this.isTransitioning) return;
    
    this.startTransition();
    
    // Pause scroll during zoom if configured
    if (this.config.pauseScrollDuringZoom && this.scrollEngine) {
      this.scrollEngine.pauseInput();
    }
    
    // Apply zoom
    this.notebook.classList.add('notebook--focused');
    document.body.classList.add('zoom-focused');
    // Update container cursor for visual feedback
    if (this.container) {
      this.container.classList.add('zoom-focused');
    }
    this.isZoomed = true;
    
    // Schedule transition end
    setTimeout(() => {
      this.endTransition();
    }, this.config.transitionDuration);
    
    console.log('🔍 Zooming in to focused state (100% scale)');
  }

  /**
   * Zoom out to default state (80% scale)
   */
  zoomOut() {
    if (!this.isZoomed || this.isTransitioning) return;
    
    this.startTransition();
    
    // Pause scroll during zoom if configured
    if (this.config.pauseScrollDuringZoom && this.scrollEngine) {
      this.scrollEngine.pauseInput();
    }
    
    // Apply zoom
    this.notebook.classList.remove('notebook--focused');
    document.body.classList.remove('zoom-focused');
    // Update container cursor for visual feedback
    if (this.container) {
      this.container.classList.remove('zoom-focused');
    }
    this.isZoomed = false;
    
    // Schedule transition end
    setTimeout(() => {
      this.endTransition();
    }, this.config.transitionDuration);
    
    console.log('🔍 Zooming out to default state (80% scale)');
  }

  /**
   * Start zoom transition
   */
  startTransition() {
    this.isTransitioning = true;
    
    // Add transition class for additional styling if needed
    if (this.notebook) {
      this.notebook.classList.add('notebook--transitioning');
    }
    
    console.log('🔍 Zoom transition started');
  }

  /**
   * End zoom transition and resume scroll input
   */
  endTransition() {
    this.isTransitioning = false;
    
    // Remove transition class
    if (this.notebook) {
      this.notebook.classList.remove('notebook--transitioning');
    }
    
    // Resume scroll input after delay
    if (this.config.pauseScrollDuringZoom && this.scrollEngine) {
      setTimeout(() => {
        this.scrollEngine.resumeInput();
        console.log('🔍 Scroll input resumed after zoom');
      }, this.config.resumeScrollDelay);
    }
    
    console.log('🔍 Zoom transition completed');
  }

  /**
   * Setup event listeners for zoom triggers
   */
  setupEventListeners() {
    if (!this.container) {
      console.warn('⚠️ ZoomManager: No container provided, using document');
      this.container = document;
    }
    
    // Create bound methods for better performance
    this.boundHandleClick = (event) => this.handleClick(event);
    this.boundHandleTouch = (event) => this.handleTouch(event);
    
    // Handle click/tap events on the container
    this.container.addEventListener('click', this.boundHandleClick, { passive: true });
    
    // Handle touch events for mobile  
    this.container.addEventListener('touchend', this.boundHandleTouch, { passive: true });
    
    console.log('🔍 Zoom event listeners attached to:', this.container === document.body ? 'body' : this.container.tagName);
  }

  /**
   * Handle click events
   * @param {MouseEvent} event - Click event
   */
  handleClick(event) {
    console.log('🔍 Click detected on:', event.target, 'zoom transitioning:', this.isTransitioning);
    
    // Prevent triggering zoom on scroll-related interactions
    if (this.isScrollEvent(event)) {
      console.log('🔍 Click ignored - scroll-related element');
      return;
    }
    
    // Prevent triggering during existing transitions
    if (this.isTransitioning) {
      console.log('🔍 Click ignored - transition in progress');
      return;
    }
    
    console.log('🔍 Click accepted, toggling zoom');
    this.toggleZoom();
  }

  /**
   * Handle touch events
   * @param {TouchEvent} event - Touch event
   */
  handleTouch(event) {
    // Only handle single-touch taps
    if (event.changedTouches.length !== 1) {
      return;
    }
    
    // Prevent triggering zoom on scroll-related interactions
    if (this.isScrollEvent(event)) {
      return;
    }
    
    // Prevent triggering during existing transitions
    if (this.isTransitioning) {
      return;
    }
    
    console.log('🔍 Tap detected, toggling zoom');
    this.toggleZoom();
  }

  /**
   * Check if event is related to scrolling
   * @param {Event} event - Event to check
   * @returns {boolean} - True if event is scroll-related
   */
  isScrollEvent(event) {
    // Check if event target is part of scroll-sensitive areas
    const target = event.target;
    
    // Only exclude specific interactive elements, allow everything else in notebook area
    // Don't trigger zoom on rings (they have their own interaction)
    if (target.closest('.rings') || target.closest('.rings-wrapper')) {
      return true;
    }
    
    // Don't trigger zoom on commentary overlays
    if (target.closest('.commentary') || target.closest('.overlay--rotate')) {
      return true;
    }
    
    // Don't trigger zoom on header elements
    if (target.closest('.heading-wrapper') || target.closest('h1') || target.closest('h2')) {
      return true;
    }
    
    // Allow zoom on everything else including pages and page content
    return false;
  }

  /**
   * Get current zoom state
   * @returns {boolean} - True if zoomed in
   */
  isZoomedIn() {
    return this.isZoomed;
  }

  /**
   * Get current zoom scale
   * @returns {number} - Current scale factor
   */
  getCurrentScale() {
    return this.isZoomed ? this.config.focusedScale : this.config.defaultScale;
  }

  /**
   * Cleanup zoom manager
   */
  destroy() {
    if (this.container && this.boundHandleClick && this.boundHandleTouch) {
      this.container.removeEventListener('click', this.boundHandleClick);
      this.container.removeEventListener('touchend', this.boundHandleTouch);
    }
    
    this.notebook = null;
    this.container = null;
    this.scrollEngine = null;
    this.boundHandleClick = null;
    this.boundHandleTouch = null;
    
    console.log('🔍 ZoomManager destroyed');
  }
}

// Export singleton instance
export const zoomManager = new ZoomManager();
export { ZoomManager }; 