import { easeInCubic, easeInOutCubic, easeInOutExpo, easeOutCubic, easeOutDampedSpring, easeOutSingleSpring } from './utils.js';

/**
 * CONFIGURATION SYSTEM
 * 
 * This file centralizes all animation parameters and visual settings.
 * Modifying these values changes how the notepad behaves and appears.
 * 
 * COORDINATE SYSTEM:
 * - X: Left/Right (positive = right)
 * - Y: Up/Down (positive = down in screen space, up in 3D space) 
 * - Z: Forward/Back (positive = toward viewer)
 * - Rotations in degrees (0° = flat, 90° = vertical, 180° = upside down)
 */

export const PAGE_ANIMATION = {
  stack: {
    visibleDepth: 15,         // Number of visible trailing pages
    depthUnit: 10,            // Z-depth separation per page (px)
    startZ: 0,                // Z pos for back of stack (px)
    startY: 20,               // Y pos for back of stack (px)
    opacityFade: [15, 5],     // [start, end] stack fade range
    stickPixels: 1,           // Dead zone in pixels before rotation begins
  },
  flip: {
    readyZ: 0,                // Z pos before flip (px)
    readyY: 0,                // Y pos before flip (px)
    startRotationX: -24,      // Initial X rotation in stack (deg)
    readyRotationX: 4,        // X rotation ready to flip (deg)
    maxAngle: 210,            // Max flip angle (deg)
    fadeStart: 90,            // Angle to start fading out (deg)
    fadeEnd: 210,             // Angle fully invisible (deg)
    blurMax: 5,               // Max blur during flip (px)
    rotationOriginX: '50%',   // Rotation origin X (center for top-hinged flip)
    rotationOriginY: '-1%',   // Rotation origin Y (top edge of binding bar, above page)
    easing: easeInOutExpo,    // Easing function
    speed: 400,               // Flip duration (ms)
  },
  loop: {
    infinite: true,           // Infinite page looping
    buffer: 15,               // Preload buffer size for infinite loop
  },
  misc: {
    // Performance settings
    enableGPUAcceleration: true,  // Enable GPU acceleration hints
    scrollSensitivity: 0.3,      // Scroll sensitivity multiplier
  },
  snap: {
    delay: 0, // ms, time after scroll stops before snapping
    threshold: 110, // deg, angle at which to snap forward
    duration: 120, // ms, duration of snap animation
    easing: easeInOutCubic, // easing function for snap
  },
  jump: {
    duration: 500, // ms, duration of jump animation
    easing: easeInOutCubic, // easing function for jump
  },
  global: {
    /**
     * Global notebook translation in 3D space (applied to the entire notepad, not pages)
     * These are in pixels and do NOT interact with mouse or scroll transforms.
     * Use to move the whole notebook in X (right), Y (down), or Z (toward viewer) directions.
     */
    offsetX: 0, // px, right (+) / left (-)
    offsetY: 0, // px, down (+) / up (-)
    offsetZ: 0, // px, forward (+) / back (-)
  },
  /**
   * PARALLAX / TILT CONFIGURATION
   * These settings control how the entire notebook responds to mouse or touch
   * movement by rotating and translating in 3-D space. Tweak these values to
   * adjust the "hand-held" feel of the notebook.
   */
  parallax: {
    // Maximum rotation angles (degrees)
    maxRotationX: 0, // Disable Up/Down tilt
    maxRotationY: 0, // Disable Left/Right turn
    maxRotationZ: 0, // Disable Roll / twist

    // Maximum translation as fraction of viewport size (0–1)
    translateFactor: 0, // Disable translation

    // Damping factor for smooth follow (0–1, lower = slower)
    damp: 0.5,

    // Render throttling
    fps: 60,             // Target frames per second for parallax loop
    mouseUpdateRate: 60, // Mouse tracker sampling FPS
  },
  effects: {
    backface: {
      fadeStartAngle: 0,
      fadeEndAngle: 0,
      startOpacity: 1,
      endOpacity: 1,
      color: 'red',
      blur: {
        enabled: true,
        maxBlur: 4
      }
    },
    shadow: {
      fadeStartAngle: 1,
      fadeEndAngle: 150,
      startOpacity: 1,
      endOpacity: 0,
      color: 'rgba(0, 0, 0, 0.2)',
      blur: {
        enabled: true,
        maxBlur: 2
      }
    },
    content: {
      fadeStartAngle: 90,
      fadeEndAngle: 270,
      startOpacity: 1,
      endOpacity: 0,
      blur: {
        enabled: true,
        maxBlur: 20
      }
    }
  },
};

// Remove redundant DEBUG object since it's now consolidated in PAGE_ANIMATION.misc.debug
// export const DEBUG = PAGE_ANIMATION.misc.debug;

// Mouse movement settings
export const MOUSE_MOVEMENT = {
  enabled: false,  // Disable mouse movement
  sensitivity: 0,  // Set sensitivity to 0
  maxRotationX: 0, // Disable X rotation
  maxRotationY: 0, // Disable Y rotation
  maxRotationZ: 0, // Disable Z rotation
  smoothing: 0.1,  // Keep smoothing for future use
  deadzone: 0.1    // Keep deadzone for future use
}; 