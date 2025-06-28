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
        description: { type: 'string' },
      },
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
            description: 'Chapter ID must match /^chapter-\\d+$/',
          },
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
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
                  description:
                    'Asset naming must match /^chapter-\\d+-\\d+\\.(jpg|jpeg|png|webp|mp4|webm)$/',
                },
                type: {
                  type: 'string',
                  enum: ['image', 'video'],
                },
                commentary: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Commentary maximum 500 characters',
                },
              },
            },
          },
        },
      },
    },
  },
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
          errors.push(
            `${pagePath}.asset must match pattern /^chapter-\\d+-\\d+\\.(jpg|jpeg|png|webp|mp4|webm)$/`
          );
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
    errors,
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
  let pageClasses = 'page page--positioned gpu-accelerated';
  
  // Add video-specific classes for proper layout
  if (pageData.type === 'video') {
    pageClasses += ' page--video-page';
  }
  
  pageEl.className = pageClasses;
  pageEl.dataset.commentary = pageData.commentary;
  pageEl.dataset.chapterId = chapterId;
  pageEl.dataset.pageIndex = pageIndex;

  // Create page-front container with all existing content
  const pageFront = document.createElement('div');
  pageFront.className = 'page-front';

  // Add ring holes container (safe zone) - using CSS class
  const holesContainer = document.createElement('div');
  holesContainer.className = 'page-holes page-holes--styled';
  pageFront.appendChild(holesContainer);

  // Add content container with CSS class alignment
  const content = document.createElement('div');
  let contentClasses = `page-content page-content--${GLOBAL_CONFIG.LAYOUT.contentAlignment}`;
  
  // Add video-specific container class for proper alignment
  if (pageData.type === 'video') {
    contentClasses += ' page-content--video-container';
  }
  
  content.className = contentClasses;

  // Create media element with proper CSS classes
  const assetPath = resolveAssetPath(chapterId, pageData.asset);
  const mediaEl = createMediaElement(pageData.type, assetPath, pageData.commentary);

  content.appendChild(mediaEl);
  pageFront.appendChild(content);

  // Add the shadow overlay div (must be LAST so it sits on top)
  const shadowWrapper = document.createElement('div');
  shadowWrapper.className = 'page-shadow-wrapper';

  const shadowDiv = document.createElement('div');
  shadowDiv.className = 'page-shadow';

  shadowWrapper.appendChild(shadowDiv);
  pageFront.appendChild(shadowWrapper);

  // Create page-back container
  const pageBack = document.createElement('div');
  pageBack.className = 'page-back';

  // Add both front and back to the page
  pageEl.appendChild(pageFront);
  pageEl.appendChild(pageBack);

  return pageEl;
}

/**
 * Create media element (image or video) with lazy loading support
 * @param {string} type - Media type ('video' or 'image')
 * @param {string} assetPath - Path to media asset
 * @param {string} altText - Alt text for accessibility
 * @returns {HTMLElement} Media element
 */
