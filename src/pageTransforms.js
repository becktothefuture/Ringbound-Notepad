/*
 * PAGE TRANSFORM UTILITIES – v1.0
 * --------------------------------
 * A single-purpose module that owns every little piece of maths required to
 * position a page in 3-D space.  Nothing here ever sets or even thinks about
 * CSS z-index; draw-order is purely the result of translateZ depth.
 */

import { GLOBAL_CONFIG } from './config.js';
import { clamp } from './utils.js';

const THICKNESS = GLOBAL_CONFIG.LAYOUT.pageThickness;
const LIFT_HEIGHT = GLOBAL_CONFIG.ANIMATION.liftHeight;
const GRAVITY_FACTOR = GLOBAL_CONFIG.ANIMATION.gravityFactor;

/**
 * Returns the static stack depth for any page when it is lying flat.
 *
 * Unread stack  (left):  Starts closest to the viewer and recedes backwards
 *                        as pageIndex increases.
 * Read   stack (right):  Starts just behind the spine (1 px) and grows toward
 *                        the viewer as pages accumulate in the read pile.
 */
export function baseDepth(pageIndex, currentPage, totalPages) {
  return pageIndex < currentPage
    ? /* 👉 read stack */ 1 + pageIndex * THICKNESS
    : /* 👉 unread stack */ (totalPages - pageIndex) * THICKNESS;
}

/**
 * Calculates the full 3-D transform string for a page given the global scroll
 * position.
 */
export function computeTransform(pageIndex, scrollPosition, totalPages) {
  const currentPage = Math.floor(scrollPosition);
  const rel = scrollPosition - pageIndex;            // -∞ … +∞
  const rotation = clamp(rel * 180, 0, 180);         // 0 – 180 °
  const progress = rotation / 180;                   // 0 – 1

  // Baseline depth of the sheet when it is flat on either stack
  const depth = baseDepth(pageIndex, currentPage, totalPages);

  // Lift the currently turning page so its edge clears the pile beneath.
  // Zero lift when sheet is flat.
  const lift = Math.sin(progress * Math.PI) * LIFT_HEIGHT;

  // Optional gravity drop so the far edge sags realistically.
  const drop = -lift * GRAVITY_FACTOR;
  const finalDepth = depth + lift;
  const finalY = rotation === 0 || rotation === 180 ? 0 : drop;

  /*
   * Perspective compensation: Without it, elements closer to the camera appear
   * larger. To keep every sheet looking identical we apply an inverse scale
   * that cancels out that perspective growth.
   *
   * The browser's perspective projection scales an element by:
   *     scalePerspective = P / (P - z)
   * where P is the perspective distance and z is the positive translateZ.
   * We invert that by multiplying with (P - z) / P so the net scale is 1.
   */
  const P = GLOBAL_CONFIG.SCENE.perspective;
  const compensation = (P - finalDepth) / P;

  return `translateZ(${finalDepth}px) translateY(${finalY}px) rotateX(${rotation}deg) scale(${compensation})`;
} 