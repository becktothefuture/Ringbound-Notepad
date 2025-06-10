import { config } from './config.js';

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const lerp = (start, end, t) => start * (1 - t) + end * t;

export const calculatePageHue = (index) => {
    const hueStep = config.hueRange / config.pageCount;
    return config.baseHue + (index * hueStep);
};

export const generatePageHTML = (index) => {
    const hue = calculatePageHue(index);
    return `
        <div class="page" data-index="${index}" style="--page-hue: ${hue}">
            <div class="content">
                <h1>Page ${index + 1}</h1>
                <p>This is page ${index + 1} of our notepad.</p>
            </div>
        </div>
    `;
};

export const generateRingsHTML = () => {
    return Array.from({ length: 20 }, () => `
        <span class="ring">
            <svg viewBox="0 0 10 10">
                <circle cx="5" cy="5" r="4" stroke-width="1.5" fill="none" stroke="#999"/>
            </svg>
        </span>
    `).join('');
};

export const calculateProgress = (scrollTop, index) => {
    const pageHeight = config.scrollPerPage;
    return clamp((scrollTop - index * pageHeight) / pageHeight, 0, 1);
};

export const calculateRotation = (progress) => {
    return progress * config.rotateMax;
};

export const calculateOpacity = (rotation) => {
    if (rotation <= config.fadeStart) return 1;
    if (rotation >= config.fadeEnd) return 0;
    return 1 - ((rotation - config.fadeStart) / (config.fadeEnd - config.fadeStart));
};

export const calculateBlur = (rotation) => {
    if (rotation <= config.fadeStart) return 0;
    if (rotation >= config.fadeEnd) return config.blurMax;
    return (rotation - config.fadeStart) / (config.fadeEnd - config.fadeStart) * config.blurMax;
};

export const shouldSnap = (rotation) => {
    return Math.abs(rotation) > config.snapThreshold;
};

export const getSnapTarget = (rotation) => {
    return shouldSnap(rotation) ? config.rotateMax : 0;
};

export const triggerHaptic = () => {
    if ('vibrate' in navigator) {
        navigator.vibrate(config.hapticDuration);
    }
}; 