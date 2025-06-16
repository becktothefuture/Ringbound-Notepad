// src/portfolioLoader.js
// Utility to dynamically create page elements and chapter definitions
// based on the automatically-generated manifest (see build.cjs).

import { CHAPTERS } from './chapters.js';
import portfolioData from '../data/portfolio.json' assert { type: 'json' };

function randomPastelColor(index) {
  // Simple deterministic pastel color generator so every load gets the same colours
  const hue = (index * 47) % 360; // 47 is a prime to give a good distribution
  return `hsl(${hue} 100% 85%)`;
}

/**
 * Inserts pages for every image described in the manifest and augments the
 * global CHAPTERS array so existing chapter UI (tabs) keeps working.
 *
 * @param {HTMLElement} container The #notepad-inner element that should hold the pages.
 * @param {Array<Object>} manifest The manifest structure generated at build time.
 * @returns {HTMLElement[]} The list of newly created page elements in order.
 */
export function createPagesFromManifest(container, manifest) {
  if (!container) throw new Error('createPagesFromManifest: container is required');
  if (!Array.isArray(manifest)) throw new Error('createPagesFromManifest: manifest must be an array');

  const pages = [];
  let totalPages = 0;
  let totalVideos = 0;

  manifest.forEach((chapter, chapterIdx) => {
    // Register chapter start page index before we start adding its pages
    const chapterStartPage = pages.length;
    const color = chapter.color || randomPastelColor(chapterIdx);
    const chapterId = `chapter-${chapterIdx}`;

    CHAPTERS.push({
      title: chapter.title || `Chapter ${chapterIdx + 1}`,
      page: chapterStartPage, // index within the final pages array
      color
    });

    chapter.pages.forEach((assetPath, mediaIdx) => {
      try {
        const pageEl = document.createElement('div');
        pageEl.className = 'page';
        pageEl.dataset.deckNumber = String(pages.length + 1).padStart(2, '0');
        
        // Get the commentary from the portfolio.json data
        const chapterId = assetPath.split('/')[2]; // Get chapter ID from path
        const assetName = assetPath.split('/').pop(); // Get asset filename
        const project = portfolioData.projects.find(p => p.id === chapterId);
        const page = project?.pages.find(p => p.asset === assetName);
        const commentary = page?.commentary || `Page ${mediaIdx + 1} of ${chapter.title}`;
        pageEl.dataset.commentary = commentary;

        const content = document.createElement('div');
        content.className = 'page-content';

        const isVideo = /\.(mp4|webm|mov)$/i.test(assetPath);
        let mediaEl;
        if (isVideo) {
          const video = document.createElement('video');
          video.src = assetPath;
          video.autoplay = true;
          video.loop = true;
          video.muted = true; // ensure autoplay works without user gesture
          video.playsInline = true;
          video.addEventListener('error', (e) => {
            console.error(`Failed to load video: ${assetPath}`, e);
          });
          mediaEl = video;
          totalVideos++;
        } else {
          const img = document.createElement('img');
          img.src = assetPath;
          img.alt = commentary;
          img.addEventListener('error', (e) => {
            console.error(`Failed to load image: ${assetPath}`, e);
          });
          mediaEl = img;
        }

        // Ensure the media covers the page nicely
        mediaEl.style.width = '100%';
        mediaEl.style.height = '100%';
        mediaEl.style.objectFit = 'cover';

        mediaEl.classList.add('page-content__inner');

        content.appendChild(mediaEl);
        pageEl.appendChild(content);
        container.appendChild(pageEl);
        pages.push(pageEl);
        totalPages++;
      } catch (error) {
        console.error(`Error creating page for ${assetPath}:`, error);
      }
    });
  });

  console.log(`✅ Created ${totalPages} pages (${totalVideos} videos) across ${manifest.length} chapters`);
  return pages;
}

/**
 * Runtime portfolio loader for development
 * Loads portfolio data from JSON and injects it into the DOM
 */

export class PortfolioLoader {
  constructor() {
    this.portfolioData = null;
    this.isPreview = new URLSearchParams(window.location.search).has('preview');
  }

  async load() {
    if (!this.isPreview) {
      console.log('Preview mode not enabled. Use ?preview=true to load JSON at runtime.');
      return;
    }

    try {
      const response = await fetch('/data/portfolio.json');
      if (!response.ok) throw new Error('Failed to load portfolio data');
      
      this.portfolioData = await response.json();
      this.validateData();
      this.injectContent();
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  }

  validateData() {
    if (!this.portfolioData?.projects?.length) {
      throw new Error('Invalid portfolio data: missing projects array');
    }

    this.portfolioData.projects.forEach(project => {
      if (!project.id || !project.title || !Array.isArray(project.pages)) {
        throw new Error(`Invalid project data: ${JSON.stringify(project)}`);
      }

      project.pages.forEach(page => {
        if (!page.asset || !page.type || !page.commentary) {
          throw new Error(`Invalid page data: ${JSON.stringify(page)}`);
        }
      });
    });
  }

  injectContent() {
    const notepadInner = document.querySelector('#notepad-inner');
    if (!notepadInner) return;

    // Clear existing pages
    const existingPages = notepadInner.querySelectorAll('.page');
    existingPages.forEach(page => page.remove());

    // Generate new pages
    const pagesHTML = this.portfolioData.projects.map(project => {
      const projectPages = project.pages.map(page => this.generatePageHTML(project.id, page)).join('\n');
      
      return `
        <section id="${project.id}" class="chapter">
          <h2>${project.title}</h2>
          ${projectPages}
        </section>
      `;
    }).join('\n');

    // Insert before shadow element
    const shadow = notepadInner.querySelector('.notebook__shadow');
    if (shadow) {
      shadow.insertAdjacentHTML('beforebegin', pagesHTML);
    } else {
      notepadInner.insertAdjacentHTML('beforeend', pagesHTML);
    }

    // Initialize videos
    this.initializeVideos();
  }

  generatePageHTML(projectId, page) {
    const assetPath = `/src/assets/portfolio-pages/${projectId}/${page.asset}`;
    
    if (page.type === 'image') {
      return `
        <div class="page">
          <div class="notebook-container">
            <img src="${assetPath}" loading="lazy" alt="${page.commentary}" />
          </div>
          <div class="commentary">${page.commentary}</div>
        </div>
      `;
    } else {
      return `
        <div class="page">
          <div class="notebook-container">
            <video src="${assetPath}" loading="lazy" muted loop playsinline></video>
          </div>
          <div class="commentary">${page.commentary}</div>
        </div>
      `;
    }
  }

  initializeVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      // Load video when it's about to be visible
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              video.load();
              observer.unobserve(video);
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(video);
    });
  }
} 