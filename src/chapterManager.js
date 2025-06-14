import { CHAPTERS } from './chapters.js';
import { jumpToPage } from './scrollEngine.js';

const TAB_WIDTH = 80; // in pixels
const TAB_HEIGHT = 40; // in pixels
const TAB_CASCADE_OFFSET = 50; // in pixels

/**
 * Initializes the chapter navigation system.
 * Creates tabs and attaches them to the corresponding pages.
 * @param {HTMLElement[]} pages - Array of all page DOM elements.
 * @param {HTMLElement} notepad - The main notepad container element.
 */
export function initChapters(pages, notepad) {
  CHAPTERS.forEach((chapter, index) => {
    if (chapter.page < pages.length) {
      const pageElement = pages[chapter.page];
      const tab = document.createElement('div');
      tab.className = 'page-tab';
      tab.textContent = chapter.title;
      // Style the tab
      tab.style.backgroundColor = chapter.color;
      tab.style.width = `${TAB_WIDTH}px`;
      tab.style.height = `${TAB_HEIGHT}px`;
      tab.style.bottom = `-${TAB_HEIGHT / 2}px`;
      tab.style.left = `${10 + (index * TAB_CASCADE_OFFSET)}px`;
      // Set CSS variable for z-index to ensure tabs stack correctly
      tab.style.setProperty('--tab-index', CHAPTERS.length - index);
      pageElement.appendChild(tab);
    }
  });
} 