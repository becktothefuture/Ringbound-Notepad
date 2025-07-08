// src/portfolioLoader.js
// Dynamically builds notebook pages from portfolio.json data
// This is the dist version minus the unsupported JSON-module import.

import { GLOBAL_CONFIG } from './config.js';
import { CHAPTERS } from './chapters.js';

// ---------------------------------------------------------------------------
// 1. SCHEMA (unchanged – trimmed for brevity)
// ---------------------------------------------------------------------------
export const PORTFOLIO_SCHEMA = {
  type: 'object',
  required: ['projects'],
  properties: {
    projects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'pages'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          pages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['asset', 'type', 'commentary'],
              properties: {
                asset: { type: 'string' },
                type: { type: 'string', enum: ['image', 'video'] },
                commentary: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// Very light runtime validator – just checks array shapes
export function validatePortfolioSchema(data) {
  return {
    isValid: !!data && Array.isArray(data.projects),
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// 2. HELPERS
// ---------------------------------------------------------------------------
export function resolveAssetPath(_, asset) {
  return `assets/portfolio-pages/pages/${asset}`;
}

function addPageHoles(front, back) {
  const f = document.createElement('div');
  f.className = 'page-holes page-holes--styled';
  front.appendChild(f);
  const b = document.createElement('div');
  b.className = 'page-holes page-holes--styled page-holes--back';
  back.appendChild(b);
}

function createMediaElement(type, src, alt) {
  if (type === 'video') {
    const v = document.createElement('video');
    v.dataset.src = src;
    v.loop = v.muted = v.autoplay = true;
    v.playsInline = true;
    v.preload = 'none';
    v.className = 'page-content__inner page-content__media--video';
    return v;
  }
  const img = document.createElement('img');
  img.dataset.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  img.className = 'page-content__inner page-content__media';
  return img;
}

function createPageElement(page, chapterId, pageIdx, globalIdx) {
  const pageEl = document.createElement('div');
  pageEl.className = `page page--positioned gpu-accelerated${page.type === 'video' ? ' page--video-page' : ''}`;
  pageEl.dataset.commentary = page.commentary;
  pageEl.dataset.chapterId = chapterId;
  pageEl.dataset.pageIndex = pageIdx;

  const front = document.createElement('div');
  front.className = 'page-front';
  const back = document.createElement('div');
  back.className = 'page-back';
  addPageHoles(front, back);

  const content = document.createElement('div');
  content.className = `page-content page-content--${GLOBAL_CONFIG.LAYOUT.contentAlignment}` +
    (page.type === 'video' ? ' page-content--video-container' : '');
  content.appendChild(createMediaElement(page.type, resolveAssetPath(chapterId, page.asset), page.commentary));
  front.appendChild(content);

  pageEl.appendChild(front);
  pageEl.appendChild(back);
  return pageEl;
}

function createCoverPage(kind, commentary, idx) {
  const cover = document.createElement('div');
  cover.className = `page cover cover--${kind} gpu-accelerated`;
  cover.dataset.commentary = commentary;
  cover.dataset.deckNumber = kind === 'front' ? 'front' : String(idx + 1).padStart(2, '0');
  const front = document.createElement('div');
  front.className = 'page-front';
  const back = document.createElement('div');
  back.className = 'page-back';
  front.classList.add('cover', `cover--${kind}`);
  addPageHoles(front, back);
  cover.appendChild(front);
  cover.appendChild(back);
  return cover;
}

export function createPagesFromPortfolioData(container, data) {
  const valid = validatePortfolioSchema(data);
  if (!valid.isValid) throw new Error('Invalid portfolio schema');

  const stack = container.classList.contains('page-stack') ? container : container.querySelector('.page-stack');
  stack.innerHTML = '';
  CHAPTERS.length = 0;

  const pages = [];
  let globalIdx = 0;
  const front = createCoverPage('front', 'Welcome!', globalIdx++);
  stack.appendChild(front);
  pages.push(front);

  data.projects.forEach(project => {
    // naive grouping – sequential order
    project.pages.forEach((p, idx) => {
      const el = createPageElement(p, project.id, idx, globalIdx);
      stack.appendChild(el);
      pages.push(el);
      globalIdx++;
    });
  });

  const back = createCoverPage('back', 'Thank you!', globalIdx++);
  stack.appendChild(back);
  pages.push(back);
  return pages;
}

// ---------------------------------------------------------------------------
// 3. PortfolioLoader – runtime fetch (preview or default)
// ---------------------------------------------------------------------------
export class PortfolioLoader {
  async load() {
    const res = await fetch('data/portfolio.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  }
} 