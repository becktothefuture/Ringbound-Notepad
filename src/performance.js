/**
 * PERFORMANCE MONITORING SYSTEM
 * 
 * This module provides comprehensive performance monitoring and optimization
 * utilities for the ringbound notepad application.
 */

import { PAGE_ANIMATION } from './config.js';
import { debug } from './debug.js';

/**
 * Performance metrics tracker
 */
class PerformanceTracker {
  constructor() {
    this.metrics = {
      frameCount: 0,
      renderTime: 0,
      lastFpsUpdate: 0,
      fps: 0,
      renderCalls: 0,
      skippedFrames: 0,
      memoryUsage: 0
    };
    
    this.isEnabled = PAGE_ANIMATION.misc.debug;
    this.lastFrameTime = performance.now();
    
    if (this.isEnabled) {
      this.startMonitoring();
    }
  }
  
  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.monitorLoop();
    
    // Memory monitoring (if available)
    if (performance.memory) {
      setInterval(() => {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      }, 1000);
    }
  }
  
  /**
   * Monitor frame rate and performance
   */
  monitorLoop() {
    const now = performance.now();
    this.metrics.frameCount++;
    
    // Calculate FPS every second
    if (now - this.metrics.lastFpsUpdate >= 1000) {
      this.metrics.fps = Math.round(
        (this.metrics.frameCount * 1000) / (now - this.metrics.lastFpsUpdate)
      );
      this.metrics.frameCount = 0;
      this.metrics.lastFpsUpdate = now;
      
      // Log performance warnings
      if (this.metrics.fps < 30) {
        debug.warn(`Low FPS detected: ${this.metrics.fps}`);
      }
    }
    
    this.lastFrameTime = now;
    requestAnimationFrame(() => this.monitorLoop());
  }
  
  /**
   * Mark the start of a render operation
   */
  startRender() {
    if (!this.isEnabled) return;
    this.renderStartTime = performance.now();
    this.metrics.renderCalls++;
  }
  
  /**
   * Mark the end of a render operation
   */
  endRender() {
    if (!this.isEnabled) return;
    this.metrics.renderTime = performance.now() - this.renderStartTime;
    
    // Warn if render time is too high
    if (this.metrics.renderTime > 16.67) { // 60fps threshold
      debug.warn(`Slow render detected: ${this.metrics.renderTime.toFixed(2)}ms`);
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Reset performance counters
   */
  reset() {
    this.metrics.renderCalls = 0;
    this.metrics.skippedFrames = 0;
    this.metrics.renderTime = 0;
  }
}

/**
 * Memory pool for reusing objects to reduce garbage collection
 */
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
  
  /**
   * Get an object from the pool
   */
  get() {
    return this.pool.length > 0 ? this.pool.pop() : this.createFn();
  }
  
  /**
   * Return an object to the pool
   */
  release(obj) {
    if (this.resetFn) {
      this.resetFn(obj);
    }
    this.pool.push(obj);
  }
}

/**
 * Create object pools for common objects
 */
const transformPool = new ObjectPool(
  () => ({ x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 }),
  (obj) => {
    obj.x = obj.y = obj.z = obj.rotX = obj.rotY = obj.rotZ = 0;
  }
);

/**
 * Throttle function calls for performance
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce function calls
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * RAF-based animation scheduler with priority
 */
class AnimationScheduler {
  constructor() {
    this.tasks = [];
    this.running = false;
  }
  
  /**
   * Schedule a task with priority
   */
  schedule(task, priority = 0) {
    this.tasks.push({ task, priority });
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    if (!this.running) {
      this.start();
    }
  }
  
  /**
   * Start the animation loop
   */
  start() {
    this.running = true;
    this.loop();
  }
  
  /**
   * Stop the animation loop
   */
  stop() {
    this.running = false;
  }
  
  /**
   * Animation loop
   */
  loop() {
    if (!this.running) return;
    
    const startTime = performance.now();
    const timeLimit = 16.67; // 60fps budget
    
    while (this.tasks.length > 0 && (performance.now() - startTime) < timeLimit) {
      const { task } = this.tasks.shift();
      try {
        task();
      } catch (error) {
        debug.error('Animation task error:', error);
      }
    }
    
    requestAnimationFrame(() => this.loop());
  }
}

// Create global instances
export const perfTracker = new PerformanceTracker();
export const animationScheduler = new AnimationScheduler();
export { throttle, debounce, transformPool };

// Export performance monitoring functions
export const perf = {
  startRender: () => perfTracker.startRender(),
  endRender: () => perfTracker.endRender(),
  getMetrics: () => perfTracker.getMetrics(),
  reset: () => perfTracker.reset()
};
