/**
 * PRELOADER SYSTEM FOR 3D NOTEBOOK PORTFOLIO
 * 
 * Implements intelligent asset preloading and lazy loading to optimize initial page load:
 * 1. Shows spinner until critical assets (cover + buffer pages) are loaded
 * 2. Uses Intersection Observer for lazy loading remaining assets
 * 3. Manages video playback based on page visibility
 * 4. Maintains current buffering logic for performance
 * 
 * @author Alexander Beck
 * @version 1.0.0
 */

import { GLOBAL_CONFIG } from './config.js';

/**
 * Preloader state management
 */
const PreloaderState = {
  isLoading: true,
  spinner: null,
  lazyLoadObserver: null,
  videoPlaybackObserver: null,
  loadedAssets: new Set(),
  criticalAssets: [],
  totalAssets: 0,
  loadTimeout: null,
  startTime: null,
  minDisplayTime: 1000, // Minimum 1 second display time
};

/**
 * Create and inject preloader spinner overlay
 */
function createSpinnerOverlay() {
  const preloaderHTML = `
    <div id="preloader" class="preloader">
      <div class="preloader__spinner">
        <div class="spinner-ring"></div>
        <div class="preloader__text">Loading Portfolio...</div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
  PreloaderState.spinner = document.getElementById('preloader');
  PreloaderState.startTime = Date.now(); // Record when preloader started
  
  console.log('🔄 Preloader spinner created');
}

/**
 * Hide preloader and fade in the notebook scene
 * Ensures minimum 1 second display time before hiding
 */
function hidePreloader() {
  if (!PreloaderState.spinner) return;
  
  const elapsedTime = Date.now() - PreloaderState.startTime;
  const remainingTime = Math.max(0, PreloaderState.minDisplayTime - elapsedTime);
  
  console.log(`✅ Hiding preloader after ${elapsedTime}ms (waiting ${remainingTime}ms more for minimum display time)`);
  
  // Wait for minimum display time if needed
  setTimeout(() => {
    // Start fade out of preloader
    PreloaderState.spinner.style.opacity = '0';
    
    // Simultaneously start fade in of notebook content
    const notebook = document.querySelector('.notebook');
    const pageWrapper = document.querySelector('.page-wrapper');
    
    if (notebook) {
      notebook.style.opacity = '1';
    }
    
    if (pageWrapper) {
      pageWrapper.style.opacity = '1';
    }
    
    // After fade transition, remove preloader element
    setTimeout(() => {
      PreloaderState.spinner.style.display = 'none';
      PreloaderState.isLoading = false;
      
      // Trigger hint overlay to appear (it will be initialized by the main app)
      // The overlay.js module will handle showing hints after preloader is done
      console.log('💡 Preloader done, overlay hints can now be shown by main app');
    }, 500); // Match the longer fade transition duration
    
  }, remainingTime);
}

/**
 * Create Intersection Observer for lazy loading assets
 * Uses larger root margin to preload assets before they're visible
 */
function createLazyLoadObserver() {
  const options = {
    root: null,
    rootMargin: '200px', // Load assets 200px before they enter viewport
    threshold: 0
  };
  
  PreloaderState.lazyLoadObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadPageAssets(entry.target);
      } else {
        // Optionally unload heavy assets when far away
        unloadPageAssets(entry.target);
      }
    });
  }, options);
  
  console.log('👁️ Lazy load observer created with 200px margin');
}

/**
 * Create Intersection Observer for video playback management
 * Videos start playing just before page is revealed, pause when flipped away
 */
function createVideoPlaybackObserver() {
  const options = {
    root: null,
    rootMargin: '50px', // Start playing videos 50px before visible
    threshold: 0.1
  };
  
  PreloaderState.videoPlaybackObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('video');
      if (!video) return;
      
      if (entry.isIntersecting) {
        // Page with video is becoming visible - start playing
        if (video.paused) {
          video.play().catch(err => {
            console.warn('Video autoplay prevented:', err);
          });
          console.log('▶️ Video started for page entering view');
        }
      } else {
        // Page with video is going away - pause to save resources
        if (!video.paused) {
          video.pause();
          console.log('⏸️ Video paused for page leaving view');
        }
      }
    });
  }, options);
  
  console.log('🎬 Video playback observer created');
}

/**
 * Load assets for a specific page element
 * @param {HTMLElement} pageElement - Page element to load assets for
 */
function loadPageAssets(pageElement) {
  const images = pageElement.querySelectorAll('img[data-src]');
  const videos = pageElement.querySelectorAll('video[data-src]');
  
  // Load images
  images.forEach(img => {
    if (img.dataset.src && !img.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      console.log('🖼️ Image loaded:', img.src.split('/').pop());
    }
  });
  
  // Load videos
  videos.forEach(video => {
    if (video.dataset.src && !video.src) {
      video.src = video.dataset.src;
      video.preload = 'auto';
      video.removeAttribute('data-src');
      
      // Set poster if available
      if (video.dataset.poster) {
        video.poster = video.dataset.poster;
        video.removeAttribute('data-poster');
      }
      
      console.log('🎬 Video loaded:', video.src.split('/').pop());
    }
  });
}

/**
 * Unload heavy assets when page is far from viewport (memory optimization)
 * @param {HTMLElement} pageElement - Page element to potentially unload
 */
function unloadPageAssets(pageElement) {
  // Only unload if page is very far from current scroll position
  const pageIndex = parseInt(pageElement.dataset.pageIndex) || 0;
  const currentScroll = window.scrollY || 0;
  const maxBuffer = GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages * 2;
  
  // For now, only unload videos to save memory - keep images cached
  const videos = pageElement.querySelectorAll('video[src]');
  videos.forEach(video => {
    if (video.src && !video.dataset.critical) {
      video.pause();
      video.currentTime = 0;
      // Optionally clear src to free memory (aggressive unloading)
      // video.removeAttribute('src');
      console.log('💾 Video paused and reset for memory optimization');
    }
  });
}

/**
 * Get critical assets that need to be preloaded before showing the notebook
 * @param {HTMLElement[]} pages - All page elements
 * @returns {Promise<void>[]} Array of promises for critical asset loading
 */
function getCriticalAssetPromises(pages) {
  const criticalPages = pages.slice(0, GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages + 1);
  const promises = [];
  
  criticalPages.forEach((page, index) => {
    // Mark as critical for memory management
    page.dataset.critical = 'true';
    
    // Get all media elements that need preloading
    const images = page.querySelectorAll('img[data-src]');
    const videos = page.querySelectorAll('video[data-src]');
    
    // Create promises for image loading
    images.forEach(img => {
      const promise = new Promise((resolve, reject) => {
        const tempImg = new Image();
        tempImg.onload = () => {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          PreloaderState.loadedAssets.add(img.dataset.src || img.src);
          resolve();
        };
        tempImg.onerror = reject;
        tempImg.src = img.dataset.src;
      });
      promises.push(promise);
    });
    
    // Create promises for video loading
    videos.forEach(video => {
      const promise = new Promise((resolve, reject) => {
        const tempVideo = document.createElement('video');
        tempVideo.oncanplaythrough = () => {
          video.src = video.dataset.src;
          video.preload = 'auto';
          video.removeAttribute('data-src');
          
          if (video.dataset.poster) {
            video.poster = video.dataset.poster;
            video.removeAttribute('data-poster');
          }
          
          PreloaderState.loadedAssets.add(video.dataset.src || video.src);
          resolve();
        };
        tempVideo.onerror = reject;
        tempVideo.src = video.dataset.src;
      });
      promises.push(promise);
    });
  });
  
  console.log(`📋 Created ${promises.length} critical asset promises for ${criticalPages.length} pages`);
  return promises;
}

/**
 * Initialize preloader system
 * @param {HTMLElement[]} pages - All page elements
 * @returns {Promise<void>} Promise that resolves when initial assets are loaded
 */
export async function initPreloader(pages) {
  console.log('🚀 Initializing preloader system...');
  
  // Create spinner overlay
  createSpinnerOverlay();
  
  // Create observers for lazy loading and video management
  createLazyLoadObserver();
  createVideoPlaybackObserver();
  
  // Observe all pages for lazy loading (but don't load them yet)
  pages.forEach(page => {
    PreloaderState.lazyLoadObserver.observe(page);
    
    // Observe pages with videos for playback management
    const hasVideo = page.querySelector('video');
    if (hasVideo) {
      PreloaderState.videoPlaybackObserver.observe(page);
    }
  });
  
  // Get critical assets that need to load before reveal
  const criticalPromises = getCriticalAssetPromises(pages);
  PreloaderState.totalAssets = criticalPromises.length;
  
  // Set timeout fallback (7 seconds as requested)
  PreloaderState.loadTimeout = setTimeout(() => {
    console.warn('⏰ Preloader timeout reached, forcing reveal after 7 seconds');
    hidePreloader();
  }, 7000);
  
  try {
    // Wait for all critical assets to load
    console.log(`⏳ Loading ${criticalPromises.length} critical assets...`);
    await Promise.allSettled(criticalPromises);
    
    // Clear timeout since we finished loading
    if (PreloaderState.loadTimeout) {
      clearTimeout(PreloaderState.loadTimeout);
    }
    
    console.log(`✅ Critical assets loaded: ${PreloaderState.loadedAssets.size}/${PreloaderState.totalAssets}`);
    
    // Hide preloader and reveal notebook
    hidePreloader();
    
  } catch (error) {
    console.error('❌ Error loading critical assets:', error);
    // Still hide preloader to prevent hanging
    hidePreloader();
  }
}

/**
 * Cleanup preloader resources
 */
export function cleanupPreloader() {
  if (PreloaderState.lazyLoadObserver) {
    PreloaderState.lazyLoadObserver.disconnect();
  }
  
  if (PreloaderState.videoPlaybackObserver) {
    PreloaderState.videoPlaybackObserver.disconnect();
  }
  
  if (PreloaderState.loadTimeout) {
    clearTimeout(PreloaderState.loadTimeout);
  }
  
  console.log('🧹 Preloader cleanup completed');
}

/**
 * Check if preloader is still active
 * @returns {boolean} True if still loading
 */
export function isPreloaderActive() {
  return PreloaderState.isLoading;
} 