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

import {
  easeInCubic,
  easeInOutCubic,
  easeInOutExpo,
  easeOutCubic,
  easeOutDampedSpring,
  easeOutSingleSpring,
} from './utils.js';

export const GLOBAL_CONFIG = {
  LAYOUT: {
    // Pages use 4:3 aspect ratio within responsive container
    pageAspectRatio: 4 / 3, // Enforced globally
    contentAlignment: 'bottom', // Enforced globally
    safeZoneHeight: 50, // px - ring hole area
  },

  PERFORMANCE: {
    targetFPS: 60,
    frameTimeTarget: 16.67, // ms
    maxVisiblePages: 5, // Drastically reduce for performance
    memoryLimit: 100, // MB
    qualityScaleMin: 0.5,
    qualityScaleMax: 1.0,
  },

  // 3D Notebook Depth Model - User Specifications
  DEPTH: {
    bottomUnreadZ: 5, // Bottom unread sheet starts at 5px
    spacingZ: 1, // Every sheet above adds 4px
    liftHeight: 30, // px clearance during flip
  },

  // Flip Animation - User Specifications
  ANIMATION: {
    duration: 280, // Slightly faster flip animation for snappier feel
    snapThreshold: 30, // Lower threshold so pages commit sooner (~17% progress)
    snapDuration: 80, // Faster snap back / forward
    liftHeight: 30, // px arc maximum (matches DEPTH.liftHeight)
    scrollSensitivity: 0.25, // Increase responsiveness to wheel / swipe input
    scrollSensitivityMobile: 0.15, // Same for mobile

    // User-specified easing curves
    easing: {
      liftHinge: 'cubic-bezier(.55,.05,.67,.19)', // 0 → 50%: lift & hinge
      dropSettle: 'cubic-bezier(.25,.46,.45,.94)', // 50 → 100%: drop & settle
      contentFade: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Page content visibility changes
      motionBlur: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Motion blur entry/exit
      ringRotation: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ring movement
      shadowTransform: 'cubic-bezier(0.33, 1, 0.68, 1)', // Shadow skewing/scaling
    },

    // Global transition durations for eased movements
    transitions: {
      contentFade: 150, // ms for page content opacity changes
      motionBlurEntry: 100, // ms for motion blur to appear
      motionBlurExit: 200, // ms for motion blur to disappear
      ringMovement: 120, // ms for ring rotations
      shadowMovement: 80, // ms for shadow transformations
    },

    // Momentum-driven page flipping
    momentum: {
      enabled: true,
      
      // Physics parameters
      decay: 0.0015, // 50% less damping = longer momentum, tighter control
      decayMobile: 0.002, // 50% less damping on mobile too
      minVelocity: 0.004, // Even lower threshold for precise control
      deadZoneVelocity: 0.012, // Velocity threshold to prevent unwanted flicking
      maxDuration: 1200, // Maximum coasting time in ms (safety cap)
      
      // Velocity-to-page conversion
      velocityToPages: 350, // Desktop: more aggressive page turning
      velocityToPagesMobile: 150, // Mobile: more responsive to flicks
      maxExtraPages: 4, // Maximum pages that can be flipped in one momentum burst
      
      // Dynamic snap duration based on momentum
      baseDuration: 200, // Base snap duration in ms
      durationMultiplier: 50, // Additional ms per extra page
      maxSnapDuration: 500, // Cap for very long flips
    },
  },

  SCENE: {
    perspective: 7000, // px
    perspectiveOriginX: '50%',
    perspectiveOriginY: '600%', // Far bottom perspective
    transformOriginX: '50%',
    transformOriginY: '0%', // Top edge hinge (user specification)
    ringZIndex: 5000, // Always on top
    activePageZIndex: 1000,
  },

  // Zoom System Configuration
  ZOOM: {
    defaultScale: 0.8, // Default notebook scale (80%)
    focusedScale: 1.0, // Focused notebook scale (100%)
    transformOrigin: '50% 60%', // Zoom from center-bottom area
    transitionDuration: 600, // ms for zoom animation
    transitionEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth ease-out
    
    // Background zoom for realistic camera effect
    background: {
      defaultScale: 1.0, // Default background scale (100%)
      focusedScale: 1.02, // Background scale when focused (104% = subtle zoom)
    },
    
    // Coordination with scroll animations
    pauseScrollDuringZoom: true, // Prevent scroll conflicts during zoom
    resumeScrollDelay: 100, // ms delay before re-enabling scroll after zoom
  },

  RINGS: {
    rotationRange: 60, // degrees - max rotation in each direction
    rotationUnflipped: 20, // degrees - rotation when stack is unflipped
    rotationFlipped: -20, // degrees - rotation when stack is fully flipped
    animationSmoothing: 0.08, // 0-1 - lower = smoother but slower response
    easingTransition: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth ease-out
    transitionDuration: 120, // ms for ring movement transitions
    perspective: 4000, // px - perspective distance for ring container
    offsetY: -7, // % - vertical offset for ring positioning (static)
    offsetZ: -25, // px - clearance offset from top page position
    yPositionUnflipped: -14, // % - Y position when stack is unflipped
    yPositionFlipped: -4, // % - Y position when stack is fully flipped
    scaleX: 0.98, // horizontal scale factor (stays constant)
    scaleY: 1.3, // vertical scale factor (stays constant)
  },

  /**
   * Page Shadow Settings (new implementation)
   * - gradientStart / gradientMid / gradientEnd: CSS color values
   * - gradientMidStop: percentage stop for the second color stop (default 50%)
   * - transitionDuration: seconds for the CSS transition on the translateY movement
   * - gradientAngle: angle of the gradient in degrees (180 = straight down, 170 = tilted left)
   * - maxSkew: maximum skew angle in degrees (0° to this value)
   * - minHeightScale: minimum height scaling (1.0 to this value)
   * - easingFunction: CSS easing function for smooth shadow transitions
   */
  SHADOW: {
    gradientStart: 'rgba(0,0,0,0.6)', // 0% stop
    gradientMid: 'rgba(0,0,0,0.3)', // 50% stop
    gradientEnd: 'rgba(0,0,0,0)', // 100% stop
    gradientMidStop: 50, // %
    gradientAngle: 180, // 10° tilt to bottom-left (180° - 10°)
    maxSkew: -45, // Maximum skew angle in degrees (0° to -45° for opposite direction)
    minHeightScale: 0, // Minimum height scale (100% to 0% - complete collapse)
    transitionDuration: 80, // ms - smooth shadow transitions
    easingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)', // Smooth cubic ease-out
    flipLimitDeg: 140, // degrees of the page ABOVE after which shadow completes
    exponentialCurve: 2, // Exponential curve factor for slower movement
  },

  /**
   * Page Backface Settings
   * Controls the appearance and behavior of page backs
   */
  BACKFACE: {
    color: 'rgba(0, 0, 0, 0.85)', // Semi-transparent black for testing (slightly darker)
    gradient: null, // Optional gradient override (null = use solid color)
    texture: null, // Optional texture/pattern URL
    borderRadius: 'inherit', // Inherit from page-front
    zOffset: -1, // px behind page-front
    // Alternative backface colors for different page types
    coverColor: 'rgba(139, 69, 19, 0.9)', // Darker brown for covers
    videoPageColor: 'rgba(0, 0, 0, 0.9)', // Darker black for video pages
  },
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
