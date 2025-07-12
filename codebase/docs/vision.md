# Vision: A Living Notebook

### Beyond Pixels
Imagine the glass of the browser dissolving away. Before you floats a ring-bound notebook, occupying real 3D space. When you drag two fingers across your trackpad, you aren't just scrolling a web page—you are exerting physical force on a tangible object. You feel the heavy cardstock resist, you see the sheet lift and bend over the metal rings, and you hear a muted *thump* as it settles onto the stack. Every interaction is a direct, immediate, and predictable conversation between you and the object.

This document codifies the principles that transform a collection of DOM elements into this living notebook. It is our constitution for animation, interaction, and sensory feedback.

---

## 1. Transfer of Force
**Core Idea:** The user is the sole source of energy in the system. The notebook's components only move when the user is actively providing input. There is no artificial momentum, easing, or inertia that continues after the user stops. The connection is direct and absolute.

**Implementation Rules:**
*   **Direct Mapping:** User input (e.g., `wheel.deltaY`, `touch.movementY`) must map linearly to an element's primary property (e.g., `page.rotation`, `scroll.position`). Avoid `lerp` or `smoothing` functions on active input.
*   **No Coasting:** Momentum-based scrolling or "coasting" after a mouse flick or touch release is forbidden. The instant the input stream stops, the object stops moving.
*   **Stateful Release:** The *only* animation permitted after user input ceases is a "settling" action driven by physics (like gravity). This is not momentum; it is the object returning to a stable state from an unstable one created by the user.

**Code Example:**
```javascript
// BAD: Artificial easing applied during user input
function onWheel(event) {
  // This creates a "laggy" or "damped" feeling.
  this.targetScroll = this.scrollPosition + event.deltaY;
}
function update() {
  // The user feels disconnected from the result.
  this.scrollPosition = lerp(this.scrollPosition, this.targetScroll, 0.1);
  requestAnimationFrame(update);
}

// GOOD: Direct 1:1 transfer of force
function onWheel(event) {
  // Input directly manipulates the property. The effect is immediate.
  this.scrollPosition += event.deltaY * SCROLL_SENSITIVITY;
  
  // If the user stops, this function isn't called, and movement ceases.
  // A separate 'onWheelEnd' event can then trigger the gravity fall.
  this.render(); 
}
```

---

## 2. Real Materiality
**Core Idea:** Elements are not flat planes; they are objects with mass, thickness, and texture. Their visual representation and behavior must consistently reflect these physical properties.

**Implementation Rules:**
*   **Mass & Thickness:** Define physical properties in a config (e.g., `PAGE_GSM = 150`, `COVER_THICKNESS = '2mm'`). Use helper functions to translate these into usable animation values like mass, inertia, and lift height.
*   **Hierarchical Lighting:** A single, global light source should govern all shadows and highlights. An object's `z-index` and `transform: translateZ` determine how it is lit and how it casts shadows on objects behind it. Avoid fake, baked-in shadows.
*   **Texture Presence:** Use subtle, looping noise or texture overlays (`background-image` with `background-blend-mode`) to give surfaces a tactile feel. A perfectly clean `#DDD` color is a digital artifact; a textured `#DDD` feels like paper.

**Code Example:**```javascript
// BAD: Magic numbers with no physical basis
const LIFT_HEIGHT = 60; // Why 60? What does it represent?

// GOOD: Derived from "real" properties
const PAGE_GSM = 150; // grams per square meter
const PAGE_AREA = 0.06237; // m^2 (A4)
const PAGE_THICKNESS_MM = 0.18;

function getPageLiftHeight(gsm) {
  // Heavier paper is stiffer and lifts higher.
  // The formula can be tuned, but it's based on a real-world property.
  const baseLift = 20; // px
  const stiffnessFactor = (gsm / 80); // 80gsm is standard paper
  return baseLift * stiffnessFactor;
}

const LIFT_HEIGHT = getPageLiftHeight(PAGE_GSM);
```

---

## 3. Predictable Time
**Core Idea:** Time is a constant. Animations should not feel arbitrarily fast or slow based on device performance. Their duration should be predictable and, where possible, derived from physical laws rather than magic numbers.

**Implementation Rules:**
*   **Delta-Time (dt) Everywhere:** All `requestAnimationFrame` loops must be time-based, not frame-based. Calculate the time elapsed since the last frame (`dt`) and use it to scale all movement and state changes. This ensures animations run at the same real-world speed on a 30Hz phone and a 144Hz monitor.
*   **Physics, Not Curves:** Instead of `ease-in-out` for 350ms, define a page's mass and a gravity value. The time it takes to fall is then a *result* of a physics simulation, not a pre-defined duration. This aligns with "Real Materiality."
*   **Instantaneous Feedback:** User-initiated actions that are not animations (e.g., clicks, toggles) must result in an instantaneous state change (`dt` does not apply). The user's action and the system's reaction should feel like a single event.

