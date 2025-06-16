import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ASSETS_DIR = path.join(process.cwd(), 'src', 'assets', 'portfolio-pages');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'portfolio.json');

// Helper function to determine if a file is a video
const isVideo = (filename) => {
  const videoExtensions = ['.mp4', '.webm', '.mov'];
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

// Helper function to determine if a file is an image
const isImage = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

// Helper function to generate a title from chapter ID
const generateTitle = (chapterId) => {
  // Convert chapter-1 to "Chapter 1" etc.
  const num = chapterId.split('-')[1];
  return `Chapter ${num}`;
};

// Helper function to generate commentary based on asset type and number
const generateCommentary = (assetName, isVideo) => {
  const num = assetName.split('-').pop().split('.')[0];
  return isVideo 
    ? `Video demonstration ${num}`
    : `Project image ${num}`;
};

// Helper to find a project by id
const findProject = (projects, id) => projects.find(p => p.id === id);
// Helper to find a page by asset name
const findPage = (pages, asset) => pages.find(p => p.asset === asset);

// Main function to generate portfolio.json
const generatePortfolioJson = () => {
  let oldPortfolio = { projects: [] };
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      oldPortfolio = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Could not parse existing portfolio.json, starting fresh.');
    }
  }

  const chapters = fs.readdirSync(ASSETS_DIR)
    .filter(item => {
      const fullPath = path.join(ASSETS_DIR, item);
      return fs.statSync(fullPath).isDirectory() && item.startsWith('chapter-');
    })
    .sort();

  const portfolio = {
    projects: chapters.map(chapterId => {
      const chapterPath = path.join(ASSETS_DIR, chapterId);
      const assets = fs.readdirSync(chapterPath)
        .filter(file => isImage(file) || isVideo(file))
        .sort();

      // Try to find this chapter in the old JSON
      const oldProject = findProject(oldPortfolio.projects, chapterId);
      const title = oldProject?.title || generateTitle(chapterId);

      // Build pages, preserving commentary if possible
      const pages = assets.map(asset => {
        const oldPage = oldProject ? findPage(oldProject.pages, asset) : undefined;
        return {
          asset,
          type: isVideo(asset) ? 'video' : 'image',
          commentary: oldPage?.commentary || generateCommentary(asset, isVideo(asset))
        };
      });

      return { id: chapterId, title, pages };
    })
  };

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(portfolio, null, 2));
  console.log('✅ Successfully merged and generated portfolio.json');
  console.log(`📊 Found ${chapters.length} chapters with ${portfolio.projects.reduce((acc, proj) => acc + proj.pages.length, 0)} total pages`);
};

// Run the generator
generatePortfolioJson(); 