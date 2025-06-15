// build.cjs
// Generates a portfolio manifest based on the folder structure in
// src/assets/portfolio-pages and writes it to src/portfolioManifest.js.
// It also copies all source files unchanged to the dist folder so they can be
// served with `npm run start`.

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, 'src');
const ASSET_ROOT = path.join(ROOT, 'assets', 'portfolio-pages');
const OUT_MANIFEST = path.join(ROOT, 'portfolioManifest.js');
const DIST_DIR = path.resolve(__dirname, 'dist');

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
  console.log(`✅ Generated portfolio manifest with ${chapters.length} chapter(s).`);
}

/**
 * Bundle source into dist/ using esbuild so that users can just run `npm run start`.
 * The bundling is very simple: copy all static assets and let esbuild handle JS.
 */
async function bundle() {
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
      }
    }
  }

  // copy everything except JS – we'll bundle JS below.
  copyRecursive(path.join(ROOT, 'assets'), path.join(DIST_DIR, 'assets'));
  // copy html and css
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(DIST_DIR, 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'style.css'), path.join(DIST_DIR, 'style.css'));

  // Bundle JS entry app.js and its imports; let esbuild handle ES modules.
  await esbuild.build({
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
  });
  console.log('✅ Build complete');
}

buildManifest();
bundle().catch((err) => {
  console.error(err);
  process.exit(1);
});
