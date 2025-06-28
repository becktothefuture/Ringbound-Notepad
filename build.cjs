/**
 * RINGBOUND NOTEPAD - BUILD SYSTEM
 * 
 * This Node.js script serves as the complete build pipeline for the Ringbound Notebook
 * portfolio application. It handles both static asset generation and JavaScript bundling
 * to create an optimized distribution ready for deployment.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 📂 Asset Manifest Generation - Scans portfolio folders and creates asset index
 * 2. 📦 JavaScript Bundling - Uses esbuild for fast, optimized ES module bundling  
 * 3. 📋 File Copying - Efficiently copies static assets (CSS, HTML, images, videos)
 * 4. 👀 Watch Mode - Live rebuilding during development with intelligent change detection
 * 5. 🚨 Error Handling - Comprehensive error reporting and recovery
 * 
 * BUILD PIPELINE FLOW:
 * ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
 * │ Portfolio Assets│───▶│ Manifest Gen     │───▶│ esbuild Bundle  │
 * │ (images/videos) │    │ (portfolioManifest.js)│ (JavaScript)    │
 * └─────────────────┘    └──────────────────┘    └─────────────────┘
 *          │                        │                        │
 *          ▼                        ▼                        ▼
 * ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
 * │ Static Assets   │    │ Development      │    │ Production      │
 * │ Copy to dist/   │    │ Watch Mode       │    │ Optimized Build │
 * └─────────────────┘    └──────────────────┘    └─────────────────┘
 * 
 * USAGE:
 * - Production build: `node build.cjs`
 * - Development with watch: `node build.cjs --watch`
 * - Integrated with npm scripts: `npm run build`, `npm run dev`
 * 
 * @author Alexander Beck
 * @version 1.0.0
 * @since 2025-01-01
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// === COMMAND LINE ARGUMENT PROCESSING ===
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const isProduction = process.env.NODE_ENV === 'production' || args.includes('--production');

// === DEPENDENCY MANAGEMENT ===
/**
 * Chokidar is only required in watch mode to avoid needless dependency cost.
 * This lazy loading approach keeps the production build lightweight.
 */
let chokidar;
if (isWatch) {
  try {
    chokidar = require('chokidar');
  } catch (err) {
    console.error('❌ chokidar is required for watch mode.');
    console.error('📦 Install it with: npm install -D chokidar');
    console.error('🔍 Or run without watch mode for single builds');
    process.exit(1);
  }
}

// === DIRECTORY PATHS AND CONFIGURATION ===
/**
 * @type {string} Source directory containing all application files
 */
const ROOT = path.resolve(__dirname, 'src');

/**
 * @type {string} Portfolio assets directory containing chapter-based content
 */
const ASSET_ROOT = path.join(ROOT, 'assets', 'portfolio-pages');

/**
 * @type {string} Generated manifest file path (auto-generated, do not edit)
 */
const OUT_MANIFEST = path.join(ROOT, 'portfolioManifest.js');

/**
 * @type {string} Distribution directory for built files
 */
const DIST_DIR = path.resolve(__dirname, 'dist');

/**
 * @type {string} Data directory containing portfolio JSON
 */
const DATA_DIR = path.resolve(__dirname, 'data');

// === LOGGING UTILITIES ===
/**
 * Structured logging utilities for build process feedback
 * Provides consistent, informative output during build operations
 */
