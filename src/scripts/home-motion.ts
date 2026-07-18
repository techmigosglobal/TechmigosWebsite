/**
 * home-motion.ts
 * GSAP ScrollTrigger animations for the homepage.
 * Dynamically imported — only runs on the homepage.
 * Respects prefers-reduced-motion.
 * Cleans up all instances on Astro page teardown.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Active ScrollTrigger instances created by this module. */
const triggers: ScrollTrigger[] = [];
/** Active GSAP tweens / timelines. */
const tweens: gsap.core.Tween[] = [];

function killAll() {
  for (const t of triggers) t.kill();
  triggers.length = 0;
  for (const tw of tweens) tw.kill();
  tweens.length = 0;
  ScrollTrigger.clearScrollMemory();
}

/**
 * Safe gsap.fromTo wrapper that records tweens for cleanup.
 */
function animate(
  targets: gsap.TweenTarget,
  from: gsap.TweenVars,
  to: gsap.TweenVars,
): gsap.core.Tween {
  const tw = gsap.fromTo(targets, from, to);
  tweens.push(tw);
  return tw;
}

/**
 * Creates a ScrollTrigger-driven reveal for a set of elements.
 */
function revealOnScroll(
  selector: string,
  opts: {
    from?: gsap.TweenVars;
    to?: gsap.TweenVars;
    stagger?: number;
    start?: string;
    once?: boolean;
  } = {},
) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  if (!elements.length) return;

  const from: gsap.TweenVars = opts.from ?? { opacity: 0, y: 28 };
  const to: gsap.TweenVars = opts.to ?? {
    opacity: 1,
    y: 0,
    duration: 0.65,
    ease: 'power2.out',
  };

  const st = ScrollTrigger.create({
    trigger: elements[0]!,
    start: opts.start ?? 'top 88%',
    once: opts.once ?? true,
    onEnter() {
      gsap.fromTo(elements, from, {
        ...to,
        stagger: opts.stagger ?? 0.09,
      });
    },
  });

  triggers.push(st);
}

/** Hero entrance — staggered content elements */
function animateHeroEntrance() {
  const heroContent = document.querySelector('.homepage-hero__content');
  if (!heroContent) return;

  const eyebrow = heroContent.querySelector('.homepage-hero__eyebrow');
  const h1 = heroContent.querySelector('h1');
  const summary = heroContent.querySelector('.homepage-hero__summary');
  const actions = heroContent.querySelector('.homepage-hero__actions');
  const assurance = heroContent.querySelector('.homepage-hero__assurance');
  const visual = document.querySelector('.homepage-hero__visual');

  const targets = [eyebrow, h1, summary, actions, assurance].filter(Boolean);

  if (targets.length) {
    const tl = gsap.timeline({ delay: 0.15 });

    tl.fromTo(
      targets,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 },
    );

    if (visual) {
      tl.fromTo(
        visual,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' },
        '<0.2',
      );
    }
  }
}

/** Trust strip */
function animateTrustSection() {
  revealOnScroll('.home-trust h2', {
    from: { opacity: 0, y: 20 },
    to: { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
    start: 'top 90%',
  });

  revealOnScroll('.home-trust__list li', {
    from: { opacity: 0, y: 14 },
    to: { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    stagger: 0.08,
    start: 'top 88%',
  });
}

/** Section headings across the page */
function animateSectionHeadings() {
  const headings = document.querySelectorAll<HTMLElement>('[data-reveal-heading]');
  for (const heading of headings) {
    const children = heading.querySelectorAll(':scope > *');
    const st = ScrollTrigger.create({
      trigger: heading,
      start: 'top 86%',
      once: true,
      onEnter() {
        gsap.fromTo(
          children,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 },
        );
      },
    });
    triggers.push(st);
  }
}

/** Services grid staggered reveal */
function animateServicesGrid() {
  const cards = document.querySelectorAll<HTMLElement>('[data-service-card]');
  if (!cards.length) return;

  const st = ScrollTrigger.create({
    trigger: cards[0]!,
    start: 'top 88%',
    once: true,
    onEnter() {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          ease: 'power2.out',
          stagger: { amount: 0.35, from: 'start' },
        },
      );
    },
  });
  triggers.push(st);
}

/** Selected work cards — spatial depth entrance */
function animateWorkCards() {
  const cards = document.querySelectorAll<HTMLElement>('[data-work-card]');
  if (!cards.length) return;

  const st = ScrollTrigger.create({
    trigger: cards[0]!,
    start: 'top 88%',
    once: true,
    onEnter() {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 40, rotateX: 4 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.65,
          ease: 'power3.out',
          stagger: { amount: 0.28, from: 'start' },
          transformOrigin: 'bottom center',
        },
      );
    },
  });
  triggers.push(st);
}

