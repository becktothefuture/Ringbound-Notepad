/**
 * OVERLAY HINTS MODULE
 * 
 * Shows interaction hints (Click to Zoom & Scroll to Flip) on page load
 * Auto-hides after timeout or user interaction
 * Integrates with scrollEngine to prevent scrolling while overlay is visible
 */

import { GLOBAL_CONFIG } from './config.js';

class OverlayHints {
  constructor() {
    this.overlayElement = null;
    this.hideTimeout = null;
    this.scrollEngine = null;
    this.isVisible = false;
    this.hasBeenDismissed = false;
  }

  /**
   * Initialize the overlay system
   * @param {VirtualScrollEngine} scrollEngine - The scroll engine instance
   */
  initialize(scrollEngine) {
    if (!GLOBAL_CONFIG.OVERLAY.enabled) {
      console.log('🚫 Overlay hints disabled in config');
      return;
    }

    this.scrollEngine = scrollEngine;
    
    // Create and show overlay
    this.createOverlay();
    this.show();
    
    console.log('🎯 Overlay hints initialized');
  }

  /**
   * Create the overlay HTML structure
   */
  createOverlay() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'overlay--hints';
    overlay.setAttribute('data-name', 'overlay--hints');
    
    // Create inner content
    overlay.innerHTML = `
      <div class="overlay--hints__inner">
        <div class="overlay--hints__content">
          <!-- Click to Zoom Animation -->
          <div class="overlay--hints__wrapper">
            <div class="overlay--hints__animation overlay--hints__animation--ripple">
              <div class="ripple-circle ripple-circle--1"></div>
              <div class="ripple-circle ripple-circle--2"></div>
              <div class="ripple-circle ripple-circle--3"></div>
            </div>
            <div class="overlay--hints__label">CLICK TO ZOOM</div>
          </div>
          
          <!-- Scroll to Flip Animation -->
          <div class="overlay--hints__wrapper">
            <div class="overlay--hints__animation overlay--hints__animation--scroll">
              <div class="scroll-track">
                <div class="scroll-line"></div>
                <div class="scroll-line"></div>
                <div class="scroll-line"></div>
                <div class="scroll-line"></div>
                <div class="scroll-line"></div>
                <div class="scroll-line"></div>
                <div class="scroll-line"></div>
                <div class="scroll-line"></div>
              </div>
            </div>
            <div class="overlay--hints__label">SCROLL TO FLIP</div>
          </div>
        </div>
      </div>
    `;
    
    this.overlayElement = overlay;
    document.body.appendChild(overlay);
    
    // Add event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for dismissing overlay
   */
  setupEventListeners() {
    // Click anywhere to dismiss
    this.overlayElement.addEventListener('click', () => {
      this.hide();
    });
    
    // Detect scroll attempt (wheel event)
    const wheelHandler = (e) => {
      e.preventDefault();
      this.hide();
      // Remove this listener after first wheel event
      window.removeEventListener('wheel', wheelHandler, { passive: false });
    };
    
    window.addEventListener('wheel', wheelHandler, { passive: false });
    
    // Touch events for mobile
    let touchStartY = null;
    const touchStartHandler = (e) => {
      touchStartY = e.touches[0].clientY;
    };
    
    const touchMoveHandler = (e) => {
      if (touchStartY !== null && Math.abs(e.touches[0].clientY - touchStartY) > 10) {
        e.preventDefault();
        this.hide();
        // Remove touch listeners after first swipe
        window.removeEventListener('touchstart', touchStartHandler);
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false });
      }
    };
    
    window.addEventListener('touchstart', touchStartHandler);
    window.addEventListener('touchmove', touchMoveHandler, { passive: false });
  }

  /**
   * Show the overlay
   */
  show() {
    if (this.isVisible || this.hasBeenDismissed) return;
    
    this.isVisible = true;
    
    // Pause scroll input
    if (this.scrollEngine) {
      this.scrollEngine.pauseInput();
    }
    
    // Force layout and trigger animation
    this.overlayElement.offsetHeight;
    this.overlayElement.classList.add('overlay--hints--visible');
    
    // Setup auto-hide timeout
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, GLOBAL_CONFIG.OVERLAY.autoHideDelay);
    
    console.log('🎨 Overlay hints shown');
  }

  /**
   * Hide the overlay
   */
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.hasBeenDismissed = true;
    
    // Clear timeout if exists
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    // Start fade out animation
    this.overlayElement.classList.remove('overlay--hints--visible');
    
    // Resume scroll input after animation
    setTimeout(() => {
      if (this.scrollEngine) {
        this.scrollEngine.resumeInput();
      }
      
      // Remove from DOM
      if (this.overlayElement && this.overlayElement.parentNode) {
        this.overlayElement.parentNode.removeChild(this.overlayElement);
        this.overlayElement = null;
      }
      
      console.log('🎨 Overlay hints hidden and removed');
    }, GLOBAL_CONFIG.OVERLAY.fadeOutDuration);
  }

  /**
   * Destroy the overlay system
   */
  destroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    this.overlayElement = null;
    this.scrollEngine = null;
  }
}

// Export singleton instance
export const overlayHints = new OverlayHints(); 