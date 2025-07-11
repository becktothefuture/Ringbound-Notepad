// LockedPortfolio – front-cover lock mechanism
// ------------------------------------------------------------
// Integrates with the DOM element `.cover-band` created by portfolioLoader.js.
// Provides: digit input handling, scroll jitter, unlock/fail animations,
// cookie persistence, and rich console debugging.

import { GLOBAL_CONFIG } from './config.js';
import * as audio from './audioManager.js';

// Ensure global lock flag defined early to avoid race with scrollEngine
if (typeof window !== 'undefined' && window.isPortfolioLocked === undefined) {
  window.isPortfolioLocked = true; // Assume locked until explicitly unlocked
}

const STATES = {
  LOCKED: 'locked',
  UNLOCKING: 'unlocking',
  UNLOCKED: 'unlocked',
};

class LockedPortfolio {
  constructor(bandElement) {
    if (!bandElement) throw new Error('LockedPortfolio: bandElement is required');
    this.band = bandElement;
    this.leftStrap = bandElement.querySelector('.cover-band__strap-left');
    this.rightStrap = bandElement.querySelector('.cover-band__strap-right');
    this.screen = bandElement.querySelector('.cover-band__screen');
    this.digitsEl = bandElement.querySelector('.cover-band__numbers');

    // Front cover element for rumble effect
    this.coverEl = document.querySelector('.page.cover.cover--front');
    this.expectedCode = GLOBAL_CONFIG.LOCK.code.join('');
    this.cookieName = GLOBAL_CONFIG.LOCK.cookieName;
    this.cookieTTL = GLOBAL_CONFIG.LOCK.cookieTTL;
    this.persistence = GLOBAL_CONFIG.LOCK.persistence !== false; // default true unless explicitly false

    this.buffer = '';
    this.state = STATES.LOCKED;

    // Debug flag – verbose console logs
    this.debug = true;

    // Global exposure for debugging helpers
    window.LockedPortfolio = this;

    // Early exit if persistence enabled and cookie says already unlocked
    if (this.persistence && this.hasCookie()) {
      this.setState(STATES.UNLOCKED);
      this.hideBandImmediate();
      return;
    }

    // Otherwise ensure band is visible
    this.band.style.display = 'flex';
    window.isPortfolioLocked = true;
    this.attachEventListeners();
    this.log('🔒 LockedPortfolio initialized');
  }

  // --------------------------------------------------
  // Public helpers (debug console)
  clearCookie() {
    document.cookie = `${this.cookieName}=; max-age=0; path=/`;
    this.log('🍪 Cookie cleared');
  }

  simulateError() {
    this.handleValidation(false);
  }

  // --------------------------------------------------
  setState(newState) {
    this.state = newState;
    this.log(`📡 State → ${newState}`);
    document.dispatchEvent(new CustomEvent('lock:state', { detail: { locked: newState !== STATES.UNLOCKED } }));
  }

  hasCookie() {
    return document.cookie.includes(`${this.cookieName}=true`);
  }

  writeCookie() {
    if (!this.persistence) return; // Skip if disabled
    document.cookie = `${this.cookieName}=true; max-age=${this.cookieTTL}; path=/`;
    this.log('🍪 Unlock cookie written');
  }

  hideBandImmediate() {
    this.band.style.display = 'none';
    window.isPortfolioLocked = false;
  }

  attachEventListeners() {
    // Keyboard
    document.addEventListener('keydown', this.onKeyDown);

    // Scroll block & jitter
    document.addEventListener('wheel', this.onBlockedScroll, { passive: false });
    document.addEventListener('touchmove', this.onBlockedScroll, { passive: false });

    // Mobile tap to open keypad
    this.screen.addEventListener('click', this.onScreenTap);
  }

