/**
 * RINGBOUND NOTEPAD - MAIN APPLICATION ORCHESTRATOR
 *
 * This module implements the specification-compliant application architecture
 * following the exact requirements from the README technical specification.
 *
 * ARCHITECTURE OVERVIEW:
 * ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
 * │   User Input    │───▶│ VirtualScrollEngine│───▶│ RenderPipeline │
 * │ (mouse, touch)  │    │ (state-driven)   │    │ (3D transforms) │
 * └─────────────────┘    └──────────────────┘    └─────────────────┘
 *          │                        │                        │
 *          ▼                        ▼                        ▼
 * ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
 * │ Input Handlers  │    │PerformanceManager│    │ DOM Manipulation│
 * │ - Wheel events  │    │ - FPS monitoring │    │ - Transform calc│
 * │ - Touch events  │    │ - Quality scaling│    │ - GPU accel     │
 * │ - Keyboard nav  │    │ - Memory tracking│    │ - Visibility    │
 * └─────────────────┘    └──────────────────┘    └─────────────────┘
 *
 * DATA FLOW:
 * Portfolio JSON → Schema Validation → Page Generation → VirtualScrollEngine → RenderPipeline → DOM
 *
 * @author Alexander Beck
 * @version 2.0.0 (Specification Compliant)
 * @since 2025-01-01
 */

// === CORE SYSTEM IMPORTS ===
import { GLOBAL_CONFIG } from './config.js';
import { VirtualScrollEngine } from './scrollEngine.js';
import {
  render,
  initializeRenderingContext,
  createRenderPipeline,
  updateRingsPosition,
} from './render.js';
import { PerformanceManager } from './performance.js';
import {
  createPagesFromPortfolioData,
  PortfolioLoader,
  validatePortfolioSchema,
} from './portfolioLoader.js';
import { initBrowserTheme } from './browserTheme.js';
import { initChapters } from './chapterManager.js';
import { zoomManager } from './zoomManager.js';
import { initializeDynamicNoise } from './noiseGenerator.js';
import { overlayHints } from './overlay.js';
import { initPreloader, cleanupPreloader } from './preloader.js';
import { headBobble } from './headBobble.js';
import portfolioData from '../data/portfolio.json' assert { type: 'json' };

// === APPLICATION STATE ===
/**
 * Global application state container
 * Implements specification-compliant state management
 */
const ApplicationState = {
  /** @type {boolean} Application initialization status */
  initialized: false,

  /** @type {VirtualScrollEngine} Scroll engine instance */
  scrollEngine: null,

  /** @type {PerformanceManager} Performance manager instance */
  performanceManager: null,

  /** @type {HTMLElement[]} All page elements */
  pages: [],

  /** @type {Function} Render pipeline function */
  renderPipeline: null,

  /** @type {number} Total page count */
  pageCount: 0,

  /** @type {Date} Application start time */
  startTime: new Date(),

  /** @type {Object} Environment flags */
  environment: {
    isPreview: new URLSearchParams(window.location.search).has('preview'),
    isDebug: new URLSearchParams(window.location.search).has('debug'),
  },

  /** @type {Object} Zoom manager instance */
  zoomManager: null,
};

// === ERROR HANDLING ===
/**
 * Specification-compliant error handler with graceful degradation
 * @param {Error} error - The error that occurred
 * @param {string} context - Error context
 */
