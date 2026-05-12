'use client';

import React, { useRef, useEffect } from 'react';

export default function CTAStripSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef?.current;
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
    <section className="relative overflow-hidden bg-[var(--primary)] py-16 sm:py-20">
      {/* Subtle background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, #F59E0B 0%, transparent 60%), radial-gradient(circle at 80% 50%, #F59E0B 0%, transparent 60%)',
        }}
      />

      <div ref={sectionRef} className="reveal relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-[var(--accent)] text-sm font-semibold tracking-widest uppercase mb-3">
          Take the next step
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
          Ready to Transform <br className="hidden sm:block" />
          Your School?
        </h2>
        <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-8">
          Join schools already using SchoolDesk to simplify administration, engage parents, and
          empower teachers — all in one platform.
        </p>
        <a
          href="#demo"
          className="inline-flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] font-bold px-8 py-4 rounded-xl text-base sm:text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all duration-200"
        >
          Book a Free Demo
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}
