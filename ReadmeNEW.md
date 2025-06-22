# Ring‑Bound Notepad – Project README (Release 1.1)

*Ship a tactile, accessible, 60 fps page‑flip notebook — production‑ready out of the box.*

---

## 1 · Quick Start

```bash
npm install            # install deps
npm run dev            # Vite dev server with HMR
npm run test           # Jest + Playwright + axe-core
npm run build && npm run preview   # production bundle + local server
```

The notebook appears at `localhost:5173`, resizes with the browser, and runs at 60 fps on any modern device.

---

## 2 · Core Goals

1. **Rigid hinge‑and‑drop** page flips — no curl, no `z-index`, no depth fights.
2. **Dynamic sizing** — pages always fill the notebook wrapper, regardless of viewport.
3. **Exact depth discipline** — 4 px per sheet, bottom unread at **Z = 5 px**, top unread at **Z = 801 px**.
4. **Performance & a11y** — 60 fps sustained, keyboard + screen‑reader support, axe‑core ≥ 98.
5. **Dev confidence** — validation, unit + e2e tests, GitHub Actions CI.

---

## 3 · Prerequisites

| Tool          | Version                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| **Node.js**   | ≥ 18                                                                                                   |
| **Browsers**  | Chrome 94+, Safari 15+, Firefox 94+, Edge 110+                                                         |
| **Bundler**   | Vite (pre‑configured)                                                                                  |
| **Polyfills** | `IntersectionObserver`, `ResizeObserver`, `Array.prototype.at` (auto‑injected via **core‑js** targets) |

---

## 4 · Design Tokens (src/style.css)

All visual constants live in CSS variables so designers can theme without touching JS.

```css
:root {
  /* colour */
  --page-front: #ffffff;
  --page-back:  #d1d1d1;
  --comment-bg: rgba(0,0,0,0.6);
  --comment-fg: #ffffff;
  --ground-shadow: rgba(0,0,0,0.15);

  /* spacing */
  --safe-zone: 50px; /* top ring area */
  --lift: 30px;      /* flip clearance */

  /* motion */
  --dur-flip: 600ms;
  --ease-in:  cubic-bezier(.55,.05,.67,.19);
  --ease-out: cubic-bezier(.25,.46,.45,.94);
}
```

Override in a theme file or via `prefers‑color‑scheme`.

---

## 5 · Configuration (src/config.js)

```js
export const CONFIG = {
  DEPTH: { spacing: 4, base: 5 }, // 5 … 801 px range
  SCENE: { perspective: 2500, origin: '60% 60%', padTilt: -5 },
  ANIMATION: { duration: 600, lift: 30, snapAt: 0.5 },
  PERFORMANCE: { targetFPS: 60, maxVisible: 15 }
};
```

---

## 6 · DOM Skeleton

```html
<div id="scene">
  <div id="notepad" tabindex="0" aria-label="Portfolio notebook">
    <div id="stack-unread" class="page-stack" aria-label="Unread pages"></div>
    <div id="stack-read"   class="page-stack" aria-label="Read pages"></div>
  </div>
</div>
```

---

## 7 · Responsive Sizing

```css
#scene { height: 100vh; display: grid; place-items: center; }
#notepad {
  max-width: 1600px;                       /* clamp ultra‑wide monitors */
  width: min(90vw, 80vh * 4/3);            /* maintain ≥4:3 but scale */
  aspect-ratio: 4 / 3;
  transform: rotateX(var(--pad-tilt, -5deg));
  transform-style: preserve-3d;
  position: relative; /* ground shadow */
}
#notepad::before {                         /* subtle desk shadow */
  content: "";
  position: absolute; inset: 6% -6% -6% 6%;
  background: var(--ground-shadow);
  filter: blur(40px);
  z-index: -1;                            /* below 3‑D context; ok because shadow is flat */
}
.page { width: 100%; height: 100%; }
```

---

## 8 · Depth Helpers (src/depth.js)

```js
import { CONFIG } from './config.js';
const { spacing: T, base: Z0 } = CONFIG.DEPTH;
export const zUnread = i => Z0 + i * T;   // 0‑199 → 5…801
export const zRead   = j => Z0 + j * T;   // read pile restarts at 5 px
```

---

## 9 · Page Component

```html
<article class="page" data-i="0" role="group" aria-label="Portfolio page 1">
  <div class="commentary" aria-live="polite"></div>
</article>
```

