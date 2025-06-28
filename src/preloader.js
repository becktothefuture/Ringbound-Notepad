/**
 * PRELOADER SYSTEM FOR 3D NOTEBOOK PORTFOLIO - SEQUENTIAL CHAPTER LOADING
 * 
 * Implements intelligent sequential asset preloading optimized for graphics performance:
 * 1. Shows spinner until 50% of assets are preloaded (was critical assets only)
 * 2. Loads assets in exact book order: Chapter 1 → Chapter 2 → etc.
 * 3. Continues background loading at reduced speed after reveal
 * 4. Completely detached from viewport performance system
 * 5. Uses modern performance techniques and best practices
 * 
 * @author Alexander Beck
 * @version 2.0.0
 */

import { GLOBAL_CONFIG } from './config.js';

/**
 * Safely set video poster only if the file exists
 * @param {HTMLVideoElement} video - Video element
 * @param {string} posterPath - Path to poster image
 */
function setPosterSafely(video, posterPath) {
  // Create a temporary image to test if poster exists
  const testImg = new Image();
  testImg.onload = () => {
    // Poster exists, safe to set
    video.poster = posterPath;
  };
  testImg.onerror = () => {
    // Poster doesn't exist, skip silently
    console.log(`ℹ️ Poster not found (skipping): ${posterPath.split('/').pop()}`);
  };
  testImg.src = posterPath;
}

/**
 * Enhanced Preloader state management for sequential loading
 */
const PreloaderState = {
  isLoading: true,
  spinner: null,
  lazyLoadObserver: null,
  videoPlaybackObserver: null,
  
  // Sequential loading state
  totalAssets: 0,
  loadedAssets: 0,
  targetLoadPercentage: 50, // Show page when 50% loaded
  isBackgroundLoading: false,
  backgroundLoadSpeed: 0.5, // Reduced speed multiplier for background loading
  
  // Asset queues for sequential loading
  assetQueue: [],
  currentChapter: 0,
  chaptersData: [],
  
  // Performance and timing
  loadTimeout: null,
  startTime: null,
  minDisplayTime: 1000, // Minimum 1 second display time
  revealTime: null,
  
  // Background loading control
  backgroundLoadInterval: null,
  backgroundLoadDelay: 150, // ms between background loads (reduced speed)
};

/**
 * Create and inject preloader spinner overlay with progress indicator
 */
