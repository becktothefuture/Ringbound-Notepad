import { config } from './config.js';

class Debug {
  constructor() {
    this.overlay = null;
    this.isEnabled = config.debug;
    this.init();
  }

  init() {
    if (!this.isEnabled) return;

    this.createOverlay();
    this.setupConsoleGroups();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'debug-overlay';
    this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            pointer-events: none;
        `;
    document.body.appendChild(this.overlay);
  }

  setupConsoleGroups() {
    console.group('Debug Groups');
    console.group('init');
    console.group('renderFrame');
    console.group('loopReset');
    console.group('errorHandling');
    console.groupEnd();
    console.groupEnd();
    console.groupEnd();
    console.groupEnd();
    console.groupEnd();
  }

  updateOverlay(data) {
    if (!this.isEnabled || !this.overlay) return;

    this.overlay.innerHTML = `
            <div>Scroll: ${Math.round(data.scrollTop)}px</div>
            <div>Page: ${data.currentPage}</div>
            <div>Rotation: ${Math.round(data.rotation)}°</div>
            <div>FPS: ${Math.round(data.fps)}</div>
        `;
  }

  log(group, message, data = null) {
    if (!this.isEnabled) return;

    console.group(group);
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
    console.groupEnd();
  }

  error(message, error) {
    if (!this.isEnabled) return;

    console.group('errorHandling');
    console.error(message, error);
    console.groupEnd();
  }
}

export const debug = new Debug();
