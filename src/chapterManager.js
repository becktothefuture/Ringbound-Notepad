import { CHAPTERS } from './chapters.js';
import { ApplicationState } from './app.js';

console.log('📑 ChapterManager imports check:');
console.log('  - CHAPTERS imported:', typeof CHAPTERS, CHAPTERS);
console.log('  - ApplicationState imported:', typeof ApplicationState, ApplicationState);

const TAB_HEIGHT_PERCENT = 8; // percentage of page height
const TAB_SPACING_PERCENT = 2; // percentage spacing between tabs

// Global state for chapter navigation
let currentChapterIndex = 0;
let isInitialized = false;

/**
 * Get the CSS variable value for tab safe area horizontal padding
 * @returns {number} Safe area padding in pixels
 */
function getTabSafeAreaHorizontal() {
  const rootStyle = getComputedStyle(document.documentElement);
  const safeAreaValue = rootStyle.getPropertyValue('--tab-safe-area-horizontal').trim();
  return parseInt(safeAreaValue, 10) || 8; // fallback to 8px
}

/**
 * Navigate to next chapter (TAB key)
 */
function navigateToNextChapter() {
  if (CHAPTERS.length === 0) {
    console.warn('⚠️ No chapters available for navigation');
    return;
  }
  
  currentChapterIndex = (currentChapterIndex + 1) % CHAPTERS.length;
  const targetChapter = CHAPTERS[currentChapterIndex];
  
  console.log(`📑 TAB Navigation: ${targetChapter.title} (page ${targetChapter.page})`);
  try {
    if (ApplicationState.scrollEngine && ApplicationState.scrollEngine.jumpToPage) {
      ApplicationState.scrollEngine.jumpToPage(targetChapter.page);
      console.log('✅ TAB jumpToPage called successfully');
    } else {
      console.error('❌ ScrollEngine not available in ApplicationState');
    }
  } catch (error) {
    console.error('❌ TAB jumpToPage failed:', error);
  }
}

/**
 * Navigate to previous chapter (Shift+TAB)
 */
function navigateToPreviousChapter() {
  if (CHAPTERS.length === 0) {
    console.warn('⚠️ No chapters available for navigation');
    return;
  }
  
  currentChapterIndex = (currentChapterIndex - 1 + CHAPTERS.length) % CHAPTERS.length;
  const targetChapter = CHAPTERS[currentChapterIndex];
  
  console.log(`📑 Shift+TAB Navigation: ${targetChapter.title} (page ${targetChapter.page})`);
  try {
    if (ApplicationState.scrollEngine && ApplicationState.scrollEngine.jumpToPage) {
      ApplicationState.scrollEngine.jumpToPage(targetChapter.page);
      console.log('✅ Shift+TAB jumpToPage called successfully');
    } else {
      console.error('❌ ScrollEngine not available in ApplicationState');
    }
  } catch (error) {
    console.error('❌ Shift+TAB jumpToPage failed:', error);
  }
}

/**
 * Handle global keyboard navigation for chapter cycling
 * @param {Event} event - Keyboard event
 */
function handleGlobalKeydown(event) {
  if (!isInitialized || CHAPTERS.length === 0) {
    if (event.key === 'Tab') {
      console.log('🎯 TAB key pressed but chapters not initialized or no chapters available');
    }
    return;
  }
  
  // Handle TAB key for chapter navigation
  if (event.key === 'Tab') {
    console.log('🎯 TAB key detected, activeElement:', document.activeElement);
    
    // Prevent default tab behavior when not focusing on interactive elements
    const activeElement = document.activeElement;
    const isOnTab = activeElement && activeElement.closest('.page-tab');
    
    console.log('🎯 Is focus on tab?', isOnTab);
    
    if (!isOnTab) {
      console.log('🎯 Preventing default TAB behavior and triggering chapter navigation');
      event.preventDefault();
      
      if (event.shiftKey) {
        console.log('🎯 Shift+TAB detected');
        navigateToPreviousChapter();
      } else {
        console.log('🎯 TAB detected');
        navigateToNextChapter();
      }
    } else {
      console.log('🎯 TAB focus on tab element, allowing normal browser behavior');
    }
  }
}

/**
 * Handle tab click events for chapter navigation
 * @param {Event} event - Click event
 */
function handleTabClick(event) {
  const tab = event.target.closest('.page-tab');
  if (!tab) return;

  console.log('🎯 Tab clicked:', tab, 'Dataset:', tab.dataset);

  // Get the chapter data from the tab's data attribute
  const chapterIndex = parseInt(tab.dataset.chapterIndex, 10);
  if (isNaN(chapterIndex) || chapterIndex < 0 || chapterIndex >= CHAPTERS.length) {
    console.warn('⚠️ Invalid chapter index:', chapterIndex, 'CHAPTERS:', CHAPTERS);
    return;
  }

  // Update current chapter index for TAB navigation continuity
  currentChapterIndex = chapterIndex;
  const targetChapter = CHAPTERS[chapterIndex];
  console.log(`📑 Click Navigation: ${targetChapter.title} (page ${targetChapter.page})`);

  // Use jumpToPage to navigate with smooth animation
  try {
    if (ApplicationState.scrollEngine && ApplicationState.scrollEngine.jumpToPage) {
      ApplicationState.scrollEngine.jumpToPage(targetChapter.page);
      console.log('✅ jumpToPage called successfully');
    } else {
      console.error('❌ ScrollEngine not available in ApplicationState');
    }
  } catch (error) {
    console.error('❌ jumpToPage failed:', error);
    console.log('Scroll engine available:', typeof ApplicationState.scrollEngine);
  }

  // Prevent any other click handlers
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Handle tab keyboard events for accessibility
 * @param {Event} event - Keyboard event
 */
function handleTabKeydown(event) {
  const tab = event.target.closest('.page-tab');
  if (!tab) return;

  // Handle Enter or Space key
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    
    // Trigger the same navigation as click
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    tab.dispatchEvent(clickEvent);
  }
}

