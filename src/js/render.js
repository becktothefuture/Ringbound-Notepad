import { config } from './config.js';
import { debug } from './debug.js';
import {
  calculateProgress,
  calculateRotation,
  calculateOpacity,
  calculateBlur,
  shouldSnap,
  getSnapTarget,
  triggerHaptic,
} from './utils.js';

class Renderer {
  constructor() {
    this.notepad = document.querySelector('.notepad');
    this.pages = Array.from(this.notepad.querySelectorAll('.page'));
    this.currentPage = 0;
    this.lastScrollTop = 0;
    this.isAnimating = false;
    this.lastFrameTime = 0;
    this.fps = 0;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.animate();
  }

  setupEventListeners() {
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    window.addEventListener('resize', this.handleResize.bind(this), { passive: true });

    if ('ontouchstart' in window) {
      this.notepad.addEventListener('touchstart', () => triggerHaptic(), { passive: true });
    }
  }

  handleScroll() {
    if (this.isAnimating) return;

    const scrollTop = window.scrollY;
    const delta = scrollTop - this.lastScrollTop;

    if (Math.abs(delta) > 0) {
      this.lastScrollTop = scrollTop;
      this.updatePages();
    }
  }

  handleResize() {
    config.scrollPerPage = window.innerHeight;
    this.updatePages();
  }

  updatePages() {
    const scrollTop = window.scrollY;

    this.pages.forEach((page, index) => {
      const progress = calculateProgress(scrollTop, index);
      const rotation = calculateRotation(progress);
      const opacity = calculateOpacity(rotation);
      const blur = calculateBlur(rotation);

      this.updatePageTransform(page, rotation, opacity, blur);

      if (progress > 0 && progress < 1) {
        this.currentPage = index;
      }
    });

    this.handleLooping(scrollTop);
  }

  updatePageTransform(page, rotation, opacity, blur) {
    const transform = `
            translate(-50%, -50%)
            rotateX(${rotation}deg)
            translateZ(calc(-0.5px * var(--i)))
            translateY(calc(-0.25px * var(--i)))
        `;

    page.style.transform = transform;
    page.style.opacity = opacity;
    page.style.filter = `blur(${blur}px)`;

    // Add depth cues
    if (Math.abs(rotation) < 20) {
      page.style.boxShadow = '0 2px 6px rgba(0,0,0,.12) inset';
      page.style.filter += ' drop-shadow(0 8px 24px rgba(0,0,0,.08))';
    } else {
      page.style.boxShadow = 'none';
    }
  }

  handleLooping(scrollTop) {
    const totalHeight = config.scrollPerPage * config.pageCount;

    if (scrollTop >= totalHeight) {
      window.scrollTo(0, scrollTop - totalHeight);
    } else if (scrollTop < 0) {
      window.scrollTo(0, scrollTop + totalHeight);
    }
  }

  animate() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;

    this.fps = 1000 / delta;
    this.lastFrameTime = now;

    if (config.debug) {
      debug.updateOverlay({
        scrollTop: window.scrollY,
        currentPage: this.currentPage,
        rotation: this.pages[this.currentPage]?.style.transform || 0,
        fps: this.fps,
      });
    }

    requestAnimationFrame(this.animate.bind(this));
  }
}

export const renderer = new Renderer();