```css
.page {
  position: absolute;
  transform-origin: calc(100% - 7mm) 0 0;
  backface-visibility: visible;
  background: var(--page-front);
  will-change: transform;                /* set on‑demand */
  pointer-events: none;                  /* avoid accidental clicks */
}
.page.flipping { will-change: transform; }
.page::after {
  content: "";
  position: absolute; inset: 0;
  background: var(--page-back);
  transform: translateZ(-1px);
}
.commentary { /* unchanged from v1.0 */ }
```

---

## 10 · Virtual Scroll (src/scrollEngine.js)

- Mouse‑wheel / trackpad
- Touch‑drag (with kinetic inertia)
- **Arrow‑Left/Right** flip one page
- **Shift + Arrow** flip ten pages
- **Home / End** jump to first / last page
- **Space** autoplay demo
- **Esc** cancel autoplay & kinetic motion

All inputs funnel into `scroll.bump(delta)` and throttle via `requestAnimationFrame`.

---

## 11 · Flip Animation (src/render.js)

```js
import { CONFIG } from './config.js';
import { zUnread, zRead } from './depth.js';
const { duration, lift, snapAt } = CONFIG.ANIMATION;

export function flip(i) {
  const page = unreadPages[i];
  const targetIndex = readPages.length;

  // prevent double‑flips
  if (page.isFlipping) return;
  page.isFlipping = true;
  page.classList.add('flipping');

  const anim = page.animate([
    { offset:0, transform:`translateZ(${zUnread(i)}px) rotateY(0deg)` },
    { offset:snapAt, transform:`translateZ(${zUnread(i)+lift}px) rotateY(90deg)`, easing:'var(--ease-in)' },
    { offset:1, transform:`translateZ(${zRead(targetIndex)}px) rotateY(180deg)`, easing:'var(--ease-out)' }
  ], { duration, fill:'forwards' });

  anim.onfinish = () => {
    anim.commitStyles(); anim.cancel();          // GPU cleanup
    stackRead.append(page);
    readPages.push(page);
    page.isFlipping = false; page.classList.remove('flipping');
  };
}
```

---

## 12 · Error Handling

| Scenario                             | Behaviour                                                        |
| ------------------------------------ | ---------------------------------------------------------------- |
| **JSON schema fail**                 | Toast + fallback demo chapter; main UI still interactive.        |
| **Slow device (< 55 fps)**           | Auto‑disable desk shadow & commentary fade‑ins; keep page flips. |
| **Unhandled promise / module error** | Fallback error screen with reload button.                        |

---

## 13 · Commentary System

- Commentary hydrated on first viewport entry (IntersectionObserver).
- Live‑region announces title only **after** page settles to avoid chatter.
- **N** toggles Notes‑mode (commentary persists on read pile).

---

## 14 · Accessibility

| Action        | Shortcut                 |
| ------------- | ------------------------ |
| Next / Prev   | Arrow‑Right / Arrow‑Left |
| Skip 10       | Shift + Arrow            |
| First / Last  | Home / End               |
| Autoplay      | Space (toggle)           |
| Cancel motion | Esc                      |

Focus ring styles adapt to system `prefers‑contrast`.

---

## 15 · Testing & Validation

### Automated (`npm run test`)

| Test         | Criteria                                |
| ------------ | --------------------------------------- |
| Frame time   | avg < 16.7 ms over 5 s scroll           |
| Memory       | heap < 100 MB after 600 flips           |
| Depth audit  | bottom unread 5 px, top unread 801 px   |
| Keyboard nav | all shortcuts work & focus ring visible |
| axe‑core     | score ≥ 98                              |

### Manual QA

-

---

## 16 · Continuous Integration

`.github/workflows/ci.yml` ensures schema validation, unit & e2e tests, and axe‑core pass on every push.

---

## 17 · File Map

```
src/
├── config.js           # tokens & numeric constants
├── depth.js            # z‑helpers
├── scrollEngine.js     # input driver + inertia
├── render.js           # flip logic + rAF loop
├── commentary.js       # notes‑mode + live region
├── a11y.js             # keyboard helpers
├── performance.js      # FPS monitor + degradation toggle
├── portfolioLoader.js  # JSON → pages
├── style.css           # core + themes + shadow
└── assets/portfolio-pages/
```

---

Follow this README verbatim and the notebook will adapt to any viewport, flip at 60 fps, validate content automatically, and pass CI on the first push. **Enjoy page‑turning perfection — with zero **``** dramas.**

