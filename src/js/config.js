export const config = {
  // Motion Parameters
  rotateMax: -300, // degrees
  fadeStart: 180, // degrees
  fadeEnd: 270, // degrees
  blurMax: 10, // pixels
  scrollPerPage: typeof window !== 'undefined' ? window.innerHeight : 1000, // 100vh fallback

  // Snap Behavior
  snapThreshold: 135, // degrees
  snapDuration: 300, // milliseconds

  // Performance
  useReducedMotion: () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,

  // Debug
  debug: false,

  // Visual
  pageCount: 50,
  baseHue: 210,
  hueRange: 50, // Will create a range from 210 to 260

  // Grid
  gridColumns: 12,
  outerGutter: 32, // pixels

  // Typography
  fontFamily: 'Inter, system-ui, sans-serif',
  headlineSize: 'clamp(2.5rem, 5vw, 3.5rem)',
  bodySize: 'clamp(1rem, 2vw, 1.125rem)',

  // Animation
  animationDuration: 300, // milliseconds
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Touch
  hapticDuration: 15, // milliseconds
};
