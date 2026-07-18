/**
 * cursor-follower.ts
 * Refined desktop-only cursor enhancement.
 *
 * Guards:
 * - Fine pointer only  (hover:hover and pointer:fine)
 * - Never on touch or mobile layouts
 * - Respects prefers-reduced-motion
 * - pointer-events: none on all cursor elements
 * - No layout reads on every pointermove (uses GSAP quickSetter)
 * - Full cleanup on Astro page teardown
 */

import { gsap } from 'gsap';

let dotEl: HTMLElement | null = null;
let ringEl: HTMLElement | null = null;
let labelEl: HTMLElement | null = null;

let isInit = false;
let rafId: number | undefined;
const cleanups: Array<() => void> = [];

/** Pointer state — updated once per rAF */
const pointer = { x: -999, y: -999 };
/** Whether cursor elements are visible yet */
let visible = false;

const RING_EXPAND_SCALE = 1.55;
const RING_LINK_SCALE = 1.2;
const MAGNETIC_RANGE = 80;
const MAGNETIC_STRENGTH = 0.3;

/**
 * Creates the cursor DOM elements (appended to body once).
 */
function createCursorElements(): void {
  dotEl = document.createElement('div');
  dotEl.id = 'cursor-dot';
  dotEl.setAttribute('aria-hidden', 'true');

  ringEl = document.createElement('div');
  ringEl.id = 'cursor-ring';
  ringEl.setAttribute('aria-hidden', 'true');

  labelEl = document.createElement('span');
  labelEl.id = 'cursor-label';
  labelEl.setAttribute('aria-hidden', 'true');
  ringEl.appendChild(labelEl);

  document.body.appendChild(dotEl);
  document.body.appendChild(ringEl);
}

/**
 * Ensures cursor elements exist (idempotent after first call).
 */
function ensureCursorElements(): void {
  dotEl = document.getElementById('cursor-dot') as HTMLElement | null;
  ringEl = document.getElementById('cursor-ring') as HTMLElement | null;
  labelEl = document.getElementById('cursor-label') as HTMLElement | null;

  if (!dotEl || !ringEl || !labelEl) {
    // Remove any stale elements first
    document.getElementById('cursor-dot')?.remove();
    document.getElementById('cursor-ring')?.remove();
    createCursorElements();
  }
}

/**
 * Applies magnetic pull to a button.
 * Returns a cleanup function.
 */
