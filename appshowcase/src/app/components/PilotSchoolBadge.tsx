'use client';

import React, { useEffect, useRef } from 'react';

const pilots = [
  {
    school: 'Sunrise Public School',
    location: 'Hyderabad',
    quote:
      'We replaced 4 different apps with SchoolDesk. Fee collection alone saves us 6 hours every week.',
    role: 'Principal',
    initials: 'SP',
    color: 'bg-amber-500/15 border-amber-500/30 text-amber-500',
  },
  {
    school: 'Greenfield Academy',
    location: 'Bengaluru',
    quote:
      'Parents actually read the notices now. The WhatsApp-style alerts changed everything for us.',
    role: 'School Administrator',
    initials: 'GA',
    color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500',
  },
];

export default function PilotSchoolBadge() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll('.reveal').forEach((card, i) => {
              setTimeout(() => card.classList.add('active'), i * 150);
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer?.observe(el);
    return () => observer?.disconnect();
  }, []);

  return (
    <section className="border-b border-border bg-card/20 py-12 sm:py-16 overflow-hidden">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="reveal mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-accent mb-2">
              Pilot Schools
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Real schools. Real results.
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Live Pilot Program
          </span>
        </div>

        {/* Cards */}
        <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {pilots?.map((pilot) => (
            <div
              key={pilot?.school}
              className="reveal rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-4 hover:border-accent/40 transition-colors duration-300"
            >
              {/* Quote */}
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;{pilot?.quote}&rdquo;
              </p>

              {/* School info */}
              <div className="flex items-center gap-3 pt-1 border-t border-border/60">
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-xl border ${pilot?.color} flex items-center justify-center text-xs font-bold`}
                >
                  {pilot?.initials}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{pilot?.school}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {pilot?.role} · {pilot?.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
