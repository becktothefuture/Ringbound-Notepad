import { CHAPTERS } from './chapters.js';
import { jumpToPage } from './scrollEngine.js';

const TAB_HEIGHT_PERCENT = 8; // percentage of page height
const TAB_SPACING_PERCENT = 2; // percentage spacing between tabs

/**
 * Initializes the chapter navigation system.
 * Creates tabs and attaches them to the corresponding pages.
 * @param {HTMLElement[]} pages - Array of all page DOM elements.
 * @param {HTMLElement} notebook - The main notebook container element.
 */
export function initChapters(pages, notebook) {
  const totalTabs = CHAPTERS.length;
  
  // Calculate tab dimensions using percentage-based logic
  // If we have N tabs, we have (N-1) gaps between them
  const totalGaps = totalTabs - 1;
  const totalSpacingPercent = totalGaps * TAB_SPACING_PERCENT;
  const availableWidthPercent = 100 - totalSpacingPercent;
  const tabWidthPercent = availableWidthPercent / totalTabs;
  
  console.log(`📐 Tab calculations: ${totalTabs} tabs, ${tabWidthPercent.toFixed(1)}% each, ${TAB_SPACING_PERCENT}% spacing, ${TAB_HEIGHT_PERCENT}% height`);

  CHAPTERS.forEach((chapter, index) => {
    if (chapter.page < pages.length) {
      const pageElement = pages[chapter.page];
      const tab = document.createElement('div');
      tab.className = 'page-tab';
      tab.textContent = chapter.title;
      
      // Style the tab with percentage-based positioning and sizing
      tab.style.backgroundColor = chapter.color;
      tab.style.width = `${tabWidthPercent}%`;
      tab.style.height = `${TAB_HEIGHT_PERCENT}%`;
      tab.style.bottom = `-${TAB_HEIGHT_PERCENT * 0.75}%`; // Make tabs stick out more (also percentage-based)
      
      // Position tabs evenly using percentages
      // First tab starts at 0%, subsequent tabs positioned with spacing
      const leftPositionPercent = index * (tabWidthPercent + TAB_SPACING_PERCENT);
      tab.style.left = `${leftPositionPercent}%`;
      
      // Add a subtle, more random rotation for each tab
      const rotation = (Math.random() * 8) - 4; // random between -4 and 4 degrees
      tab.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
      
      // Set tab background image if available
      if (chapter.tabImage) {
        tab.style.backgroundImage = `url('assets/portfolio-pages/chapter-tabs/${chapter.tabImage}')`;
        tab.classList.add('tab-with-image');
      } else {
        // Fallback: simple SVG icon for chapters without tab images
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 100 100`);
        svg.style.display = 'block';
        
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', '10');
        rect.setAttribute('y', '25');
        rect.setAttribute('width', '80');
        rect.setAttribute('height', '50');
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', '#fff8');
        rect.setAttribute('stroke', '#333');
        rect.setAttribute('stroke-width', '3');
        svg.appendChild(rect);
        tab.appendChild(svg);
      }
      
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