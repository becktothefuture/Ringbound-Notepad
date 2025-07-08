# 🗒️ Ring-Bound Notebook Portfolio

A GPU-accelerated, 3D notebook simulation that creates a realistic page-flipping experience. Built with modern web technologies, this portfolio mimics the tactile feel of browsing through a physical spiral-bound notebook.

## ✨ Features

- **Realistic 3D Physics**: Pages lift, rotate, and settle with natural arcing motion
- **Smooth Performance**: 60fps target with intelligent performance scaling
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support
- **Smart Loading**: Progressive asset loading with performance optimization
- **Chapter Navigation**: Tab-based navigation with visual chapter indicators
- **Zoom System**: Smooth zoom transitions between overview and focused modes
- **Theme Integration**: Automatic browser theme detection and adaptation

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (with live reload)
npm run dev

# Build for production
npm run build

# Serve production build
npm start
```

The application will be available at `http://localhost:3000`

## 🎮 User Controls

| Input | Action |
|-------|--------|
| **Mouse wheel** | Scroll through pages with momentum |
| **Touch drag** | Swipe to flip pages (mobile) |
| **Arrow keys** ← → ↑ ↓ | Flip one page at a time |
| **TAB / Shift+TAB** | Navigate between chapters |
| **Home / End** | Jump to first/last page |
| **Click notebook** | Toggle zoom (80% ⇄ 100%) |
| **Space** | Flip to next page |

## 🏗️ System Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│ VirtualScrollEngine│───▶│ RenderPipeline │
│ (mouse, touch)  │    │ (state-driven)   │    │ (3D transforms) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Input Handlers  │    │PerformanceManager│    │ DOM Manipulation│
│ - Wheel events  │    │ - FPS monitoring │    │ - Transform calc│
│ - Touch events  │    │ - Quality scaling│    │ - GPU accel     │
│ - Keyboard nav  │    │ - Memory tracking│    │ - Visibility    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow

```
Portfolio JSON → Schema Validation → Page Generation → 
VirtualScrollEngine → RenderPipeline → DOM Updates
```

## 📁 File Structure

```
src/
├── app.js                 # 🎬 Main application orchestrator
├── config.js              # ⚙️ Centralized configuration system
├── scrollEngine.js        # 🎮 Input handling and scroll state management
├── render.js              # 🎨 3D transforms and rendering pipeline
├── pageTransforms.js      # 📐 3D mathematics for page positioning
├── portfolioLoader.js     # 📄 Content loading and page generation
├── performance.js         # 📊 Performance monitoring and optimization
├── zoomManager.js         # 🔍 Zoom system with smooth transitions
├── chapterManager.js      # 📑 Chapter navigation and tab system
├── overlay.js             # 💡 User hints and guidance system
├── preloader.js           # ⏳ Asset preloading and optimization
├── browserTheme.js        # 🎨 Browser-specific theme adaptation
├── noiseGenerator.js      # 🌟 Visual noise effects
├── utils.js               # 🔧 Mathematical utilities and helpers
├── style.css              # 💄 3D styling and visual effects
└── index.html             # 🏠 Application structure

data/
└── portfolio.json         # 📋 Content source of truth

assets/
├── portfolio-pages/       # 📸 Page images and videos
├── background-assets/     # 🖼️ Notebook textures and rings
└── fonts/                 # 🔤 Typography assets
```

## 🎯 How It Works

### 3D Depth System

The notebook uses a **Z-depth stacking model** instead of traditional CSS z-index:

```javascript
// Unread pages (back to front)
Page 0: translateZ(5px)    // Bottom of stack
Page 1: translateZ(9px)    // 4px higher
Page 2: translateZ(13px)   // 4px higher
...

// Read pages (closest to camera)
Flipped Page 1: translateZ(805px)  // Lands on top
Flipped Page 2: translateZ(809px)  // 4px closer
```

### Page Flip Animation

Each page flip consists of two phases:

1. **Lift & Hinge (0% → 50%)**
   - Page lifts 30px creating natural arc
   - Rotates 0° → 90° around top edge
   - Fast start, slow middle (ease-in)

2. **Drop & Settle (50% → 100%)**
   - Page drops to final position
   - Rotates 90° → 180° completing flip
   - Slow start, fast end (ease-out)

### Performance Optimization

The system includes multiple performance measures:

- **Viewport Culling**: Only visible pages are rendered
- **Progressive Loading**: Assets load based on proximity to viewport
- **Quality Scaling**: Automatically reduces quality on slower devices
- **Memory Management**: Aggressive cleanup of off-screen content
- **GPU Acceleration**: All transforms use hardware acceleration

## 📋 Content Management

### Portfolio Structure

Content is defined in `data/portfolio.json`:

```json
{
  "projects": [
    {
      "id": "chapter-1",
      "title": "Project Name",
      "color": "#ffb3ba",
      "tabImage": "project-tab.png",
      "pages": [
        {
          "asset": "chapter-1-1.jpg",
          "type": "image",
          "commentary": "Page description"
        },
        {
          "asset": "chapter-1-2.mp4",
          "type": "video",
          "commentary": "Video description"
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
├── chapter-covers/
│   └── project-cover.png
└── chapter-tabs/
    └── project-tab.png
```

### Adding New Content

1. **Add media files** to appropriate chapter folder
2. **Update JSON** in `data/portfolio.json`
3. **Restart development server** for changes to take effect

## ⚙️ Configuration

All settings are centralized in `src/config.js`:

### Performance Settings
```javascript
PERFORMANCE: {
  targetFPS: 60,                    // Target frame rate
  maxVisiblePages: 12,              // Pages rendered simultaneously
  memoryLimit: 100,                 // Memory limit in MB
  qualityScaleMin: 0.5,             // Minimum quality scale
  emergencyFpsThreshold: 5,         // Emergency performance threshold
}
```

### Animation Settings
```javascript
ANIMATION: {
  duration: 280,                    // Page flip duration (ms)
  snapThreshold: 30,                // Snap completion threshold
  scrollSensitivity: 0.15,          // Mouse wheel sensitivity
  liftHeight: 30,                   // Page lift height (px)
}
```

### 3D Scene Settings
```javascript
SCENE: {
  perspective: 7000,                // 3D perspective distance
  perspectiveOriginY: '350%',       // Viewing angle
  transformOriginY: '-2%',          // Page hinge position
}
```

## 🔧 Development

### Debug Mode

Add `?debug=true` to the URL for detailed performance information:
- Real-time FPS monitoring
- Memory usage tracking
- Render call statistics
- Performance bottleneck identification

### Preview Mode

Add `?preview=true` to load content dynamically:
- JSON loaded at runtime
- Useful for content testing
- No server restart required

### Performance Monitoring

The system includes comprehensive performance monitoring:

```javascript
// Access performance data in console
ApplicationState.performanceManager.getPerformanceReport();

// Enable detailed logging
ApplicationState.environment.isDebug = true;
```

## 🎨 Customization

### Styling

Key visual properties can be modified in `src/style.css`:

```css
:root {
  --page-background: #f5f5f5;      /* Page color */
  --page-shadow: rgba(0,0,0,0.2);  /* Shadow color */
  --ring-color: #silver;           /* Ring binding color */
}
```

### Animation Timing

Modify animation behavior in `src/config.js`:

```javascript
ANIMATION: {
  duration: 400,        // Slower flips
  snapThreshold: 50,    // Later snap point
  liftHeight: 40,       // Higher arc
}
```

### Performance Tuning

Adjust performance settings based on target devices:

```javascript
PERFORMANCE: {
  maxVisiblePages: 8,   // Fewer pages for mobile
  memoryLimit: 80,      // Lower memory limit
  qualityScaleMin: 0.3, // More aggressive scaling
}
```

## 🏗️ Build System

The project uses a custom build system with esbuild:

- **Development**: `npm run dev` - Live reload with source maps
- **Production**: `npm run build` - Optimized bundle with asset processing
- **Watch Mode**: `npm run build:watch` - Incremental builds

### Build Features

- **Asset Optimization**: Images and videos are optimized automatically
- **Code Splitting**: Modules are bundled efficiently
- **Source Maps**: Full debugging support in development
- **Live Reload**: Instant updates during development

## 📱 Browser Support

- **Chrome/Edge**: Full feature support with optimal performance
- **Safari**: Full support with hardware acceleration
- **Firefox**: Full support with performance optimizations
- **Mobile**: Responsive design with touch gesture support

### Performance Targets

- **Desktop**: 60fps at 1080p with high quality
- **Tablet**: 60fps at 768p with medium quality
- **Mobile**: 30fps at 375p with adaptive quality

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Static Hosting

The built application in `dist/` can be deployed to any static hosting service:

- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Performance Considerations

- **CDN**: Use a CDN for asset delivery
- **Compression**: Enable gzip/brotli compression
- **Caching**: Set appropriate cache headers for assets
- **Preloading**: Critical assets are preloaded automatically

## 🔍 Troubleshooting

### Common Issues

**Pages not flipping?**
- Check browser console for errors
- Verify `#notebook` and `#page-stack` containers exist
- Ensure portfolio.json is valid

**Performance issues?**
- Reduce `maxVisiblePages` in config
- Enable debug mode to identify bottlenecks
- Check memory usage in browser dev tools

**Assets not loading?**
- Verify file paths in portfolio.json
- Check network tab for 404 errors
- Ensure build process copied assets correctly

### Debug Tools

```javascript
// Performance monitoring
ApplicationState.performanceManager.logPerformanceMetrics();

// Scroll state inspection
ApplicationState.scrollEngine.getScrollState();

// Page visibility debugging
document.querySelectorAll('.page').forEach((page, i) => {
  console.log(`Page ${i}:`, page.style.transform);
});
```

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with modern web technologies for a tactile digital experience.** 