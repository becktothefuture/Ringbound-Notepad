// src/portfolioLoader.js
// Utility to dynamically create page elements and chapter definitions
// based on the automatically-generated manifest (see build.cjs).

import { CHAPTERS } from './chapters.js';

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

  manifest.forEach((chapter, chapterIdx) => {
    // Register chapter start page index before we start adding its pages
    const chapterStartPage = pages.length;
    const color = chapter.color || randomPastelColor(chapterIdx);

    CHAPTERS.push({
      title: chapter.title || `Chapter ${chapterIdx + 1}`,
      page: chapterStartPage, // index within the final pages array
      color
    });

    chapter.pages.forEach((mediaSrc, mediaIdx) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'page';
      pageEl.dataset.deckNumber = String(pages.length + 1).padStart(2, '0');

      const content = document.createElement('div');
      content.className = 'page-content';

      const isVideo = /\.(mp4|webm|mov)$/i.test(mediaSrc);
      let mediaEl;
      if (isVideo) {
        const video = document.createElement('video');
        video.src = mediaSrc;
        video.autoplay = true;
        video.loop = true;
        video.muted = true; // ensure autoplay works without user gesture
        video.playsInline = true;
        mediaEl = video;
      } else {
        const img = document.createElement('img');
        img.src = mediaSrc;
        img.alt = `${chapter.title || `Chapter ${chapterIdx + 1}`} – Page ${mediaIdx + 1}`;
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
    });
  });

  return pages;
} 