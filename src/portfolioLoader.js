// src/portfolioLoader.js
// Utility to dynamically create page elements and chapter definitions
// based on the automatically-generated manifest (see build.cjs).

import { GLOBAL_CONFIG } from './config.js';
import { CHAPTERS } from './chapters.js';
import portfolioData from '../data/portfolio.json' assert { type: 'json' };

/**
 * Portfolio JSON Schema Definition
 * Based on specification requirements in README
 */
const PORTFOLIO_SCHEMA = {
  type: 'object',
  required: ['projects'],
  properties: {
    metadata: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' }
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'pages'],
        properties: {
          id: {
            type: 'string',
            pattern: '^chapter-\\d+$',
            description: 'Chapter ID must match /^chapter-\\d+$/'
          },
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 100
          },
          pages: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['asset', 'type', 'commentary'],
              properties: {
                asset: {
                  type: 'string',
                  pattern: '^chapter-\\d+-\\d+\\.(jpg|jpeg|png|webp|mp4|webm)$',
                  description: 'Asset naming must match /^chapter-\\d+-\\d+\\.(jpg|jpeg|png|webp|mp4|webm)$/'
                },
                type: {
                  type: 'string',
                  enum: ['image', 'video']
                },
                commentary: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Commentary maximum 500 characters'
                }
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Asset path resolver
 * Resolves asset paths to `assets/portfolio-pages/{chapter-id}/{asset}`
 * @param {string} chapterId - Chapter identifier
 * @param {string} assetName - Asset filename
 * @returns {string} Resolved asset path
 */
function resolveAssetPath(chapterId, assetName) {
  return `assets/portfolio-pages/${chapterId}/${assetName}`;
}

/**
 * Validate portfolio JSON against schema
 * @param {Object} data - Portfolio data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validatePortfolioSchema(data) {
  const errors = [];
  
  try {
    // Basic structure validation
    if (!data || typeof data !== 'object') {
      errors.push('Portfolio data must be an object');
      return { isValid: false, errors };
    }
    
    if (!Array.isArray(data.projects)) {
      errors.push('Portfolio must have "projects" array');
      return { isValid: false, errors };
    }
    
    // Validate each project
    data.projects.forEach((project, projectIndex) => {
      const projectPath = `projects[${projectIndex}]`;
      
      // Required fields
      if (!project.id || typeof project.id !== 'string') {
        errors.push(`${projectPath}.id is required and must be a string`);
      } else if (!/^chapter-\d+$/.test(project.id)) {
        errors.push(`${projectPath}.id must match pattern /^chapter-\\d+$/`);
      }
      
      if (!project.title || typeof project.title !== 'string') {
        errors.push(`${projectPath}.title is required and must be a string`);
      }
      
      if (!Array.isArray(project.pages)) {
        errors.push(`${projectPath}.pages must be an array`);
        return;
      }
      
      // Validate each page
      project.pages.forEach((page, pageIndex) => {
        const pagePath = `${projectPath}.pages[${pageIndex}]`;
        
        if (!page.asset || typeof page.asset !== 'string') {
          errors.push(`${pagePath}.asset is required and must be a string`);
        } else if (!/^chapter-\d+-\d+\.(jpg|jpeg|png|webp|mp4|webm)$/.test(page.asset)) {
          errors.push(`${pagePath}.asset must match pattern /^chapter-\\d+-\\d+\\.(jpg|jpeg|png|webp|mp4|webm)$/`);
        }
        
        if (!page.type || !['image', 'video'].includes(page.type)) {
          errors.push(`${pagePath}.type must be "image" or "video"`);
        }
        
        if (typeof page.commentary !== 'string') {
          errors.push(`${pagePath}.commentary is required and must be a string`);
        } else if (page.commentary.length > 500) {
          errors.push(`${pagePath}.commentary must be maximum 500 characters`);
        }
      });
    });
    
  } catch (error) {
    errors.push(`Validation error: ${error.message}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create individual page element with clean CSS class-based styling
 * @param {Object} pageData - Page data object
 * @param {string} chapterId - Chapter identifier
 * @param {number} pageIndex - Page index within chapter
 * @param {number} globalIndex - Global page index
 * @returns {HTMLElement} Configured page element
 */
function createPageElement(pageData, chapterId, pageIndex, globalIndex) {
  const pageEl = document.createElement('div');
  pageEl.className = 'page page--positioned gpu-accelerated';
  pageEl.dataset.commentary = pageData.commentary;
  pageEl.dataset.chapterId = chapterId;
  pageEl.dataset.pageIndex = pageIndex;
  
  // Add ring holes container (safe zone) - using CSS class
  const holesContainer = document.createElement('div');
  holesContainer.className = 'page-holes page-holes--styled';
  pageEl.appendChild(holesContainer);
  
  // Add content container with CSS class alignment
  const content = document.createElement('div');
  content.className = `page-content page-content--${GLOBAL_CONFIG.LAYOUT.contentAlignment}`;
  
  // Create media element with proper CSS classes
  const assetPath = resolveAssetPath(chapterId, pageData.asset);
  const mediaEl = createMediaElement(pageData.type, assetPath, pageData.commentary);
  
  content.appendChild(mediaEl);
  pageEl.appendChild(content);
  
  return pageEl;
}

/**
 * Create media element (image or video) with proper CSS classes
 * @param {string} type - Media type ('video' or 'image')
 * @param {string} assetPath - Path to media asset
 * @param {string} altText - Alt text for accessibility
 * @returns {HTMLElement} Media element
 */
function createMediaElement(type, assetPath, altText) {
  let mediaEl;
  
  if (type === 'video') {
    mediaEl = document.createElement('video');
    mediaEl.src = assetPath;
    mediaEl.autoplay = true;
    mediaEl.loop = true;
    mediaEl.muted = true;
    mediaEl.playsInline = true;
    mediaEl.className = 'page-content__inner page-content__media--video';
    mediaEl.addEventListener('error', (e) => {
      console.error(`Failed to load video: ${assetPath}`, e);
    });
  } else {
    mediaEl = document.createElement('img');
    mediaEl.src = assetPath;
    mediaEl.alt = altText;
    mediaEl.className = 'page-content__inner page-content__media';
    mediaEl.addEventListener('error', (e) => {
      console.error(`Failed to load image: ${assetPath}`, e);
    });
  }
  
  return mediaEl;
}

/**
 * Create cover page with clean CSS class-based styling
 * @param {string} type - 'front' or 'back'
 * @param {string} commentary - Commentary text
 * @param {number} globalIndex - Global page index
 * @returns {HTMLElement} Cover element
 */
function createCoverPage(type, commentary, globalIndex) {
  const coverEl = document.createElement('div');
  
  if (type === 'front') {
    coverEl.className = 'page cover cover--front gpu-accelerated';
    coverEl.dataset.deckNumber = 'front';
    
    // NO CONTENT - covers should have no text as requested
  } else {
    coverEl.className = 'page cover cover--back gpu-accelerated';
    coverEl.dataset.deckNumber = String(globalIndex + 1).padStart(2, '0');
  }
  
  coverEl.dataset.commentary = commentary;
  
  return coverEl;
}

/**
 * Create cover content with proper styling
 * @returns {HTMLElement} Cover content element
 */
function createCoverContent() {
  // This function is no longer used - covers should have no text content
  const content = document.createElement('div');
  content.className = 'cover-content';
  return content;
}

/**
 * Generate pages from portfolio data with full validation
 * @param {HTMLElement} container - Container element
 * @param {Object} portfolioData - Validated portfolio data
 * @returns {HTMLElement[]} Array of created page elements
 */
export function createPagesFromPortfolioData(container, portfolioData) {
  if (!container) throw new Error('Container element is required');
  
  // Validate portfolio data
  const validation = validatePortfolioSchema(portfolioData);
  if (!validation.isValid) {
    console.error('❌ Portfolio schema validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Portfolio data validation failed');
  }
  
  console.log('✅ Portfolio schema validation passed');
  
  const pages = [];
  let globalPageIndex = 0;
  
  // Clear existing content
  const existingElements = container.querySelectorAll('.page, .cover');
  existingElements.forEach(el => el.remove());
  
  // Create front cover
  const frontCover = createCoverPage('front', 
    'Welcome to my portfolio. Scroll to begin exploring my work as a UX/UI Designer and Creative Technologist.',
    globalPageIndex
  );
  container.appendChild(frontCover);
  pages.push(frontCover);
  globalPageIndex++;
  
  // Process each project
  portfolioData.projects.forEach((project, projectIndex) => {
    const chapterStartPage = globalPageIndex;
    
    // Update CHAPTERS array for navigation
    CHAPTERS.push({
      title: project.title,
      page: chapterStartPage,
      color: `hsl(${(projectIndex * 47) % 360}, 70%, 85%)`
    });
    
    // Create pages for this project
    project.pages.forEach((pageData, pageIndex) => {
      try {
        const pageEl = createPageElement(pageData, project.id, pageIndex, globalPageIndex);
        container.appendChild(pageEl);
        pages.push(pageEl);
        globalPageIndex++;
      } catch (error) {
        console.error(`Error creating page ${project.id}[${pageIndex}]:`, error);
      }
    });
  });
  
  // Create back cover
  const backCover = createCoverPage('back',
    'Thank you for exploring my portfolio. I hope you enjoyed the journey through my creative work.',
    globalPageIndex
  );
  container.appendChild(backCover);
  pages.push(backCover);
  globalPageIndex++;
  
  console.log(`📄 Generated ${pages.length} pages from ${portfolioData.projects.length} projects`);
  return pages;
}

/**
 * Legacy compatibility function
 * @param {HTMLElement} container - Container element
 * @param {Array} manifest - Legacy manifest format
 * @returns {HTMLElement[]} Array of created page elements
 */
export function createPagesFromManifest(container, manifest) {
  console.warn('⚠️ Using legacy createPagesFromManifest. Consider migrating to createPagesFromPortfolioData.');
  
  // Convert manifest to portfolio data format for validation
  const portfolioData = {
    projects: manifest || []
  };
  
  return createPagesFromPortfolioData(container, portfolioData);
}

/**
 * Runtime portfolio loader for preview mode
 * Implements specification-compliant JSON loading with validation
 */
export class PortfolioLoader {
  constructor() {
    this.portfolioData = null;
    this.isPreview = new URLSearchParams(window.location.search).has('preview');
    this.isDebug = new URLSearchParams(window.location.search).has('debug');
  }
  
  /**
   * Load and validate portfolio data
   * @returns {Promise<Object>} Validated portfolio data
   */
  async load() {
    if (!this.isPreview) {
      console.log('💡 Preview mode not enabled. Use ?preview=true to load JSON at runtime.');
      return portfolioData; // Return static data
    }
    
    try {
      console.log('🔄 Loading portfolio data in preview mode...');
      const response = await fetch('/data/portfolio.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      this.portfolioData = await response.json();
      
      // Validate schema
      const validation = validatePortfolioSchema(this.portfolioData);
      if (!validation.isValid) {
        console.error('❌ Portfolio validation failed:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        throw new Error('Portfolio validation failed');
      }
      
      if (this.isDebug) {
        console.group('🔍 Portfolio Debug Info');
        console.log('Projects:', this.portfolioData.projects.length);
        console.log('Total pages:', this.portfolioData.projects.reduce((sum, p) => sum + p.pages.length, 0));
        console.log('Validation:', validation);
        console.groupEnd();
      }
      
      console.log('✅ Portfolio data loaded and validated successfully');
      return this.portfolioData;
      
    } catch (error) {
      console.error('❌ Error loading portfolio:', error);
      console.log('📦 Falling back to static portfolio data');
      return portfolioData; // Fallback to static data
    }
  }
  
  /**
   * Inject loaded content into DOM
   * @param {HTMLElement} container - Target container
   * @returns {HTMLElement[]} Created page elements
   */
  async injectContent(container) {
    const data = await this.load();
    return createPagesFromPortfolioData(container, data);
  }
}

// Export validation utilities
export { validatePortfolioSchema, resolveAssetPath, PORTFOLIO_SCHEMA }; 