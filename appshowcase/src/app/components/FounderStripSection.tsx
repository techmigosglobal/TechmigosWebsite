'use client';

import React, { useEffect, useRef } from 'react';

export default function FounderStripSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('active');
            el.classList.add('reveal-active');
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer?.observe(el);
    return () => observer?.disconnect();
  }, []);

  return (
    <section className="border-b border-border bg-card/30 py-10 sm:py-14 overflow-hidden">
      <div
        ref={ref}
        className="reveal max-w-5xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10"
      >
        {/* Icon / Avatar */}
        <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 text-2xl select-none">
          🛠️
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-2">
            Built by TechMigos
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2 leading-snug">
            We built SchoolDesk because we saw schools drowning in paperwork.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            The TechMigos team spent months inside schools in Hyderabad and Bengaluru — watching
            principals juggle five apps, teachers chase fee receipts on WhatsApp, and parents left
            in the dark. SchoolDesk is our answer: one platform that actually fits how Indian
            schools work.
          </p>
        </div>

        {/* Link */}
        <a
          href="https://www.techmigos.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline underline-offset-4 transition-colors whitespace-nowrap"
        >
          Visit techmigos.com
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-10 10M7 7h10v10" />
          </svg>
        </a>
      </div>
    </section>
  );
}
