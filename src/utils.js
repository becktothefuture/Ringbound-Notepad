/**
 * MATHEMATICAL UTILITY FUNCTIONS
 * 
 * This module provides essential mathematical operations used throughout the animation system.
 * These functions are building blocks for smooth animations and value transformations.
 */

/**
 * CLAMP FUNCTION
 * Constrains a value between minimum and maximum bounds.
 * 
 * Use cases:
 * - Preventing scroll values from going negative or beyond page count
 * - Ensuring opacity values stay between 0 and 1
 * - Keeping rotation angles within reasonable ranges
 * 
 * @param {number} val - The value to constrain
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} The clamped value
 * 
 * Example: clamp(150, 0, 100) returns 100
 */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * LINEAR INTERPOLATION (LERP)
 * Blends between two values based on a progress parameter.
 * 
 * Use cases:
 * - Smooth transitions between two positions
 * - Color blending between two colors
 * - Animating any numeric property over time
 * 
 * @param {number} start - Starting value
 * @param {number} end - Ending value  
 * @param {number} t - Progress from 0 (start) to 1 (end)
 * @returns {number} The interpolated value
 * 
 * Example: lerp(0, 100, 0.5) returns 50 (halfway between 0 and 100)
 */
export const lerp = (start, end, t) => start + (end - start) * t;

/**
 * RANGE MAPPING
 * Converts a value from one numeric range to another.
 * Essential for converting scroll positions to rotation angles, etc.
 * 
 * Use cases:
 * - Converting scroll position (0-1) to rotation angle (0-270°)
 * - Mapping page position (0-7) to z-depth (0-100px)
 * - Transforming any input range to any output range
 * 
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @param {number} val - Value to map from input range
 * @returns {number} Mapped value in output range
 * 
 * Example: mapRange(0, 10, 0, 100, 5) returns 50
 * (5 is halfway through 0-10, so result is halfway through 0-100)
 */
export const mapRange = (inMin, inMax, outMin, outMax, val) =>
  ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  
// === EASING FUNCTIONS ===
//
// Easing functions control the rate of change during animations.
// They make animations feel more natural by varying the speed over time.
//
// All easing functions take a parameter t (time) from 0 to 1:
// - t = 0: Animation start
// - t = 1: Animation end
// - Return value: Progress (usually 0 to 1, but can overshoot for bounce effects)

/**
 * EASE-OUT CUBIC
 * Starts fast, then slows down (decelerates).
 * Creates a natural "settling" feeling.
 * 
 * Use cases:
 * - Objects coming to rest
 * - UI elements appearing
 * - Fade-in effects
 * - Any animation that should feel like it's "landing"
 * 
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/**
 * EASE-IN CUBIC  
 * Starts slow, then speeds up (accelerates).
 * Creates a natural "launching" feeling.
 * 
 * Use cases:
 * - Objects starting to move
 * - UI elements disappearing  
 * - Fade-out effects
 * - Any animation that should feel like it's "taking off"
 * 
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeInCubic = t => t * t * t;

/**
 * EASE-IN-OUT CUBIC
 * Starts slow, speeds up in middle, then slows down.
 * Most natural feeling for general animations.
 * 
 * Use cases:
 * - Page flipping animations
 * - General UI transitions
 * - Any animation that should feel smooth and natural
 * - Default choice when unsure which easing to use
 * 
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * LINEAR EASING
 * Constant speed throughout the animation.
 * No acceleration or deceleration.
 * 
 * Use cases:
 * - Mechanical movements
 * - Loading bars
 * - When you want constant, predictable motion
 * - Debug/testing animations
 * 
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Same as input (no easing applied)
 */
export const linear = t => t;

/**
 * EASE-IN-OUT EXPO
 * Accelerates rapidly, then decelerates rapidly. Very smooth for rotation.
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeInOutExpo = t =>
  t === 0 ? 0 :
  t === 1 ? 1 :
  t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;

/**
 * Adds a beautiful, soft shadow to the notebook element, simulating a floating effect.
 * @param {HTMLElement} el - The notebook DOM element.
 * @param {Object} options - Shadow parameters.
 * @param {number} options.layers - Number of shadow layers.
 * @param {string} options.color - Base shadow color (e.g. '0,0,0' for black).
 * @param {number} options.opacity - Max opacity (0-1).
 * @param {number} options.blurBase - Base blur (px).
 * @param {number} options.blurStep - Additional blur per layer (px).
 * @param {number} options.spreadBase - Base spread (px).
 * @param {number} options.spreadStep - Additional spread per layer (px).
 * @param {number} options.offsetX - X offset (px).
 * @param {number} options.offsetY - Y offset (px).
 */
export function applyBeautifulShadow(el, {
  layers = 6,
  color = '0,0,0',
  opacity = 0.16,
  blurBase = 24,
  blurStep = 12,
  spreadBase = 0,
  spreadStep = 2,
  offsetX = 0,
  offsetY = 24,
} = {}) {
  const shadows = [];
  for (let i = 0; i < layers; i++) {
    const blur = blurBase + i * blurStep;
    const spread = spreadBase + i * spreadStep;
    const alpha = opacity * (1 - i / (layers * 1.1)); // fade out with each layer
    shadows.push(
      `${offsetX}px ${offsetY + i * 2}px ${blur}px ${spread}px rgba(${color},${alpha.toFixed(3)})`
    );
  }
  el.style.boxShadow = shadows.join(', ');
}

/**
 * Adds a beautiful, soft drop-shadow filter to the notebook element.
 * @param {HTMLElement} el - The notebook DOM element.
 * @param {Object} options - Shadow parameters.
 * @param {number} options.layers - Number of shadow layers.
 * @param {string} options.color - Base shadow color (e.g. '0,0,0' for black).
 * @param {number} options.opacity - Max opacity (0-1).
 * @param {number} options.blurBase - Base blur (px).
 * @param {number} options.blurStep - Additional blur per layer (px).
 * @param {number} options.offsetX - X offset (px).
 * @param {number} options.offsetY - Y offset (px).
 */
export function applyBeautifulDropShadow(el, {
  layers = 6,
  color = '0,0,0',
  opacity = 0.16,
  blurBase = 24,
  blurStep = 12,
  offsetX = 0,
  offsetY = 24,
} = {}) {
  const filters = [];
  for (let i = 0; i < layers; i++) {
    const blur = blurBase + i * blurStep;
    const alpha = opacity * (1 - i / (layers * 1.1));
    filters.push(
      `drop-shadow(${offsetX}px ${offsetY + i * 2}px ${blur}px rgba(${color},${alpha.toFixed(3)}))`
    );
  }
  el.style.filter = filters.join(' ');
}

/**
 * Damped spring easing for multiple bounces.
 * @param {number} t - Time progress from 0 to 1
 * @param {number} bounces - Number of bounces (e.g., 2.5)
 * @param {number} damping - Damping factor (e.g., 5-10, higher = less bounce)
 * @returns {number} Eased progress value
 */
export function easeOutDampedSpring(t, bounces = 2.5, damping = 8) {
  if (t === 0 || t === 1) return t;
  const expo = Math.exp(-damping * t);
  const sine = Math.sin((bounces * Math.PI) * t);
  return 1 - expo * sine;
}

/**
 * Realistic single-bounce spring easing.
 * @param {number} t - Time progress from 0 to 1
 * @param {number} overshoot - How far past the target to go (e.g., 0.05 for 5%)
 * @returns {number} Eased progress value
 */
export function easeOutSingleSpring(t, overshoot = 0.05) {
  const s = overshoot;
  return 1 + s * Math.exp(-8 * t) * Math.sin(10 * t - 1.5);
} 