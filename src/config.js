/**
 * GLOBAL CONFIGURATION SYSTEM
 * 
 * This file centralizes all layout, performance, and visual parameters.
 * All configuration values are globally defined (NOT in JSON).
 * Based on the Ring-Bound Notepad Technical Specification.
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
    pageThickness: 4,                // px between pages to match physical spacing
    stackCompression: 0.8,           // Y-axis compression for stacked pages
    contentAlignment: 'bottom',      // Enforced globally
    safeZoneHeight: 50,              // px - ring hole area
    coverSizeMultiplier: 1.01        // Covers 1% larger
  },
  
  PERFORMANCE: {
    targetFPS: 60,
    frameTimeTarget: 16.67,          // ms
    maxVisiblePages: 15,
    memoryLimit: 100,                // MB
    qualityScaleMin: 0.5,
    qualityScaleMax: 1.0
  },
  
  ANIMATION: {
    snapThreshold: 110,              // Degrees (61% progress)
    snapDuration: 120,               // ms
    liftHeight: 50,                  // px arc maximum
    gravityFactor: 0.3,              // Y-offset multiplier
    scrollSensitivity: 0.1,
    scrollSensitivityMobile: 0.05
  },
  
  SCENE: {
    perspective: 2500,               // px
    perspectiveOriginX: '50%',
    perspectiveOriginY: '30%',       // Bottom bias
    transformOriginX: '50%',
    transformOriginY: '-1%',         // Slightly above page top for natural hinge
    ringZIndex: 5000,                // Always on top
    activePageZIndex: 1000
  }
};

// Legacy compatibility - map old PAGE_ANIMATION to new GLOBAL_CONFIG
export const PAGE_ANIMATION = {
  stack: {
    bottomStack: {
      visibleDepth: GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages,
      depthUnit: 1,
      startZ: 1,
      startY: 0,
      opacityFade: [GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages, GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages],
    },
    topStack: {
      visibleDepth: GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages,
      depthUnit: 1,
      startZ: 1,
      startY: 2,
      opacityFade: [GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages, GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages],
    },
    visibleDepth: GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages,
    depthUnit: 1,
    startZ: 1,
    startY: 0,
    opacityFade: [GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages, GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages],
    stickPixels: 1,
    minZIndex: 10,
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
    enableGPUAcceleration: true,
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