function createMediaElement(type, assetPath, altText) {
  let mediaEl;

  if (type === 'video') {
    mediaEl = document.createElement('video');
    // Use data-src for lazy loading instead of immediate src
    mediaEl.dataset.src = assetPath;
    mediaEl.autoplay = true;
    mediaEl.loop = true;
    mediaEl.muted = true;
    mediaEl.playsInline = true;
    mediaEl.preload = 'none'; // Don't preload until explicitly needed
    mediaEl.className = 'page-content__inner page-content__media--video';
    mediaEl.addEventListener('error', e => {
      console.error(`Failed to load video: ${assetPath}`, e);
    });
    
    // Generate poster path for video thumbnails if available
    const posterPath = assetPath.replace(/\.(mp4|webm)$/, '-poster-00001.jpg');
    mediaEl.dataset.poster = posterPath;
    
  } else {
    mediaEl = document.createElement('img');
    // Use data-src for lazy loading instead of immediate src
    mediaEl.dataset.src = assetPath;
    mediaEl.alt = altText;
    mediaEl.loading = 'lazy'; // Native lazy loading as fallback
    mediaEl.className = 'page-content__inner page-content__media';
    mediaEl.addEventListener('error', e => {
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

  // Create cover front container
  const coverFront = document.createElement('div');
  coverFront.className = 'page-front';

  if (type === 'front') {
    coverEl.className = 'page cover cover--front gpu-accelerated';
    coverEl.dataset.deckNumber = 'front';
    coverFront.classList.add('cover', 'cover--front');

    // NO CONTENT - covers should have no text as requested
  } else {
    coverEl.className = 'page cover cover--back gpu-accelerated';
    coverEl.dataset.deckNumber = String(globalIndex + 1).padStart(2, '0');
    coverFront.classList.add('cover', 'cover--back');
  }

  coverEl.dataset.commentary = commentary;

  // Create cover back container
  const coverBack = document.createElement('div');
  coverBack.className = 'page-back';

  // Add both front and back to the cover
  coverEl.appendChild(coverFront);
  coverEl.appendChild(coverBack);

  return coverEl;
}



/**
 * Generate pages from portfolio data with full validation
 * @param {HTMLElement} container - Container element (should be page-stack)
 * @param {Object} portfolioData - Validated portfolio data
 * @returns {HTMLElement[]} Array of created page elements
 */
export function createPagesFromPortfolioData(container, portfolioData) {
  if (!container) throw new Error('Container element is required');

  // Ensure we're working with the page-stack container
  let pageStack = container;
  if (!container.classList.contains('page-stack')) {
    pageStack = container.querySelector('.page-stack') || container.querySelector('#page-stack');
    if (!pageStack) {
      console.warn('⚠️ No page-stack container found, using provided container');
      pageStack = container;
    }
  }

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

  // Clear existing content from page stack
  const existingElements = pageStack.querySelectorAll('.page, .cover');
  existingElements.forEach(el => el.remove());

  // Create front cover
  const frontCover = createCoverPage(
    'front',
    'Welcome to my portfolio. Scroll to begin exploring my work as a UX/UI Designer and Creative Technologist.',
    globalPageIndex
  );
  pageStack.appendChild(frontCover);
  pages.push(frontCover);
  globalPageIndex++;

  // Process each project
  portfolioData.projects.forEach((project, projectIndex) => {
    const chapterStartPage = globalPageIndex;

    // Get color from project data, fallback to default
    const projectColor = project.color 
      ? GLOBAL_CONFIG.COLORS.palette[project.color] 
      : GLOBAL_CONFIG.COLORS.default;

    // Update CHAPTERS array for navigation
    CHAPTERS.push({
      title: project.title,
      page: chapterStartPage,
      color: projectColor,
      tabImage: project.tabImage, // Add tab image reference
    });
    
    console.log(`📑 Added chapter: ${project.title} at page ${chapterStartPage}, CHAPTERS now has ${CHAPTERS.length} items`);
    console.log('📑 Current CHAPTERS array:', CHAPTERS);

    // Create pages for this project
    project.pages.forEach((pageData, pageIndex) => {
      try {
        const pageEl = createPageElement(pageData, project.id, pageIndex, globalPageIndex);
        
        // Apply color to chapter start page (first page of each project)
        if (pageIndex === 0 && project.color) {
          pageEl.style.setProperty('--page-color', projectColor);
          pageEl.classList.add('page--colored');
        }
        
        pageStack.appendChild(pageEl);
        pages.push(pageEl);
        globalPageIndex++;
      } catch (error) {
        console.error(`Error creating page ${project.id}[${pageIndex}]:`, error);
      }
    });
  });

  // Create back cover
  const backCover = createCoverPage(
    'back',
    'Thank you for exploring my portfolio. I hope you enjoyed the journey through my creative work.',
    globalPageIndex
  );
  pageStack.appendChild(backCover);
  pages.push(backCover);
  globalPageIndex++;

  console.log(`📄 Generated ${pages.length} pages from ${portfolioData.projects.length} projects`);
  return pages;
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
        console.log(
          'Total pages:',
          this.portfolioData.projects.reduce((sum, p) => sum + p.pages.length, 0)
        );
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
