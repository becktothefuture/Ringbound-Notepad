import { GLOBAL_CONFIG } from './config.js';

// --- State Management ---
const state = {
  isVisible: false,
  activeTab: 'master',
  tabs: {},
  controls: new Map(),
  config: {}, // Local copy of GLOBAL_CONFIG for manipulation
};

// --- Core Functions ---

/**
 * Initializes the debug panel, loads settings, and sets up listeners.
 */
function initialize() {
  loadSettings();
  createPanel();
  setupEventListeners();
  console.log('🔧 Debug Panel v2 Initialized');
}

/**
 * Creates the main panel and tab structure in the DOM.
 */
function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'debug-panel-v2';
  panel.innerHTML = getPanelHTML();
  document.body.appendChild(panel);
  state.panel = panel;

  // Define tabs
  addTab('master', '👑', 'Master', createMasterContent);
  addTab('physics', '🌎', 'Physics', createPhysicsContent);
  addTab('animation', '🎨', 'Animation', createAnimationContent);
  addTab('performance', '⚡️', 'Performance', createPerformanceContent);
  
  // Activate the default or saved tab
  const savedTab = localStorage.getItem('debug-panel-active-tab');
  setActiveTab(savedTab || 'master');
}

/**
 * Sets up global event listeners (e.g., keyboard shortcuts).
 */
function setupEventListeners() {
  // Toggle panel visibility with Ctrl+Shift+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggle();
    }
  });

  // Close button
  state.panel.querySelector('.debug-panel__close').addEventListener('click', hide);
  
  // Tab navigation
  state.panel.querySelector('.debug-panel__tabs').addEventListener('click', (e) => {
    const tabButton = e.target.closest('[data-tab]');
    if (tabButton) {
      setActiveTab(tabButton.dataset.tab);
    }
  });
}

/**
 * Adds a new tab and its content generator to the panel.
 * @param {string} id - Unique ID for the tab.
 * @param {string} icon - Emoji for the tab button.
 * @param {string} title - Text label for the tab.
 * @param {Function} contentGenerator - Function that returns the HTML for the tab's content.
 */
function addTab(id, icon, title, contentGenerator) {
  // Add tab button
  const tabsContainer = state.panel.querySelector('.debug-panel__tabs');
  const button = document.createElement('button');
  button.dataset.tab = id;
  button.className = 'debug-panel__tab-button';
  button.innerHTML = `<span class="icon">${icon}</span> ${title}`;
  tabsContainer.appendChild(button);

  // Add content pane
  const contentContainer = state.panel.querySelector('.debug-panel__content');
  const pane = document.createElement('div');
  pane.id = `tab-content-${id}`;
  pane.className = 'debug-panel__tab-pane';
  pane.innerHTML = contentGenerator();
  contentContainer.appendChild(pane);
  
  // Store reference
  state.tabs[id] = { button, pane };
  
  // Wire up controls within the new content
  wireControls(pane);
}

/**
 * Sets the currently active tab.
 * @param {string} id - The ID of the tab to activate.
 */
function setActiveTab(id) {
  if (!state.tabs[id]) return;

  state.activeTab = id;
  localStorage.setItem('debug-panel-active-tab', id);

  // Update button and pane visibility
  for (const tabId in state.tabs) {
    const { button, pane } = state.tabs[tabId];
    const isActive = tabId === id;
    button.classList.toggle('active', isActive);
    pane.classList.toggle('active', isActive);
  }
}

/**
 * Finds all control elements within a container and attaches listeners.
 * @param {HTMLElement} container - The parent element containing controls.
 */
function wireControls(container) {
  const sliders = container.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const key = slider.dataset.key;
    const [group, prop] = key.split('.');
    
    // Set initial value from config
    const valueEl = slider.parentElement.querySelector('.debug-control__value');
    slider.value = state.config[group][prop];
    if (valueEl) valueEl.textContent = slider.value;
    
    // Add listener
    slider.addEventListener('input', () => {
      const newValue = parseFloat(slider.value);
      state.config[group][prop] = newValue;
      if (valueEl) valueEl.textContent = newValue.toFixed(2);
      saveSettings();
      // Optional: Dispatch a global event for real-time updates
      window.dispatchEvent(new CustomEvent('config-updated', { detail: { key, value: newValue } }));
    });
    
    state.controls.set(key, slider);
  });
}

