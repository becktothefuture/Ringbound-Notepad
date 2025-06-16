// build.cjs
// Generates a portfolio manifest based on the folder structure in
// src/assets/portfolio-pages and writes it to src/portfolioManifest.js.
// It also copies all source files unchanged to the dist folder so they can be
// served with `npm run start`.

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');

// Chokidar is only required in watch mode to avoid needless dependency cost
let chokidar;
if (isWatch) {
  try {
    chokidar = require('chokidar');
  } catch (err) {
    console.error('❌ chokidar is required for watch mode. Run `npm i -D chokidar`');
    process.exit(1);
  }
}

const ROOT = path.resolve(__dirname, 'src');
const ASSET_ROOT = path.join(ROOT, 'assets', 'portfolio-pages');
const OUT_MANIFEST = path.join(ROOT, 'portfolioManifest.js');
const DIST_DIR = path.resolve(__dirname, 'dist');

/** Simple logger helpers */
const log = {
  js: () => console.log('🔄 JS rebuilt'),
  manifest: () => console.log('📝 manifest updated'),
  copy: (rel) => console.log(`📂 copied ${rel}`),
  remove: (rel) => console.log(`🗑 removed ${rel}`),
};

/**
 * Recursively walks a directory and returns a sorted list of files relative to the root.
 */
function walkDir(dir, relBase = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkDir(absPath, relBase));
    } else if (entry.isFile()) {
      files.push(path.relative(relBase, absPath));
    }
  }
  return files.sort();
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
      'src/**/*',
      '!src/**/*.js',
      '!src/**/*.ts',
      '!src/**/*.tsx',
      '!src/assets/portfolio-pages/**',
      '!src/**/.*',
    ], {
      ignoreInitial: true,
    });

    staticWatcher
      .on('add', (abs) => handleAssetChange(abs, 'add'))
      .on('change', (abs) => handleAssetChange(abs, 'change'))
      .on('unlink', (abs) => handleAssetChange(abs, 'unlink'))
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
