# Scroll-Driven Notepad/Portfolio Effect Documentation

## Overview

This document describes the technical implementation of a scroll-driven, 3D notepad/portfolio effect that simulates flipping through pages in a realistic, animated stack. The effect is achieved using continuous scroll detection, 3D CSS transforms, dynamic opacity, blur, and shadow overlays, and direct DOM manipulation for high performance.

## Architecture

### File Structure
```
src/
├── app.js            // Main entry point, orchestrates modules
├── config.js         // Centralized animation and visual settings
├── render.js         // Core rendering logic: 3D transforms, opacity, blur, shadow
├── scrollEngine.js   // Handles scroll/touch input, manages scroll state
├── style.css         // 3D/CSS visual styles, page backgrounds, rings
├── infiniteLoop.js   // Infinite page cycling logic (optional)
├── utils.js          // Math helpers, easing functions
├── assets/portfolio-pages/Deck XX.jpg // Page images
```

### Main Data Flow
```
User Input (scroll/touch)
  → scrollEngine.js (virtual scroll state)
    → render.js (calculates 3D transforms, opacity, blur, shadow)
      → style.css (applies visual styles)
```

## Core Functionality

### 1. Scroll Detection & State
- **Virtual Scroll:** Maintains a floating-point scroll value (e.g., 2.5 = halfway through flipping page 2).
- **Input Normalization:** Mouse wheel and touch events are converted to the same scroll state.
- **Snapping:** When scrolling stops, the system animates to the nearest page using configurable easing and duration.
- **Infinite Loop (optional):** Pages can cycle seamlessly if enabled in config.

#### Example (from `scrollEngine.js`):
```js
// Get current scroll state
export function getState() {
  const page = Math.floor(scroll);
  const progress = scroll - page;
  return {
    scroll,      // Raw scroll value
    page,        // Current page index
    progress,    // Flip progress (0-1)
    rotation: progress * PAGE_ANIMATION.flip.maxAngle,
    totalPages
  };
}
```

### 2. 3D Page Stack & Flipping Logic
- **Continuous Position:** Each page's appearance is a function of its float-based position in the stack.
- **Relative Position:** For each page, `rel = pageIndex - scroll` (or calculated for infinite loop).
- **Stacked Pages:** Pages behind the current one are stacked with decreasing opacity and increasing Z/Y offset.
- **Flipping Page:** The top page rotates around the X axis, with dead zone (stick) before rotation starts.
- **Hidden Pages:** Pages outside the visible range are hidden for performance.

#### Example (from `render.js`):
```js
for (let i = 0; i < pageCount; i++) {
  // ...
  let rel = i - scroll; // or infinite loop calculation
  // ...
  // 3D transform
  page.style.transform = `translate3d(0, ${y}px, ${z}px) rotateX(${angle}deg)`;
  page.style.opacity = opacity;
  page.style.filter = `blur(${blur}px)`;
  // ...
}
```

### 3. Visual Effects
- **Opacity Fade:** As a page rotates past a certain angle, it fades out (configurable start/end angles).
- **Motion Blur:** Blur increases as the page rotates edge-on.
- **Backface Fading:** The back of a page fades in with configurable opacity and blur as it rotates past 90°.
- **Dynamic Shadow Overlay:** Pages underneath a flipping page receive a shadow that fades as the page above rotates.
- **CSS Variables:** All effects are controlled via CSS custom properties, updated by JS.

#### Example (from `render.js`):
```js
if (angle > flip.fadeStart) {
  opacity = mapRange(flip.fadeStart, flip.fadeEnd, 1, 0, angle);
  blur = mapRange(flip.fadeStart, flip.fadeEnd, 0, flip.blurMax, angle);
}
if (angle > PAGE_ANIMATION.backface.fadeStartAngle) {
  backfaceAlpha = mapRange(
    PAGE_ANIMATION.backface.fadeStartAngle,
    PAGE_ANIMATION.backface.fadeEndAngle,
    PAGE_ANIMATION.backface.startOpacity,
    PAGE_ANIMATION.backface.endOpacity,
    angle
  );
  backfaceBlur = backfaceAlpha * 4;
}
```

