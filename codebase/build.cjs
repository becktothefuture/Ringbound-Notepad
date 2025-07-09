#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const ASSET_ROOT = path.join(__dirname, 'src', 'assets', 'portfolio-pages');
const OUTPUT_FILE = path.join(__dirname, 'src', 'portfolioManifest.js');
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
 * Recursively walk a directory and return all files
 */
function walkDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkDir(fullPath));
    } else {
      files.push(path.relative(ASSET_ROOT, fullPath));
    }
  }
  
  return files;
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

  // Collect all image and video files from the pages folder in natural filename order
  const pageFiles = walkDir(pagesDir)
    .filter((f) => /\.(png|jpe?g|gif|svg|webp|mp4|webm|mov)$/i.test(f))
    // localeCompare with {numeric: true} gives natural sorting
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((f) => f.replace(/\\/g, '/')); // normalize path separators

  console.log(`📑 Found ${pageFiles.length} portfolio files`);

  const manifest = {
    title: 'Portfolio Pages',
    pages: pageFiles,
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