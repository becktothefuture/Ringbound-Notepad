/**
 * PERFORMANCE MANAGEMENT SYSTEM
 * 
 * Implements specification-compliant performance monitoring and optimization
 * for the ringbound notebook application. Provides FPS monitoring, memory tracking,
 * and automatic quality scaling to maintain 60fps performance.
 * 
 * PERFORMANCE TARGETS:
 * - Frame Rate: 60fps sustained during continuous scrolling
 * - Memory Usage: < 100MB heap for 80-page portfolio
 * - Load Time: < 2s to first interactive frame
 * - Quality Scaling: Auto-reduce effects if performance drops
 */

import { GLOBAL_CONFIG } from './config.js';

/**
 * PerformanceManager Class
 * Comprehensive performance monitoring and optimization system
 */
class PerformanceManager {
  constructor() {
    this.metrics = {
      frameCount: 0,
      renderTime: 0,
      lastFpsUpdate: 0,
      fps: 0,
      averageFps: 60,
      renderCalls: 0,
      skippedFrames: 0,
      memoryUsage: 0,
      qualityScale: GLOBAL_CONFIG.PERFORMANCE.qualityScaleMax
    };
    
    this.isEnabled = false;
    this.lastFrameTime = performance.now();
    this.renderStartTime = 0;
    this.fpsHistory = [];
    this.renderTimeHistory = [];
    
    // Performance thresholds
    this.targetFPS = GLOBAL_CONFIG.PERFORMANCE.targetFPS;
    this.frameTimeTarget = GLOBAL_CONFIG.PERFORMANCE.frameTimeTarget;
    this.memoryLimit = GLOBAL_CONFIG.PERFORMANCE.memoryLimit;
    
    console.log('📊 PerformanceManager initialized');
  }
  
  /**
   * Start application performance monitoring
   */
  startApplication() {
    this.isEnabled = true;
    this.metrics.lastFpsUpdate = performance.now();
    this.startMonitoring();
    console.log('🚀 Performance monitoring started');
  }
  
  /**
   * Start the monitoring loop
   */
  startMonitoring() {
    this.monitorLoop();
    
    // Set up periodic quality assessment
    setInterval(() => {
      this.assessPerformanceAndScale();
    }, 2000); // Check every 2 seconds
  }
  
  /**
   * Main monitoring loop
   */
  monitorLoop() {
    if (!this.isEnabled) return;
    
    const now = performance.now();
    this.metrics.frameCount++;
    
    // Calculate frame time
    const frameTime = now - this.lastFrameTime;
    this.renderTimeHistory.push(frameTime);
    
    // Keep only last 60 frames for rolling average
    if (this.renderTimeHistory.length > 60) {
      this.renderTimeHistory.shift();
    }
    
    // Calculate FPS every second
    if (now - this.metrics.lastFpsUpdate >= 1000) {
      this.metrics.fps = Math.round(
        (this.metrics.frameCount * 1000) / (now - this.metrics.lastFpsUpdate)
      );
      
      // Update FPS history for trend analysis
      this.fpsHistory.push(this.metrics.fps);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }
      
      // Calculate average FPS
      this.metrics.averageFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      
      // Update memory usage
      this.updateMemoryUsage();
      
      this.metrics.frameCount = 0;
      this.metrics.lastFpsUpdate = now;
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
    
    // Check if frame time exceeds target
    if (this.metrics.renderTime > this.frameTimeTarget) {
      this.metrics.skippedFrames++;
    }
  }
  
  /**
   * Get current FPS
   * @returns {number} Current FPS
   */
  getFPS() {
    return this.metrics.fps;
  }
  
  /**
   * Get average FPS over recent history
   * @returns {number} Average FPS
   */
  getAverageFPS() {
    return Math.round(this.metrics.averageFps);
  }
  
  /**
   * Get current memory usage in MB
   * @returns {number} Memory usage in MB
   */
  getMemoryUsage() {
    return this.metrics.memoryUsage;
  }
  
  /**
   * Get current quality scale
   * @returns {number} Quality scale (0.5 to 1.0)
   */
  getQualityScale() {
    return this.metrics.qualityScale;
  }
  
  /**
   * Update memory usage metrics
   */
  updateMemoryUsage() {
    if (performance.memory) {
      this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
    }
  }
  
  /**
   * Assess performance and adjust quality scaling
   */
  assessPerformanceAndScale() {
    const avgFps = this.getAverageFPS();
    const memoryUsage = this.getMemoryUsage();
    const currentScale = this.metrics.qualityScale;
    
    // Performance assessment flags
    const lowFPS = avgFps < this.targetFPS * 0.9; // Below 54fps
    const highMemory = memoryUsage > this.memoryLimit * 0.8; // Above 80MB
    const criticalFPS = avgFps < this.targetFPS * 0.7; // Below 42fps
    const criticalMemory = memoryUsage > this.memoryLimit; // Above 100MB
    
    let newScale = currentScale;
    
    // Critical performance issues - aggressive scaling
    if (criticalFPS || criticalMemory) {
      newScale = Math.max(GLOBAL_CONFIG.PERFORMANCE.qualityScaleMin, currentScale - 0.2);
      console.warn('🔴 Critical performance detected, reducing quality to', newScale);
    }
    // Minor performance issues - gradual scaling
    else if (lowFPS || highMemory) {
      newScale = Math.max(GLOBAL_CONFIG.PERFORMANCE.qualityScaleMin, currentScale - 0.1);
      console.log('🟡 Performance issues detected, reducing quality to', newScale);
    }
    // Good performance - try to improve quality
    else if (avgFps >= this.targetFPS && memoryUsage < this.memoryLimit * 0.6) {
      newScale = Math.min(GLOBAL_CONFIG.PERFORMANCE.qualityScaleMax, currentScale + 0.1);
      if (newScale > currentScale) {
        console.log('🟢 Good performance, increasing quality to', newScale);
      }
    }
    
    // Apply quality scale changes
    if (newScale !== currentScale) {
      this.metrics.qualityScale = newScale;
      this.applyQualityScale(newScale);
    }
  }
  
