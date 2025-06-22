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
import { render, initializeRenderingContext, createRenderPipeline, updateRingsPosition } from './render.js';
import { PerformanceManager } from './performance.js';
import { createPagesFromPortfolioData, PortfolioLoader, validatePortfolioSchema } from './portfolioLoader.js';
import { initBrowserTheme } from './browserTheme.js';
import { initChapters } from './chapterManager.js';
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
    isDebug: new URLSearchParams(window.location.search).has('debug')
  }
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
    
    // Log performance targets
    console.log('🎯 Performance Targets:');
    console.log(`  - FPS: ${GLOBAL_CONFIG.PERFORMANCE.targetFPS}fps`);
    console.log(`  - Frame Time: ${GLOBAL_CONFIG.PERFORMANCE.frameTimeTarget}ms`);
    console.log(`  - Memory Limit: ${GLOBAL_CONFIG.PERFORMANCE.memoryLimit}MB`);
    console.log(`  - Max Visible Pages: ${GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages}`);
    
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
    console.log('🎯 3D Notebook rendering system initialized');
    
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
    console.log('🎨 Browser theme integration initialized');
  } catch (error) {
    console.warn('⚠️ Browser theme initialization failed:', error);
    // Non-critical error - continue without theme integration
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
      console.log('🔄 Loading portfolio in preview mode...');
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
    
    console.log('✅ Portfolio schema validation passed');
    
    // Generate pages from validated data in the page-stack container
    console.log('🎯 Generating 3D notebook pages...');
    const pageStack = document.getElementById('page-stack') || notebook;
    if (!pageStack) {
      throw new Error('Page stack container not found. Expected #page-stack.');
    }
    
    const pages = createPagesFromPortfolioData(pageStack, portfolioDataToUse);
    
    // Update application state
    ApplicationState.pages = pages;
    ApplicationState.pageCount = pages.length;
    
    console.log(`🎯 3D Notebook loaded: ${pages.length} pages generated in page-stack`);
    
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
    
    console.log(`🎮 VirtualScrollEngine initialized with ${pageCount} pages`);
    
    return scrollEngine;
    
  } catch (error) {
    handleApplicationError(error, 'VirtualScrollEngine Initialization');
  }
}

/**
 * Initialize chapter navigation system
 * @param {HTMLElement[]} pages - Page elements
 */
function initializeChapterSystem(pages) {
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
    
    initChapters(pageElements, notebook);
    console.log('📑 Chapter navigation system initialized');
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
    scrollEngine.addObserver((scrollState) => {
      ApplicationState.performanceManager.startRender();
      renderPipeline(scrollState);
      ApplicationState.performanceManager.endRender();
    });
    
    console.log('🎨 Render pipeline created and connected');
    
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
    
    // Log final state
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
    console.log('📋 Following technical specification v2.0.0');
    
    // Phase 1: Initialize core systems
    console.log('📊 Phase 1: Initializing core systems...');
    initializePerformanceSystem();
    initializeBrowserTheme();
    
    // Phase 2: Load and validate content
    console.log('🎯 Phase 2: Loading and validating 3D notebook content...');
    const pages = await loadPortfolioContent();
    
    // Initialize rendering system with page count for depth model
    initializeRenderingSystem(ApplicationState.pageCount);
    
    // Ensure rings position is calculated with actual page count
    updateRingsPosition(ApplicationState.pageCount);
    
    // Phase 3: Initialize interaction systems
    console.log('🎮 Phase 3: Initializing interaction systems...');
    const container = document.getElementById('notebook');
    if (!container) throw new Error('Container element not found');
    
    ApplicationState.scrollEngine = initializeScrollEngine(container, ApplicationState.pageCount);
    initializeChapterSystem(pages);
    
    // Phase 4: Create render pipeline
    console.log('🎨 Phase 4: Creating render pipeline...');
    ApplicationState.renderPipeline = createRenderingPipeline(pages, ApplicationState.scrollEngine);
    
    // Phase 5: Finalize application
    console.log('✅ Phase 5: Finalizing application...');
    finalizeApplication();
    
    console.log('🎉 Application bootstrap complete!');
    
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
      // Clean up scroll engine resources
      ApplicationState.scrollEngine = null;
    }
    
    if (ApplicationState.performanceManager) {
      // Clean up performance monitoring
      ApplicationState.performanceManager = null;
    }
    
    console.log('🧹 Application cleanup complete');
    
  } catch (error) {
    console.error('⚠️ Cleanup error:', error);
  }
}

// === EVENT LISTENERS ===

// Handle page visibility changes for performance optimization
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('📱 Page hidden - pausing performance monitoring');
  } else {
    console.log('📱 Page visible - resuming performance monitoring');
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

// === APPLICATION ENTRY POINT ===

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Export for testing and debugging
export { ApplicationState, bootstrap, cleanup }; 