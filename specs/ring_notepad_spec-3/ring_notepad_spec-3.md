Ring‑Bound Landscape Notepad Scroll – Comprehensive Specification

Version 1.1 – 10 June 2025 – Author: ChatGPT (OpenAI o3) for Alex Beck

1. Vision & Goals

“Reproduce the tactile delight of flicking through a horizontal spiral notebook, delivered as a buttery‑smooth, GPU‑driven web experience that drops directly into Webflow.”

Success Criteria

Visual parity with the 3‑D mock‑up (see Image Prompt).

60 FPS on mid‑range mobile (iPhone 11 / Pixel 6).

Lighthouse Perf ≥ 95, Accessibility ≥ 95.

Accessible fallback when prefers‑reduced‑motion: reduce is detected.

No flicker or positional jump when the page stack loops.

Strictly modular, debug-safe, and optimised for minimal layout reflow.

Easily extensible and understandable by AI agents and junior developers.

2. Project Structure

/src
├── config.js         # All configurable values (timings, thresholds, ratios, toggles)
├── index.html        # Entry point
├── style.css         # Core layout and design (rings, pages, blur)
├── app.js            # Orchestrator: imports and bootstraps system
├── scrollEngine.js   # Converts scroll delta to rotation state
├── render.js         # Applies transform/opacity/blur to DOM elements
├── domManager.js     # DOM lifecycle: inject, hydrate, recycle pages
├── videoController.js# Handles preload and playback of inline video content
├── debug.js          # Optional: shows live debug overlay + console groups
├── utils.js          # Pure functions (e.g. clamp, ease, lerp, etc.)

All modules are ES6 imports. No globals. Avoids concatenation. Follows SRP (Single Responsibility Principle).

3. config.js — Full Documentation

/**
 * Core settings to control system behaviour.
 * Changes here modify stack depth, easing, scroll response, video preload, debug mode, etc.
 *
 * Designed to be: human-readable, AI-parsable, and fully decoupled from business logic.
 */

export const CONFIG = {
  /**
   * Number of visible trailing pages behind the current active one.
   * Helps maintain realism without overloading the DOM.
   */
  STACK_VISIBLE_DEPTH: 5,

  /**
   * The z-depth unit (in px or % if using translateZ) between each page in the stack.
   * Creates a physical stack feel. Increase for more dramatic depth.
   */
  STACK_DEPTH_UNIT: 1.5,

  /**
   * Max angle a page flips. -300deg = full backflip + continuation
   */
  ROTATE_MAX: -300,

  /**
   * When fading starts and ends, in degrees
   */
  FADE_START: 180,
  FADE_END: 270,

  /**
   * Max Gaussian blur on the flipped page. Avoids Z-clash and flatness
   */
  BLUR_MAX: 10,

  /**
   * Determines how many scroll pixels = one full page flip
   */
  SCROLL_SENSITIVITY: 0.4,

  /**
   * The rotation degree at which we preload the next page’s video
   */
  VIDEO_PRELOAD_TRIGGER_DEG: 270,

  /**
   * Snap threshold. If current page crosses this angle, it flips forward.
   * Otherwise it rolls back.
   */
  SNAP_THRESHOLD: 135,

  /**
   * Should debugging UI be shown?
   */
  DEBUG_MODE: true,

  /**
   * Frames per second cap. Controls animation throttle.
   */
  FRAME_CAP: 60
};

4. utils.js — Utility Functions

/**
 * Clamp a number between min and max
 */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Ease-out cubic – good for blur and fade ramping
 */
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/**
 * Linear interpolation
 */
export const lerp = (start, end, t) => start + (end - start) * t;

/**
 * Maps a value from one range to another
 */
export const mapRange = (inMin, inMax, outMin, outMax, val) =>
  ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

This structure will ensure:

Low decision fatigue — everything predictable, separated, configurable.

Modularity — each file is responsible for one task.

Education — inline comments explain purpose and advantage of each function/setting.

AI-agent readiness — config can be read and acted on line-by-line.

Let me know when you'd like this structure turned into real code — ready to ship and test live.

