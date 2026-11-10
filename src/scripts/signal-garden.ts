
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Form = { x: number; y: number; path: string };
const stageDuration = 5600;
const motionPreference = 'techmigos-reduced-home-motion';

export function mountSignalGarden(home: HTMLElement) {
  const listeners = new AbortController();
  const { signal } = listeners;
  const hero = home.querySelector<HTMLElement>('[data-signal-hero]')!;
  const intro = home.querySelector<HTMLElement>('[data-signal-intro]')!;
  const headlines = [...intro.querySelectorAll<HTMLElement>('[data-signal-headline]')];
  const stage = home.querySelector<HTMLElement>('[data-signal-stage]')!;
  const flora = stage.querySelector('svg')!;
  const drift = stage.querySelector('[data-signal-drift]')!;
  const atmosphere = hero.querySelector<HTMLElement>('[data-signal-atmosphere]')!;
  const orbit = home.querySelector<HTMLElement>('[data-signal-orbit]')!;
  const choices = home.querySelector<HTMLElement>('[data-signal-choices]')!;
  const carousel = choices.parentElement!;
  const panelRegion = home.querySelector<HTMLElement>('[data-signal-panels]')!;
  const preference = home.querySelector<HTMLButtonElement>('[data-signal-motion]')!;
  const buttons = [...home.querySelectorAll<HTMLButtonElement>('[data-signal-choice]')];
  const panels = [...home.querySelectorAll<HTMLElement>('[data-signal-panel]')];
  const branches = [...stage.querySelectorAll<SVGGElement>('.signal-branch')].map((branch) => ({
    path: branch.querySelector('path')!,
    tip: branch.querySelector('circle')!,
    forms: JSON.parse(branch.getAttribute('data-signal-forms')!) as Form[],
  }));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const desktop = matchMedia('(min-width: 901px)');
  const paths = branches.map(({ path }) => path);
  const tips = branches.map(({ tip }) => tip);
  let selected = 0;
  let motionReduced = false;
  try { motionReduced = localStorage.getItem(motionPreference) === 'true'; } catch { /* Storage is optional. */ }
  let stageSelected = false;
  let stageVisible = false;
  let orbitVisible = false;
  let carouselHovered = false;
  let timer: number | undefined;
  let introductionPlayed = false;
  let context: gsap.Context | undefined;
  let ambient: gsap.core.Timeline | undefined;
  let orbitMotion: gsap.core.Timeline | undefined;
  let morph: gsap.core.Timeline | undefined;
  let panelTween: gsap.core.Tween | undefined;
  let headlineMotion: gsap.core.Timeline | undefined;
  let detailTween: gsap.core.Tween | undefined;
  const pointerMotion = new Map<HTMLElement, { x: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo> }>();

  const motionEnabled = () => !reduced.matches && !motionReduced;

  function renderHeadline(index: number, animate: boolean) {
    headlineMotion?.revert();
    headlineMotion = undefined;
    headlines.forEach((headline, i) => headline.toggleAttribute('data-active', i === index));
    if (!animate) return;

    const headline = headlines[index];
    const typed = headline.querySelector<HTMLElement>('[data-signal-type]')!;
    headlineMotion = gsap.timeline()
      .fromTo(headline, { opacity: .18, x: desktop.matches ? -18 : 0 }, {
        opacity: 1, x: 0, duration: .42, ease: 'power3.out', clearProps: 'opacity,transform',
      }, 0)
      .fromTo(typed, { clipPath: 'inset(0 100% 0 0)' }, {
        clipPath: 'inset(0 0% 0 0)', duration: .66, ease: `steps(${typed.textContent?.length ?? 16})`, clearProps: 'clipPath',
      }, .11);
  }

  function renderForm(index: number, animate: boolean) {
    morph?.kill();
    morph = animate ? gsap.timeline({ defaults: { duration: .75, ease: 'power3.inOut' } }) : undefined;
    branches.forEach(({ path, tip, forms }, branchIndex) => {
      const form = forms[index];
      if (morph) {
        const offset = (branchIndex % 12) * .012;
        morph.to(path, { attr: { d: form.path } }, offset);
        morph.to(tip, { attr: { cx: form.x, cy: form.y } }, offset);
      } else {
        path.setAttribute('d', form.path);
        tip.setAttribute('cx', String(form.x));
        tip.setAttribute('cy', String(form.y));
      }
    });
  }

  function select(index: number) {
    if (index === selected) return;
    selected = index;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    panelTween?.kill();
    renderHeadline(index, motionEnabled());
    renderForm(index, motionEnabled());
    if (motionEnabled()) {
      panelTween = gsap.fromTo(panels[index], { opacity: .45, y: 5 }, {
        opacity: 1, y: 0, duration: .24, ease: 'power3.out', clearProps: 'opacity,transform',
      });
    }
  }

  function syncPlayback() {
    window.clearTimeout(timer);
    const canPlay = motionEnabled() && !document.hidden;
    ambient?.paused(!canPlay || !stageVisible);
    orbitMotion?.paused(!canPlay || !orbitVisible);
    const canAdvance = canPlay && stageVisible && !stageSelected && !carouselHovered && !carousel.contains(document.activeElement);
    panelRegion.setAttribute('aria-live', canAdvance ? 'off' : 'polite');
    if (canAdvance) {
      timer = window.setTimeout(() => {
        select((selected + 1) % buttons.length);
        syncPlayback();
      }, stageDuration);
    }
  }

  function configureMotion() {
    morph?.kill();
    panelTween?.kill();
    detailTween?.revert();
    panels.forEach((panel) => { panel.style.removeProperty('opacity'); panel.style.removeProperty('transform'); });
    context?.revert();
    context = undefined;
    ambient = undefined;
    orbitMotion = undefined;
    pointerMotion.clear();
    renderHeadline(selected, false);
    renderForm(selected, false);
    preference.hidden = reduced.matches;
    preference.setAttribute('aria-pressed', String(motionReduced));
    home.toggleAttribute('data-motion-reduced', !motionEnabled());
    if (!motionEnabled()) {
      syncPlayback();
      return;
    }

    context = gsap.context(() => {
      if (!introductionPlayed && window.scrollY < 100) {
        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .from(intro, { x: desktop.matches ? -64 : 0, opacity: .35, duration: .88, clearProps: 'opacity,transform' }, .05)
          .from(stage, { x: desktop.matches ? 74 : 0, opacity: .24, duration: .98, clearProps: 'opacity,transform' }, .03)
          .fromTo(headlines[0].querySelector('[data-signal-type]'), { clipPath: 'inset(0 100% 0 0)' }, {
            clipPath: 'inset(0 0% 0 0)', duration: .66, ease: 'steps(18)', clearProps: 'clipPath',
          }, .26)
          .fromTo(paths, { strokeDasharray: '1', strokeDashoffset: 1 }, {
            strokeDashoffset: 0, duration: .92, stagger: .012, clearProps: 'strokeDasharray,strokeDashoffset',
          }, .25)
          .from(tips, { opacity: 0, duration: .4, stagger: .01, clearProps: 'opacity' }, .65)
          .from('.signal-core', { opacity: 0, duration: .45, clearProps: 'opacity' }, .52);
      }
      introductionPlayed = true;

      gsap.set(drift, { svgOrigin: '500 194' });
      ambient = gsap.timeline({ repeat: -1, yoyo: true, paused: true, defaults: { duration: 8, ease: 'sine.inOut' } })
        .fromTo(drift, { rotation: -4, scale: .97 }, { rotation: 5, scale: 1.035 }, 0)
        .fromTo('.signal-halo-blue', { xPercent: 4, yPercent: 1 }, { xPercent: 37, yPercent: 24 }, 0)
        .fromTo('.signal-halo-rose', { xPercent: -3, yPercent: 1 }, { xPercent: -30, yPercent: -20 }, 0)
        .fromTo('.signal-field', { x: 12, y: 15 }, { x: -32, y: -24 }, 0)
        .fromTo('.signal-motes', { x: -10, y: 5, opacity: .22 }, { x: 14, y: -10, opacity: .45 }, 0);

      home.querySelectorAll<HTMLElement>('[data-signal-reveal]').forEach((item) => {
        gsap.from(item, {
          y: 25, opacity: .4, duration: .85, ease: 'power3.out', clearProps: 'opacity,transform',
          scrollTrigger: { trigger: item, start: 'top 90%', once: true },
        });
      });

      for (const [selector, offset] of [['[data-signal-service]', 20], ['[data-signal-card]', 28], ['[data-signal-step]', 14]] as const) {
        const items = home.querySelectorAll(selector);
        if (!items.length) continue;
        gsap.from(items, {
          x: desktop.matches ? offset : 0, opacity: .66, duration: .66, stagger: .09,
          ease: 'power3.out', clearProps: 'opacity,transform',
          scrollTrigger: { trigger: items[0], start: 'top 92%', once: true },
        });
      }
      gsap.from('.signal-contact-rings i', {
        scale: .7, opacity: .15, duration: 1.15, stagger: .12, ease: 'power3.out', clearProps: 'opacity,transform',
        scrollTrigger: { trigger: '.signal-contact', start: 'top 85%', once: true },
      });

      gsap.set('[data-signal-rings], [data-signal-satellites]', { svgOrigin: '260 260' });
      orbitMotion = gsap.timeline({ repeat: -1, paused: true, defaults: { duration: 32, ease: 'none' } })
        .to('[data-signal-rings]', { rotation: 360 }, 0)
        .to('[data-signal-satellites]', { rotation: -720 }, 0);

      const setPointerMotion = (surface: HTMLElement, target: Element) => pointerMotion.set(surface, {
        x: gsap.quickTo(target, 'x', { duration: .55, ease: 'power3.out' }),
        y: gsap.quickTo(target, 'y', { duration: .55, ease: 'power3.out' }),
      });
      setPointerMotion(orbit, orbit.querySelector('[data-signal-orbit-layer]')!);

      if (pointer.matches) {
        setPointerMotion(stage, flora);
        setPointerMotion(hero, atmosphere);
        const contact = home.querySelector<HTMLElement>('.signal-contact')!;
        setPointerMotion(contact, contact.querySelector('.signal-contact-rings')!);
        home.querySelectorAll('[data-signal-project] img').forEach((image) => {
          gsap.fromTo(image, { yPercent: -2, scale: 1.055 }, {
            yPercent: 2, scale: 1.055, ease: 'none',
            scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 },
          });
        });
      }
    }, home);
    syncPlayback();
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => {
    stageSelected = true;
    syncPlayback();
    select(index);
  }, { signal }));
  choices.hidden = false;
  carousel.addEventListener('focusin', syncPlayback, { signal });
  carousel.addEventListener('focusout', () => queueMicrotask(() => {
    if (!signal.aborted) syncPlayback();
  }), { signal });
  carousel.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    carouselHovered = true;
    syncPlayback();
  }, { signal });
  carousel.addEventListener('pointerleave', () => {
    carouselHovered = false;
    syncPlayback();
  }, { signal });
  preference.addEventListener('click', () => {
    motionReduced = !motionReduced;
    try { localStorage.setItem(motionPreference, String(motionReduced)); } catch { /* Storage is optional. */ }
    configureMotion();
  }, { signal });

  const contact = home.querySelector<HTMLElement>('.signal-contact')!;
  for (const surface of [hero, stage, orbit, contact]) {
    surface.addEventListener('pointermove', (event) => {
      const move = pointerMotion.get(surface);
      if (!move || (event.pointerType !== 'mouse' && (surface !== orbit || !event.buttons))) return;
      const bounds = surface.getBoundingClientRect();
      const travel = surface === orbit ? 56 : 27;
      move.x((event.clientX - bounds.left - bounds.width / 2) / bounds.width * travel);
      move.y((event.clientY - bounds.top - bounds.height / 2) / bounds.height * travel * .72);
    }, { signal });
    const reset = () => {
      pointerMotion.get(surface)?.x(0);
      pointerMotion.get(surface)?.y(0);
    };
    surface.addEventListener('pointerleave', reset, { signal });
    surface.addEventListener('pointercancel', reset, { signal });
    surface.addEventListener('pointerup', (event) => { if (event.pointerType !== 'mouse') reset(); }, { signal });
  }

  for (const details of home.querySelectorAll<HTMLDetailsElement>('[data-signal-step] details')) {
    details.addEventListener('toggle', () => {
      if (!details.open || !motionEnabled()) return;
      detailTween?.revert();
      detailTween = gsap.from(details.querySelector('p'), {
        opacity: .35, x: 8, duration: .32, ease: 'power3.out', clearProps: 'opacity,transform',
      });
    }, { signal });
  }

  const visibility = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === stage) stageVisible = entry.isIntersecting;
      else orbitVisible = entry.isIntersecting;
    }
    syncPlayback();
  });
  visibility.observe(stage);
  visibility.observe(orbit);
  document.addEventListener('visibilitychange', syncPlayback, { signal });
  reduced.addEventListener('change', configureMotion, { signal });
  pointer.addEventListener('change', configureMotion, { signal });
  desktop.addEventListener('change', configureMotion, { signal });
  configureMotion();

  return () => {
    listeners.abort();
    window.clearTimeout(timer);
    visibility.disconnect();
    morph?.kill();
    panelTween?.kill();
    headlineMotion?.revert();
    detailTween?.revert();
    context?.revert();
  };
}