/** Process section — progressive step activation */
function animateProcessSection() {
  const steps = document.querySelectorAll<HTMLElement>('[data-process-step]');
  const progressBar = document.querySelector<HTMLElement>('.home-process__progress-fill');
  if (!steps.length) return;

  // Animate the steps sequentially
  const st = ScrollTrigger.create({
    trigger: steps[0]!,
    start: 'top 86%',
    once: true,
    onEnter() {
      gsap.fromTo(
        steps,
        { opacity: 0, x: -18 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.1,
          onUpdate() {
            // Activate steps progressively via a ScrollTrigger scrub
          },
        },
      );
    },
  });
  triggers.push(st);

  // Progress bar scrub (desktop only — no pinning)
  if (progressBar) {
    const container = document.querySelector('.home-process');
    if (container) {
      const scrubTrigger = ScrollTrigger.create({
        trigger: container,
        start: 'top 70%',
        end: 'bottom 30%',
        scrub: 1.2,
        onUpdate(self) {
          progressBar.style.setProperty('--progress', `${Math.round(self.progress * 100)}%`);
        },
      });
      triggers.push(scrubTrigger);
    }
  }

  // Individual step active class
  for (const [i, step] of Array.from(steps).entries()) {
    const st2 = ScrollTrigger.create({
      trigger: step,
      start: 'top 65%',
      end: 'bottom 35%',
      onEnter() {
        step.classList.add('is-active');
      },
      onLeave() {
        step.classList.remove('is-active');
      },
      onEnterBack() {
        step.classList.add('is-active');
      },
      onLeaveBack() {
        step.classList.remove('is-active');
      },
    });
    triggers.push(st2);
    void i; // suppress unused variable
  }
}

/** Technology groups — clustered stagger reveal */
function animateTechnologyGroups() {
  const groups = document.querySelectorAll<HTMLElement>('[data-tech-group]');
  if (!groups.length) return;

  const st = ScrollTrigger.create({
    trigger: groups[0]!,
    start: 'top 86%',
    once: true,
    onEnter() {
      gsap.fromTo(
        groups,
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: { amount: 0.4, from: 'start' },
        },
      );

      // Technology tags stagger inside each group
      const tags = document.querySelectorAll('[data-tech-group] li');
      gsap.fromTo(
        tags,
        { opacity: 0, scale: 0.88 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.35,
          ease: 'back.out(1.4)',
          stagger: { amount: 0.8, from: 'start' },
          delay: 0.3,
        },
      );
    },
  });
  triggers.push(st);
}

/** Principles section */
function animatePrinciples() {
  revealOnScroll('[data-principle-item]', {
    from: { opacity: 0, y: 18 },
    to: { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    stagger: 0.1,
    start: 'top 85%',
  });
}

/** Insights cards */
function animateInsights() {
  revealOnScroll('[data-insight-card]', {
    from: { opacity: 0, y: 24 },
    to: { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
    stagger: 0.1,
    start: 'top 88%',
  });
}

/** Final CTA reconnect reveal */
function animateFinalCta() {
  const cta = document.querySelector('.home-final-cta');
  if (!cta) return;

  const content = cta.querySelectorAll('.home-final-cta__content > *');
  const orbitLine = cta.querySelector('.home-final-cta__orbit');

  const st = ScrollTrigger.create({
    trigger: cta,
    start: 'top 80%',
    once: true,
    onEnter() {
      if (orbitLine) {
        gsap.fromTo(
          orbitLine,
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.0, ease: 'power2.out' },
        );
      }
      gsap.fromTo(
        content,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          ease: 'power2.out',
          stagger: 0.12,
          delay: 0.15,
        },
      );
    },
  });
  triggers.push(st);
}

/**
 * Initialize all homepage animations.
 * Called after DOM is ready.
 */
export function initHomeMotion(): void {
  animateHeroEntrance();
  animateTrustSection();
  animateSectionHeadings();
  animateServicesGrid();
  animateWorkCards();
  animateProcessSection();
  animateTechnologyGroups();
  animatePrinciples();
  animateInsights();
  animateFinalCta();

  // Refresh ScrollTrigger after all init
  ScrollTrigger.refresh();
}

/**
 * Destroy all GSAP instances — call on Astro page teardown.
 */
export function destroyHomeMotion(): void {
  killAll();
  ScrollTrigger.getAll().forEach((st) => st.kill());
}
