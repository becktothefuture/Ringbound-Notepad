/**
 * SCENE TILTING SYSTEM - SIMPLE & WORKING VERSION
 *
 * Adds subtle scene tilting during page flips to simulate the natural motion
 * of handling a physical notebook. The entire 3D scene rotates around the X-axis
 * to create the feeling that the notebook is being gently tilted as pages are flipped.
 */

import { GLOBAL_CONFIG } from './config.js';

/**
 * Simple Scene Tilting Configuration
 */
const TILT_CONFIG = {
  maxTilt: 2.5,                 // Maximum tilt angle in degrees
  damping: 0.15,                // How quickly tilt responds to changes
  
  // Tilt direction control - INVERTED per user request
  forwardTiltDirection: -1,      // Tilt direction for forward flips (-1 = down, 1 = up)
  backwardTiltDirection: 1,      // Tilt direction for backward flips (1 = up, -1 = down)
};

class SceneTiltingManager {
  constructor() {
    this.currentTilt = 0;
    this.targetTilt = 0;
    this.lastScrollPosition = 0;
    this.sceneContainer = null;
    this.lastAppliedTilt = 0;
    this.frameSkipCounter = 0;
    this.lastTransform = '';
    
    this.initializeSystem();
  }

  /**
   * Initialize the scene tilting system
   */
  initializeSystem() {
    this.sceneContainer = document.querySelector('.notebook-inner');
    
    if (!this.sceneContainer) {
      console.warn('🎯 Scene container not found - scene tilting disabled');
      return;
    }

    console.log('🎯 Scene tilting system initialized');
    console.log('📐 Tilt config:', {
      maxTilt: `${TILT_CONFIG.maxTilt}°`,
      damping: TILT_CONFIG.damping
    });
  }

  /**
   * Update scene tilting based on scroll state - PERFORMANCE OPTIMIZED
   * @param {Object} scrollState - Current scroll state from VirtualScrollEngine
   */
  updateTilting(scrollState) {
    if (!this.sceneContainer) return;
    
    // PERFORMANCE OPTIMIZATION: Update every 3rd frame (20fps) instead of every frame
    this.frameSkipCounter = (this.frameSkipCounter || 0) + 1;
    if (this.frameSkipCounter % 3 !== 0) return;
    
    const { scroll, velocity } = scrollState;
    const scrollDelta = scroll - this.lastScrollPosition;
    this.lastScrollPosition = scroll;
    
    // PERFORMANCE OPTIMIZATION: Only update if there's meaningful change
    if (Math.abs(scrollDelta) < 0.01 && Math.abs(velocity) < 0.01) {
      return; // Skip update for tiny changes
    }
    
    // Simple direct tilt calculation - no complex physics
    this.targetTilt = Math.max(-2.5, Math.min(2.5, scrollDelta * 5));
    
    // Simple interpolation with reduced precision
    this.currentTilt = this.currentTilt * 0.85 + this.targetTilt * 0.15;
    
    // PERFORMANCE OPTIMIZATION: Round to 1 decimal place to reduce string generation
    const roundedTilt = Math.round(this.currentTilt * 10) / 10;
    const transform = `rotateX(${roundedTilt}deg)`;
    
    // PERFORMANCE OPTIMIZATION: Only apply if transform actually changed
    if (this.lastTransform !== transform) {
      this.sceneContainer.style.transform = transform;
      this.lastTransform = transform;
    }
  }

  /**
   * Reset the tilting system
   */
  reset() {
    this.currentTilt = 0;
    this.targetTilt = 0;
    this.lastScrollPosition = 0;
    this.lastAppliedTilt = 0;
    this.frameSkipCounter = 0;
    this.lastTransform = '';
    
    if (this.sceneContainer) {
      this.sceneContainer.style.transform = '';
    }
  }
}

// Create singleton instance
const sceneTilting = new SceneTiltingManager();

/**
 * Main update function called by render system
 * @param {Object} scrollState - Current scroll state
 */
export function updateSceneRealism(scrollState) {
  sceneTilting.updateTilting(scrollState);
}

// Console helpers for debugging
window.sceneRealism = {
  getDebugInfo() {
    return {
      currentTilt: sceneTilting.currentTilt,
      targetTilt: sceneTilting.targetTilt,
      config: TILT_CONFIG
    };
  }
};

export { sceneTilting, TILT_CONFIG }; 