function createSpinnerOverlay() {
  const preloaderHTML = `
    <div id="preloader" class="preloader">
      <div class="preloader__progress-bar-container">
        <div class="preloader__progress-bar">
          <div class="preloader__progress-fill"></div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
  PreloaderState.spinner = document.getElementById('preloader');
  PreloaderState.startTime = Date.now();
  
  // Set initial progress to 25%
  setTimeout(() => {
    updateProgress(25);
  }, 100);
  
  console.log('🔄 Sequential preloader created with large progress bar starting at 25%');
}

/**
 * Update progress bar and text
 * @param {number} percentage - Progress percentage (0-100)
 */
function updateProgress(percentage) {
  const progressFill = document.querySelector('.preloader__progress-fill');
  
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
}

/**
 * Hide preloader and reveal notebook
 */
function hidePreloader() {
  if (!PreloaderState.spinner) return;
  
  const elapsedTime = Date.now() - PreloaderState.startTime;
  const remainingTime = Math.max(0, PreloaderState.minDisplayTime - elapsedTime);
  
  PreloaderState.revealTime = Date.now();
  
  setTimeout(() => {
    const notebook = document.querySelector('.notebook');
    
    if (PreloaderState.spinner) {
      PreloaderState.spinner.style.opacity = '0';
      PreloaderState.spinner.style.pointerEvents = 'none';
    }
    
    if (notebook) {
      notebook.style.opacity = '1';
      // Don't override transition - let CSS handle both transform and opacity transitions
    }
    
    // Start background loading if not already started
    if (!PreloaderState.isBackgroundLoading) {
      startBackgroundLoading();
    }
    
    // Clean up after transition
    setTimeout(() => {
      if (PreloaderState.spinner && PreloaderState.spinner.parentNode) {
        PreloaderState.spinner.parentNode.removeChild(PreloaderState.spinner);
        PreloaderState.spinner = null;
      }
      PreloaderState.isLoading = false;
      
      console.log('💡 Preloader done, overlay hints can now be shown by main app');
      
      // Notify the main app that preloader is complete
      document.dispatchEvent(new CustomEvent('preloader:complete'));
    }, 500);
    
  }, remainingTime);
}

/**
 * Create Intersection Observer for lazy loading remaining assets
 */
function createLazyLoadObserver() {
  const options = {
    root: null,
    rootMargin: '100px', // Reduced margin for better performance
    threshold: 0
  };
  
  PreloaderState.lazyLoadObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadPageAssets(entry.target);
      } else {
        // Unload heavy assets when far away (performance optimization)
        unloadPageAssets(entry.target);
      }
    });
  }, options);
  
  console.log('👁️ Lazy load observer created with 100px margin');
}

/**
 * Create video playback observer for performance management
 */
function createVideoPlaybackObserver() {
  const options = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };
  
  PreloaderState.videoPlaybackObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('video');
      if (!video) return;
      
      if (entry.isIntersecting) {
        // Video entering view - try to play
        if (video.paused && video.readyState >= 2) {
          video.play().catch(error => {
            console.log('Video autoplay prevented:', error);
          });
        }
        console.log('▶️ Video started for page entering view');
      } else {
        // Video leaving view - pause and reset for memory optimization
        if (!video.paused) {
          video.pause();
          video.currentTime = 0;
          console.log('💾 Video paused and reset for memory optimization');
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
        setPosterSafely(video, video.dataset.poster);
        video.removeAttribute('data-poster');
      }
      
      console.log('🎬 Video loaded:', video.src.split('/').pop());
    }
  });
}

/**
 * Unload heavy assets when page is far from viewport
 * @param {HTMLElement} pageElement - Page element to unload assets from
 */
function unloadPageAssets(pageElement) {
  // Only unload if background loading is active (after reveal)
  if (!PreloaderState.isBackgroundLoading) return;
  
  const videos = pageElement.querySelectorAll('video[src]');
  
  // Pause and reset videos to save memory
  videos.forEach(video => {
    if (!video.paused) {
      video.pause();
      video.currentTime = 0;
    }
  });
}

/**
 * Build sequential asset queue from pages data
 * @param {HTMLElement[]} pages - All page elements
 * @returns {Array} Sequential asset queue
 */
function buildSequentialAssetQueue(pages) {
  const assetQueue = [];
  const chaptersData = [];
  
  // Group pages by chapter
  let currentChapter = null;
  let chapterPages = [];
  
  pages.forEach((page, index) => {
    const chapterId = page.dataset.chapterId;
    
    if (chapterId !== currentChapter) {
      // New chapter started
      if (currentChapter !== null) {
        chaptersData.push({
          id: currentChapter,
          pages: [...chapterPages]
        });
      }
      currentChapter = chapterId;
      chapterPages = [];
    }
    
    chapterPages.push(page);
    
    // Add page assets to queue in order
    const images = page.querySelectorAll('img[data-src]');
    const videos = page.querySelectorAll('video[data-src]');
    
    [...images, ...videos].forEach((element, assetIndex) => {
      assetQueue.push({
        element,
        pageIndex: index,
        chapterId,
        assetIndex,
        type: element.tagName.toLowerCase(),
        src: element.dataset.src
      });
    });
  });
  
  // Add last chapter
  if (currentChapter !== null) {
    chaptersData.push({
      id: currentChapter,
      pages: [...chapterPages]
    });
  }
  
  PreloaderState.chaptersData = chaptersData;
  PreloaderState.totalAssets = assetQueue.length;
  
  console.log(`📚 Built sequential asset queue: ${assetQueue.length} assets across ${chaptersData.length} chapters`);
  
  return assetQueue;
}

/**
 * Load single asset from the queue
 * @param {Object} assetInfo - Asset information object
 * @returns {Promise} Promise that resolves when asset is loaded
 */
function loadSingleAsset(assetInfo) {
  return new Promise((resolve, reject) => {
    const { element, type, src } = assetInfo;
    
    if (type === 'img') {
      const tempImg = new Image();
      tempImg.onload = () => {
        element.src = src;
        element.removeAttribute('data-src');
        console.log(`🖼️ Chapter asset loaded: ${src.split('/').pop()}`);
        resolve();
      };
      tempImg.onerror = () => {
        console.warn(`⚠️ Failed to load image: ${src}`);
        resolve(); // Continue even if asset fails
      };
      tempImg.src = src;
    } else if (type === 'video') {
      const tempVideo = document.createElement('video');
      tempVideo.oncanplaythrough = () => {
        element.src = src;
        element.preload = 'auto';
        element.removeAttribute('data-src');
        
        if (element.dataset.poster) {
          setPosterSafely(element, element.dataset.poster);
          element.removeAttribute('data-poster');
        }
        
        console.log(`🎬 Chapter video loaded: ${src.split('/').pop()}`);
        resolve();
      };
      tempVideo.onerror = () => {
        console.warn(`⚠️ Failed to load video: ${src}`);
        resolve(); // Continue even if asset fails
      };
      tempVideo.src = src;
    } else {
      resolve();
    }
  });
}

/**
 * Start sequential loading of assets
 * @param {Array} assetQueue - Queue of assets to load sequentially
 */
async function startSequentialLoading(assetQueue) {
  const targetAssets = Math.ceil(PreloaderState.totalAssets * (PreloaderState.targetLoadPercentage / 100));
  
  console.log(`⏳ Starting sequential loading: ${targetAssets}/${PreloaderState.totalAssets} assets (${PreloaderState.targetLoadPercentage}%)`);
  
  for (let i = 0; i < targetAssets && i < assetQueue.length; i++) {
    try {
      await loadSingleAsset(assetQueue[i]);
      PreloaderState.loadedAssets++;
      
      // Update progress from 25% to 100%
      const progress = 25 + ((PreloaderState.loadedAssets / targetAssets) * 75);
      updateProgress(progress);
      
      // Log chapter progress
      if (i === 0 || assetQueue[i].chapterId !== assetQueue[i-1]?.chapterId) {
        console.log(`📖 Loading Chapter: ${assetQueue[i].chapterId}`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Asset load error (continuing):`, error);
      PreloaderState.loadedAssets++;
    }
  }
  
  console.log(`✅ Sequential loading complete: ${PreloaderState.loadedAssets}/${targetAssets} assets loaded`);
  
  // Ensure progress reaches 100%
  updateProgress(100);
  
  // Wait for transition to complete (600ms) + 300ms delay before hiding preloader
  setTimeout(() => {
    hidePreloader();
  }, 900);
}

