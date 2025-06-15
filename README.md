# Ring-Bound Notepad

A web-native, GPU-accelerated notebook that turns a sequence of images (and optional videos) into pages bound by a realistic 3-ring coil. Scroll, drag, or swipe to flip through pages with physical-inspired motion, infinite looping, and performance-aware rendering.

## How It Works

• `scrollEngine.js` converts user input into a continuous **scroll value**.<br/>
• `render.js` is the heart of the system – every animation frame it maps the scroll value to 3-D transforms, opacity, blur, and shadows for **every** page. No CSS classes, just mathematics.<br/>
• When `PAGE_ANIMATION.loop.infinite` is `true`, pages are drawn at multiple virtual indices, allowing the notebook to **cycle forever** without visible seams.<br/>
• A build step (`npm run build`) walks `src/assets/portfolio-pages/chapter-*` and emits `portfolioManifest.js`, a list of all media files. esbuild then bundles the source into `dist/` so the whole project can be served statically.

## Project Structure

```text
ring-bound-notepad/
├── src/
│   ├── assets/
│   │   └── portfolio-pages/    # chapter-* folders with images / videos
│   ├── app.js                  # bootstraps app & event wiring
│   ├── config.js               # central animation constants
│   ├── scrollEngine.js         # converts input into scroll state
│   ├── render.js               # render loop & 3-D math
│   ├── infiniteLoop.js         # helpers for infinite page cycling
│   ├── performance.js          # FPS monitor & auto-tuning
│   ├── debug.js                # conditional logs & on-screen overlay
│   ├── style.css               # layout and visual effects
│   └── index.html              # root HTML
│
├── build.cjs                   # esbuild bundler + manifest generator
├── dist/                       # generated output after build
├── jest.config.js              # Jest configuration
├── package.json                # npm scripts & dependencies
└── README.md                   # this file
```

## Key Features

- ✨ 60 FPS, **GPU-accelerated** 3-D page-flip animation
- ♾️ **Infinite looping** when enabled – keep scrolling forever
- 🖼 **Auto-generated manifest** – drop media into `src/assets/portfolio-pages` and rebuild
- 🚀 **Performance monitor** & adaptive quality scaling
- 🎮 Mouse, touch & keyboard input with momentum scrolling
- 🐛 Toggleable **debug overlay** (`Ctrl + D`) with FPS, scroll and cycle info
- 🛠 Written in modern ES-modules; **zero runtime dependencies**

## Getting Started

```bash
# 1. install deps
npm install

# 2. build the project (creates dist/)
npm run build

# 3. serve the built files locally (default port 3000)
npm start
```

During active development you can keep esbuild watching for changes:

```bash
npm run build -- --watch
```

## Configuration

Animation parameters live in `src/config.js`. Frequently-tweaked options:

| Option | Purpose |
| --- | --- |
| `PAGE_ANIMATION.stack.visibleDepth` | How many trailing pages stay visible |
| `PAGE_ANIMATION.loop.infinite` | Enable/disable infinite cycling |
| `PAGE_ANIMATION.misc.scrollSensitivity` | Mouse/touch scroll multiplier |
| `PAGE_ANIMATION.misc.debug` | Enable console logs **and** on-screen debug overlay |

After editing `config.js`, simply refresh the browser; no rebuild required.

## Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Bundles the app into `dist/` (plus manifest generation) |
| `npm start` | Serves the contents of `dist/` using the *serve* package |
| `npm test` | Runs Jest unit tests |
| `npm run lint` | ESLint over all source files |
| `npm run format` | Prettier over JS, CSS and HTML |

## Testing & Linting

```bash
npm test           # run Jest unit tests
npm run lint       # ESLint
npm run format     # Prettier
```

## Browser Support

Evergreen browsers released since 2021 (Chromium 94+, Firefox 94+, Safari 15+) with GPU acceleration enabled.

## License

MIT License 