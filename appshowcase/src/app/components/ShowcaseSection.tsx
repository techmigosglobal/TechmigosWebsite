'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface ShowcaseFeature {
  text: string;
}

interface ShowcaseSection {
  id: string;
  sectionOrder: number;
  sectionKey: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: ShowcaseFeature[];
  highlight: string;
  designInsightLabel: string;
  designInsightDescription: string;
  screenImage: string;
  screenAlt: string;
  accentColor: string;
}

interface ShowcaseSectionRow {
  id: string;
  section_order: number;
  section_key: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: ShowcaseFeature[] | unknown;
  highlight: string;
  design_insight_label: string;
  design_insight_description: string;
  screen_image: string;
  screen_alt: string;
  accent_color: string;
}

// Fallback static data in case DB is unavailable
const fallbackSections: ShowcaseSection[] = [
  {
    id: 'overview',
    sectionOrder: 0,
    sectionKey: 'overview',
    icon: 'HomeIcon',
    title: 'Overview',
    subtitle: 'Everything in one intelligent dashboard',
    description:
      'From the moment you log in, SchoolDesk gives every user — admin, teacher, parent, or student — a personalized view of what matters most to them.',
    features: [
      { text: 'Role-based personalized dashboards' },
      { text: 'Live school summary for administrators' },
      { text: 'Smart alerts for circulars and events' },
      { text: 'Real-time synced academic calendars' },
    ],
    highlight: 'One login. Every role. Zero confusion.',
    designInsightLabel: 'Design Decision',
    designInsightDescription:
      'Each stakeholder sees only what they need — reducing cognitive load and increasing daily active usage by 3×.',
    screenImage: '/showcase/assets/images/generated/showcase-overview.webp',
    screenAlt: 'Dashboard interface showing school management overview',
    accentColor: '#F59E0B',
  },
];

function mapRow(row: ShowcaseSectionRow): ShowcaseSection {
  return {
    id: row.id,
    sectionOrder: row.section_order,
    sectionKey: row.section_key,
    icon: row.icon,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    features: Array.isArray(row.features) ? row.features : [],
    highlight: row.highlight,
    designInsightLabel: row.design_insight_label,
    designInsightDescription: row.design_insight_description,
    screenImage: row.screen_image,
    screenAlt: row.screen_alt,
    accentColor: row.accent_color,
  };
}

interface ShowcaseSectionProps {
  initialData?: ShowcaseSectionRow[];
}

