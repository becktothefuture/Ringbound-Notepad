/**
 * GLOBAL CONFIGURATION SYSTEM
 * 
 * This file centralizes all layout, performance, and visual parameters.
 * All configuration values are globally defined (NOT in JSON).
 * Based on the Ring-Bound Notebook Technical Specification.
 * 
 * COORDINATE SYSTEM:
 * - X: Left/Right (positive = right)
 * - Y: Up/Down (positive = down in screen space, up in 3D space) 
 * - Z: Forward/Back (positive = toward viewer)
 * - Rotations in degrees (0° = flat, 90° = vertical, 180° = upside down)
 */

import { easeInCubic, easeInOutCubic, easeInOutExpo, easeOutCubic, easeOutDampedSpring, easeOutSingleSpring } from './utils.js';

export const GLOBAL_CONFIG = {
  LAYOUT: {
    // Pages use 4:3 aspect ratio within responsive container
    pageAspectRatio: 4/3,            // Enforced globally
    contentAlignment: 'bottom',      // Enforced globally
    safeZoneHeight: 50,              // px - ring hole area
  },
  
  PERFORMANCE: {
    targetFPS: 60,
    frameTimeTarget: 16.67,          // ms
    maxVisiblePages: 15,
    memoryLimit: 100,                // MB
    qualityScaleMin: 0.5,
    qualityScaleMax: 1.0
  },
  
  // 3D Notebook Depth Model - User Specifications
  DEPTH: {
    bottomUnreadZ: 5,                // Bottom unread sheet starts at 5px
    spacingZ: 2,                     // Every sheet above adds 4px
    liftHeight: 30,                  // px clearance during flip
  },
  
  // Flip Animation - User Specifications  
  ANIMATION: {
    duration: 600,                   // ms for flip animation (60fps)
    snapThreshold: 110,              // Degrees (61% progress)
    snapDuration: 120,               // ms
    liftHeight: 30,                  // px arc maximum (matches DEPTH.liftHeight)
    scrollSensitivity: 0.1,
    scrollSensitivityMobile: 0.05,
    
    // User-specified easing curves
    easing: {
      liftHinge: 'cubic-bezier(.55,.05,.67,.19)',    // 0 → 50%: lift & hinge
      dropSettle: 'cubic-bezier(.25,.46,.45,.94)'    // 50 → 100%: drop & settle
    }
  },
  
  SCENE: {
    perspective: 2500,               // px
    perspectiveOriginX: '50%',
    perspectiveOriginY: '30%',       // Bottom bias
    transformOriginX: '50%',
    transformOriginY: '0%',          // Top edge hinge (user specification)
    ringZIndex: 5000,                // Always on top
    activePageZIndex: 1000
  }
};

// Legacy compatibility - map old PAGE_ANIMATION to new GLOBAL_CONFIG
export const PAGE_ANIMATION = {
  stack: {
    visibleDepth: GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages,
  },
  flip: {
    maxAngle: 180,
    speed: 400,
    easing: easeInOutExpo,
    rotationOriginX: GLOBAL_CONFIG.SCENE.transformOriginX,
    rotationOriginY: GLOBAL_CONFIG.SCENE.transformOriginY,
  },
  loop: {
    infinite: false,
    buffer: GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages,
  },
  misc: {
    scrollSensitivity: GLOBAL_CONFIG.ANIMATION.scrollSensitivity,
  },
  snap: {
    delay: 0,
    threshold: GLOBAL_CONFIG.ANIMATION.snapThreshold,
    duration: GLOBAL_CONFIG.ANIMATION.snapDuration,
    easing: easeInOutCubic,
  },
  jump: {
    duration: 500,
    easing: easeInOutCubic,
  },
  perspective: {
    distance: GLOBAL_CONFIG.SCENE.perspective,
    originX: GLOBAL_CONFIG.SCENE.perspectiveOriginX,
    originY: GLOBAL_CONFIG.SCENE.perspectiveOriginY,
  },
};



