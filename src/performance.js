/**
 * PERFORMANCE MONITORING SYSTEM
 * 
 * This module provides comprehensive performance monitoring and optimization
 * utilities for the ringbound notepad application.
 */

import { PAGE_ANIMATION } from './config.js';

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
    
    this.isEnabled = false;
    this.lastFrameTime = performance.now();
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
  }
  
  /**
   * Mark the end of a render operation
   */
  endRender() {
    if (!this.isEnabled) return;
    this.metrics.renderTime = performance.now() - this.renderStartTime;
  }
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
        console.error('Animation task error:', error);
      }
    }
    
    requestAnimationFrame(() => this.loop());
  }
}

// Export singleton instances
export const perf = new PerformanceTracker();
export const scheduler = new AnimationScheduler();
