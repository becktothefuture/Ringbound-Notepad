import { CHAPTERS } from './chapters.js';
import { jumpToPage } from './scrollEngine.js';

const TAB_WIDTH = 60; // in pixels
const TAB_HEIGHT = 30; // in pixels
const TAB_CASCADE_OFFSET = 5; // percentage of page width

/**
 * Initializes the chapter navigation system.
 * Creates tabs and attaches them to the corresponding pages.
 * @param {HTMLElement[]} pages - Array of all page DOM elements.
 * @param {HTMLElement} notepad - The main notepad container element.
 */
export function initChapters(pages, notepad) {
  // Calculate tab width and spacing based on page width
  const pageWidth = pages[0].offsetWidth;
  const tabWidth = Math.min(pageWidth * 0.15, 120); // 15% of page width, max 120px
  const totalTabs = CHAPTERS.length;
  const availableWidth = pageWidth - tabWidth; // Account for tab width
  const spacing = availableWidth / (totalTabs - 1); // Even spacing between tabs

  CHAPTERS.forEach((chapter, index) => {
    if (chapter.page < pages.length) {
      const pageElement = pages[chapter.page];
      const tab = document.createElement('div');
      tab.className = 'page-tab';
      tab.textContent = chapter.title;
      // Style the tab
      tab.style.backgroundColor = chapter.color;
      tab.style.width = `${tabWidth}px`;
      tab.style.height = `${TAB_HEIGHT}px`;
      tab.style.bottom = `-${TAB_HEIGHT / 1.5}px`;
      // Position tabs evenly across the page width
      const leftPosition = (spacing * index);
      tab.style.left = `${leftPosition}px`;
      // Add a subtle, more random rotation for each tab
      const rotation = (Math.random() * 8) - 4; // random between -4 and 4 degrees
      tab.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
      // Add SVG icon filling the tab
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', `0 0 ${tabWidth} ${TAB_HEIGHT}`);
      svg.style.display = 'block';
      // Placeholder: simple book icon
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', '5');
      rect.setAttribute('y', '5');
      rect.setAttribute('width', tabWidth - 10);
      rect.setAttribute('height', TAB_HEIGHT - 10);
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', '#fff8');
      rect.setAttribute('stroke', '#333');
      rect.setAttribute('stroke-width', '2');
      svg.appendChild(rect);
      tab.appendChild(svg);
      // Set CSS variable for z-index to ensure tabs stack correctly
      tab.style.setProperty('--tab-index', CHAPTERS.length - index);
      // Ensure tab is not affected by page shadows
      tab.style.setProperty('--shadow-overlay', '0');
      tab.style.setProperty('--shadow-blur', '0');
      tab.style.setProperty('--shadow-color', 'transparent');
      pageElement.appendChild(tab);
    }
  });
} 