# Ring-Bound Notepad: Technical Specification

## 1. Overview

This specification defines a hyper-realistic 3D ring-bound portfolio notepad with physically accurate page-flipping animations. The system uses a virtual scroll engine and state-driven rendering to achieve 60fps performance while maintaining complete fidelity to real-world notebook physics.

**Core Requirements:**
- Physics-based page flipping with arc motion
- JSON-driven content management
- 60fps performance with adaptive quality scaling
- Realistic visual effects (shadows, ring holes, covers)
- Cross-platform compatibility (desktop, mobile, touch)

## 2. Architecture Principles

- **State-Driven Rendering**: All visual properties calculated as pure functions of scroll position
- **Content-Code Separation**: JSON contains only content; layout/physics are globally defined  
- **Performance-First**: GPU acceleration, visibility culling, and memory management
- **Realistic Physics**: Based on real notebook mechanics and constraints

## 3. Data Schema

### 3.1 Portfolio JSON Structure
```json
{
  "metadata": {
    "title": "Portfolio Title",
    "description": "Optional description"
  },
  "projects": [
    {
      "id": "chapter-1",
      "title": "Chapter Title", 
      "pages": [
        {
          "asset": "chapter-1-1.jpg",
          "type": "image",
          "commentary": "Page commentary text"
        }
      ]
    }
  ]
}
```

### 3.2 Schema Requirements
- **Root**: `projects` array (required)
- **Chapter**: `id`, `title`, `pages` (all required)
- **Page**: `asset`, `type`, `commentary` (all required)
- **Asset Types**: `"image"` or `"video"`
- **Asset Path**: Resolved to `assets/portfolio-pages/{chapter-id}/{asset}`

### 3.3 Validation Rules
- Chapter ID: `/^chapter-\d+$/`
- Asset Naming: `/^chapter-\d+-\d+\.(jpg|jpeg|png|webp|mp4|webm)$/`
- Commentary: Maximum 500 characters
- Image Formats: jpg, jpeg, png, webp
- Video Formats: mp4, webm

## 4. Global Configuration

All layout, performance, and visual parameters are globally defined (NOT in JSON):

```javascript
const GLOBAL_CONFIG = {
  LAYOUT: {
    pageWidth: 600,                  // px
    pageHeight: 450,                 // px (4:3 ratio)
    pageAspectRatio: 4/3,            // Enforced globally
    contentAspectRatio: 16/9,        // Enforced globally
    contentAlignment: 'bottom',      // Enforced globally
    safeZoneHeight: 50,              // px - ring hole area
    coverSizeMultiplier: 1.01        // Covers 1% larger
  },
  
  PERFORMANCE: {
    targetFPS: 60,
    frameTimeTarget: 16.67,          // ms
    maxVisiblePages: 15,
    memoryLimit: 100,                // MB
    qualityScaleMin: 0.5,
    qualityScaleMax: 1.0
  },
  
  ANIMATION: {
    snapThreshold: 110,              // Degrees (61% progress)
    snapDuration: 120,               // ms
    liftHeight: 50,                  // px arc maximum
    gravityFactor: 0.3,              // Y-offset multiplier
    scrollSensitivity: 0.1,
    scrollSensitivityMobile: 0.05
  },
  
  SCENE: {
    perspective: 2500,               // px
    perspectiveOriginX: '50%',
    perspectiveOriginY: '80%',       // Bottom bias
    transformOriginX: '50%',
    transformOriginY: '-1%',         // Above page top
    ringZIndex: 5000,                // Always on top
    activePageZIndex: 1000
  }
};
```

## 5. Core Systems

### 5.1 Virtual Scroll Engine
```javascript
class VirtualScrollEngine {
  constructor() {
    this.scrollPosition = 0.0;       // Fractional (1.5 = 50% through page 1)
    this.snapThreshold = 110;        // Auto-flip at 110° (61% progress)
    this.isSnapping = false;         // Prevent conflicts
  }
  
  updateScrollPosition(delta) {
    if (this.isSnapping) return;
    this.scrollPosition += delta * CONFIG.scrollSensitivity;
    this.scrollPosition = Math.max(0, Math.min(this.maxPages - 1, this.scrollPosition));
    this.notifyObservers(this.scrollPosition);
  }
}
```