function handleApplicationError(error, context = 'Application') {
  console.error(`❌ ${context} Error:`, error);

  // Log error details for debugging
  if (ApplicationState.environment.isDebug) {
    console.group('🔍 Error Details');
    console.log('Stack:', error.stack);
    console.log('Application State:', ApplicationState);
    console.groupEnd();
  }

  // Show user-friendly error message
  const errorMessage = `
    <div style="
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #f8f8f8; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      font-family: system-ui, sans-serif; max-width: 500px; text-align: center; z-index: 10000;
    ">
      <h2>🔧 Application Error</h2>
      <p>The 3D portfolio encountered an error in ${context}.</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><small>Please refresh the page or check the console for details.</small></p>
      <button onclick="location.reload()" style="
        background: #007bff; color: white; border: none; padding: 0.5rem 1rem;
        border-radius: 4px; cursor: pointer; margin-top: 1rem;
      ">Reload Page</button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', errorMessage);

  // Prevent further execution
  throw error;
}

// === INITIALIZATION FUNCTIONS ===

/**
 * Initialize performance monitoring system
 * Sets up FPS monitoring, memory tracking, and quality scaling
 */
function initializePerformanceSystem() {
  try {
    ApplicationState.performanceManager = new PerformanceManager();
    ApplicationState.performanceManager.startApplication();

    // Set up debug logging if enabled
    if (ApplicationState.environment.isDebug) {
      setInterval(() => {
        ApplicationState.performanceManager.logPerformanceMetrics();
      }, 5000);
    }
  } catch (error) {
    handleApplicationError(error, 'Performance System Initialization');
  }
}

/**
 * Initialize 3D notebook rendering system with user specification
 */
function initializeRenderingSystem(totalPages = 0) {
  try {
    initializeRenderingContext(totalPages);

    // Apply global CSS variables
    const root = document.documentElement;
    root.style.setProperty('--ring-z-index', GLOBAL_CONFIG.SCENE.ringZIndex);
    root.style.setProperty('--active-page-z-index', GLOBAL_CONFIG.SCENE.activePageZIndex);
  } catch (error) {
    handleApplicationError(error, '3D Notebook Rendering System Initialization');
  }
}

/**
 * Initialize browser theme integration
 */
function initializeBrowserTheme() {
  try {
    initBrowserTheme();
  } catch (error) {
    console.warn('⚠️ Browser theme initialization failed:', error);
    // Non-critical error - continue without theme integration
  }
}

/**
 * Initialize head bobble animation system
 */
function initializeHeadBobble() {
  try {
    // Wait for DOM to be ready and find the wrapper
    const wrapper = document.querySelector('.head-bobble-wrapper');
    if (!wrapper) {
      console.warn('⚠️ Head bobble wrapper not found, falling back to body');
    }
    
    // Configure head bobble with settings from GLOBAL_CONFIG
    const config = {
      ...GLOBAL_CONFIG.HEAD_BOBBLE,
      target: wrapper || document.body
    };
    
    headBobble.updateConfig(config);
    headBobble.initialize();
  } catch (error) {
    console.warn('⚠️ Head bobble initialization failed:', error);
    // Non-critical error - continue without head bobble animation
  }
}

/**
 * Load and validate portfolio content
 * @returns {Promise<HTMLElement[]>} Array of generated page elements
 */
async function loadPortfolioContent() {
  try {
    const notebook = document.getElementById('notebook');
    if (!notebook) {
      throw new Error('Required DOM element #notebook not found');
    }

    // Load portfolio data (supports both static and preview modes)
    let portfolioDataToUse = portfolioData;

    if (ApplicationState.environment.isPreview) {
      const loader = new PortfolioLoader();
      portfolioDataToUse = await loader.load();
    }

    // Validate portfolio schema
    const validation = validatePortfolioSchema(portfolioDataToUse);
    if (!validation.isValid) {
      console.error('❌ Portfolio validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error('Portfolio data validation failed');
    }

    // Generate pages from validated data in the page-stack container
    const pageStack = document.getElementById('page-stack') || notebook;
    if (!pageStack) {
      throw new Error('Page stack container not found. Expected #page-stack.');
    }

    const pages = createPagesFromPortfolioData(pageStack, portfolioDataToUse);

    // Update application state
    ApplicationState.pages = pages;
    ApplicationState.pageCount = pages.length;

    return pages;
  } catch (error) {
    handleApplicationError(error, 'Portfolio Content Loading');
  }
}

/**
 * Initialize VirtualScrollEngine with specification compliance
 * @param {HTMLElement} container - Container element
 * @param {number} pageCount - Total page count
 * @returns {VirtualScrollEngine} Initialized scroll engine
 */
function initializeScrollEngine(container, pageCount) {
  try {
    const scrollEngine = new VirtualScrollEngine();
    scrollEngine.setMaxPages(pageCount);
    scrollEngine.initializeEventListeners(container);

    return scrollEngine;
  } catch (error) {
    handleApplicationError(error, 'VirtualScrollEngine Initialization');
  }
}

/**
 * Initialize chapter navigation system
 * @param {HTMLElement[]} pages - Page elements
 * @param {VirtualScrollEngine} scrollEngine - Scroll engine instance
 */
function initializeChapterSystem(pages, scrollEngine) {
  try {
    const notebook = document.getElementById('notebook');
    if (!notebook) {
      throw new Error('Notebook container not found');
    }

    // Get actual page elements from the DOM
    const pageElements = Array.from(notebook.querySelectorAll('.page'));

    if (pageElements.length === 0) {
      throw new Error('No page elements found in notebook');
    }

    initChapters(pageElements, notebook, scrollEngine);
  } catch (error) {
    console.warn('⚠️ Chapter system initialization failed:', error);
    // Non-critical error - continue without chapter navigation
  }
}

/**
 * Create and initialize the render pipeline
 * @param {HTMLElement[]} pages - Page elements
 * @param {VirtualScrollEngine} scrollEngine - Scroll engine instance
 * @returns {Function} Render pipeline function
 */
function createRenderingPipeline(pages, scrollEngine) {
  try {
    const renderPipeline = createRenderPipeline(pages);

    // Subscribe to scroll state changes
    scrollEngine.addObserver(scrollState => {
      ApplicationState.performanceManager.startRender();
      renderPipeline(scrollState);
      ApplicationState.performanceManager.endRender();
    });

    return renderPipeline;
  } catch (error) {
    handleApplicationError(error, 'Render Pipeline Creation');
  }
}

/**
 * Perform final application setup and validation
 */
function finalizeApplication() {
  try {
    // Validate critical systems
    if (!ApplicationState.scrollEngine) {
      throw new Error('VirtualScrollEngine not initialized');
    }

    if (!ApplicationState.performanceManager) {
      throw new Error('PerformanceManager not initialized');
    }

    if (!ApplicationState.pages.length) {
      throw new Error('No pages generated');
    }

    // Apply quality scaling based on device capabilities
    const qualityScale = ApplicationState.performanceManager.getQualityScale();
    ApplicationState.performanceManager.applyQualityScale(qualityScale);

    // Mark application as initialized
    ApplicationState.initialized = true;

    const initTime = Date.now() - ApplicationState.startTime.getTime();
    console.log(`🚀 Application initialized successfully in ${initTime}ms`);

    // Log final state in debug mode
    if (ApplicationState.environment.isDebug) {
      console.group('🔍 Final Application State');
      console.log('Pages:', ApplicationState.pageCount);
      console.log('Performance Manager:', ApplicationState.performanceManager.getPerformanceReport());
      console.log('Environment:', ApplicationState.environment);
      console.groupEnd();
    }
  } catch (error) {
    handleApplicationError(error, 'Application Finalization');
  }
}

// === MAIN BOOTSTRAP FUNCTION ===

/**
 * Bootstrap the application with specification-compliant initialization
 * Follows the exact architecture and requirements from the README
 */
async function bootstrap() {
  try {
    console.log('🔄 Initializing Ring-Bound Notebook Application...');

    // Phase 1: Initialize core systems
    initializePerformanceSystem();
    initializeBrowserTheme();
    initializeDynamicNoise();
    initializeHeadBobble();

    // Phase 2: Load and validate content
    const pages = await loadPortfolioContent();

    // Phase 2.5: Initialize preloader system with critical assets
    await initPreloader(pages);

    // Initialize rendering system with page count for depth model
    initializeRenderingSystem(ApplicationState.pageCount);

    // Ensure rings position is calculated with actual page count
    updateRingsPosition(ApplicationState.pageCount);

    // Phase 3: Initialize interaction systems
    const container = document.getElementById('notebook');
    if (!container) throw new Error('Container element not found');

    ApplicationState.scrollEngine = initializeScrollEngine(container, ApplicationState.pageCount);
    initializeChapterSystem(pages, ApplicationState.scrollEngine);

    // Phase 4: Create render pipeline
    ApplicationState.renderPipeline = createRenderingPipeline(pages, ApplicationState.scrollEngine);

    // Phase 5: Initialize zoom system
    ApplicationState.zoomManager = zoomManager;
    const notebookContainer = document.querySelector('.notebook');
    const clickContainer = document.querySelector('.page-wrapper');
    zoomManager.initialize(notebookContainer, clickContainer, ApplicationState.scrollEngine);

    // Phase 6: Initialize overlay hints
    overlayHints.initialize(ApplicationState.scrollEngine);

    // Phase 7: Finalize application
    finalizeApplication();

    console.log('🎉 Application bootstrap complete!');
    console.log('💡 TIP: Click anywhere on the notebook area to zoom in/out (80% ⇄ 100%)');
  } catch (error) {
    handleApplicationError(error, 'Application Bootstrap');
  }
}

// === CLEANUP FUNCTIONS ===

/**
 * Clean up application resources
 */
function cleanup() {
  try {
    if (ApplicationState.scrollEngine) {
      ApplicationState.scrollEngine = null;
    }

    if (ApplicationState.performanceManager) {
      ApplicationState.performanceManager = null;
    }

    if (ApplicationState.zoomManager) {
      ApplicationState.zoomManager.destroy();
      ApplicationState.zoomManager = null;
    }

    // Clean up overlay hints
    overlayHints.destroy();

    // Clean up preloader resources
    cleanupPreloader();

    // Clean up head bobble animation
    headBobble.destroy();

    console.log('🧹 Application cleanup complete');
  } catch (error) {
    console.error('⚠️ Cleanup error:', error);
  }
}

// === EVENT LISTENERS ===

// Handle page visibility changes for performance optimization
document.addEventListener('visibilitychange', () => {
  if (ApplicationState.performanceManager) {
    // Performance manager will handle visibility changes internally
  }
});

// Handle window beforeunload for cleanup
window.addEventListener('beforeunload', cleanup);

// Handle resize events for responsive behavior
window.addEventListener('resize', () => {
  if (ApplicationState.renderPipeline && ApplicationState.scrollEngine) {
    // Trigger re-render on resize
    const scrollState = ApplicationState.scrollEngine.getScrollState();
    ApplicationState.renderPipeline(scrollState);
  }
});

// === GLOBAL RUNTIME UTILITIES ===
// Expose ring control utilities for runtime adjustment
window.notebook = window.notebook || {};
window.notebook.rings = {
  /**
   * Update front ring settings and apply immediately
   * @param {Object} settings - Front ring settings object
   */
  updateFront(settings) {
    const ringsCfg = GLOBAL_CONFIG.RINGS.front;
    Object.assign(ringsCfg, settings);
    
    console.log('🔗 Front ring settings updated:', settings);
    
    // Apply changes immediately if rings exist
    const frontRing = document.querySelector('.rings--front');
    if (frontRing && ApplicationState.pageCount > 0) {
      updateRingsPosition(ApplicationState.pageCount);
    }
  },
  
  /**
   * Update back ring settings and apply immediately
   * @param {Object} settings - Back ring settings object
   */
  updateBack(settings) {
    const ringsCfg = GLOBAL_CONFIG.RINGS.back;
    Object.assign(ringsCfg, settings);
    
    console.log('🔗 Back ring settings updated:', settings);
    
    // Apply changes immediately if rings exist
    const backRing = document.querySelector('.rings--back');
    if (backRing && ApplicationState.pageCount > 0) {
      updateRingsPosition(ApplicationState.pageCount);
    }
  },
  
  /**
   * Update shared ring animation settings
   * @param {Object} settings - Shared animation settings
   */
  updateAnimation(settings) {
    const validKeys = ['yPositionUnflipped', 'yPositionFlipped', 'animationSmoothing', 'transitionDuration'];
    const filteredSettings = {};
    
    validKeys.forEach(key => {
      if (settings[key] !== undefined) {
        filteredSettings[key] = settings[key];
      }
    });
    
    Object.assign(GLOBAL_CONFIG.RINGS, filteredSettings);
    console.log('🔗 Ring animation settings updated:', filteredSettings);
  },
  
  /**
   * Get current ring settings
   */
  getSettings() {
    return {
      front: { ...GLOBAL_CONFIG.RINGS.front },
      back: { ...GLOBAL_CONFIG.RINGS.back },
      animation: {
        yPositionUnflipped: GLOBAL_CONFIG.RINGS.yPositionUnflipped,
        yPositionFlipped: GLOBAL_CONFIG.RINGS.yPositionFlipped,
        animationSmoothing: GLOBAL_CONFIG.RINGS.animationSmoothing,
        transitionDuration: GLOBAL_CONFIG.RINGS.transitionDuration,
      }
    };
  },
  
  /**
   * Reset rings to default positions and rotations
   */
  reset() {
    // Reset to config defaults
    const frontRing = document.querySelector('.rings--front');
    const backRing = document.querySelector('.rings--back');
    
    if (frontRing) {
      const ringsCfg = GLOBAL_CONFIG.RINGS;
      frontRing.style.transform = `translateZ(var(--rings-front-position)) translateY(${ringsCfg.yPositionUnflipped}%) scaleX(${ringsCfg.front.scaleX}) scaleY(${ringsCfg.front.scaleY}) rotateX(${ringsCfg.front.rotationUnflipped}deg)`;
    }
    
    if (backRing) {
      const ringsCfg = GLOBAL_CONFIG.RINGS;
      backRing.style.transform = `translateZ(${ringsCfg.back.offsetZ}px) translateY(${ringsCfg.yPositionUnflipped}%) scaleX(${ringsCfg.back.scaleX}) scaleY(${ringsCfg.back.scaleY}) rotateX(${ringsCfg.back.rotationUnflipped}deg)`;
    }
    
    console.log('🔗 Rings reset to default positions');
  },

  /**
   * Debug ring visibility and positioning
   */
  debugRings() {
    const frontRing = document.querySelector('.rings--front');
    const backRing = document.querySelector('.rings--back');
    const wrapper = document.querySelector('.rings-wrapper');
    
    console.log('🔍 RING DEBUG INFORMATION:');
    console.log('Wrapper:', wrapper ? 'Found' : 'Missing', wrapper);
    console.log('Front ring:', frontRing ? 'Found' : 'Missing', frontRing);
    console.log('Back ring:', backRing ? 'Found' : 'Missing', backRing);
    
    if (frontRing) {
      const frontStyle = getComputedStyle(frontRing);
      console.log('Front ring styles:', {
        display: frontStyle.display,
        opacity: frontStyle.opacity,
        transform: frontStyle.transform,
        visibility: frontStyle.visibility,
        zIndex: frontStyle.zIndex,
        position: frontStyle.position
      });
      
      const frontImg = frontRing.querySelector('img');
      if (frontImg) {
        console.log('Front ring image:', {
          src: frontImg.src,
          naturalWidth: frontImg.naturalWidth,
          naturalHeight: frontImg.naturalHeight,
          complete: frontImg.complete
        });
      }
    }
    
    if (backRing) {
      const backStyle = getComputedStyle(backRing);
      console.log('Back ring styles:', {
        display: backStyle.display,
        opacity: backStyle.opacity,
        transform: backStyle.transform,
        visibility: backStyle.visibility,
        zIndex: backStyle.zIndex,
        position: backStyle.position
      });
      
      const backImg = backRing.querySelector('img');
      if (backImg) {
        console.log('Back ring image:', {
          src: backImg.src,
          naturalWidth: backImg.naturalWidth,
          naturalHeight: backImg.naturalHeight,
          complete: backImg.complete
        });
      }
    }
  },
};

// Expose head bobble control utilities for runtime adjustment
window.notebook.headBobble = {
  /**
   * Enable head bobble animation
   */
  enable() {
    headBobble.enable();
    console.log('🎭 Head bobble enabled');
  },
  
  /**
   * Disable head bobble animation
   */
  disable() {
    headBobble.disable();
    console.log('🎭 Head bobble disabled');
  },
  
  /**
   * Update head bobble settings
   * @param {Object} settings - New settings object
   */
  updateSettings(settings) {
    headBobble.updateConfig(settings);
    console.log('🎭 Head bobble settings updated:', settings);
  },
  
  /**
   * Get current head bobble status and settings
   */
  getStatus() {
    return headBobble.getStatus();
  },
  
  /**
   * Apply a preset configuration
   * @param {string} presetName - Name of the preset (subtle, normal, energetic, disabled)
   */
  async applyPreset(presetName) {
    try {
      const { BOBBLE_PRESETS } = await import('./headBobble.js');
      const preset = BOBBLE_PRESETS[presetName];
      
      if (preset) {
        headBobble.updateConfig(preset);
        console.log(`🎭 Applied head bobble preset: ${presetName}`, preset);
      } else {
        console.warn(`🎭 Unknown head bobble preset: ${presetName}`);
        console.log('Available presets:', Object.keys(BOBBLE_PRESETS));
      }
    } catch (error) {
      console.error('🎭 Failed to apply head bobble preset:', error);
    }
  },
  
  /**
   * Toggle head bobble on/off
   */
  toggle() {
    const status = headBobble.getStatus();
    if (status.enabled && status.isRunning) {
      headBobble.disable();
      console.log('🎭 Head bobble toggled OFF');
    } else {
      headBobble.enable();
      console.log('🎭 Head bobble toggled ON');
    }
  }
};

console.log(`\n🔗 RING CONTROL UTILITIES READY\nUse these commands to adjust ring positioning:\n\n// Update front ring\nwindow.notebook.rings.updateFront({\n  offsetZ: -30,        // Z distance from top page\n  rotationUnflipped: 25,  // Rotation when unflipped\n  rotationFlipped: -25,   // Rotation when flipped\n  scaleX: 1.1,           // Horizontal scale\n  scaleY: 1.4            // Vertical scale\n});\n\n// Update back ring\nwindow.notebook.rings.updateBack({\n  offsetZ: -15,        // Z position behind pages\n  rotationUnflipped: 20,  // Rotation when unflipped\n  rotationFlipped: -20,   // Rotation when flipped\n});\n\n// View current settings\nwindow.notebook.rings.getSettings();\n\n// Reset to defaults\nwindow.notebook.rings.reset();\n\n// Debug ring visibility (Safari troubleshooting)\nwindow.notebook.rings.debugRings();\n\n🎭 HEAD BOBBLE UTILITIES:\n\n// Toggle head bobble on/off\nwindow.notebook.headBobble.toggle();\n\n// Apply presets\nwindow.notebook.headBobble.applyPreset('subtle');     // Barely perceptible movement\nwindow.notebook.headBobble.applyPreset('normal');     // Natural human breathing with gentle tilt\nwindow.notebook.headBobble.applyPreset('relaxed');    // Slower, deeper breathing with more tilt\nwindow.notebook.headBobble.applyPreset('focused');    // Controlled, steady breathing\nwindow.notebook.headBobble.applyPreset('chilled');    // Very slow, relaxed breathing with natural tilt\nwindow.notebook.headBobble.applyPreset('mechanical'); // Simple sine wave (old style)\nwindow.notebook.headBobble.applyPreset('disabled');   // Turn off\n\n// Custom organic settings with head tilt\nwindow.notebook.headBobble.updateSettings({\n  amplitude: 3,              // px up/down movement\n  pitchDeg: 1.5,             // degrees forward/back rotation\n  tiltDeg: 1.0,              // degrees left/right head tilt\n  frequency: 0.12,           // cycles per second (very slow)\n  organicIntensity: 1.0,     // 0-2, organic variation strength\n  breathingVariation: 0.8,   // 0-1, breathing irregularity\n  microMovements: true       // enable micro-movements\n});\n\n// Get current status\nwindow.notebook.headBobble.getStatus();\n`);

// === APPLICATION ENTRY POINT ===

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Export for testing and debugging
export { ApplicationState, bootstrap, cleanup };