**Code Example:**
```javascript
// BAD: Frame-rate dependent animation
let rotation = 0;
function animate() {
  rotation += 1; // Will be 2x faster at 60fps than 30fps
  element.style.transform = `rotate(${rotation}deg)`;
  requestAnimationFrame(animate);
}

// GOOD: Delta-time based animation
let rotation = 0;
let lastTime = 0;
const ROTATION_SPEED = 60; // degrees per second

function animate(time) {
  if (!lastTime) lastTime = time;
  const dt = (time - lastTime) / 1000; // delta-time in seconds
  
  rotation += ROTATION_SPEED * dt; // Same speed on all devices
  element.style.transform = `rotate(${rotation}deg)`;
  
  lastTime = time;
  requestAnimationFrame(animate);
}
```

---

## 4. Sensory Minimalism
**Core Idea:** Every sound and haptic cue must have a purpose. It should confirm an action or signal a state change that has a clear physical analog. We avoid decorative sounds or effects that add noise without adding information.

**Implementation Rules:**
*   **One-Shot Sounds:** Sounds should be short, one-shot triggers tied to discrete events (e.g., page landing, lock engaging). Avoid continuous loops (e.g., paper rustling during a drag) as they are difficult to sync and often feel artificial.
*   **Sound Confirms Action:** Play sounds *after* an action completes, not during. The "click" of a page landing confirms it has settled. The "thud" of a lock closing confirms it is secure.
*   **No UI Chrome Sound:** Do not play sounds for interacting with standard UI elements like toggles or buttons unless they are direct analogs of a physical control on the notebook itself. The experience is the notebook, not a digital interface layered on top of it.

**Code Example:**
```javascript
// BAD: Sound is disconnected from the physical event
function onScroll(event) {
  // Playing a continuous 'whoosh' is hard to sync and sounds fake.
  audio.play('rustle-loop'); 
}

// GOOD: Sound confirms a discrete physical event
function onPageLanded(pageIndex) {
  // A single, clean 'thump' when the page hits the stack.
  audio.play('page-settle');
}

// In ScrollEngine, after a snap or physics settle completes:
this.isSnapping = false;
this.onPageLanded(this.targetPage); // Triggers the sound
``` 

---

## 5. Accessibility for All
**Core Idea:** The tactile, physical metaphor must not come at the cost of exclusion. The notebook should be as usable and intelligible to a person using a screen reader or keyboard as it is to a person using a mouse on a 4K display. Our implementation must be universally accessible.

**Implementation Rules:**
*   **Full Keyboard Navigability:** All core interactions must map to the keyboard. For example, `ArrowLeft`/`ArrowRight` to flip pages, `ArrowUp`/`ArrowDown` to scroll content within a page, and `Spacebar`/`PageDown` to advance to the next page.
*   **Screen-Reader Clarity:** Use ARIA roles and attributes to describe the state of the notebook. A container with `aria-live="polite"` should announce page turns (e.g., "Page 4 of 128"). Pages should have `role="article"`, and interactive elements must have descriptive `aria-label`s.
*   **Respect for User Preferences:** The `(prefers-reduced-motion: reduce)` media query must be honored. When active, all physics-based animations (settling, bending) should be replaced with simple, direct fades or instant transitions to avoid vestibular triggers.

---

## 6. Performance as a Feature
**Core Idea:** The illusion of physicality is fragile. It is shattered by dropped frames, input lag, or jank. Performance is not an optimization pass; it is a fundamental feature that enables the entire experience to feel real.

**Implementation Rules:**
*   **Strict Frame Budget:** Target a consistent 60fps (a budget of 16.7ms per frame) on primary devices. On secondary devices, 30fps is the minimum acceptable floor.
*   **Memory & Resource Limits:** Define and enforce budgets for DOM nodes per page and total texture memory. Implement virtualisation, lazy-loading textures as they approach the viewport and aggressively releasing them when they are out of view.
*   **Instrument and Measure:** Integrate the `PerformanceObserver` API to log long tasks, and create telemetry hooks to report dropped frames and interaction latency in production. We cannot improve what we do not measure.

---

## 7. Responsive & Cross-Device Reality
**Core Idea:** A notebook is still a notebook, whether it's viewed on a phone or a wall-sized monitor. The physics and feel should scale, but the core identity must remain intact.

**Implementation Rules:**
*   **Input-Aware Interactions:** Differentiate between input types. A `touch` event offers direct manipulation, a `wheel` event implies rate-based scrolling, and a `stylus` can offer pressure data. Tune sensitivity and response curves for each.
*   **Viewport-Relative Physics:** Key physical parameters like page lift height and shadow depth must adapt to the viewport. A page lifting 50px feels dramatic on a phone but is barely noticeable on a large desktop; these values should be expressed in viewport units (`vh`, `vw`) or be dynamically calculated.

---

## 8. Theming & Customization
**Core Idea:** The notebook is not a single, static object but a template for many possible notebooks. The underlying system should be flexible enough to support radical changes in appearance and material properties.