const log = {
  // Core build operations
  js: () => console.log('🔄 JavaScript bundle rebuilt'),
  manifest: () => console.log('📝 Portfolio manifest updated'),
  copy: (rel) => console.log(`📂 Copied: ${rel}`),
  remove: (rel) => console.log(`🗑️  Removed: ${rel}`),
  
  // Progress and status
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.warn(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  
  // Development mode
  watch: (path) => console.log(`👀 Watching: ${path}`),
  change: (path) => console.log(`🔄 Changed: ${path}`),
  
  // Verbose mode logging
  verbose: (msg) => {
    if (isVerbose) console.log(`🔍 ${msg}`);
  }
};

// === UTILITY FUNCTIONS ===

/**
 * Recursively walks a directory and returns a sorted list of files relative to the root.
 * 
 * This function is used to discover all portfolio assets and maintain consistent
 * file ordering across different operating systems and file systems.
 * 
 * @param {string} dir - The directory to walk
 * @param {string} relBase - The base directory for relative path calculation
 * @returns {string[]} Array of relative file paths, sorted alphabetically
 * @throws {Error} If directory cannot be read or accessed
 */
function walkDir(dir, relBase = dir) {
  try {
    log.verbose(`Walking directory: ${dir}`);
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    
    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively walk subdirectories
        const subFiles = walkDir(absPath, relBase);
        files = files.concat(subFiles);
        log.verbose(`Found ${subFiles.length} files in subdirectory: ${entry.name}`);
      } else if (entry.isFile()) {
        // Add regular files
        const relativePath = path.relative(relBase, absPath);
        files.push(relativePath);
      }
    }
    
    // Sort files for consistent ordering across platforms
    // Use locale-aware sorting with numeric handling for filenames like "page-1.jpg", "page-10.jpg"
    return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    
  } catch (error) {
    log.error(`Failed to walk directory: ${dir}`);
    throw new Error(`Directory walk failed: ${error.message}`);
  }
}

/**
 * Build the manifest – an array of chapters where each chapter has
 *  title: the folder name (e.g. "chapter-0" → "Chapter 0")
 *  pages: array of relative paths that the browser can request
 */
function buildManifest() {
  if (!fs.existsSync(ASSET_ROOT)) {
    console.error(`Portfolio assets folder not found: ${ASSET_ROOT}`);
    process.exit(1);
  }

  const chapters = fs
    .readdirSync(ASSET_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('chapter-'))
    .sort((a, b) => {
      // sort numerically by chapter number
      const numA = parseInt(a.name.split('-')[1], 10);
      const numB = parseInt(b.name.split('-')[1], 10);
      return numA - numB;
    })
    .map((dirent) => {
      const chapterDir = path.join(ASSET_ROOT, dirent.name);
      // Collect every image or video file within the chapter folder *in natural filename order*.
      // We avoid splitting images/videos so that mixed media (e.g. page-1.png, page-2.mp4)
      // are kept in the exact alphanumeric sequence defined by their filenames.
      const pageFiles = walkDir(chapterDir)
        .filter((f) => /\.(png|jpe?g|gif|svg|webp|mp4|webm|mov)$/i.test(f))
        // localeCompare with {numeric: true} gives "chapter-1-10" > "chapter-1-2"
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      return {
        title: dirent.name.replace('chapter-', 'Chapter '),
        pages: pageFiles.map((file) => {
          // Browser-relative path starting from src/
          const relPath = path.join('assets', 'portfolio-pages', dirent.name, file).replace(/\\/g, '/');
          return relPath;
        }),
      };
    });

  const jsContent = `// AUTO-GENERATED FILE – do not edit directly.\nexport default ${JSON.stringify(chapters, null, 2)};\n`;
  fs.writeFileSync(OUT_MANIFEST, jsContent, 'utf8');
  log.manifest();
}

/**
 * Bundle source into dist/ using esbuild so that users can just run `npm run start`.
 * The bundling is very simple: copy all static assets and let esbuild handle JS.
 */
