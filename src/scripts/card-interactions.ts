/**
 * card-interactions.ts
 * Service card spotlight, tilt, project card depth, and hero button magnetic.
 *
 * All tilt/spotlight effects guarded to fine-pointer desktop only.
 * 3D tilt disabled on touch devices entirely.
 * Keyboard-focus equivalent spotlight for accessibility.
 * Full cleanup on Astro page teardown.
 */

import { gsap } from 'gsap';

const cleanups: Array<() => void> = [];

const isFinePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Service card pointer-following spotlight + subtle tilt.
 * Max 3 degrees of rotation.
 */
function initServiceCardInteractions(): void {
  if (!isFinePointer() || prefersReducedMotion()) return;

  const cards = document.querySelectorAll<HTMLElement>('[data-service-card]');

  for (const card of cards) {
    const onEnter = () => {
      gsap.to(card, { '--spotlight-opacity': 1, duration: 0.3 });
    };

    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const nx = (x - cx) / cx; // -1 to 1
      const ny = (y - cy) / cy;

      // Spotlight position
      card.style.setProperty('--spotlight-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--spotlight-y', `${(y / rect.height) * 100}%`);

      // Tilt — max 3 degrees
      gsap.to(card, {
        rotateY: nx * 3,
        rotateX: -ny * 2.5,
        duration: 0.35,
        ease: 'power2.out',
        transformOrigin: 'center center',
        transformPerspective: 800,
      });
    };

    const onLeave = () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        '--spotlight-opacity': 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    // Focus equivalent — highlight without tilt
    const onFocus = () => {
      card.style.setProperty('--spotlight-opacity', '1');
      card.style.setProperty('--spotlight-x', '50%');
      card.style.setProperty('--spotlight-y', '50%');
    };

    const onBlur = () => {
      card.style.setProperty('--spotlight-opacity', '0');
    };

    card.addEventListener('pointerenter', onEnter, { passive: true });
    card.addEventListener('pointermove', onMove, { passive: true });
    card.addEventListener('pointerleave', onLeave, { passive: true });
    card.addEventListener('focusin', onFocus, { passive: true });
    card.addEventListener('focusout', onBlur, { passive: true });

    cleanups.push(() => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      card.removeEventListener('focusin', onFocus);
      card.removeEventListener('focusout', onBlur);
      gsap.killTweensOf(card);
      gsap.set(card, { rotateX: 0, rotateY: 0 });
    });
  }
}

/**
 * Project card image subtle parallax on hover.
 * No 3D tilt on project cards — just depth on the image.
 */
function initProjectCardInteractions(): void {
  if (!isFinePointer() || prefersReducedMotion()) return;

  const cards = document.querySelectorAll<HTMLElement>('[data-work-card]');

  for (const card of cards) {
    const img = card.querySelector<HTMLElement>('img');
    if (!img) continue;

    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

      gsap.to(img, {
        x: nx * 5,
        y: ny * 4,
        scale: 1.04,
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    const onLeave = () => {
      gsap.to(img, { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' });
    };

    card.addEventListener('pointermove', onMove, { passive: true });
    card.addEventListener('pointerleave', onLeave, { passive: true });

    cleanups.push(() => {
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(img);
      gsap.set(img, { x: 0, y: 0, scale: 1 });
    });
  }
}

/**
 * Hero button animated arrow movement on hover.
 */
function initHeroButtonInteractions(): void {
  const buttons = document.querySelectorAll<HTMLElement>('.homepage-hero__primary-action');

  for (const btn of buttons) {
    const arrow = btn.querySelector<SVGElement>('svg');
    if (!arrow) continue;

    const onEnter = () => {
      gsap.to(arrow, { x: 3, duration: 0.25, ease: 'power2.out' });
    };
    const onLeave = () => {
      gsap.to(arrow, { x: 0, duration: 0.3, ease: 'power2.out' });
    };

    btn.addEventListener('pointerenter', onEnter, { passive: true });
    btn.addEventListener('pointerleave', onLeave, { passive: true });

    cleanups.push(() => {
      btn.removeEventListener('pointerenter', onEnter);
      btn.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(arrow);
      gsap.set(arrow, { x: 0 });
    });
  }
}

/**
 * Technology group connection-line glow on hover.
 */
function initTechGroupInteractions(): void {
  if (!isFinePointer() || prefersReducedMotion()) return;

  const groups = document.querySelectorAll<HTMLElement>('[data-tech-group]');

  for (const group of groups) {
    const tags = group.querySelectorAll<HTMLElement>('li');

    const onEnter = () => {
      gsap.to(tags, { '--tag-glow': 1, duration: 0.3, stagger: 0.04 });
    };
    const onLeave = () => {
      gsap.to(tags, { '--tag-glow': 0, duration: 0.3 });
    };

    group.addEventListener('pointerenter', onEnter, { passive: true });
    group.addEventListener('pointerleave', onLeave, { passive: true });

    cleanups.push(() => {
      group.removeEventListener('pointerenter', onEnter);
      group.removeEventListener('pointerleave', onLeave);
    });
  }
}

/**
 * Initialise all card micro-interactions.
 */
export function initCardInteractions(): void {
  initServiceCardInteractions();
  initProjectCardInteractions();
  initHeroButtonInteractions();
  initTechGroupInteractions();
}

/**
 * Destroy all card interactions — call on Astro page teardown.
 */
export function destroyCardInteractions(): void {
  for (const cleanup of cleanups) cleanup();
  cleanups.length = 0;
}
