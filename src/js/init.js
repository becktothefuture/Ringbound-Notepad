import { config } from './config.js';
import { debug } from './debug.js';
import { generatePageHTML, generateRingsHTML } from './utils.js';

class Initializer {
  constructor() {
    this.notepad = document.querySelector('.notepad');
    this.init();
  }

  init() {
    try {
      debug.log('init', 'Starting initialization');

      this.setupNotepad();
      this.generatePages();
      this.setupScrollHeight();

      debug.log('init', 'Initialization complete');
    } catch (error) {
      debug.error('Initialization failed', error);
      this.showFallback();
    }
  }

  setupNotepad() {
    // Add rings container
    const rings = document.createElement('div');
    rings.className = 'rings';
    rings.innerHTML = generateRingsHTML();
    this.notepad.insertBefore(rings, this.notepad.firstChild);

    // Set cursor style
    this.notepad.style.cursor = 'grab';
    this.notepad.addEventListener('mousedown', () => {
      this.notepad.style.cursor = 'grabbing';
    });
    this.notepad.addEventListener('mouseup', () => {
      this.notepad.style.cursor = 'grab';
    });
    this.notepad.addEventListener('mouseleave', () => {
      this.notepad.style.cursor = 'grab';
    });
  }

  generatePages() {
    const pagesHTML = Array.from({ length: config.pageCount }, (_, i) => generatePageHTML(i)).join(
      ''
    );

    this.notepad.insertAdjacentHTML('beforeend', pagesHTML);
  }

  setupScrollHeight() {
    // Set the total scroll height to accommodate all pages
    const totalHeight = config.scrollPerPage * config.pageCount;
    document.body.style.height = `${totalHeight}px`;
  }

  showFallback() {
    // Hide the notepad
    this.notepad.style.display = 'none';

    // Create and show fallback message
    const fallback = document.createElement('div');
    fallback.className = 'fallback';
    fallback.innerHTML = `
            <h1>Ring-Bound Notepad</h1>
            <p>We're sorry, but the 3D notepad effect is not available on your device.</p>
            <p>Please try using a modern browser with WebGL support.</p>
        `;

    // Add fallback styles
    fallback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            padding: 2rem;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 90%;
            width: 400px;
        `;

    document.body.appendChild(fallback);
  }
}

// Initialize the notepad
new Initializer();