async function bundle({ watch = false } = {}) {
  if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Copy static files (html, css, assets)
  function copyRecursive(srcDir, destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const absSrc = path.join(srcDir, entry.name);
      const absDest = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(absSrc, absDest);
      } else if (entry.isFile()) {
        fs.copyFileSync(absSrc, absDest);
        if (watch) log.copy(path.relative(ROOT, absSrc));
      }
    }
  }

  // copy everything except JS – we'll bundle JS below.
  copyRecursive(path.join(ROOT, 'assets'), path.join(DIST_DIR, 'assets'));
  // copy html and css
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(DIST_DIR, 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'style.css'), path.join(DIST_DIR, 'style.css'));
  // copy portfolio.json from data directory to maintain path structure
  fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true });
  fs.copyFileSync(path.join(DATA_DIR, 'portfolio.json'), path.join(DIST_DIR, 'data', 'portfolio.json'));

  // Shared esbuild options
  const esOpts = {
    entryPoints: [path.join(ROOT, 'app.js')],
    bundle: true,
    outdir: DIST_DIR,
    format: 'esm',
    sourcemap: true,
    target: ['es2018'],
    loader: {
      '.png': 'file',
      '.jpg': 'file',
      '.jpeg': 'file',
      '.gif': 'file',
      '.svg': 'file',
      '.webp': 'file',
      '.mp4': 'file',
      '.webm': 'file',
      '.mov': 'file',
      '.css': 'css',
    },
    assetNames: 'assets/[name]-[hash]',
  };

  if (!watch) {
    await esbuild.build(esOpts);
    console.log('✅ Build complete');
  } else {
    const ctx = await esbuild.context(esOpts);
    await ctx.watch();
log.js();
  }
}

// --------------------------- MAIN -----------------------------
(async () => {
  try {
    buildManifest();
    await bundle({ watch: isWatch });

    if (!isWatch) return; // single build done

    // ----------------- WATCH MODE -----------------

    /**
     * 1) Watch portfolio-pages to regenerate manifest and copy affected media
     */
    const portfolioWatcher = chokidar.watch('src/assets/portfolio-pages', {
      ignoreInitial: true,
    });

    function handleAssetChange(absPath, event) {
      const relFromSrc = path.relative(ROOT, absPath);
      const destPath = path.join(DIST_DIR, relFromSrc);

      if (event === 'add' || event === 'change') {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(absPath, destPath);
        log.copy(relFromSrc);
      } else if (event === 'unlink') {
        fs.rmSync(destPath, { force: true });
        log.remove(relFromSrc);
      }
      buildManifest();
    }

    portfolioWatcher
      .on('add', (p) => handleAssetChange(p, 'add'))
      .on('change', (p) => handleAssetChange(p, 'change'))
      .on('unlink', (p) => handleAssetChange(p, 'unlink'))
      .on('error', (err) => {
        console.error('❌ portfolio watcher error:', err);
        process.exit(1);
      });

    /**
     * 2) Watch other static assets (html, css, non-JS assets excluding portfolio-pages)
     */
    const staticWatcher = chokidar.watch([
      path.resolve(ROOT, 'index.html'),
      path.resolve(ROOT, 'style.css'),
      path.resolve(ROOT, 'assets'),
      path.resolve(DATA_DIR, 'portfolio.json'),
    ], {
      ignoreInitial: true,
      ignored: [
        path.resolve(ROOT, 'assets/portfolio-pages/**'),
        '**/*.js',
        '**/*.ts',
        '**/*.tsx'
      ]
    });

    function handleStaticChange(absPath, event) {
      let relFromSrc, destPath;
      
      // Handle portfolio.json from data directory specially
      if (absPath.includes('data/portfolio.json')) {
        relFromSrc = 'data/portfolio.json';
        destPath = path.join(DIST_DIR, 'data', 'portfolio.json');
      } else {
        relFromSrc = path.relative(ROOT, absPath);
        destPath = path.join(DIST_DIR, relFromSrc);
      }

      // Priority handling for CSS changes
      const isCSSFile = relFromSrc.endsWith('.css');
      
      if (event === 'add' || event === 'change') {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(absPath, destPath);
        
        if (isCSSFile) {
          console.log('🎨 CSS change detected', destPath);
        }
        log.copy(relFromSrc);
      } else if (event === 'unlink') {
        fs.rmSync(destPath, { force: true });
        log.remove(relFromSrc);
      }
    }

    staticWatcher
      .on('add', (abs) => handleStaticChange(abs, 'add'))
      .on('change', (abs) => handleStaticChange(abs, 'change'))
      .on('unlink', (abs) => handleStaticChange(abs, 'unlink'))
      .on('error', (err) => {
        console.error('❌ static watcher error:', err);
        process.exit(1);
      });

    console.log('👀 Watch mode active – waiting for changes...');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
