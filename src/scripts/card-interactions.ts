/**
 * card-interactions.ts
 * Service card spotlight + lift, project card depth, hero button magnetic.
 *
 * ⚠️  NO 3D TRANSFORMS on cards — rotateY/rotateX with preserve-3d causes
 *     cards to go blank as the face rotates away from the viewer.
 *     Instead: scale + subtle Y-translate gives a "lift" feel.
 */

import { gsap } from 'gsap';

const cleanups: Array<() => void> = [];

const isFinePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Service card pointer-following spotlight + lift.
 * NO rotateY/rotateX — uses scale + translateY instead.
 */
function initServiceCardInteractions(): void {
  if (!isFinePointer()) return;

  const cards = document.querySelectorAll<HTMLElement>('[data-service-card]');

  for (const card of cards) {
    const spotlight = card.querySelector<HTMLElement>('.home-service-card__spotlight');

    const onEnter = () => {
      gsap.to(card, {
        y: -6,
        scale: 1.015,
        duration: 0.35,
        ease: 'power2.out',
      });
      if (spotlight) {
        gsap.to(spotlight, { opacity: 1, duration: 0.3 });
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Spotlight tracks the pointer
      card.style.setProperty('--spotlight-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--spotlight-y', `${(y / rect.height) * 100}%`);
    };

    const onLeave = () => {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: 'power3.out',
      });
      if (spotlight) {
        gsap.to(spotlight, { opacity: 0, duration: 0.4 });
      }
    };

    // Focus equivalent — spotlight without lift
    const onFocus = () => {
      card.style.setProperty('--spotlight-x', '50%');
      card.style.setProperty('--spotlight-y', '50%');
      if (spotlight) gsap.to(spotlight, { opacity: 1, duration: 0.3 });
    };

    const onBlur = () => {
      if (spotlight) gsap.to(spotlight, { opacity: 0, duration: 0.3 });
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
      if (spotlight) gsap.killTweensOf(spotlight);
      gsap.set(card, { y: 0, scale: 1 });
    });
  }
}

/**
 * Project card image subtle parallax on hover.
 */
function initProjectCardInteractions(): void {
  if (!isFinePointer()) return;

  const cards = document.querySelectorAll<HTMLElement>('[data-work-card]');

  for (const card of cards) {
    const img = card.querySelector<HTMLElement>('img');
    if (!img) continue;

    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

      gsap.to(img, {
        x: nx * 6,
        y: ny * 5,
        scale: 1.05,
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
 * Hero button animated arrow on hover.
 */
function initHeroButtonInteractions(): void {
  const buttons = document.querySelectorAll<HTMLElement>('.homepage-hero__primary-action');

  for (const btn of buttons) {
    const arrow = btn.querySelector<SVGElement>('svg');
    if (!arrow) continue;

    const onEnter = () => {
      gsap.to(arrow, { x: 4, duration: 0.25, ease: 'power2.out' });
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
 * Technology group tag stagger glow on hover.
 */
function initTechGroupInteractions(): void {
  if (!isFinePointer()) return;

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

export function initCardInteractions(): void {
  initServiceCardInteractions();
  initProjectCardInteractions();
  initHeroButtonInteractions();
  initTechGroupInteractions();
}

export function destroyCardInteractions(): void {
  for (const cleanup of cleanups) cleanup();
  cleanups.length = 0;
}