**Implementation Rules:**
*   **Physicality as Design Tokens:** Abstract physical properties into design tokens. `PAGE_GSM` becomes `--page-stiffness`, cover material becomes `--cover-texture-url`. This allows designers to modify the notebook's feel without touching JavaScript.
*   **Config-Driven Themes:** A single theme object should define the entire aesthetic. Switching from a `'spiral-notebook'` theme to a `'leather-journal'` theme should be a one-line change that swaps out textures, fonts, ring models, and even physics constants.

---

## 9. A Robust Physics Layer
**Core Idea:** The physics engine is the heart of the experience. It must be predictable, testable, and debuggable. Its behavior should be governed by explicit states and verifiable rules, not emergent complexity.

**Implementation Rules:**
*   **Explicit State Machine:** Model all interactions (e.g., `idle`, `dragging`, `settling`, `snapping`) as a Finite State Machine. This prevents invalid state transitions and makes the logic of the interaction model transparent and debuggable.
*   **Testable Physics Core:** The physics calculations (gravity, spring forces, inertia) should be pure functions, completely decoupled from the DOM. This allows for unit tests that assert, for instance, that a page with `mass: 2` falls twice as fast as a page with `mass: 1`.
*   **Systematic Tuning:** Follow a clear process for tuning physical parameters. Start with values derived from real-world measurements, then adjust methodically to achieve the desired user experience.

---

## 10. Graceful Degradation & Fallbacks
**Core Idea:** Not all users will have a high-end device or a modern browser. The experience should degrade gracefully, preserving core functionality even if the rich physical simulation is not possible.

**Implementation Rules:**
*   **Simplified Fallback Mode:** On load, perform feature detection. If key APIs like `transform-style: preserve-3d` or high-precision `requestAnimationFrame` are absent, the application should automatically switch to a "Simplified Mode." This mode would be a standard, flat, 2D scrolling experience with no physics.
*   **Performance-Based Degradation:** For users on capable browsers but low-spec hardware, the application can run a brief performance benchmark on load. If the device fails to hold a minimum frame rate, it can offer to switch to the Simplified Mode.

---

## 11. State Persistence & Sensory Synchronization
**Core Idea:** The notebook is a persistent object. It should remember where you left off, and its state should be shareable. Its sensory feedback must be perfectly timed with its physical state.

**Implementation Rules:**
*   **URL-Based State:** The current page should always be reflected in the URL (e.g., using a hash: `.../portfolio#page/12`). This allows for deep linking and sharing.
*   **Session Restoration:** The user's scroll position should be saved to `localStorage` on unload and restored on the next visit, allowing them to seamlessly continue where they left off.
*   **Synchronized Feedback:** Sensory feedback must have low latency. Audio cues should fire within 50ms of the event they represent. Haptic feedback (via `navigator.vibrate()`) should be precisely timed to user actions like a page snapping into place.

---

## 12. Developer Ergonomics & API Design
**Core Idea:** This vision can only be executed by a team of developers. The system's internal structure must be as well-crafted as the user-facing experience, with clear APIs and extension points.

**Implementation Rules:**
*   **A Public API:** Expose a clean, well-documented public interface for controlling the notebook. Methods like `notebook.goToPage(n)`, `notebook.next()`, and events like `notebook.on('pageTurn', callback)` should be the primary way application logic interacts with the view.
*   **Extensible via Plugins:** Design a simple plugin system. A plugin should be able to hook into the notebook's lifecycle to add new functionality (like bookmarks or annotations) without modifying the core engine.

---

## 13. Performance-First Code Patterns
**Core Idea:** Performance is built from the ground up, at the line-by-line level. Code examples and established patterns must reinforce best practices to prevent performance bottlenecks before they are created.

**Implementation Rules:**
*   **Batch DOM Read/Write:** All DOM manipulations must be batched within a `requestAnimationFrame` callback. Perform all DOM reads first, then perform all DOM writes. This avoids layout thrashing and is non-negotiable.
*   **Promote to Composite Layer:** For elements that animate frequently (like pages), use `transform: translateZ(0)` or `will-change: transform` to promote them to their own compositor layer, preventing costly repaints of the entire scene.
*   **Lazy Loading and Cleanup:** Load expensive resources like high-resolution images or video textures only when they are about to become visible. Crucially, explicitly unregister event listeners and release object references when a page or component is destroyed to prevent memory leaks.

**Code Example (DOM Batching):**
```javascript
// BAD: Interleaving reads and writes causes layout thrashing
function updatePositions(elements) {
  elements.forEach(el => {
    const top = el.offsetTop; // READ
    el.style.top = (top + 1) + 'px'; // WRITE
  });
}

// GOOD: Batching reads and writes with requestAnimationFrame
function updatePositions(elements) {
  requestAnimationFrame(() => {
    // 1. First, read all the values
    const tops = elements.map(el => el.offsetTop);
    
    // 2. Then, write all the changes
    elements.forEach((el, i) => {
      el.style.top = (tops[i] + 1) + 'px';
    });
  });
}
``` 
