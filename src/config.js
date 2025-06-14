import { easeOutCubic, easeInCubic, easeInOutCubic, linear, easeInOutExpo } from './utils.js';

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
    visibleDepth: 7,         // Number of visible trailing pages
    depthUnit: 10,            // Z-depth separation per page (px)
    startZ: -1,              // Z pos for back of stack (px)
    startY: 30,                // Y pos for back of stack (px)
    opacityFade: [7, 3],     // [start, end] stack fade range
    stickPixels: 10,         // Dead zone in pixels before rotation begins
  },
  flip: {
    readyZ: 0,              // Z pos before flip (px)
    readyY: 0,               // Y pos before flip (px)
    startRotationX: -10,     // Initial X rotation in stack (deg)
    readyRotationX: 4,       // X rotation ready to flip (deg)
    maxAngle: 270,           // Max flip angle (deg)
    fadeStart: 200,          // Angle to start fading out (deg)
    fadeEnd: 270,            // Angle fully invisible (deg)
    blurMax: 7,              // Max blur during flip (px)
    rotationOriginX: '100%',  // Rotation origin X
    rotationOriginY: '-1%',   // Rotation origin Y (2% above the top edge)
    easing: easeInOutExpo,          // Easing function
    speed: 400,              // Flip duration (ms)
  },
  shadow: {
    maxOpacity: 1,         // Max shadow opacity
    fadeStartAngle: 1,       // Angle when shadow is fully visible
    fadeEndAngle: 150,        // Angle when shadow is gone
  },
  backface: {
    fadeStartAngle: 90, // Angle where backface fade starts
    fadeEndAngle: 180, // Angle where backface fade ends
    startOpacity: 0.5,   // Opacity at fade start
    endOpacity: 0.2,     // Opacity at fade end
  },
  background: {
    fadeStart: 180,
    fadeEnd: 270,
    startOpacity: 1,
    endOpacity: 0.5,
  },
  loop: {
    infinite: true,          // Infinite page looping
    buffer: 10,              // Preload buffer size
  },
  misc: {
    rotationEasing: easeInOutExpo,  // Easing for rotation
    videoPreloadDeg: 270,    // Video preload trigger angle
    scrollSensitivity: 0.09, // Scroll sensitivity
    debug: true,             // Debug mode
    frameCap: 60,            // Animation FPS cap
  },
  snap: {
    delay: 0, // ms, time after scroll stops before snapping
    threshold: 140, // deg, angle at which to snap forward
    duration: 250, // ms, duration of snap animation
    easing: easeInCubic, // easing function for snap
  },
  jump: {
    duration: 1000, // ms, duration of jump animation
    easing: easeInOutCubic, // easing function for jump
  },
  // === GLOBAL NOTEBOOK OFFSET ===
  global: {
    /**
     * Global notebook translation in 3D space (applied to the entire notepad, not pages)
     * These are in pixels and do NOT interact with mouse or scroll transforms.
     * Use to move the whole notebook in X (right), Y (down), or Z (toward viewer) directions.
     */
    offsetX: 0, // px, right (+) / left (-)
    offsetY: 0, // px, down (+) / up (-)
    offsetZ: 200, // px, forward (+) / back (-)
  },
}; 