### 4. 3D CSS & DOM Structure
- **Perspective:** The main container uses `perspective: 1500px;` and `transform-style: preserve-3d`.
- **Page Elements:** Each `.page` is absolutely positioned, with a `.page-content` child for the image.
- **Rings:** The `.rings` container is positioned in 3D space between the top and bottom of the stack.
- **Pseudo-elements:** `::before` and `::after` on `.page` create backface and shadow overlays.

#### Example (from `style.css`):
```css
#notepad {
  perspective: 1500px;
  perspective-origin: 50% 0%;
  transform-style: preserve-3d;
}
.page {
  position: absolute;
  width: 100%; height: 100%;
  transform-origin: var(--page-rotation-origin-x) var(--page-rotation-origin-y);
  transform-style: preserve-3d;
  will-change: transform, opacity, filter;
}
.page-content {
  background-image: url('assets/portfolio-pages/Deck XX.jpg');
  backface-visibility: hidden;
}
.page::before { /* Backface fade */ }
.page::after { /* Shadow overlay */ }
```

### 5. Configuration & Customization
- All animation parameters (angles, durations, depths, fade/blur/shadow settings, infinite loop, etc.) are centralized in `config.js` under `PAGE_ANIMATION`.
- Page backgrounds are set via CSS selectors using `data-deck-number` attributes.

#### Example (from `config.js`):
```js
export const PAGE_ANIMATION = {
  stack: {
    visibleDepth: 7,
    depthUnit: 10,
    startZ: -100,
    startY: 400,
    opacityFade: [7, 3],
    stickPixels: 10,
  },
  flip: {
    readyZ: 0,
    readyY: 0,
    startRotationX: -30,
    readyRotationX: 4,
    maxAngle: 270,
    fadeStart: 200,
    fadeEnd: 270,
    blurMax: 7,
    rotationOriginX: '100%',
    rotationOriginY: '-1%',
    easing: easeInOutExpo,
    speed: 400,
  },
  // ...
};
```

## Mathematical Formulas

- **Relative Position:**
  - `rel = pageIndex - scroll` (or infinite loop calculation)
- **Opacity Fade:**
  - `opacity = mapRange(fadeStart, fadeEnd, 1, 0, angle)`
- **Shadow Overlay:**
  - `shadowOverlay = mapRange(shadow.fadeStartAngle, shadow.fadeEndAngle, shadow.maxOpacity, 0, pageAboveAngle)`
- **Backface Alpha:**
  - `backfaceAlpha = mapRange(backface.fadeStartAngle, backface.fadeEndAngle, startOpacity, endOpacity, angle)`

## Visual Structure

- **Main Container:** `#notepad` (3D stage)
- **Pages:** `.page[data-deck-number] > .page-content` (background image)
- **Rings:** `.rings > .ring` (SVG ellipses, positioned in 3D)
- **Pseudo-elements:** `.page::before` (backface), `.page::after` (shadow)

## Performance Optimizations
- Only visible pages are rendered; hidden pages are set to `display: none`.
- All transforms and opacity/blur are hardware-accelerated.
- Passive event listeners for scroll/touch.
- Animation frame throttling and FPS cap in config.

## Customization
- **Page Images:** Add or remove `.page[data-deck-number]` elements in HTML and corresponding images in `assets/portfolio-pages/`.
- **Animation Feel:** Adjust parameters in `config.js` (`PAGE_ANIMATION`).
- **Visual Style:** Edit `style.css` for backgrounds, rings, shadows, etc.

## Conclusion

This scroll-driven notepad/portfolio effect is a high-performance, visually rich 3D animation system. It leverages continuous scroll, 3D CSS transforms, dynamic opacity/blur/shadow, and modular configuration to create a realistic flipping experience. The implementation is pure JS/CSS, with no React or component framework, and is fully customizable via config and CSS.