  detachEventListeners() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('wheel', this.onBlockedScroll);
    document.removeEventListener('touchmove', this.onBlockedScroll);
    this.screen.removeEventListener('click', this.onScreenTap);
  }

  // Arrow functions for proper this binding
  onKeyDown = (e) => {
    if (this.state !== STATES.LOCKED) return;

    // Numeric keys only 0-9
    if (!/^[0-9]$/.test(e.key)) return;

    e.preventDefault(); // Prevent default scrolling shortcuts or input

    // Resume audio on very first digit
    if (this.buffer.length === 0) {
      audio.resumeContext();
    }

    // Limit to 3 digits
    if (this.buffer.length >= 3) return;

    this.buffer += e.key;
    this.updateDisplay();

    // Play digit sound (except maybe first due to restrictions, resume already done)
    audio.play('digit');

    if (this.buffer.length === 3) {
      const isCorrect = this.buffer === this.expectedCode;
      this.handleValidation(isCorrect);
    }
  };

  onScreenTap = () => {
    if (this.hiddenInput) return; // Already created

    // Create hidden tel input off-screen to get keypad
    const input = document.createElement('input');
    input.type = 'tel';
    input.inputMode = 'numeric';
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.maxLength = 3;
    document.body.appendChild(input);
    input.focus();
    this.hiddenInput = input;

    // Mirror keydown logic via input event
    input.addEventListener('input', () => {
      const val = input.value.replace(/[^0-9]/g, '');
      if (val.length === 0) return;

      for (const digit of val) {
        const fakeEvent = { key: digit };
        this.onKeyDown(fakeEvent);
      }

      input.value = '';
    });
  };

  onBlockedScroll = (e) => {
    if (this.state !== STATES.LOCKED) return;
    e.preventDefault();
    this.triggerJitter();
  };

  triggerJitter() {
    if (this.jitterTimeout) return; // throttle
    if (!this.coverEl) return;

    // Set custom property for angle
    const maxDeg = GLOBAL_CONFIG.LOCK.coverRumbleMaxDeg || 5;
    this.coverEl.style.setProperty('--rumble-deg', `${maxDeg}deg`);

    this.coverEl.classList.add('cover-rumble');
    this.jitterTimeout = setTimeout(() => {
      this.coverEl.classList.remove('cover-rumble');
      this.jitterTimeout = null;
    }, 180);
  }

  updateDisplay() {
    const padded = (this.buffer + '000').slice(0, 3);
    this.digitsEl.textContent = padded;
  }

  resetDisplay() {
    this.buffer = '';
    this.digitsEl.textContent = '000';
  }

  handleValidation(isCorrect) {
    if (isCorrect) {
      this.setState(STATES.UNLOCKING);
      audio.play('unlock');
      this.playUnlockAnimation();
    } else {
      audio.play('error');
      this.playErrorAnimation();
    }
  }

  playErrorAnimation() {
    this.digitsEl.classList.add('error');
    this.setState('error');
    this.log('❌ Wrong code');

    // After animation, clean up
    const handler = () => {
      this.digitsEl.classList.remove('error');
      this.digitsEl.removeEventListener('animationend', handler);
      this.resetDisplay();
      this.setState(STATES.LOCKED);
    };
    this.digitsEl.addEventListener('animationend', handler);
  }

  playUnlockAnimation() {
    this.log('🔓 Correct code – unlock animation start');

    // Read animation params from config
    const cfg = GLOBAL_CONFIG.LOCK;
    const distance = cfg.strapSlideDistanceVW ?? 5; // vw
    const strapDuration = cfg.strapDuration ?? 1500;
    const bandDuration = cfg.bandDuration ?? 800;

    // Prepare Straps
    const strapTransition = `transform ${strapDuration}ms ease-out, opacity 200ms ease-out ${strapDuration * 0.8}ms`;
    [this.leftStrap, this.rightStrap].forEach(el => {
      el.style.transition = strapTransition;
    });

    // Trigger reflow then set final styles
    void this.leftStrap.offsetWidth;

    this.leftStrap.style.transform = `translateX(-${distance}vw)`;
    this.rightStrap.style.transform = `translateX(${distance}vw)`;
    this.leftStrap.style.opacity = '0';
    this.rightStrap.style.opacity = '0';

    // Band transition starts after straps movement completes
    const bandDelay = strapDuration;
    const bandTransition = `transform ${bandDuration}ms ease-out ${bandDelay}ms, filter ${bandDuration}ms ease-out ${bandDelay}ms, opacity ${bandDuration}ms ease-out ${bandDelay}ms`;
    this.band.style.transition = bandTransition;

    // Trigger reflow before changing band styles
    void this.band.offsetWidth;

    const lift = cfg.bandLift ?? 80;
    const scale = cfg.bandScale ?? 1.2;
    const blur = cfg.bandBlur ?? 6;

    this.band.style.transform = `translateZ(${lift}px) scale(${scale})`;
    this.band.style.filter = `blur(${blur}px)`;
    this.band.style.opacity = '0';

    // Clean up after full timeline (straps + band)
    setTimeout(() => {
      this.setState(STATES.UNLOCKED);
      this.writeCookie();
      this.detachEventListeners();
      this.band.style.display = 'none';
      window.isPortfolioLocked = false;
      if (this.hiddenInput) {
        this.hiddenInput.remove();
        this.hiddenInput = null;
      }
      this.log('🏁 Unlock complete');
    }, strapDuration + bandDuration + 100);
  }

  log(...args) {
    if (this.debug) console.log('%c🔐 LockedPortfolio', 'color:#0af', ...args);
  }
}

// Factory
export function init(bandElement) {
  if (!bandElement) {
    console.warn('LockedPortfolio.init called with null element');
    return null;
  }
  return new LockedPortfolio(bandElement);
} 