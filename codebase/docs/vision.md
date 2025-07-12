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

**Code Example:**
```javascript
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