  /**
   * Apply quality scaling to visual effects
   * @param {number} scale - Quality scale (0.5 to 1.0)
   */
  applyQualityScale(scale) {
    const root = document.documentElement;
    
    // Scale visual effects based on performance
    root.style.setProperty('--quality-scale', scale);
    root.style.setProperty('--shadow-quality', scale < 0.8 ? 'none' : 'normal');
    root.style.setProperty('--blur-quality', scale < 0.7 ? '0px' : '2px');
    
    // Adjust render distance based on quality
    const maxPages = Math.round(GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages * scale);
    root.style.setProperty('--max-visible-pages', maxPages);
    
    // Emit performance event for other systems
    document.dispatchEvent(new CustomEvent('performance:qualityChanged', {
      detail: { qualityScale: scale, reason: 'performance' }
    }));
  }
  
  /**
   * Get comprehensive performance report
   * @returns {Object} Performance metrics report
   */
  getPerformanceReport() {
    const avgRenderTime = this.renderTimeHistory.length > 0 
      ? this.renderTimeHistory.reduce((a, b) => a + b, 0) / this.renderTimeHistory.length 
      : 0;
    
    return {
      fps: this.metrics.fps,
      averageFps: this.getAverageFPS(),
      memoryUsage: this.metrics.memoryUsage,
      qualityScale: this.metrics.qualityScale,
      renderTime: Math.round(avgRenderTime * 100) / 100,
      renderCalls: this.metrics.renderCalls,
      skippedFrames: this.metrics.skippedFrames,
      isPerformant: this.getAverageFPS() >= this.targetFPS * 0.9 && 
                   this.metrics.memoryUsage < this.memoryLimit * 0.8
    };
  }
  
  /**
   * Log performance metrics to console
   */
  logPerformanceMetrics() {
    const report = this.getPerformanceReport();
    console.group('📊 Performance Metrics');
    console.log(`FPS: ${report.fps} (avg: ${report.averageFPS})`);
    console.log(`Memory: ${report.memoryUsage}MB / ${this.memoryLimit}MB`);
    console.log(`Quality Scale: ${report.qualityScale}`);
    console.log(`Render Time: ${report.renderTime}ms (target: ${this.frameTimeTarget}ms)`);
    console.log(`Render Calls: ${report.renderCalls}`);
    console.log(`Skipped Frames: ${report.skippedFrames}`);
    console.log(`Performance Status: ${report.isPerformant ? '🟢 Good' : '🔴 Issues'}`);
    console.groupEnd();
  }
}

/**
 * RAF-based animation scheduler with performance awareness
 */
class PerformanceAwareScheduler {
  constructor(performanceManager) {
    this.performanceManager = performanceManager;
    this.tasks = [];
    this.running = false;
    this.frameTimeLimit = GLOBAL_CONFIG.PERFORMANCE.frameTimeTarget;
  }
  
  /**
   * Schedule a task with priority
   * @param {Function} task - Task to execute
   * @param {number} priority - Task priority (higher = more important)
   */
  schedule(task, priority = 0) {
    this.tasks.push({ task, priority, timestamp: performance.now() });
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    if (!this.running) {
      this.start();
    }
  }
  
  /**
   * Start the scheduler
   */
  start() {
    this.running = true;
    this.loop();
  }
  
  /**
   * Stop the scheduler
   */
  stop() {
    this.running = false;
  }
  
  /**
   * Main scheduler loop with performance awareness
   */
  loop() {
    if (!this.running) return;
    
    const frameStart = performance.now();
    const qualityScale = this.performanceManager.getQualityScale();
    const adjustedTimeLimit = this.frameTimeLimit * qualityScale;
    
    // Process tasks within time budget
    while (this.tasks.length > 0 && (performance.now() - frameStart) < adjustedTimeLimit) {
      const { task } = this.tasks.shift();
      try {
        task();
      } catch (error) {
        console.error('Scheduler task error:', error);
      }
    }
    
    // Skip tasks if over time budget to maintain performance
    if (this.tasks.length > 0 && (performance.now() - frameStart) >= adjustedTimeLimit) {
      console.warn('⚠️ Scheduler dropping tasks to maintain performance');
      this.tasks = this.tasks.filter(task => task.priority > 5); // Keep only high priority tasks
    }
    
    requestAnimationFrame(() => this.loop());
  }
}

// Export singleton instances
export const perf = new PerformanceManager();
export const scheduler = new PerformanceAwareScheduler(perf);

// Export class for direct instantiation
export { PerformanceManager, PerformanceAwareScheduler };
