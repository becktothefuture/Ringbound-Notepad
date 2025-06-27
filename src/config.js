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
    maxVisiblePages: 12, // RESTORED: Original value (was 8)
    memoryLimit: 100, // RESTORED: Original value (was 80MB)
    qualityScaleMin: 0.5, // RESTORED: Original value
    qualityScaleMax: 1.0,
    
    // Original emergency settings
    emergencyFpsThreshold: 5,
    emergencyMaxVisiblePages: 3,
    emergencyQualityScale: 0.2,
    
    // Original background loading settings
    backgroundLoadingEnabled: true,
    backgroundLoadDelay: 150,
    backgroundLoadSpeedReduction: 0.5,
  },

  // 3D Notebook Depth Model - ORIGINAL VALUES RESTORED
  DEPTH: {
    bottomUnreadZ: 5, // Bottom unread sheet starts at 5px
    spacingZ: 1, // RESTORED: Original spacing (was 10px)
    liftHeight: 30, // RESTORED: Original lift height (was 60px)
  },

  // Flip Animation - User Specifications
  ANIMATION: {
    duration: 280, // Slightly faster flip animation for snappier feel
    snapThreshold: 30, // Lower threshold so pages commit sooner (~17% progress)
    snapDuration: 80, // Faster snap back / forward
    liftHeight: 30, // px arc maximum (matches DEPTH.liftHeight)
    scrollSensitivity: 0.15, // REDUCED: Less sensitive to reduce wheel spam (was 0.25)
    scrollSensitivityMobile: 0.1, // REDUCED: Less sensitive on mobile (was 0.15)

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

    // Momentum-driven page flipping - OPTIMIZED
    momentum: {
      enabled: true,
      
      // Physics parameters - REDUCED for smoother performance
      decay: 0.003, // INCREASED: Faster decay to reduce processing time (was 0.0015)
      decayMobile: 0.004, // INCREASED: Faster decay on mobile (was 0.002)
      minVelocity: 0.008, // INCREASED: Higher threshold to stop earlier (was 0.004)
      deadZoneVelocity: 0.02, // INCREASED: Higher threshold to prevent unwanted flicking (was 0.012)
      maxDuration: 800, // REDUCED: Shorter maximum coasting time (was 1200ms)
      
      // Velocity-to-page conversion - REDUCED for less aggressive scrolling
      velocityToPages: 250, // REDUCED: Less aggressive page turning (was 350)
      velocityToPagesMobile: 100, // REDUCED: Less responsive to flicks (was 150)
      maxExtraPages: 3, // REDUCED: Maximum pages per momentum burst (was 4)
      
      // Dynamic snap duration based on momentum
      baseDuration: 150, // REDUCED: Faster base snap duration (was 200ms)
      durationMultiplier: 30, // REDUCED: Less additional time per page (was 50ms)
      maxSnapDuration: 400, // REDUCED: Lower cap for very long flips (was 500ms)
    },
  },

  SCENE: {
    perspective: 7000, // RESTORED: Original perspective (was 12000)
    perspectiveOriginX: '50%',
    perspectiveOriginY: '350%', // Far bottom perspective
    transformOriginX: '50%',
    transformOriginY: '-2%', // KEEP: Negative value for natural arch movement
    ringZIndex: 5000, // Always on top
    activePageZIndex: 1000,
  },

  // Zoom System Configuration
  ZOOM: {
    defaultScale: 0.8, // Default notebook scale (80%)
    focusedScale: 1.07, // Focused notebook scale (110%)
    transformOrigin: '50% 60%', // Zoom from center-bottom area
    transitionDuration: 600, // ms for zoom animation
    transitionEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth ease-out
    
    // Background zoom for realistic camera effect
    background: {
      defaultScale: 1.0, // Default background scale (100%)
      focusedScale: 0.97, // Background scale when focused (104% = subtle zoom)
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
    perspective: 1000, // px - perspective distance for ring container
    offsetY: -9, // % - vertical offset for ring positioning (static)
    offsetZ: -25, // px - clearance offset from top page position
    yPositionUnflipped: -14, // % - Y position when stack is unflipped
    yPositionFlipped: -4, // % - Y position when stack is fully flipped
    scaleX: 1.02, // horizontal scale factor (stays constant)
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
   * Page Backface Settings - ORIGINAL VALUES RESTORED
   * Controls the appearance and behavior of page backs
   */
  BACKFACE: {
    color: '#f5f5f5', // RESTORED: Original light color (was #d8d8d8)
    gradient: null, // Optional gradient override (null = use solid color)
    texture: null, // Optional texture/pattern URL
    borderRadius: 'inherit', // Inherit from page-front
    zOffset: -1, // px behind page-front
    // Alternative backface colors for different page types
    coverColor: 'rgba(139, 69, 19, 0.9)', // Darker brown for covers
    videoPageColor: 'rgba(0, 0, 0, 0.9)', // Darker black for video pages
    
    // Original shadow gradient settings
    shadowGradient: {
      enabled: true,
      direction: 'to bottom right', // Diagonal shadow for more realism
      startColor: 'rgba(0, 0, 0, 0.15)', // RESTORED: Original lighter shadow
      endColor: 'rgba(0, 0, 0, 0.35)', // RESTORED: Original lighter shadow
      startPosition: '0%', // Where gradient starts
      endPosition: '100%', // Where gradient ends
      
      // Original animation settings during page flip
      animation: {
        enabled: true,
        maxOpacity: 0.8, // RESTORED: Original visibility
        minOpacity: 0.2, // RESTORED: Original minimum visibility
        fadeStartAngle: 10, // RESTORED: Original fade timing
        fadeEndAngle: 170, // RESTORED: Original fade timing
        hardwareAccelerated: true, // Enable GPU acceleration for shadows
      },
    },
  },

  // Application colors
  COLORS: {
    // Default page color
    default: '#f5f5f5',
    
    // Pastel color palette for chapter covers and tabs
    palette: {
      coral: '#ffb3ba',      // Soft coral pink
      peach: '#ffdfba',      // Gentle peach
      lavender: '#bae1ff',   // Light lavender blue
      mint: '#baffc9',       // Soft mint green
      lemon: '#ffffba',      // Pale lemon yellow
      rose: '#ffb3e6',       // Light rose pink
      sky: '#c9e4ff',        // Soft sky blue
      sage: '#c9ffba',       // Sage green
      cream: '#fff2e6',      // Warm cream
      lilac: '#e6ccff'       // Soft lilac
    }
  },

  COMMENTARY: {
    typewriterDelay: 400, // ms delay before commentary text animates in
  },

  // Overlay hint configuration
  OVERLAY: {
    enabled: true, // Whether to show the overlay on page load
    autoHideDelay: 3000, // Auto-hide after 3 seconds (ms)
    fadeOutDuration: 300, // Fade out animation duration (ms)
    backdropBlur: 10, // Backdrop blur amount (px)
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Overlay background color
    zIndex: 90000, // Below noise (99999) but above everything else
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
