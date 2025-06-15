import { CHAPTERS } from './chapters.js';
import { jumpToPage } from './scrollEngine.js';

const TAB_WIDTH = 60; // in pixels
const TAB_HEIGHT = 30; // in pixels
const TAB_CASCADE_OFFSET = 40; // in pixels

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
      tab.style.bottom = `-${TAB_HEIGHT / 1.5}px`;
      tab.style.left = `${10 + (index * TAB_CASCADE_OFFSET)}px`;
      // Add a subtle, more random rotation for each tab
      const rotation = (Math.random() * 8) - 4; // random between -4 and 4 degrees
      tab.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
      // Add SVG icon filling the tab
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', '0 0 60 30');
      svg.style.display = 'block';
      // Placeholder: simple book icon
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', '5');
      rect.setAttribute('y', '5');
      rect.setAttribute('width', '50');
      rect.setAttribute('height', '20');
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', '#fff8');
      rect.setAttribute('stroke', '#333');
      rect.setAttribute('stroke-width', '2');
      svg.appendChild(rect);
      tab.appendChild(svg);
      // Set CSS variable for z-index to ensure tabs stack correctly
      tab.style.setProperty('--tab-index', CHAPTERS.length - index);
      pageElement.appendChild(tab);
    }
  });
} 