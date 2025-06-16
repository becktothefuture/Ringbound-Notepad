/**
 * Browser Theme System
 * 
 * This module handles browser-specific theming and color matching.
 * It detects the user's browser and applies appropriate colors to match
 * the browser's native appearance in both light and dark modes.
 */

console.log('Browser Theme Initialised');

// Cache DOM elements and media query
const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
const root = document.documentElement;

// Enhanced color presets with additional properties
const COLOR_PRESETS = {
    chrome: { 
        light: { 
            main: "#ffffff",
            accent: "#e8eaed",
            text: "#202124"
        }, 
        dark: { 
            main: "#3c3c3c",
            accent: "#444746",
            text: "#e8eaed"
        }
    },
    safari: { 
        light: { 
            main: "#f3f3f2",
            accent: "#cdcdcc",
            text: "#1d1d1f"
        }, 
        dark: { 
            main: "#242424",
            accent: "#000000",
            text: "#f5f5f7"
        }
    },
    firefox: { 
        light: { 
            main: "#f5f5f5",
            accent: "#d4d4d2",
            text: "#20123a"
        }, 
        dark: { 
            main: "#2e2e2e",
            accent: "#2d2d2d",
            text: "#f9f9fa"
        }
    },
    edge: { 
        light: { 
            main: "#f3f2f1",
            accent: "#e2e3e1",
            text: "#323130"
        }, 
        dark: { 
            main: "#323130",
            accent: "#444746",
            text: "#f3f2f1"
        }
    },
    opera: { 
        light: { 
            main: "#fafafa",
            accent: "#e2e3e1",
            text: "#202124"
        }, 
        dark: { 
            main: "#3b3b3b",
            accent: "#444746",
            text: "#f5f5f7"
        }
    },
    brave: { 
        light: { 
            main: "#ffffff",
            accent: "#e2e3e1",
            text: "#202124"
        }, 
        dark: { 
            main: "#2d2d2d",
            accent: "#444746",
            text: "#f5f5f7"
        }
    },
    arc: { 
        light: { 
            main: "#e8e8e8",
            accent: "#e2e3e1",
            text: "#202124"
        }, 
        dark: { 
            main: "#292a2b",
            accent: "#444746",
            text: "#f5f5f7"
        }
    },
    default: { 
        light: { 
            main: "#ffffff",
            accent: "#e2e3e1",
            text: "#202124"
        }, 
        dark: { 
            main: "#1b1c1c",
            accent: "#444746",
            text: "#f5f5f7"
        }
    }
};

// Presets for the hairline colors (optional)
const COLOR_LINE_PRESETS = {
    chrome: { light: "#e2e3e1", dark: "#444746" },
    safari: { light: "#cdcdcc", dark: "#000000" },
    firefox: { light: "#d4d4d2", dark: "#2d2d2d" },
    edge: { light: "#e2e3e1", dark: "#444746" },
    opera: { light: "#e2e3e1", dark: "#444746" },
    brave: { light: "#e2e3e1", dark: "#444746" },
    arc: { light: "#e2e3e1", dark: "#444746" },
    default: { light: "#e2e3e1", dark: "#444746" }
};

// Detect user's browser with improved accuracy
function detectBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for Brave first as it can be detected via API
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
        return "brave";
    }
    
    // Check for Arc
    if (userAgent.includes("arc")) {
        return "arc";
    }
    
    // Check for Edge (must be before Chrome as Edge includes Chrome in UA)
    if (userAgent.includes("edg")) {
        return "edge";
    }
    
    // Check for Opera (must be before Chrome as Opera includes Chrome in UA)
    if (userAgent.includes("opera") || userAgent.includes("opr")) {
        return "opera";
    }
    
    // Check for Chrome (must be after Edge and Opera)
    if (userAgent.includes("chrome")) {
        return "chrome";
    }
    
    // Check for Safari (must be after Chrome as Safari includes Chrome in UA)
    if (userAgent.includes("safari")) {
        return "safari";
    }
    
    // Check for Firefox
    if (userAgent.includes("firefox")) {
        return "firefox";
    }
    
    return "default";
}

// Apply color settings with smooth transitions
function applyBrowserColors() {
    const browser = detectBrowser();
    const mode = prefersDarkMode.matches ? "dark" : "light";
    const colors = COLOR_PRESETS[browser] || COLOR_PRESETS.default;
    const theme = colors[mode];

    // Add transition class
    root.classList.add('theme-transitioning');

    // Apply colors to CSS variables
    root.style.setProperty("--browser-color", theme.main);
    root.style.setProperty("--browser-accent", theme.accent);
    root.style.setProperty("--browser-text", theme.text);
    
    // Apply background color to body
    document.body.style.backgroundColor = theme.main;
    
    // Update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme.main);
    }

    // Remove transition class after animation completes
    setTimeout(() => {
        root.classList.remove('theme-transitioning');
    }, 300);
}

// Initialize theme settings
export function initBrowserTheme() {
    // Add transition styles
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --browser-color: #ffffff;
            --browser-accent: #e2e3e1;
            --browser-text: #202124;
            transition: background-color 0.3s ease;
        }
        
        :root.theme-transitioning * {
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        body {
            background-color: var(--browser-color);
            color: var(--browser-text);
        }
    `;
    document.head.appendChild(style);

    // Initial application
    applyBrowserColors();

    // Listen for theme changes
    prefersDarkMode.addEventListener("change", applyBrowserColors);
    
    // Listen for visibility changes to handle theme updates when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            applyBrowserColors();
        }
    });
}