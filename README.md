# 3D Ring-Bound Notebook Portfolio

## 🎯 What This Is

This is a **3D notebook simulation** that looks and behaves like a real reporter's notebook. When you scroll, pages flip over the top edge and land on a growing pile that moves toward the camera. Each page flip follows realistic physics with a lift-and-drop motion.

**Live Demo:** [Your Portfolio URL Here]

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

The notebook loads portfolio content from `data/portfolio.json` and creates 3D pages that you can flip through by scrolling, using arrow keys, or swiping on mobile.

---

## 🎮 How It Works (For Junior Developers)

### The Big Picture

Think of this like a real notebook:
- **Unread pages** start in a stack (bottom page at Z=5px, each page 4px higher)
- When you **scroll**, the top page flips over the top edge
- **Flipped pages** land on a growing pile that gets closer to the camera
- Each flip takes 600ms and follows realistic physics

### Key Concept: Z-Depth Stacking

Instead of using CSS `z-index`, we use `translateZ()` to create real 3D depth:

```javascript
// Bottom unread page
translateZ(5px)    // Farthest from camera

// Next unread page  
translateZ(9px)    // 4px closer

// Top unread page
translateZ(801px)  // Closest unread (for 200 pages)

// First flipped page lands at
translateZ(805px)  // Even closer to camera!
```

---

## 🔧 System Architecture

### 1. **Page Container** (`src/index.html`)

All pages live in a single `.page-stack` container within the notebook:

```html
<div id="notebook" class="notebook-inner">
  <div class="page-stack" id="page-stack">
    <div class="page">Page 1</div>
    <div class="page">Page 2</div>
    <!-- ... all pages ... -->
  </div>
</div>
```

**Why this structure?** The `#notebook` container provides the 3D perspective context, while the `page-stack` keeps all pages in the same 3D space so depth calculations work correctly.

### 2. **Depth System** (`src/pageTransforms.js`)

This is the heart of the 3D effect:

```javascript
// Every unread page gets a Z position
function getUnreadDepth(pageIndex, totalPages) {
  const indexFromBottom = totalPages - 1 - pageIndex;
  return 5 + indexFromBottom * 4;  // 5px base + 4px per page
}

// Track where the next flipped page should land
let nextLandingZ = 805; // Starts above highest unread page

// When a page flips, it lands here, then nextLandingZ += 4
```

### 3. **Scroll Engine** (`src/scrollEngine.js`)

Converts scroll wheel/touch into fractional page positions:

```javascript
// Scroll position can be fractional
scrollPosition = 1.5  // Halfway through flipping page 1

// Each integer step = one complete page flip
scrollPosition = 2.0  // Page 1 fully flipped, page 2 starting
```

### 4. **Flip Animation** (`src/pageTransforms.js`)

Each page flip has 2 phases:

```javascript
if (progress <= 0.5) {
  // Phase 1: Lift & hinge (0% → 50%)
  const z = restingZ + (30 * progress * 2);     // Lift 30px
  const rotX = 90 * progress * 2;               // Rotate 0° → 90°
  return `translateZ(${z}px) rotateX(${rotX}deg)`;
  
} else {
  // Phase 2: Drop & settle (50% → 100%)  
  const z = liftedZ + (targetZ - liftedZ) * progressInPhase;
  const rotX = 90 + (90 * progressInPhase);     // Rotate 90° → 180°
  return `translateZ(${z}px) rotateX(${rotX}deg)`;
}
```

### 5. **Page Styling** (`src/style.css`)

Pages have two sides:

```css
.page {
  /* Front side: light grey paper */
  background-color: #f5f5f5;
  transform-origin: 50% 0 0;  /* Hinge on top edge */
  backface-visibility: visible;
}

.page::after {
  /* Back side: darker grey, only visible when flipped */
  background: #888888;
  transform: rotateY(180deg) translateZ(-1px);
}
```

---

## 📁 File Structure & What Each Does

```
src/
├── config.js              # 🎛️  All settings (depths, timing, etc.)
├── app.js                 # 🎬  Main app orchestrator  
├── pageTransforms.js      # 🎯  3D math & flip calculations
├── scrollEngine.js        # 🎮  Handle scroll/touch input
├── render.js              # 🎨  Apply transforms to DOM
├── portfolioLoader.js     # 📄  Generate pages from JSON
├── style.css              # 💄  3D styling & page appearance
└── index.html             # 🏠  Page structure

data/
└── portfolio.json         # 📋  Content source of truth
```

### Key Files Explained

#### `config.js` - The Control Panel
```javascript
export const GLOBAL_CONFIG = {
  DEPTH: {
    bottomUnreadZ: 5,     // Bottom page starts here
    spacingZ: 4,          // Each page 4px higher  
    liftHeight: 30,       // How high pages lift during flip
  },
  ANIMATION: {
    duration: 600,        // 600ms per flip
    easing: {
      liftHinge: 'cubic-bezier(.55,.05,.67,.19)',   // 0→50% easing
      dropSettle: 'cubic-bezier(.25,.46,.45,.94)'   // 50→100% easing
    }
  }
};
```