// --- Persistence ---

/**
 * Saves the current state of `state.config` to localStorage.
 */
function saveSettings() {
  try {
    localStorage.setItem('debug-panel-config', JSON.stringify(state.config));
  } catch (e) {
    console.error('Failed to save debug settings to localStorage.', e);
  }
}

/**
 * Loads settings from localStorage and merges them with GLOBAL_CONFIG.
 */
function loadSettings() {
  const defaultConfig = JSON.parse(JSON.stringify(GLOBAL_CONFIG));
  try {
    const savedSettings = localStorage.getItem('debug-panel-config');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Deep merge saved settings over defaults
      Object.keys(parsed).forEach(group => {
        if (defaultConfig[group]) {
          Object.keys(parsed[group]).forEach(prop => {
            defaultConfig[group][prop] = parsed[group][prop];
          });
        }
      });
    }
  } catch (e) {
    console.error('Failed to load debug settings from localStorage.', e);
  }
  state.config = defaultConfig;
  // Overwrite GLOBAL_CONFIG with the potentially modified version
  Object.assign(GLOBAL_CONFIG, state.config);
}


// --- UI & Content ---

/**
 * Toggles the visibility of the debug panel.
 */
function toggle() {
  state.isVisible ? hide() : show();
}
function show() {
  state.panel.classList.add('visible');
  state.isVisible = true;
}
function hide() {
  state.panel.classList.remove('visible');
  state.isVisible = false;
}

/**
 * Returns the main HTML structure for the panel.
 */
function getPanelHTML() {
  return `
    <div class="debug-panel__header">
      <h3>Debug Controls</h3>
      <button class="debug-panel__close">&times;</button>
    </div>
    <div class="debug-panel__tabs"></div>
    <div class="debug-panel__content"></div>
  `;
}

// --- Content Generators ---

function createMasterContent() {
  return `
    <div class="debug-panel__group master-group">
      <h4>Master Controls</h4>
      <p>Global multipliers affecting the entire simulation.</p>
      ${createSlider('EXPERIMENTS.gravityMultiplier', 'Gravity Multiplier', 0.1, 5, 0.1)}
    </div>
  `;
}

function createPhysicsContent() { return 'Physics content goes here.'; }
function createAnimationContent() { return 'Animation content goes here.'; }
function createPerformanceContent() { return 'Performance content goes here.'; }

/**
 * Helper to create a slider control.
 * @param {string} key - The config key (e.g., "PHYSICS.mass").
 * @param {string} label - The display label for the slider.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @param {number} step - Step increment.
 */
function createSlider(key, label, min, max, step) {
  return `
    <div class="debug-control debug-control--slider">
      <label>${label}</label>
      <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}">
      <span class="debug-control__value"></span>
    </div>
  `;
}

// --- Styles ---
function injectStyles() {
    const css = `
    #debug-panel-v2 {
        /* Main panel styles */
    }
    .debug-panel__tab-button.active {
        /* Active tab styles */
    }
    .master-group {
        background: rgba(20, 100, 255, 0.1);
        border-left: 3px solid rgba(20, 100, 255, 0.8);
    }
    .master-group::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: radial-gradient(circle at 50% 50%, rgba(20, 100, 255, 0.2), transparent 70%);
        animation: pulse 2s infinite ease-in-out;
        pointer-events: none;
    }
    @keyframes pulse {
        0% { transform: scale(0.9); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(0.9); opacity: 0.5; }
    }
    /* Add other styles for sliders, labels, etc. */
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

// --- Public API ---
export const debugPanel = {
  initialize,
  toggle,
  show,
  hide,
  get config() { return state.config; },
};

// Auto-initialize if in debug mode
if (new URLSearchParams(window.location.search).has('debug')) {
  document.addEventListener('DOMContentLoaded', initialize);
} 