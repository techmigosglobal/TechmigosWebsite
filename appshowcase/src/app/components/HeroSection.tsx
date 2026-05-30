'use client';

import React, { memo } from 'react';
import Icon from '../../components/ui/AppIcon';
import { smoothScrollTo } from '../../lib/scroll-utils';

const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative border-b border-border min-h-[100svh] overflow-hidden bg-background pt-16">
      {/* Vertical grid guides */}
      <div
        className="absolute inset-0 pointer-events-none grid-guide opacity-60"
        aria-hidden="true"
      />
      {/* Ambient glow blobs */}
      <div
        className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-accent/8 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] bg-primary/6 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] sm:w-[800px] sm:h-[400px] bg-accent/3 rounded-full blur-[80px] sm:blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      {/* Content — full width centered */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100svh-64px)] px-5 py-12 sm:px-10 md:px-16 lg:px-24 text-center">
        {/* Badge */}
        <div className="mb-5 sm:mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            School Management Platform
          </span>
        </div>

        {/* Pain-point hook */}
        <p className="mb-4 sm:mb-5 text-sm sm:text-base font-mono text-muted-foreground/80 tracking-wide border border-border/50 rounded-lg px-4 py-2 bg-card/40 backdrop-blur-sm max-w-xl">
          <span className="text-accent font-semibold">
            Still managing your school on spreadsheets and WhatsApp groups?
          </span>
        </p>

        {/* Title */}
        <h1 className="reveal-active text-4xl xs:text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-bold tracking-tighter leading-none mb-4 sm:mb-7 text-foreground">
          <span className="text-reveal-wrapper block">
            <span className="text-reveal-content">Every</span>
          </span>
          <span className="text-reveal-wrapper block">
            <span className="text-reveal-content" style={{ transitionDelay: '0.15s' }}>
              Stakeholder.
            </span>
          </span>
          <span className="text-reveal-wrapper block">
            <span className="text-reveal-content text-accent" style={{ transitionDelay: '0.3s' }}>
              One Platform.
            </span>
          </span>
        </h1>

        {/* Solution statement */}
        <p className="max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-6 sm:mb-10">
          SchoolDesk replaces scattered tools with a single platform for academics, finance,
          learning, and communication —{' '}
          <span className="text-foreground font-medium">go live in 30 minutes, not 30 days.</span>
        </p>

        <div className="flex flex-col xs:flex-row gap-3 mb-8 sm:mb-14">
          <a
            href="#demo"
            onClick={(e) => {
              e?.preventDefault();
              smoothScrollTo('demo', 64);
            }}
            className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 hover:shadow-xl hover:shadow-primary/25 group"
          >
            Book a Free Demo
            <Icon
              name="ArrowRightIcon"
              size={16}
              className="group-hover:translate-x-1 transition-transform"
              aria-hidden="true"
            />
          </a>
          <a
            href="#showcase"
            onClick={(e) => {
              e?.preventDefault();
              smoothScrollTo('showcase', 64);
            }}
            className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Icon name="PlayIcon" size={16} className="text-accent" aria-hidden="true" />
            See It In Action
          </a>
        </div>

        {/* Pilot school trust signal */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="flex -space-x-1">
            {['🏫', '🏫']?.map((e, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-[10px]"
              >
                {e}
              </span>
            ))}
          </span>
          <span>Trusted by pilot schools in Hyderabad &amp; Bengaluru</span>
        </div>
      </div>
      {/* Scroll indicator */}
      <button
        onClick={() => smoothScrollTo('showcase', 64)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity animate-bounce cursor-pointer group"
        aria-label="Scroll to showcase"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
          Scroll
        </span>
        <Icon
          name="ChevronDownIcon"
          size={16}
          className="text-muted-foreground group-hover:text-foreground transition-colors"
        />
      </button>
    </section>
  );
});

export default HeroSection;