function addMagnetic(el: HTMLElement): () => void {
  const onMove = (e: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MAGNETIC_RANGE) {
      gsap.to(el, {
        x: dx * MAGNETIC_STRENGTH,
        y: dy * MAGNETIC_STRENGTH,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
  };

  el.addEventListener('pointermove', onMove, { passive: true });
  el.addEventListener('pointerleave', onLeave, { passive: true });

  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    gsap.killTweensOf(el);
    gsap.set(el, { x: 0, y: 0 });
  };
}

/**
 * Main initialisation. Safe to call multiple times — idempotent.
 */
export function initCursorFollower(): void {
  if (isInit) return;

  // Guard: fine pointer only
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Guard: not a touch/mobile layout
  const isMobileLayout = window.matchMedia('(max-width: 1023px)').matches;
  // Guard: reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!hasFinePointer || isMobileLayout || prefersReducedMotion) return;

  isInit = true;
  ensureCursorElements();

  if (!dotEl || !ringEl || !labelEl) return;

  // GSAP quick setters — bypass GSAP's internal style parsing on every move
  const setDotX = gsap.quickSetter(dotEl, 'x', 'px');
  const setDotY = gsap.quickSetter(dotEl, 'y', 'px');
  const setRingX = gsap.quickSetter(ringEl, 'x', 'px');
  const setRingY = gsap.quickSetter(ringEl, 'y', 'px');

  // Ring lags slightly behind for the soft-follow feel
  const ringSmooth = { x: -999, y: -999 };
  const RING_LAG = 0.12; // lerp factor

  function rafLoop() {
    // Lerp ring towards dot
    ringSmooth.x += (pointer.x - ringSmooth.x) * RING_LAG;
    ringSmooth.y += (pointer.y - ringSmooth.y) * RING_LAG;

    setDotX(pointer.x);
    setDotY(pointer.y);
    setRingX(ringSmooth.x);
    setRingY(ringSmooth.y);

    rafId = requestAnimationFrame(rafLoop);
  }

  // Start RAF loop
  rafId = requestAnimationFrame(rafLoop);
  cleanups.push(() => {
    if (rafId !== undefined) cancelAnimationFrame(rafId);
    rafId = undefined;
  });

  const onPointerMove = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;

    if (!visible && dotEl && ringEl) {
      visible = true;
      gsap.to([dotEl, ringEl], { opacity: 1, duration: 0.3 });
    }
  };

  const onPointerLeave = () => {
    if (visible && dotEl && ringEl) {
      visible = false;
      gsap.to([dotEl, ringEl], { opacity: 0, duration: 0.2 });
    }
  };

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });
  cleanups.push(() => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
  });

  // Interactive element states
  const interactiveSelectors = 'a, button, [role="button"], input, textarea, select, label, [tabindex]';

  const onInteractiveEnter = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!ringEl || !labelEl) return;

    // Check for cursor label
    const card = target.closest('[data-cursor-label]') as HTMLElement | null;
    const label = card?.dataset.cursorLabel ?? '';

    if (label) {
      labelEl.textContent = label;
      labelEl.style.opacity = '1';
      gsap.to(ringEl, { scale: RING_EXPAND_SCALE, duration: 0.25, ease: 'power2.out' });
    } else {
      labelEl.style.opacity = '0';
      gsap.to(ringEl, { scale: RING_LINK_SCALE, duration: 0.2, ease: 'power2.out' });
    }
  };

  const onInteractiveLeave = () => {
    if (!ringEl || !labelEl) return;
    labelEl.style.opacity = '0';
    gsap.to(ringEl, { scale: 1, duration: 0.25, ease: 'power2.out' });
  };

  document.addEventListener('pointerover', onInteractiveEnter, { passive: true });
  document.addEventListener('pointerout', onInteractiveLeave, { passive: true });
  cleanups.push(() => {
    document.removeEventListener('pointerover', onInteractiveEnter);
    document.removeEventListener('pointerout', onInteractiveLeave);
  });

  // Magnetic CTAs
  const magneticTargets = document.querySelectorAll<HTMLElement>('[data-magnetic]');
  const magneticCleanups = Array.from(magneticTargets).map(addMagnetic);
  cleanups.push(() => {
    for (const cleanup of magneticCleanups) cleanup();
  });

  // Prevent cursor on text inputs
  const inputHandler = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if (dotEl && ringEl) {
      gsap.to([dotEl, ringEl], { opacity: isInput ? 0 : 1, duration: 0.2 });
    }
  };

  document.addEventListener('focusin', inputHandler, { passive: true });
  document.addEventListener('focusout', inputHandler, { passive: true });
  cleanups.push(() => {
    document.removeEventListener('focusin', inputHandler);
    document.removeEventListener('focusout', inputHandler);
  });

  // Hide native cursor on desktop
  document.documentElement.classList.add('custom-cursor-active');
  cleanups.push(() => {
    document.documentElement.classList.remove('custom-cursor-active');
  });
}

/**
 * Destroy cursor — call on Astro page teardown or navigation.
 */
export function destroyCursorFollower(): void {
  for (const cleanup of cleanups) cleanup();
  cleanups.length = 0;
  isInit = false;
  visible = false;

  // Remove DOM elements created by this module
  dotEl?.remove();
  ringEl?.remove();
  dotEl = null;
  ringEl = null;
  labelEl = null;
}
