Ring-Bound Notepad – CURRENT STACKING & FLIPPING MODEL
======================================================

1. Scene & Coordinate System
----------------------------
• CSS perspective context is applied to the notebook wrapper:
  – Perspective distance `P = 2500px` (`--perspective-distance`).  
  – Origin: `50% × 30%` (centre-top third).

• We treat the viewer as looking straight down the negative Z axis:  
  – **+Z** → toward the camera (nearer).  
  – **–Z** → away from the camera (farther).

• Pages live in a single DOM stack (`#notepad-inner`) with
  `transform-style: preserve-3d`. **No element has a `z-index`.**

2. Page Geometry & Transform Origins
------------------------------------
Every page/cover uses:

```css
transform-origin: 50% -1%;
```

…so pages hinge right above the line of ring-holes.

3. Static Depth Layout (Flat Pages)
-----------------------------------
Let

```
N  = totalPages
T  = pageThickness (4px)
i  = pageIndex (0 … N-1)
cp = currentPage = floor(scroll)
```

```js
if (i < cp) {            // already flipped → read stack (right side)
  depthBase = 1 + i * T;
} else {                 // not yet flipped → unread stack (left side)
  depthBase = (N - i) * T;
}
```

*Example with `N = 73`, `T = 4`:*

| Stack          | Top sheet Z | Next sheet | … | Bottom sheet |
| -------------- | ----------- | ---------- | - | ------------- |
| Unread (left)  | 292px       | 288px      | … | 4px           |
| Read (right)   | 1px         | 5px        | … | grows upward  |

4. Dynamic Flip Motion
----------------------
```
rel       = scrollPosition - i          // -∞ … +∞
rotation  = clamp(rel * 180°, 0°, 180°)
progress  = rotation / 180             // 0 → 1

lift      = sin(progress * π) * 50px          // arc clearance
sag       = -lift * 0.3                       // gravity drop
Y         = (rotation === 0° || 180°) ? 0 : sag;

Z = depthBase + lift;
scaleComp = (P - Z) / P;                     // perspective compensation

transform = `translateZ(${Z}px) translateY(${Y}px)
             rotateX(${rotation}deg) scale(${scaleComp})`;
```

5. Perspective Compensation
---------------------------
Because elements nearer than the perspective distance appear larger, we
apply the inverse scale `((P - Z) / P)` so every page keeps identical
perceived size regardless of depth.

6. Render Pipeline Overview
---------------------------
1. **VirtualScrollEngine** emits `{scroll}` every frame.  
2. For each visible page `i` → `computeTransform(i, scroll, N)`.  
3. The returned string is written to `element.style.transform`.  
4. No per-frame `z-index` or DOM queries.

7. Known Visual Issues
----------------------
*Flip origin anomaly* – the sheet visually on top at rest does **not**
become the rotating sheet; instead the one underneath flips. Likely an
off-by-one around `currentPage = floor(scroll)`.

*Perceived shrinking pile* – even with compensation, the left (unread)
stack is closer to the camera, so the right stack feels smaller.

8. Key Tunables (config.js)
---------------------------
| Key | Current | Notes |
| --- | ------- | ----- |
| `SCENE.perspective` | 2500px | P value used in compensation |
| `LAYOUT.pageThickness` | 4px | Stack spacing T |
| `ANIMATION.liftHeight` | 50px | Max arc height |
| `ANIMATION.gravityFactor` | 0.3 | Sag multiplier |

9. Next Investigation Steps
---------------------------
1. Validate that `currentPage` truly maps to the **top unread sheet**; may
   need `Math.round(scroll)` or `ceil`.
2. Experiment with reversing stack polarity (unread behind origin, read
   in front) for more intuitive depth.
3. If size disparity persists, adjust perspective origin/distance instead
   of scale compensation. 