#### `pageTransforms.js` - The 3D Math
```javascript
// Main function: given a page index and scroll position, 
// return the 3D transform string
export function computeTransform(pageIndex, scrollPosition, totalPages) {
  const rel = scrollPosition - pageIndex;
  
  if (rel >= 0 && rel <= 1) {
    // This page is currently flipping
    return computeFlipTransform(pageIndex, rel, totalPages);
  } else if (rel < 0) {
    // Page not reached yet - in unread stack
    const z = getUnreadDepth(pageIndex, totalPages);
    return `translateZ(${z}px) rotateX(0deg)`;
  } else {
    // Page already flipped - in read stack  
    const z = calculateFlippedDepth(rel);
    return `translateZ(${z}px) rotateX(180deg)`;
  }
}
```

#### `scrollEngine.js` - Input Handler
```javascript
class VirtualScrollEngine {
  updateScrollPosition(delta) {
    // Convert mouse wheel/touch into scroll position
    this.scrollPosition += delta * this.scrollSensitivity;
    
    // Keep in bounds [0, maxPages-1]
    this.scrollPosition = Math.max(0, Math.min(this.maxPages - 1, this.scrollPosition));
    
    // Tell everyone about the change
    this.notifyObservers(this.scrollPosition);
  }
}
```

#### `render.js` - Apply to DOM
```javascript
export function render(pages, scrollState) {
  const { scroll, totalPages } = scrollState;
  
  pages.forEach((page, i) => {
    // Calculate 3D transform for this page
    const transform = computeTransform(i, scroll, totalPages);
    
    // Apply to DOM
    page.style.transform = transform;
  });
}
```

---

## 🎮 User Controls

| Input | Action |
|-------|--------|
| **Mouse wheel** | Scroll through pages |
| **Touch drag** | Swipe to flip pages (mobile) |
| **Arrow keys** ← → | Flip one page |
| **Shift + Arrow** | Flip 10 pages |
| **Home / End** | Jump to first/last page |

---

## 📋 Content Management

### Portfolio JSON Structure
```json
{
  "projects": [
    {
      "id": "chapter-1",
      "title": "Project Name",
      "pages": [
        {
          "asset": "chapter-1-1.jpg",
          "type": "image",
          "commentary": "Description of this page"
        }
      ]
    }
  ]
}
```

### Asset Organization
```
src/assets/portfolio-pages/
├── chapter-1/
│   ├── chapter-1-1.jpg
│   ├── chapter-1-2.jpg
│   └── chapter-1-3.mp4
├── chapter-2/
│   └── chapter-2-1.jpg
```

### Adding New Content

1. **Add images/videos** to `src/assets/portfolio-pages/chapter-X/`
2. **Update JSON** in `data/portfolio.json`:
   ```json
   {
     "asset": "chapter-1-4.jpg",
     "type": "image",
     "commentary": "New page description"
   }
   ```
3. **Restart dev server** - pages auto-generate from JSON

---

## 🎯 The Physics Explained

### Why This Feels Real

1. **Top-edge hinge**: `transform-origin: 50% 0 0` makes pages flip over the top
2. **Arc motion**: Pages lift 30px during flip (like real paper flexibility)  
3. **Two-phase animation**: 
   - Phase 1: Lift & hinge (fast start, slow middle)
   - Phase 2: Drop & settle (slow start, fast end)
4. **Growing pile**: Each flip moves pages closer to camera
5. **No z-index**: Real 3D depth using `translateZ()` only

### How the Two Stacks Work Now

The notebook always has **two stacks** sharing the same depth ruler:

• **Unread stack (bottom)** – pages that haven't flipped yet. They start at
  `translateZ(5px)` for the very last page and rise by `4px` per sheet until the
  top-most unread page is reached.

• **Read stack (top)** – every page that *has* flipped.  Its first member (the
  very first page you flip) lands **exactly on the depth of the bottom unread
  page** – so visually it appears to slide under the notebook.  Each
  subsequent flip lands one sheet (`4px`) closer to the camera, building a
  tidy pile that grows toward you while the unread stack shrinks.

This symmetric depth model keeps the total height of the notebook constant –
pages are never "lost" in space; they simply migrate from one end of the depth
ruler to the other.

### Depth Calculation Example (10 pages)

Unread stack before flipping:
```
Index 0 (bottom): Z = 5 + (10-1-0) × 4 = 41px
Index 1        : Z = 37px
…
Index 9 (top)  : Z = 5px
```

Flipping index **9** (the first visible page):
```
Start  : translateZ(5px)   rotateX(0deg)
50%    : translateZ(35px)  rotateX(90deg)  (lifted)
Finish : translateZ(41px)  rotateX(180deg) (lands on depth of bottom sheet)
```

