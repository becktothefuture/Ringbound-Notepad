/**
 * DEBUG SYSTEM
 * 
 * This module provides conditional logging and visual debug indicators
 * that can be easily enabled/disabled through the CONFIG.DEBUG_MODE setting.
 */

import { PAGE_ANIMATION } from './config.js';

/**
 * Debug logger that only outputs when DEBUG_MODE is enabled
 * Provides different log levels and formatting for better debugging
 */
export const debug = {
  /**
   * General information logging
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (PAGE_ANIMATION.misc.debug) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Group logging for related information
   * @param {string} label - Group label
   * @param {Function} fn - Function to execute within the group
   */
  group(label, fn) {
    if (PAGE_ANIMATION.misc.debug) {
      console.group(`[DEBUG] ${label}`);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Warning messages
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (PAGE_ANIMATION.misc.debug) {
      console.warn('[DEBUG]', ...args);
    }
  },

  /**
   * Error messages (always shown regardless of debug mode)
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    console.error('[ERROR]', ...args);
  },

  /**
   * Performance timing
   * @param {string} label - Timer label
   */
  time(label) {
    if (PAGE_ANIMATION.misc.debug) {
      console.time(`[DEBUG] ${label}`);
    }
  },

  /**
   * End performance timing
   * @param {string} label - Timer label
   */
  timeEnd(label) {
    if (PAGE_ANIMATION.misc.debug) {
      console.timeEnd(`[DEBUG] ${label}`);
    }
  }
};

/**
 * Visual debug overlay for real-time information
 */
class DebugOverlay {
  constructor() {
    this.overlay = null;
    this.isVisible = false;
    this.stats = {};
    this.initialized = false;
    
    if (PAGE_ANIMATION.misc.debug) {
      // Initialize after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
  }

  /**
   * Initialize the debug overlay
   */
  init() {
    if (this.initialized) return;
    
    this.createOverlay();
    this.bindControls();
    this.initialized = true;
    
    debug.log('Debug overlay initialized');
  }

  /**
   * Create the debug overlay UI
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'debug-overlay';
    this.overlay.innerHTML = `
      <div class="debug-header">
        <h3>🐛 Debug Info</h3>
        <button id="debug-toggle">Hide</button>
      </div>
      <div class="debug-grid">
        <div class="debug-cell"><div class="debug-label">Scroll</div><div id="debug-scroll">Waiting...</div></div>
        <div class="debug-cell"><div class="debug-label">Page</div><div id="debug-page">Waiting...</div></div>
        <div class="debug-cell"><div class="debug-label">Rotation</div><div id="debug-rotation">Waiting...</div></div>
        <div class="debug-cell"><div class="debug-label">FPS</div><div id="debug-fps">Calculating...</div></div>
        <div class="debug-cell"><div class="debug-label">Cycle</div><div id="debug-cycle">-</div></div>
        <div class="debug-cell"><div class="debug-label">Cycle Pos</div><div id="debug-cycle-pos">-</div></div>
      </div>
      <div class="debug-controls"><span style="font-size:10px;color:#444;">Ctrl+D: Toggle overlay</span></div>
    `;
    // Style the overlay
    this.overlay.style.cssText = `
      position: fixed;
      right: 24px;
      bottom: 24px;
      background: rgba(255,255,255,0.75);
      color: #111;
      padding: 16px 18px 10px 18px;
      border-radius: 10px;
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11px;
      z-index: 10000;
      min-width: 320px;
      min-height: 110px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.10);
      border: 1px solid rgba(0,0,0,0.08);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    `;
    // Style the header
    const header = this.overlay.querySelector('.debug-header');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      width: 100%;
      border-bottom: 1px solid #eee;
      padding-bottom: 6px;
    `;
    const h3 = header.querySelector('h3');
    h3.style.cssText = `
      margin: 0;
      font-size: 13px;
      color: #111;
      font-family: Helvetica, Arial, sans-serif;
      font-weight: bold;
    `;
    // Style the grid
    const grid = this.overlay.querySelector('.debug-grid');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, auto);
      gap: 8px 18px;
      width: 100%;
      margin-bottom: 8px;
    `;
    // Style each cell
    const cells = this.overlay.querySelectorAll('.debug-cell');
    cells.forEach(cell => {
      cell.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        background: none;
        padding: 0;
        border: none;
      `;
      const label = cell.querySelector('.debug-label');
      if (label) {
        label.style.cssText = `
          font-size: 10px;
          color: #444;
          margin-bottom: 2px;
          font-weight: 600;
          letter-spacing: 0.5px;
        `;
      }
      const value = cell.querySelector('div:not(.debug-label)');
      if (value) {
        value.style.cssText = `
          color: #111;
          font-weight: 500;
          font-size: 11px;
        `;
      }
    });
    // Hide cycle/cycle-pos if not in loop mode
    this.overlay.querySelector('#debug-cycle').parentElement.style.display = 'none';
    this.overlay.querySelector('#debug-cycle-pos').parentElement.style.display = 'none';
    // Style the toggle button
    const toggleBtn = this.overlay.querySelector('#debug-toggle');
    toggleBtn.style.cssText = `
      background: #fff;
      color: #111;
      border: 1px solid #bbb;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
      margin-left: 10px;
      transition: background 0.2s;
    `;
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.background = '#f0f0f0';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.background = '#fff';
    });
    // Style controls
    const controls = this.overlay.querySelector('.debug-controls');
    controls.style.cssText = `
      width: 100%;
      text-align: right;
      margin-top: 2px;
      color: #444;
    `;
    document.body.appendChild(this.overlay);
    this.isVisible = true;
    debug.log('Debug overlay created and added to DOM');
  }

  /**
   * Bind keyboard controls for the debug overlay
   */
  bindControls() {
    // Toggle with Ctrl+D key combination
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'd' && e.ctrlKey) {
        e.preventDefault();
        this.toggle();
        debug.log('Debug overlay toggled via keyboard shortcut');
      }
    });
    
    // Toggle button
    const toggleBtn = this.overlay?.querySelector('#debug-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggle();
        debug.log('Debug overlay toggled via button click');
      });
    }
    
    debug.log('Debug overlay controls bound');
  }

  /**
   * Toggle the debug overlay visibility
   */
  toggle() {
    if (!this.overlay) return;
    
    this.isVisible = !this.isVisible;
    this.overlay.style.display = this.isVisible ? 'block' : 'none';
    
    const toggleBtn = this.overlay.querySelector('#debug-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.isVisible ? 'Hide' : 'Show';
    }
    
    debug.log(`Debug overlay ${this.isVisible ? 'shown' : 'hidden'}`);
  }

  /**
   * Update the debug information display
   * @param {Object} data - Debug data to display
   */
  update(data) {
    if (!this.overlay || !this.isVisible || !this.initialized) return;
    
    const elements = {
      scroll: this.overlay.querySelector('#debug-scroll'),
      page: this.overlay.querySelector('#debug-page'),
      rotation: this.overlay.querySelector('#debug-rotation'),
      fps: this.overlay.querySelector('#debug-fps'),
      cycle: this.overlay.querySelector('#debug-cycle'),
      cyclePos: this.overlay.querySelector('#debug-cycle-pos'),
      loopSection: this.overlay.querySelector('#debug-loop-section')
    };
    
    if (data.scroll !== undefined && elements.scroll) {
      elements.scroll.textContent = `${data.scroll.toFixed(3)}`;
    }
    
    if (data.page !== undefined && data.progress !== undefined && elements.page) {
      elements.page.textContent = `${data.page} (${(data.progress * 100).toFixed(1)}%)`;
    }
    
    if (data.rotation !== undefined && elements.rotation) {
      elements.rotation.textContent = `${data.rotation.toFixed(1)}°`;
    }
    
    if (data.fps !== undefined && elements.fps) {
      elements.fps.textContent = `${data.fps} FPS`;
    }
    
    if (data.cycle !== undefined && data.cyclePosition !== undefined) {
      // Show cycle/cycle-pos cells in grid
      if (elements.cycle) {
        elements.cycle.parentElement.style.display = '';
        elements.cycle.textContent = `${data.cycle}`;
      }
      if (elements.cyclePos) {
        elements.cyclePos.parentElement.style.display = '';
        elements.cyclePos.textContent = `${data.cyclePosition.toFixed(2)}`;
      }
    } else {
      if (elements.cycle) elements.cycle.parentElement.style.display = 'none';
      if (elements.cyclePos) elements.cyclePos.parentElement.style.display = 'none';
    }
  }
}

// Create global debug overlay instance
let debugOverlayInstance = null;

// Initialize overlay when module loads
if (PAGE_ANIMATION.misc.debug) {
  debugOverlayInstance = new DebugOverlay();
}

export const debugOverlay = debugOverlayInstance || {
  update: () => {},
  toggle: () => {},
  init: () => {}
};

/**
 * Performance monitor for FPS tracking
 */
export class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    
    if (PAGE_ANIMATION.misc.debug) {
      this.startMonitoring();
      debug.log('Performance monitor started');
    }
  }
  
  startMonitoring() {
    const tick = () => {
      this.frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - this.lastTime >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
        this.frameCount = 0;
        this.lastTime = currentTime;
        
        if (debugOverlay && debugOverlay.update) {
          debugOverlay.update({ fps: this.fps });
        }
      }
      
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  }
}

// Create global performance monitor
export const perfMonitor = PAGE_ANIMATION.misc.debug ? new PerformanceMonitor() : null; 