/**
 * Start background loading of remaining assets at reduced speed
 */
function startBackgroundLoading() {
  if (PreloaderState.isBackgroundLoading) return;
  
  PreloaderState.isBackgroundLoading = true;
  const remainingAssets = PreloaderState.assetQueue.slice(PreloaderState.loadedAssets);
  
  if (remainingAssets.length === 0) {
    console.log('🎯 All assets already loaded');
    return;
  }
  
  console.log(`🔄 Starting background loading: ${remainingAssets.length} remaining assets at reduced speed`);
  
  let backgroundIndex = 0;
  
  PreloaderState.backgroundLoadInterval = setInterval(async () => {
    if (backgroundIndex >= remainingAssets.length) {
      clearInterval(PreloaderState.backgroundLoadInterval);
      console.log('✅ Background loading complete - all assets loaded');
      return;
    }
    
    try {
      await loadSingleAsset(remainingAssets[backgroundIndex]);
      backgroundIndex++;
      
      const totalProgress = ((PreloaderState.loadedAssets + backgroundIndex) / PreloaderState.totalAssets) * 100;
      console.log(`📊 Background progress: ${Math.round(totalProgress)}% (${PreloaderState.loadedAssets + backgroundIndex}/${PreloaderState.totalAssets})`);
      
    } catch (error) {
      console.warn('Background loading error:', error);
      backgroundIndex++;
    }
  }, PreloaderState.backgroundLoadDelay);
}

/**
 * Initialize sequential preloader system
 * @param {HTMLElement[]} pages - All page elements
 * @returns {Promise<void>} Promise that resolves when initial loading is complete
 */
export async function initPreloader(pages) {
  console.log('🚀 Initializing sequential preloader system...');
  
  // Create enhanced spinner overlay
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
  
  // Build sequential asset queue in book order
  PreloaderState.assetQueue = buildSequentialAssetQueue(pages);
  
  // Set timeout fallback (10 seconds for sequential loading)
  PreloaderState.loadTimeout = setTimeout(() => {
    console.warn('⏰ Preloader timeout reached, forcing reveal after 10 seconds');
    // Ensure progress reaches 100% even on timeout
    updateProgress(100);
    // Wait for transition to complete (600ms) + 300ms delay
    setTimeout(() => {
      hidePreloader();
    }, 900);
  }, 10000);
  
  try {
    // Start sequential loading
    await startSequentialLoading(PreloaderState.assetQueue);
    
    // Clear timeout since we finished loading
    if (PreloaderState.loadTimeout) {
      clearTimeout(PreloaderState.loadTimeout);
    }
    
  } catch (error) {
    console.error('❌ Error in sequential loading:', error);
    // Still hide preloader to prevent hanging, but ensure 100% first
    updateProgress(100);
    // Wait for transition to complete (600ms) + 300ms delay
    setTimeout(() => {
      hidePreloader();
    }, 900);
  }
}

/**
 * Clean up preloader resources
 */
export function cleanupPreloader() {
  if (PreloaderState.backgroundLoadInterval) {
    clearInterval(PreloaderState.backgroundLoadInterval);
  }
  
  if (PreloaderState.loadTimeout) {
    clearTimeout(PreloaderState.loadTimeout);
  }
  
  if (PreloaderState.lazyLoadObserver) {
    PreloaderState.lazyLoadObserver.disconnect();
  }
  
  if (PreloaderState.videoPlaybackObserver) {
    PreloaderState.videoPlaybackObserver.disconnect();
  }
  
  console.log('🧹 Preloader resources cleaned up');
} 