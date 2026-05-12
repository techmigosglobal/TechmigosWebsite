'use client';

import React, { useEffect, useRef } from 'react';

const steps = [
  {
    number: '01',
    emoji: '✍️',
    title: 'Sign Up',
    description:
      'Create your school account in under 2 minutes. No credit card, no contracts — just your school name and email.',
    accent: 'from-accent/20 to-accent/5',
    border: 'border-accent/30',
  },
  {
    number: '02',
    emoji: '🏫',
    title: 'Onboard Your School',
    description:
      'Add classes, staff, and students using our guided setup wizard. Import from Excel or start fresh — your choice.',
    accent: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
  },
  {
    number: '03',
    emoji: '🚀',
    title: 'Go Live in 30 Minutes',
    description:
      'Your school is live. Teachers take attendance, parents get alerts, and fees are tracked — all from day one.',
    accent: 'from-green-500/20 to-green-500/5',
    border: 'border-green-500/30',
  },
];

export default function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll('.reveal').forEach((card, i) => {
              setTimeout(() => card.classList.add('active'), i * 100);
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      className="border-b border-border bg-background py-14 sm:py-20 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="reveal mb-10 sm:mb-14">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-2">
            How It Works
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            From signup to fully operational — <span className="text-accent">in 30 minutes.</span>
          </h2>
        </div>

        {/* Steps — asymmetric bento layout */}
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`reveal relative rounded-2xl border ${step.border} bg-gradient-to-br ${step.accent} p-6 sm:p-7 flex flex-col gap-4 overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}
            >
              {/* Step number watermark */}
              <span className="absolute top-3 right-4 text-5xl font-black text-foreground/5 select-none pointer-events-none leading-none">
                {step.number}
              </span>

              {/* Emoji */}
              <span className="text-3xl">{step.emoji}</span>

              {/* Content */}
              <div>
                <h3 className="text-base font-bold text-foreground mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>

              {/* Connector arrow (not on last) */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center rounded-full bg-background border border-border text-muted-foreground text-xs">
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <a
            href="#demo"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
          >
            Get Started Free
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