### 5.2 Physics Calculations
```javascript
function calculatePageTransform(pageIndex, scrollPosition) {
  const relativePos = scrollPosition - pageIndex;
  const rotation = Math.max(0, Math.min(180, relativePos * 180));
  const flipProgress = rotation / 180;
  const liftHeight = Math.sin(flipProgress * Math.PI) * CONFIG.liftHeight;
  
  return {
    transform: `translateZ(${liftHeight}px) translateY(${-liftHeight * CONFIG.gravityFactor}px) rotateX(${rotation}deg)`,
    zIndex: calculateZIndex(pageIndex, scrollPosition, rotation)
  };
}
```

### 5.3 Performance Management
- **Visibility Culling**: Only 15 pages rendered simultaneously
- **Frame Monitoring**: Track frame times, auto-adjust quality if < 60fps
- **Memory Management**: Object pooling, garbage collection optimization
- **GPU Acceleration**: `translate3d`, `rotateX`, `will-change: transform`

## 6. Visual Requirements

### 6.1 Page Layout
- **Dimensions**: 600×450px (4:3 aspect ratio)
- **Content Area**: 16:9 aspect ratio, bottom-aligned
- **Safe Zone**: Top 50px reserved for ring holes
- **Transform Origin**: `50% -1%` for top-hinged flipping

### 6.2 Ring System
- **Ring Holes**: Visible on both front and back of pages
- **Safe Zone**: Content cannot overlap top 50px
- **Z-Index**: Rings always visible above all pages
- **Opacity**: Front 1.0, back 0.8

### 6.3 Shadow System
```css
.page::before {
  background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.05) 100%);
}

.page.flipped::before {
  background: linear-gradient(0deg, rgba(0,0,0,0.15) 0%, transparent 15%);
}
```

## 7. Implementation Requirements

### 7.1 Required Components
- `VirtualScrollEngine`: Fractional scroll state management
- `RenderPipeline`: State-driven page transformations
- `PerformanceManager`: FPS monitoring and quality scaling
- `PortfolioLoader`: JSON-driven content generation
- `CommentarySystem`: Real-time commentary updates

### 7.2 Animation States
- **Stacked**: Pages at `rotateX(0deg)` with 1px depth separation
- **Flipping**: Current page rotating 0° to 180° with arc motion
- **Flipped**: Completed pages at `rotateX(180deg)` building upward

### 7.3 Z-Index Management
```javascript
function calculateZIndex(pageIndex, scrollPosition, rotation) {
  const currentPage = Math.floor(scrollPosition);
  if (pageIndex === currentPage && rotation > 0) return 1000;  // Active flip
  if (pageIndex < currentPage) return 100 + pageIndex;        // Flipped stack
  return 200 - pageIndex;                                     // Unflipped stack
}
```

## 8. Performance Targets

- **Frame Rate**: 60fps sustained during continuous scrolling
- **Memory Usage**: < 100MB heap for 80-page portfolio
- **Load Time**: < 2s to first interactive frame
- **Quality Scaling**: Auto-reduce effects if performance drops
- **Browser Support**: Chrome 94+, Safari 15+, Firefox 94+

## 9. Testing & Validation

### 9.1 Performance Tests
```javascript
// Frame time validation (must average < 16.67ms)
// Memory usage validation (must stay < 100MB)
// Snap threshold accuracy (61% progress = auto-complete)
```

### 9.2 Visual Tests
```javascript
// Ring holes visible on both page sides
// Content respects 50px safe zone
// Page aspect ratio maintains 4:3
// Content aspect ratio maintains 16:9
```

### 9.3 QA Checklist
- [ ] 60fps during continuous scrolling
- [ ] Memory below 100MB after 10 minutes
- [ ] Ring holes visible on all pages
- [ ] No content overlaps safe zone
- [ ] Smooth arc motion physics
- [ ] Touch input works on mobile
- [ ] Keyboard navigation support

## 10. Development Workflow

```bash
npm run dev                    # Development server
npm run build                  # Production build
npm start                      # Serve production
npm run validate-json          # Validate portfolio.json
```

**Development Modes:**
- `?preview=true`: Runtime JSON loading
- `?debug=true`: Performance overlay

## 11. File Structure

```
src/
├── config.js                 # Global configuration
├── app.js                    # Application orchestrator
├── scrollEngine.js           # Virtual scroll management
├── render.js                 # 3D transformation pipeline
├── performance.js            # FPS monitoring & optimization
├── portfolioLoader.js        # JSON content management
├── style.css                 # 3D styling & pseudo-elements
└── assets/
    ├── background-assets/    # Rings, holes, textures
    └── portfolio-pages/      # Content organized by chapter
data/
└── portfolio.json           # Content source of truth
```

This specification ensures consistent implementation of a performant, realistic ring-bound notebook with clear separation between content (JSON) and behavior (global configuration). 