// Configuration variables - adjust these to customize the behavior
const CONFIG = {
    // Animation settings
    rotationMax: -300, // Maximum rotation in degrees when page is fully flipped
    fadeStart: -180,   // Rotation angle where fade effect begins
    fadeEnd: -270,     // Rotation angle where fade effect ends
    blurMax: 10,       // Maximum blur amount in pixels
    // Depth effect settings
    zOffset: -0.5,     // Z-axis offset per page (creates stack effect)
    yOffset: -0.25,    // Y-axis offset per page (enhances stack effect)
    // Performance settings
    useRAF: true,      // Use requestAnimationFrame for smoother animations
    // Debug settings
    showDebug: false,  // Show debug information
    // Accessibility
    announcePageChanges: true // Announce page changes to screen readers
};

// Core elements and cached values
let pad, pages, pageCount, totalHeight, pageHeight;
let isInitialized = false;
let currentPage = 0;

// Transform template for better performance
const createTransform = (z, y, rotation) => 
    `translateZ(${z}px) translateY(${y}px) rotateX(${rotation}deg)`;

/**
 * Initialize the notepad with error handling
 * @returns {boolean} Whether initialization was successful
 */
function initializeNotepad() {
    try {
        // Get core elements
        pad = document.querySelector('.notepad');
        if (!pad) throw new Error('Notepad element not found');

        pages = document.querySelectorAll('.page');
        if (!pages.length) throw new Error('No pages found');

        // Cache values
        pageCount = pages.length;
        pageHeight = window.innerHeight;
        totalHeight = pageCount * pageHeight;

        // Set initial transforms and ARIA attributes
        pages.forEach((page, index) => {
            // Set initial transform
            page.style.transform = createTransform(
                CONFIG.zOffset * index,
                CONFIG.yOffset * index,
                0
            );

            // Add ARIA attributes
            page.setAttribute('role', 'region');
            page.setAttribute('aria-label', `Page ${index + 1} of ${pageCount}`);
            page.setAttribute('tabindex', '0');
        });

        // Add keyboard navigation instructions
        const instructions = document.createElement('div');
        instructions.setAttribute('role', 'status');
        instructions.setAttribute('aria-live', 'polite');
        instructions.className = 'sr-only';
        instructions.textContent = 'Use arrow keys, page up/down, or space to navigate pages';
        document.body.appendChild(instructions);

        // Initialize debug panel if enabled
        if (CONFIG.showDebug) {
            initializeDebugPanel();
        }

        // Handle window resize
        window.addEventListener('resize', handleResize, { passive: true });

        isInitialized = true;
        return true;
    } catch (error) {
        console.error('Failed to initialize notepad:', error);
        return false;
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    pageHeight = window.innerHeight;
    totalHeight = pageCount * pageHeight;
    updatePages();
}

/**
 * Update page transforms and effects based on scroll position
 */
function updatePages() {
    if (!isInitialized) return;

    const scrollTop = pad.scrollTop;
    
    // Handle infinite scroll loop
    if (scrollTop >= totalHeight) {
        pad.scrollTop = 0;
        return;
    }
    
    // Calculate current page for accessibility
    const newPage = Math.floor(scrollTop / pageHeight);
    if (newPage !== currentPage && CONFIG.announcePageChanges) {
        announcePageChange(newPage);
    }
    currentPage = newPage;
    
    // Update each page's transform and effects
    pages.forEach((page, index) => {
        // Calculate progress through the current page (0 to 1)
        const progress = Math.max(0, Math.min(1, 
            (scrollTop - index * pageHeight) / pageHeight
        ));
        
        // Calculate rotation based on progress
        const rotation = progress * CONFIG.rotationMax;
        
        // Apply transforms for 3D effect
        page.style.transform = createTransform(
            CONFIG.zOffset * index,
            CONFIG.yOffset * index,
            rotation
        );
        
        // Handle fade and blur effects when page is rotated past fadeStart
        if (rotation <= CONFIG.fadeStart) {
            // Calculate fade progress (0 to 1)
            const fadeProgress = Math.min(1, 
                (-rotation - Math.abs(CONFIG.fadeStart)) / 
                (Math.abs(CONFIG.fadeEnd) - Math.abs(CONFIG.fadeStart))
            );
            // Apply cubic ease-out to fade
            const fadeEase = 1 - Math.pow(1 - fadeProgress, 1.7);
            page.style.opacity = 1 - fadeEase;
            page.style.filter = `blur(${fadeEase * CONFIG.blurMax}px)`;
        } else {
            // Reset effects when page is not fading
            page.style.opacity = 1;
            page.style.filter = 'none';
        }
    });
}

/**
 * Announce page changes to screen readers
 */
function announcePageChange(pageNumber) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Page ${pageNumber + 1} of ${pageCount}`;
    document.body.appendChild(announcement);
    // Remove after announcement
    setTimeout(() => announcement.remove(), 1000);
}

/**
 * Initialize debug panel to show scroll position
 */
function initializeDebugPanel() {
    const debug = document.createElement('div');
    debug.className = 'debug-info';
    document.body.appendChild(debug);
    
    function updateDebug() {
        debug.textContent = `Scroll: ${Math.round(pad.scrollTop)}px / ${totalHeight}px`;
    }
    
    pad.addEventListener('scroll', updateDebug, { passive: true });
    updateDebug();
}

// Initialize the notepad
if (!initializeNotepad()) {
    console.error('Notepad initialization failed');
}

// Scroll event handler with performance optimization
pad.addEventListener('scroll', () => {
    if (CONFIG.useRAF) {
        requestAnimationFrame(updatePages);
    } else {
        updatePages();
    }
}, { passive: true });

/**
 * Handle keyboard navigation
 * Supports arrow keys, page up/down, and space
 */
document.addEventListener('keydown', (e) => {
    if (!isInitialized) return;

    const pageHeight = window.innerHeight;
    switch(e.key) {
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
            e.preventDefault();
            pad.scrollBy({ top: pageHeight, behavior: 'smooth' });
            break;
        case 'ArrowUp':
        case 'PageUp':
            e.preventDefault();
            pad.scrollBy({ top: -pageHeight, behavior: 'smooth' });
            break;
    }
});

/**
 * Handle click/tap navigation
 * Clicking the notepad area advances to next page
 */
pad.addEventListener('click', (e) => {
    if (!isInitialized || e.target !== pad) return;
    
    const pageHeight = window.innerHeight;
    pad.scrollBy({ top: pageHeight, behavior: 'smooth' });
});

/**
 * Add haptic feedback for touch devices
 * Provides subtle vibration when scrolling
 */
if ('vibrate' in navigator) {
    pad.addEventListener('scroll', () => {
        navigator.vibrate(15);
    }, { passive: true });
}

// Add CSS for screen reader only class
const style = document.createElement('style');
style.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
`;
document.head.appendChild(style); 