/**
 * Initialize tab click handlers and global keyboard navigation
 * @param {HTMLElement} notebook - The main notebook container element
 */
function initTabClickHandlers(notebook) {
  // Add test event listener to verify event delegation is working
  notebook.addEventListener('click', (event) => {
    console.log('🎯 Notebook click detected on:', event.target);
    console.log('🎯 Closest .page-tab:', event.target.closest('.page-tab'));
  }, false);

  // Use event delegation for better performance and automatic handling of dynamic tabs
  notebook.addEventListener('click', handleTabClick, true);
  notebook.addEventListener('keydown', handleTabKeydown, true);
  
  // Add global keyboard handler for TAB navigation
  document.addEventListener('keydown', handleGlobalKeydown, true);
  
  console.log('🎯 Tab click, keyboard, and global TAB navigation handlers initialized');
  console.log('🎯 Event listeners attached to notebook:', notebook.id, notebook.className);
}

/**
 * Initializes the chapter navigation system.
 * Creates tabs and attaches them to the corresponding pages.
 * @param {HTMLElement[]} pages - Array of all page DOM elements.
 * @param {HTMLElement} notebook - The main notebook container element.
 */
export function initChapters(pages, notebook) {
  console.log('🔍 Chapter initialization debug:');
  console.log('  - CHAPTERS array:', CHAPTERS);
  console.log('  - CHAPTERS length:', CHAPTERS.length);
  console.log('  - Pages array length:', pages.length);
  
  const totalTabs = CHAPTERS.length;
  
  if (totalTabs === 0) {
    console.warn('⚠️ No chapters found - skipping tab initialization');
    console.log('This might indicate the portfolio data hasn\'t been loaded yet');
    return;
  }
  
  // Get safe area padding and convert to percentage based on page width
  const safeAreaPx = getTabSafeAreaHorizontal();
  // Assume page width is container width for calculation
  const pageElement = pages[0];
  const pageWidth = pageElement ? pageElement.offsetWidth : 800; // fallback
  const safeAreaPercent = (safeAreaPx / pageWidth) * 100; // Single safe area for positioning

  // Calculate tab dimensions using percentage-based logic with safe area
  // If we have N tabs, we have (N-1) gaps between them
  const totalGaps = totalTabs - 1;
  const totalSpacingPercent = totalGaps * TAB_SPACING_PERCENT;
  const totalSafeAreaPercent = safeAreaPercent * 2; // left + right safe areas
  const availableWidthPercent = 100 - totalSpacingPercent - totalSafeAreaPercent;
  const tabWidthPercent = availableWidthPercent / totalTabs;

  console.log(
    `📐 Tab calculations: ${totalTabs} tabs, ${tabWidthPercent.toFixed(1)}% each, ${TAB_SPACING_PERCENT}% spacing, ${TAB_HEIGHT_PERCENT}% height, ${totalSafeAreaPercent.toFixed(1)}% total safe area`
  );

  CHAPTERS.forEach((chapter, index) => {
    if (chapter.page < pages.length) {
      const pageElement = pages[chapter.page];
      const tab = document.createElement('div');
      tab.className = 'page-tab';
      tab.textContent = chapter.title;
      
      // Store chapter index for click handling
      tab.dataset.chapterIndex = index;
      tab.setAttribute('aria-label', `Jump to ${chapter.title}`);
      tab.setAttribute('role', 'button');
      tab.setAttribute('tabindex', '0');

      // Style the tab with percentage-based positioning and sizing
      tab.style.backgroundColor = chapter.color;
      tab.style.width = `${tabWidthPercent}%`;
      tab.style.height = `${TAB_HEIGHT_PERCENT}%`;
      tab.style.bottom = `-${TAB_HEIGHT_PERCENT * 0.75}%`; // Make tabs stick out more (also percentage-based)

      // Position tabs evenly using percentages, starting after the safe area
      // First tab starts at safe area offset, subsequent tabs positioned with spacing
      const leftPositionPercent = safeAreaPercent + index * (tabWidthPercent + TAB_SPACING_PERCENT);
      tab.style.left = `${leftPositionPercent}%`;

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

  // Initialize click handlers after all tabs are created
  initTabClickHandlers(notebook);
  
  // Mark as initialized and set starting chapter
  isInitialized = true;
  currentChapterIndex = 0; // Start with first chapter
  
  console.log('📑 Chapter navigation system ready');
  console.log('💡 TIP: Use TAB/Shift+TAB to navigate between chapters');
}
