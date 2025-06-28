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
    scrollSensitivity: 0.25, // INCREASED: More sensitive for direct response (was 0.15)
    scrollSensitivityMobile: 0.18, // INCREASED: More sensitive on mobile (was 0.1)

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

    // Momentum-driven page flipping - DIRECT AND RESPONSIVE
    momentum: {
      enabled: true,
      
      // Physics parameters - DIRECT response with minimal dampening
      decay: 0.001, // REDUCED: Much slower decay for more direct control (was 0.003)
      decayMobile: 0.0015, // REDUCED: Slower decay on mobile (was 0.004)
      minVelocity: 0.003, // REDUCED: Lower threshold for more responsive control (was 0.008)
      deadZoneVelocity: 0.008, // REDUCED: Lower threshold for better sensitivity (was 0.02)
      maxDuration: 1500, // INCREASED: Longer coasting for more direct feel (was 800ms)
      
      // Velocity-to-page conversion - MORE AGGRESSIVE for direct response
      velocityToPages: 400, // INCREASED: More aggressive page turning (was 250)
      velocityToPagesMobile: 200, // INCREASED: More responsive to flicks (was 100)
      maxExtraPages: 5, // INCREASED: More pages per momentum burst (was 3)
      
      // Dynamic snap duration based on momentum - FASTER
      baseDuration: 100, // REDUCED: Faster base snap duration (was 150ms)
      durationMultiplier: 20, // REDUCED: Less additional time per page (was 30ms)
      maxSnapDuration: 300, // REDUCED: Lower cap for snappier flips (was 400ms)
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
    transitionDuration: 450, // ms for zoom animation
    transitionEasing: 'cubic-bezier(0.25, 0.46, 0.45, 1)', // Smooth ease-out
    
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
    // Ring positioning - individual control for front and back rings
    front: {
      offsetZ: -15,                       // px - distance in front of top page
      offsetY: -10,                       // % - vertical offset from page center
      scaleX: 1.02,                       // horizontal scale factor
      scaleY: 1.3,                        // vertical scale factor
      rotationUnflipped: 20,              // degrees - rotation when stack is unflipped
      rotationFlipped: -20,               // degrees - rotation when stack is fully flipped
    },
    back: {
      offsetZ: -10,                       // px - distance behind bottom page  
      offsetY: -14,                       // % - vertical offset from page center
      scaleX: 1.02,                       // horizontal scale factor
      scaleY: 1.3,                        // vertical scale factor
      rotationUnflipped: 15,              // degrees - rotation when stack is unflipped
      rotationFlipped: -15,               // degrees - rotation when stack is fully flipped
    },
    
    // Animation settings
    animationSmoothing: 0.08,             // 0-1 - lower = smoother but slower response
    easingTransition: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth ease-out
    transitionDuration: 120,              // ms for ring movement transitions
    perspective: 1000,                    // px - perspective distance for ring container
    
    // Y position animation (shared between both rings)
    yPositionUnflipped: -14,              // % - Y position when stack is unflipped
    yPositionFlipped: -4,                 // % - Y position when stack is fully flipped
    

  },

  /**
   * Skewed Page Shadow Settings (appears on page when page above flips)
   * Controls the dynamic shadow that appears on a page when the page above it starts flipping
   */
  SHADOW: {
    // Shadow gradient colors for the CSS background
    gradientStart: 'rgba(0,0,0,0.78)', // 0% stop - darkest part of shadow
    gradientMid: 'rgba(0,0,0,0.39)', // 50% stop - middle part of shadow  
    gradientEnd: 'rgba(0,0,0,0)', // 100% stop - transparent end
    gradientMidStop: 50, // % - position of middle color stop
    gradientAngle: 180, // degrees - gradient direction (180° = straight down)
    
    // Shadow transform animation
    maxSkew: -45, // degrees - maximum skew angle (0° to -45°)
    minHeightScale: 0, // scale factor - minimum height scale (1.0 to 0.0)
    
    // Shadow opacity animation (as page above flips)
    startOpacity: 1.0, // opacity when page above starts flipping (0°)
    endOpacity: 0.5, // opacity when page above completes flip (120°)
    
    // Animation timing
    flipLimitDeg: 140, // degrees - rotation of page above when shadow completes
    exponentialCurve: 2, // curve factor - controls shadow movement speed
    transitionDuration: 80, // ms - CSS transition duration
    easingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)', // CSS easing function
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
      startColor: 'rgba(0, 0, 0, 0.195)', // 30% darker (0.15 → 0.195)
      endColor: 'rgba(0, 0, 0, 0.455)', // 30% darker (0.35 → 0.455)
      startPosition: '0%', // Where gradient starts
      endPosition: '100%', // Where gradient ends
      
      // Backface shadow animation (shadow on back of flipped pages)
      animation: {
        enabled: true,
        startOpacity: 0.75, // opacity when page starts flipping (0°)
        endOpacity: 0.25, // opacity when page finishes flipping (180°)
        fadeStartAngle: 90, // degrees - when fade animation starts
        fadeEndAngle: 120, // degrees - when fade animation ends
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

  // Head Bobble Animation Configuration
  HEAD_BOBBLE: {
    enabled: true, // Whether to enable head bobble animation
    amplitude: 2, // px up/down movement (very subtle for realism)
    pitchDeg: 0.6, // degrees forward/back rotation (minimal for subtlety)
    tiltDeg: 0, // degrees left/right tilt (head tilting)
    frequency: 0.15, // cycles per second (very slow, chilled breathing ~9 breaths/min)
    target: null, // Will be set to .head-bobble-wrapper by default
    
    // Organic movement settings for natural feel
    organicIntensity: 1.2, // 0-2, subtle organic variations
    breathingVariation: 0.7, // 0-1, natural breathing irregularity
    microMovements: true, // enable micro-movements for realism
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
