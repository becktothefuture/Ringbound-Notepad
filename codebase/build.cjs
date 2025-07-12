#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const ASSET_ROOT = 'src/assets/portfolio-pages';
const OUTPUT_FILE = 'src/portfolioManifest.js';
const DIST_DIR = path.join(__dirname, 'dist');

/**
 * Clean the dist directory
 */
function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    console.log('🗑️  Cleaned dist directory');
  }
}

/**
 * Custom directory walker
 * @param {string} dir - Directory to walk
 * @param {string[]} [filelist] - Array to store file paths
 * @returns {string[]} - Array of file paths
 */
function walkDir(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkDir(filepath, filelist);
    } else {
      // Push path relative to the initial pages directory
      filelist.push(path.relative(path.join(ASSET_ROOT, 'pages'), filepath));
    }
  });
  return filelist;
}

/**
 * Build the manifest – an array of pages from the main pages folder
 * title: "Portfolio Pages"
 * pages: array of relative paths that the browser can request
 */
function buildManifest() {
  if (!fs.existsSync(ASSET_ROOT)) {
    console.error(`Portfolio assets folder not found: ${ASSET_ROOT}`);
    process.exit(1);
  }

  // Check if pages folder exists
  const pagesDir = path.join(ASSET_ROOT, 'pages');
  if (!fs.existsSync(pagesDir)) {
    console.error(`Pages folder not found: ${pagesDir}`);
    process.exit(1);
  }

  const sizes = {};
  // Collect all image and video files from the pages folder in natural filename order
  const pageFiles = walkDir(pagesDir)
    .filter((f) => /\.(png|jpe?g|gif|svg|webp|mp4|webm|mov)$/i.test(f))
    // localeCompare with {numeric: true} gives natural sorting
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((f) => {
      const relativePath = f.replace(/\\/g, '/');
      // The path for stat needs to be relative to CWD, which pagesDir is.
      const fullPath = path.join(pagesDir, relativePath);
      try {
        const stats = fs.statSync(fullPath);
        sizes[relativePath] = stats.size;
      } catch (e) {
        console.warn(`Could not stat file: ${fullPath}`);
        sizes[relativePath] = 0;
      }
      return relativePath;
    });

  console.log(`📑 Found ${pageFiles.length} portfolio files`);

  const manifest = {
    title: 'Portfolio Pages',
    pages: pageFiles,
    sizes: sizes,
  };

  // Write to portfolioManifest.js
  const manifestContent = `// Auto-generated manifest
// Last updated: ${new Date().toISOString()}

export const PORTFOLIO_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, manifestContent);
  console.log(`✅ Manifest written to ${OUTPUT_FILE}`);
  console.log(`📊 Total pages: ${pageFiles.length}`);
}

/**
 * Copy files to dist directory
 */
function copyAssets() {
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Copy all files from src to dist
  const srcDir = path.join(__dirname, 'src');
  copyRecursive(srcDir, DIST_DIR);
  
  console.log('✅ Assets copied to dist/');
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main build process
function main() {
  console.log('🔨 Building portfolio...');
  
  cleanDist(); // Clean the dist directory before building
  buildManifest();
  copyAssets();
  
  console.log('✅ Build complete!');
}

if (require.main === module) {
  main();
}

module.exports = { buildManifest, copyAssets }; 