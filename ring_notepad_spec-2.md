# Ring‑Bound Landscape Notepad Scroll – **Comprehensive Specification**

Version **1.0** – 10 June 2025 – Author: ChatGPT (OpenAI o3) for **Alex Beck**

---

## 1. Vision & Goals

> *“Reproduce the tactile delight of flicking through a horizontal spiral notebook, delivered as a buttery‑smooth, GPU‑driven web experience that drops directly into Webflow.”*

### Success Criteria

- **Visual parity** with the 3‑D mock‑up (see Image Prompt).
- **60 FPS** on mid‑range mobile (iPhone 11 / Pixel 6).
- **Lighthouse Perf ≥ 95**, Accessibility ≥ 95.
- Accessible fallback when `prefers‑reduced‑motion: reduce` is detected.
- No flicker or positional jump when the page stack loops.
- Strictly modular, debug-safe, and optimised for minimal layout reflow.

---

## 2. Use‑Case Scenarios

| Actor                 | Motivation                      | Interaction Path                                     |
| --------------------- | ------------------------------- | ---------------------------------------------------- |
| Casual visitor        | Quickly browse visual portfolio | Scroll wheel → sequential flips at comfortable speed |
| Mobile viewer         | Skim on phone held sideways     | Rotate device (toast prompt) → swipe scroll          |
| Power user            | Jump through many pages fast    | Trackpad flick / keyboard Page Down / rapid taps     |
| Motion‑sensitive user | Avoid motion nausea             | OS setting reduce‑motion → cross‑fade animation      |

---

## 3. Information Architecture

### 3.1 DOM Contract (authoring‑time)

```html
<div class="notepad" data-pages="50">
  <div class="page" data-index="0">…</div>
  …
  <div class="page" data-index="49">…</div>
</div>
```

- `.notepad` is scroll container with fixed-position content; pages never flow vertically.
- `data-pages` drives page generation.
- `data-index` is optional; fallback is child index.

### 3.2 Dynamic Generation (no Webflow CMS)

Use **template literal strings** to avoid concatenation:

```js
pad.innerHTML = Array.from({length: 50}, (_, i) => `
  <div class="page" style="--i:${i};">Page ${i + 1}</div>
`).join("");
```

Avoid string building via `+=` or `innerHTML +=`.

---

## 4. Visual Design Guidelines (Aesthetic Spec)

| Layer                 | Details & Rationale                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canvas**            | Full‑bleed dark charcoal `#111`; provides high contrast and frames vivid page colours.                                                                                                                                                                                                                                                                              |
| **Grid**              | *Swiss‑style 12‑col modular grid*. Notebook spans 10 cols on ≥1440 px; auto‑full on smaller widths. 32 px outer gutter prevents aesthetic claustrophobia on ultrawide monitors.                                                                                                                                                                                     |
| **Typography**        | *Inter* variable font, optical sizes enabled.• Headline: `--step-5` ≈ 48/56 px.• Body: `--step-0` ≈ 18/28 px.Fluid‑type via `clamp()` for size‑in‑between breakpoints.                                                                                                                                                                                              |
| **Colour System**     | Define `--page-hue` per sheet. Default cool analogous range (210–260 hue). Use CSS OKLCH in 2025‑ready browsers for perceptual uniformity.                                                                                                                                                                                                                          |
| **Rings (Spiral)**    | Flex container of `<span class="ring">` children. Each ring uses inline SVG `<circle cx="5" cy="5" r="4" stroke-width="1.5" />`. Even stroke thickness at 90° rotation. Avoids border-radius flattening issue.                                                                                                                               |
| **Depth Cues**        | Each page offset by `translateZ(calc(-0.5px * var(--i)))` and `translateY(calc(-0.25px * var(--i)))`. Add `box-shadow: 0 2px 6px rgba(0,0,0,.12) inset` and `filter: drop-shadow(0 8px 24px rgba(0,0,0,.08))` when `rotateX` < 20° to simulate stack and curl.                                                                                                              |
| **Micro‑interaction** | Cursor changes `grab` → `grabbing`. On touch, trigger 15 ms haptic via `navigator.vibrate(15)`.

Pages must always:
- Maintain **16:9 aspect ratio**, regardless of screen.
- Stay **perfectly centred** in viewport via `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);`.
- Not scroll vertically—only **rotate** along the top edge.

---

## 5. Behavioural Specification

### 5.1 Motion Parameters

| Variable            | Purpose                            | Default     |
| ------------------- | ---------------------------------- | ----------- |
| `--rotate-max`      | End rotation                       | **-300deg** |
| `--fade-start`      | Rotation where fade begins         | **180deg**  |
| `--fade-end`        | Rotation where fade hits 0 opacity | **270deg**  |
| `--blur-max`        | Maximum Gaussian blur              | **10px**    |
| `--scroll-per-page` | Scroll delta to progress page 0→1  | **100vh**   |

### 5.2 Progress Calculation

```js
progress = clamp((scrollTop - index * pageH) / pageH, 0, 1);
rotation = progress * config.rotateMax;
```

*Use config object instead of magic numbers. Expose `config.js` with overrideable defaults.*

### 5.3 Snap Behaviour

- As scroll stops, each page evaluates its current rotation.
- If > midpoint threshold (e.g. 135°), auto-advance to 270°.
- If < threshold, animate back to 0°.
- Snap is handled in JS via `requestIdleCallback` and `requestAnimationFrame`.

### 5.4 Looping

- Seamless: when `scrollTop >= totalHeight`, subtract total.
- Prevent DOM reorder or flicker. Always update scroll offset only.

### 5.5 Debug & Config

- Enable `debug=true` flag.
- Console group: `init`, `renderFrame`, `loopReset`, `errorHandling`.
- Include floating debug overlay showing:
  - Current `scrollTop`
  - Page index in view
  - Current rotation value

---

## 6. Code Quality & Performance Principles

- **Avoid string concatenation** in HTML/JS generation. Use template literals.
- Use `requestAnimationFrame` for any scroll-dependent computation.
- Avoid main-thread work: `transform`, `opacity`, `filter` only.
- Use a **single animation loop**, don’t bind work to scroll events.
- Lazy-load media, pause hidden `<video>`s via IntersectionObserver.
- Use `config.js` file for:
  - Scroll sensitivity
  - Rotation ranges
  - Snap thresholds
  - Animation durations
- Modularise using ES6 imports where possible (`init.js`, `render.js`, `utils.js`, etc).
- Use try/catch blocks for `init()` and `render()` to log and gracefully fallback.
- Fallback: if any WebGL or GPU layer fails, hide `.page`, show message.

---

## 7. Updated Integration Summary

- All `.page` elements are **fixed-positioned**, stacked visually.
- Scrolling drives **only their rotation**, not vertical movement.
- Pages must be **16:9**, centred and non-cropped.
- The scroll mechanic controls **angle**, not pixel shift.

```css
.page {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotateX(var(--angle));
  aspect-ratio: 16/9;
  width: 80vw; max-width: 1280px;
  height: auto;
}
```

---

## 8. Summary

This spec now enforces:
- Best-practice JS hygiene
- Full separation of config, debug, and render logic
- Scroll as a driver of **rotation**, not position
- Pages centred, composited, and aspect-locked
- Developer tooling and fallback coverage

Let’s build something beautiful, performant, and easy to evolve.

Next: implement full code with `config.js`, `debug.js`, and modular `render.js`. Let me know when you're ready.