Flipping index **8** next:
```
Lands at translateZ(37px) – one sheet (4 px) closer to camera than the
previously-flipped page.
```

And so on until the unread stack is empty and all pages have migrated to the
read stack.

---

## 🧹 Recent Improvements (v1.1)

### Simplified HTML Structure
We recently streamlined the DOM structure for better maintainability:

**Before:**
```html
<div id="notepad" class="notebook-inner">
  <div id="notepad-inner">  <!-- ← Unnecessary wrapper -->
    <div class="page-stack" id="page-stack">
      <!-- pages -->
    </div>
  </div>
</div>
```

**After:**
```html
<div id="notebook" class="notebook-inner">
  <div class="page-stack" id="page-stack">
    <!-- pages directly here -->
  </div>
</div>
```

### Consistent Naming
- **Standardized terminology**: All "notepad" references updated to "notebook" 
- **Simplified CSS**: Removed redundant `#notepad-inner` rules
- **Cleaner JavaScript**: Updated all DOM queries to use `#notebook`

**Benefits:**
- ✅ One less unnecessary wrapper div
- ✅ Consistent naming throughout codebase  
- ✅ Better maintainability
- ✅ Same functionality, cleaner code

---

## 🔧 Development Tips

### Debugging
- Add `?debug=true` to URL for performance overlay
- Add `?preview=true` to load JSON at runtime
- Check browser console for initialization logs

### Common Issues

**Pages not flipping?**
```javascript
// Check if page-stack container exists
const pageStack = document.getElementById('page-stack');
console.log('Page stack:', pageStack);
```

**Wrong flip direction?**
```javascript
// Check transform origin in CSS
.page {
  transform-origin: 50% 0 0; /* Must be top edge */
}
```

**Performance issues?**
```javascript
// Reduce visible pages in config.js
PERFORMANCE: {
  maxVisiblePages: 10  // Default is 15
}
```

### Customization

**Change flip speed:**
```javascript
// In config.js
ANIMATION: {
  duration: 800  // Slower (was 600)
}
```

**Adjust depth spacing:**
```javascript
// In config.js  
DEPTH: {
  spacingZ: 6  // More space between pages (was 4)
}
```

**Modify page colors:**
```css
/* In style.css */
.page {
  background-color: #f0f0f0;  /* Lighter grey */
}

.page::after {
  background: #666666;  /* Darker back */
}
```

---

## 🚀 Performance

The system targets **60fps** during scrolling:

- **Visibility culling**: Only 15 pages rendered at once
- **GPU acceleration**: All transforms use `translate3d`
- **RAF rendering**: One frame per scroll update
- **Memory management**: Pages outside view are hidden

### Performance Monitoring
```javascript
// Check FPS in console
ApplicationState.performanceManager.getPerformanceReport();
```

---

## 📱 Mobile Support

- **Touch gestures**: Swipe to flip pages
- **Responsive design**: Scales to mobile screens  
- **Performance optimized**: Lower scroll sensitivity on mobile
- **Orientation support**: Works in landscape mode

---

## 🎨 Customization Guide

### Changing Colors
```css
/* Page front (light grey) */
.page {
  background-color: #f5f5f5;
}

/* Page back (darker grey) */  
.page::after {
  background: #888888;
}

/* Covers (cardboard texture) */
.cover {
  background-image: url('./assets/background-assets/images/cardboard.jpg');
}
```

### Adjusting Physics
```javascript
// In config.js
DEPTH: {
  liftHeight: 40,    // Higher lift (was 30)
  spacingZ: 6,       // More page spacing (was 4)
}

ANIMATION: {
  duration: 800,     // Slower flips (was 600)
}
```

### Adding New Page Types
1. **Define in JSON schema** (portfolioLoader.js)
2. **Add creation logic** (createPageElement function)  
3. **Style the new type** (style.css)

---

## 🤝 Contributing

1. **Fork the repo**
2. **Make changes**
3. **Test thoroughly** - check flips work in both directions
4. **Update this README** if you change core behavior
5. **Submit PR** with clear description

### Testing Checklist
- [ ] Pages flip in correct direction (over top edge)
- [ ] Growing pile moves toward camera  
- [ ] Smooth 60fps performance
- [ ] Works on mobile touch
- [ ] All page types render correctly

---

## 📞 Support

**Common Questions:**

**Q: Pages look flat/not 3D?**  
A: Check that `perspective: 2500px` is applied to container

**Q: Flips are jerky?**  
A: Reduce `maxVisiblePages` in config.js for better performance

**Q: Wrong flip direction?**  
A: Ensure `transform-origin: 50% 0 0` (top edge hinge)

**Q: Pages don't load?**  
A: Check portfolio.json format and asset paths

---

This 3D notebook system creates a realistic page-flipping experience that feels like using a real reporter's notebook. The key is in the physics: pages flip over the top edge, lift during transition, and land on a growing pile that moves toward the viewer. 🎯 