const ShowcaseSectionComponent = memo(function ShowcaseSection({
  initialData,
}: ShowcaseSectionProps) {
  const [sections] = useState<ShowcaseSection[]>(() => {
    if (initialData && initialData.length > 0) {
      return initialData.map(mapRow);
    }
    return fallbackSections;
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const progressRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const sectionsLengthRef = useRef(sections.length);
  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileTabRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync to avoid stale closures in interval
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  useEffect(() => {
    sectionsLengthRef.current = sections.length;
  }, [sections.length]);

  // Auto-scroll nav to keep active tab visible without affecting page scroll
  useEffect(() => {
    const scrollContainer = (container: HTMLElement | null, index: number) => {
      if (!container) return;
      const activeBtn = container.querySelectorAll('button')[index] as
        | HTMLButtonElement
        | undefined;
      if (activeBtn) {
        const containerRect = container.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();

        // Only scroll if the button is not fully visible within the container
        if (btnRect.left < containerRect.left || btnRect.right > containerRect.right) {
          const scrollLeft =
            activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
          container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth',
          });
        }
      }
    };

    // Desktop nav
    scrollContainer(desktopNavRef.current, activeIndex);
    // Mobile tab strip
    scrollContainer(mobileTabRef.current, activeIndex);
  }, [activeIndex]);

  const goToSection = useCallback((index: number) => {
    if (index === activeIndexRef.current) return;
    setContentVisible(false);
    setTimeout(() => {
      setActiveIndex(index);
      setProgress(0);
      progressRef.current = 0;
      setContentVisible(true);
    }, 220);
  }, []);

  useEffect(() => {
    if (!isAutoPlay || sections.length === 0) return;

    timerRef.current = setInterval(() => {
      progressRef.current += 1.25;
      setProgress(progressRef.current);
      if (progressRef.current >= 100) {
        progressRef.current = 0;
        setProgress(0);
        setActiveIndex((prev) => (prev + 1) % sectionsLengthRef.current);
        setContentVisible(false);
        setTimeout(() => setContentVisible(true), 220);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoPlay, activeIndex, sections.length]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll('.reveal').forEach((r, i) => {
              setTimeout(() => r.classList.add('active'), i * 80);
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Memoize active section to avoid recalculation on every render
  const active = useMemo(() => sections[activeIndex] || sections[0], [sections, activeIndex]);

  if (sections.length === 0) return null;

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="relative flex flex-col bg-background border-b border-border overflow-hidden"
      style={{ height: '100dvh', minHeight: '580px', maxHeight: '1000px' }}
    >
      {/* ── TOP HEADER BAR ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="reveal flex flex-col">
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest hidden sm:block">
            01 / Product Showcase
          </span>
          <h2 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-foreground leading-tight">
            See Every Feature in Action
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Section counter */}
          <span className="hidden sm:inline-flex text-xs text-muted-foreground font-mono">
            {String(activeIndex + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
          </span>

          {/* Auto-play toggle */}
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            aria-label={isAutoPlay ? 'Pause auto-play' : 'Start auto-play'}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-all duration-200 ${
              isAutoPlay
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
          >
            <Icon name={isAutoPlay ? 'PauseIcon' : 'PlayIcon'} size={10} aria-hidden="true" />
            <span className="hidden sm:inline">{isAutoPlay ? 'Pause' : 'Auto'}</span>
          </button>

          {/* Mobile dots */}
          <div className="flex sm:hidden items-center gap-1">
            {sections.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIsAutoPlay(false);
                  goToSection(i);
                }}
                className="rounded-full transition-all duration-300"
                style={
                  i === activeIndex
                    ? { backgroundColor: active.accentColor, width: '16px', height: '5px' }
                    : { backgroundColor: 'var(--border)', width: '5px', height: '5px' }
                }
                aria-label={`Go to section ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* ── LEFT PANEL ── */}
        <div className="lg:w-[56%] xl:w-[58%] flex flex-col border-b lg:border-b-0 lg:border-r border-border overflow-hidden">
          {/* Desktop section nav — compact horizontal tabs */}
          <nav
            ref={desktopNavRef}
            className="reveal hidden lg:flex items-center gap-0 px-4 py-0 border-b border-border flex-shrink-0 overflow-x-auto scrollbar-hide"
            aria-label="Showcase sections"
          >
            {sections.map((section, i) => (
              <button
                key={section.id}
                onClick={() => {
                  setIsAutoPlay(false);
                  goToSection(i);
                }}
                className={`group relative flex items-center gap-2 px-3 py-2.5 text-left whitespace-nowrap transition-all duration-200 border-b-2 ${
                  i === activeIndex
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
                style={
                  i === activeIndex
                    ? { borderBottomColor: active.accentColor, color: active.accentColor }
                    : {}
                }
              >
                {/* Progress ring for active */}
                {i === activeIndex ? (
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16" aria-hidden="true">
                      <circle
                        cx="8"
                        cy="8"
                        r="5.5"
                        fill="none"
                        stroke={`${active.accentColor}30`}
                        strokeWidth="2"
                      />
                      <circle
                        cx="8"
                        cy="8"
                        r="5.5"
                        fill="none"
                        stroke={active.accentColor}
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 5.5}`}
                        strokeDashoffset={`${2 * Math.PI * 5.5 * (1 - progress / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                      />
                    </svg>
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ color: active.accentColor }}
                    >
                      <Icon
                        name={section.icon as Parameters<typeof Icon>[0]['name']}
                        size={8}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${i < activeIndex ? 'bg-accent' : 'bg-border'}`}
                  />
                )}
                <span className="text-xs font-medium">{section.title}</span>
                {i < activeIndex && (
                  <Icon
                    name="CheckIcon"
                    size={10}
                    className="text-accent flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Mobile horizontal tab strip */}
          <div className="lg:hidden flex-shrink-0 overflow-x-auto scrollbar-hide border-b border-border">
            <div ref={mobileTabRef} className="flex px-3 py-1.5 gap-1 min-w-max">
              {sections.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setIsAutoPlay(false);
                    goToSection(i);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    i === activeIndex
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={
                    i === activeIndex
                      ? { backgroundColor: `${active.accentColor}15`, color: active.accentColor }
                      : {}
                  }
                >
                  <Icon
                    name={section.icon as Parameters<typeof Icon>[0]['name']}
                    size={10}
                    aria-hidden="true"
                  />
                  {section.title}
                </button>
              ))}
            </div>
            {/* Progress bar */}
            <div className="h-0.5 bg-border mx-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%`, backgroundColor: active.accentColor }}
              />
            </div>
          </div>

          {/* Content area */}
          <div
            className={`flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-3 sm:py-4 flex flex-col gap-3 transition-all duration-220 ${
              contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {/* Active section card */}
            <div
              className="reveal relative rounded-xl p-4 sm:p-5 overflow-hidden border flex-shrink-0 cursor-default group hover:shadow-lg transition-shadow duration-300"
              style={
                {
                  borderColor: `${active.accentColor}40`,
                  background: `linear-gradient(135deg, ${active.accentColor}12 0%, ${active.accentColor}04 100%)`,
                } as React.CSSProperties
              }
            >
              <div
                className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-30 pointer-events-none transition-opacity duration-300 group-hover:opacity-50"
                style={{ backgroundColor: active.accentColor }}
                aria-hidden="true"
              />

              <div
                className="absolute bottom-0 left-0 w-20 h-20 rounded-full blur-xl opacity-20 pointer-events-none"
                style={{ backgroundColor: active.accentColor }}
                aria-hidden="true"
              />

              <div className="flex items-start gap-3 relative z-10">
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110"
                  style={
                    {
                      backgroundColor: `${active.accentColor}25`,
                      boxShadow: `0 0 0 1px ${active.accentColor}40, 0 6px 20px ${active.accentColor}20`,
                    } as React.CSSProperties
                  }
                >
                  <Icon
                    name={active.icon as Parameters<typeof Icon>[0]['name']}
                    size={20}
                    style={{ color: active.accentColor } as React.CSSProperties}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-tight mb-1">
                    {active.subtitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {active.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Feature list — interactive */}
            <ul className="reveal flex flex-col gap-1.5 flex-shrink-0">
              {active.features?.map((f, i) => (
                <li
                  key={i}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/60 bg-card/50 hover:bg-card hover:border-border hover:shadow-sm transition-all duration-200 cursor-default group"
                  style={
                    hoveredFeature === i
                      ? {
                          borderColor: `${active.accentColor}50`,
                          backgroundColor: `${active.accentColor}06`,
                        }
                      : {}
                  }
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                    style={
                      {
                        backgroundColor: `${active.accentColor}25`,
                        boxShadow: `0 0 0 1px ${active.accentColor}30`,
                      } as React.CSSProperties
                    }
                  >
                    <Icon
                      name="CheckIcon"
                      size={9}
                      style={{ color: active.accentColor } as React.CSSProperties}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-xs sm:text-sm text-foreground font-medium">{f.text}</span>
                  <Icon
                    name="ArrowRightIcon"
                    size={10}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
                    style={{ color: active.accentColor } as React.CSSProperties}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>

            {/* Highlight */}
            <div
              className="reveal flex items-center gap-2.5 px-3 py-2.5 rounded-xl flex-shrink-0 hover:shadow-sm transition-shadow duration-200"
              style={
                {
                  borderLeft: `3px solid ${active.accentColor}`,
                  backgroundColor: `${active.accentColor}0D`,
                } as React.CSSProperties
              }
            >
              <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: active.accentColor }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: active.accentColor }}
                />
              </span>
              <p
                className="text-xs sm:text-sm font-bold"
                style={{ color: active.accentColor } as React.CSSProperties}
              >
                {active.highlight}
              </p>
            </div>

            {/* Design insight */}
            <div
              className="reveal border rounded-xl p-3 sm:p-4 shadow-sm flex-shrink-0 hover:shadow-md transition-shadow duration-200"
              style={
                {
                  borderColor: `${active.accentColor}20`,
                  background: `linear-gradient(135deg, var(--card) 0%, ${active.accentColor}06 100%)`,
                } as React.CSSProperties
              }
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: active.accentColor }}
                  aria-hidden="true"
                />
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-widest"
                  style={{ color: active.accentColor } as React.CSSProperties}
                >
                  {active.designInsightLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {active.designInsightDescription}
              </p>
            </div>

            {/* Navigation arrows — mobile/tablet */}
            <div className="flex items-center justify-between lg:hidden flex-shrink-0 pt-1">
              <button
                onClick={() => {
                  setIsAutoPlay(false);
                  goToSection((activeIndex - 1 + sections.length) % sections.length);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              >
                <Icon name="ChevronLeftIcon" size={12} aria-hidden="true" />
                Prev
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                {activeIndex + 1} / {sections.length}
              </span>
              <button
                onClick={() => {
                  setIsAutoPlay(false);
                  goToSection((activeIndex + 1) % sections.length);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              >
                Next
                <Icon name="ChevronRightIcon" size={12} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — Phone Mockup ── */}
        <div className="reveal flex-1 lg:max-w-[44%] xl:max-w-[42%] relative bg-secondary/20 flex items-center justify-center overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 opacity-40 transition-colors duration-700 pointer-events-none"
            style={
              {
                background: `radial-gradient(ellipse at 55% 45%, ${active.accentColor}18 0%, transparent 65%)`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 dot-pattern opacity-20 pointer-events-none"
            aria-hidden="true"
          />

          {/* Phone wrapper */}
          <div className="relative z-10 flex items-center justify-center w-full h-full p-3 sm:p-5 lg:p-6">
            {/* Left arrow */}
            <button
              onClick={() => {
                setIsAutoPlay(false);
                goToSection((activeIndex - 1 + sections.length) % sections.length);
              }}
              className="absolute left-1 sm:left-2 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-card/80 border border-border shadow-md hover:bg-card hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="Previous screen"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              <Icon
                name="ChevronLeftIcon"
                size={14}
                className="text-foreground"
                aria-hidden="true"
              />
            </button>

            <div
              className="relative float-gentle"
              style={{
                /* Height drives the layout; width is derived from the image ratio */
                height: 'min(calc(100% - 12px), 90%)',
                aspectRatio: `calc(1230 + 24) / calc(2673 + 24)`,
                maxHeight: '760px',
              }}
            >
              {/* Phone outer shell */}
              <div
                className="relative w-full h-full bg-primary rounded-[2.6rem] sm:rounded-[3rem]"
                style={{
                  padding: '9px',
                  boxShadow:
                    '0 0 0 1px rgba(255,255,255,0.08) inset, 0 32px 80px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(0,0,0,0.3)',
                }}
              >
                {/* Speaker grille */}
                <div
                  className="absolute top-[13px] left-1/2 -translate-x-1/2 w-8 h-1 bg-black/40 rounded-full z-40"
                  aria-hidden="true"
                />

                {/* Screen bezel */}
                <div className="relative bg-black rounded-[2rem] sm:rounded-[2.4rem] overflow-hidden w-full h-full">
                  {/* Dynamic Island */}
                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 bg-black rounded-full z-30 flex items-center justify-center gap-1"
                    aria-hidden="true"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  </div>

                  {/* Status bar */}
                  <div
                    className="absolute top-0 left-0 right-0 z-20 flex items-end pb-1 px-4"
                    style={{ height: '10%', maxHeight: '40px' }}
                    aria-hidden="true"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] font-semibold text-white/70">9:41</span>
                      <div className="flex items-center gap-0.5">
                        <Icon name="SignalIcon" size={9} className="text-white/70" />
                        <Icon name="WifiIcon" size={9} className="text-white/70" />
                        <Icon name="Battery100Icon" size={9} className="text-white/70" />
                      </div>
                    </div>
                  </div>

                  {/* Screen images — optimized crossfade with preloading */}
                  <div className="absolute inset-0">
                    {sections.map((section, i) => {
                      const isActive = i === activeIndex;
                      const isNext = i === (activeIndex + 1) % sections.length;
                      const isPrev = i === (activeIndex - 1 + sections.length) % sections.length;

                      // Only render current, next, and previous images to optimize memory and network
                      if (!isActive && !isNext && !isPrev) return null;

                      return (
                        <div
                          key={section.id}
                          className={`absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                        >
                          {section.screenImage ? (
                            <AppImage
                              src={section.screenImage}
                              alt={section.screenAlt}
                              fill
                              className="object-cover object-top"
                              sizes="(max-width: 640px) 55vw, (max-width: 1024px) 45vw, 35vw"
                              priority={isActive}
                              quality={75}
                              loading={isActive ? 'eager' : 'lazy'}
                            />
                          ) : null}
                          {isActive && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={
                                {
                                  background: `linear-gradient(to top, ${section.accentColor}20 0%, transparent 45%)`,
                                } as React.CSSProperties
                              }
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Home indicator */}
                  <div
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20"
                    aria-hidden="true"
                  >
                    <div
                      className="rounded-full opacity-60"
                      style={{
                        backgroundColor: active.accentColor,
                        width: '28%',
                        height: '4px',
                        minWidth: '50px',
                      }}
                    />
                  </div>
                </div>

                {/* Side buttons */}
                <div
                  className="absolute -left-[4px] top-[22%] w-[4px] h-[5%] bg-primary/80 rounded-l-md"
                  aria-hidden="true"
                  style={{ boxShadow: '-1px 0 2px rgba(0,0,0,0.4)' }}
                />
                <div
                  className="absolute -left-[4px] top-[30%] w-[4px] h-[8%] bg-primary/80 rounded-l-md"
                  aria-hidden="true"
                  style={{ boxShadow: '-1px 0 2px rgba(0,0,0,0.4)' }}
                />
                <div
                  className="absolute -left-[4px] top-[40%] w-[4px] h-[8%] bg-primary/80 rounded-l-md"
                  aria-hidden="true"
                  style={{ boxShadow: '-1px 0 2px rgba(0,0,0,0.4)' }}
                />
                <div
                  className="absolute -right-[4px] top-[32%] w-[4px] h-[12%] bg-primary/80 rounded-r-md"
                  aria-hidden="true"
                  style={{ boxShadow: '1px 0 2px rgba(0,0,0,0.4)' }}
                />
              </div>

              {/* Floating badge — desktop only */}
              <div
                className="absolute -right-2 lg:-right-10 top-[22%] bg-card border border-border rounded-xl p-2 shadow-lg highlight-pulse hidden lg:block"
                style={
                  {
                    borderColor: `${active.accentColor}40`,
                    maxWidth: '120px',
                  } as React.CSSProperties
                }
              >
                <div
                  className="w-5 h-5 rounded-lg flex items-center justify-center mb-1"
                  style={{ backgroundColor: `${active.accentColor}20` } as React.CSSProperties}
                >
                  <Icon
                    name={active.icon as Parameters<typeof Icon>[0]['name']}
                    size={11}
                    style={{ color: active.accentColor } as React.CSSProperties}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-[11px] font-semibold text-foreground leading-tight">
                  {active.title}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                  Active module
                </p>
              </div>
            </div>

            {/* Right arrow */}
            <button
              onClick={() => {
                setIsAutoPlay(false);
                goToSection((activeIndex + 1) % sections.length);
              }}
              className="absolute right-1 sm:right-2 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-card/80 border border-border shadow-md hover:bg-card hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="Next screen"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              <Icon
                name="ChevronRightIcon"
                size={14}
                className="text-foreground"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Section dots — desktop */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1.5 z-20">
            {sections.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIsAutoPlay(false);
                  goToSection(i);
                }}
                className="rounded-full transition-all duration-300 hover:opacity-80"
                style={
                  i === activeIndex
                    ? { backgroundColor: active.accentColor, width: '18px', height: '6px' }
                    : { backgroundColor: 'var(--border)', width: '6px', height: '6px' }
                }
                aria-label={`Go to section ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

export default ShowcaseSectionComponent;
