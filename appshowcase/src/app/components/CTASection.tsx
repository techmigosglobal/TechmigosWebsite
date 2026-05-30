'use client';

import React, { useEffect, useRef, memo, useState } from 'react';
import Icon from '../../components/ui/AppIcon';

const contactDetails = [
  {
    icon: 'EnvelopeIcon' as const,
    label: 'Email Us',
    value: 'info@techmigos.com',
    href: 'mailto:info@techmigos.com',
  },
  {
    icon: 'GlobeAltIcon' as const,
    label: 'Website',
    value: 'www.techmigos.com',
    href: 'https://www.techmigos.com',
  },
];

const ctaStats = [
  { value: '200+', label: 'Schools' },
  { value: '4.9/5', label: 'Avg Rating' },
  { value: '< 30m', label: 'Setup Time' },
];

const interactiveWords = ['Smarter', 'Faster', 'Together', 'Better'];

const CTASection = memo(function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll('.reveal').forEach((r) => r.classList.add('active'));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % interactiveWords.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="bg-primary relative overflow-hidden grain-overlay py-20 md:py-32 px-4 sm:px-6"
    >
      {/* Background glows */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 dot-pattern opacity-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Floating decorations */}
      <div
        className="absolute top-12 left-8 opacity-10 float-gentle hidden lg:block"
        aria-hidden="true"
      >
        <Icon name="AcademicCapIcon" size={64} className="text-primary-foreground" />
      </div>
      <div
        className="absolute bottom-12 right-12 opacity-10 hidden lg:block"
        style={{ animationDelay: '2s' }}
        aria-hidden="true"
      >
        <Icon name="BookOpenIcon" size={80} className="text-accent float-gentle" />
      </div>
      <div
        className="absolute top-1/2 right-16 opacity-10 hidden xl:block"
        style={{ animationDelay: '4s' }}
        aria-hidden="true"
      >
        <Icon name="SparklesIcon" size={48} className="text-accent float-gentle" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="reveal inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary-foreground/10 bg-primary-foreground/5 mb-8">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-xs font-mono font-bold text-primary-foreground/60 uppercase tracking-widest">
            Trusted by 200+ Schools Across India
          </span>
        </div>

        {/* Headline with animated word */}
        <h2 className="reveal reveal-delay-1 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-primary-foreground leading-none mb-6">
          Run your school{' '}
          <span
            className="text-accent inline-block transition-all duration-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            {interactiveWords[wordIndex]}
          </span>
        </h2>

        <p className="reveal reveal-delay-2 text-lg text-primary-foreground/60 mb-10 max-w-2xl mx-auto leading-relaxed">
          Join 200+ schools that replaced disconnected tools with SchoolDesk. Your team will be live
          in under 30 minutes — no technical expertise required.
        </p>

        {/* Interactive highlight cards */}
        <div className="reveal reveal-delay-3 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
          {[
            {
              icon: 'ClockIcon' as const,
              title: 'Up in 30 Minutes',
              desc: 'Guided onboarding, zero downtime',
            },
            {
              icon: 'ShieldCheckIcon' as const,
              title: 'Secure by Default',
              desc: 'Role-based access & cloud backups',
            },
            {
              icon: 'DevicePhoneMobileIcon' as const,
              title: 'Works on Any Device',
              desc: 'Mobile, tablet, or desktop',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 hover:bg-primary-foreground/10 hover:border-accent/40 transition-all duration-300 cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <Icon name={item.icon} size={18} className="text-accent" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-primary-foreground">{item.title}</p>
              <p className="text-xs text-primary-foreground/50 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Contact details */}
        <div className="reveal reveal-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          {contactDetails.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="group flex items-center gap-3 px-5 py-3 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 hover:bg-primary-foreground/10 hover:border-accent/40 transition-all duration-300"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors flex-shrink-0">
                <Icon name={c.icon} size={15} className="text-accent" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-mono text-primary-foreground/40 uppercase tracking-widest">
                  {c.label}
                </p>
                <p className="text-sm font-semibold text-primary-foreground group-hover:text-accent transition-colors">
                  {c.value}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* Stats row */}
        <div className="reveal reveal-delay-5 flex flex-wrap items-center justify-center gap-6 sm:gap-12 pt-10 sm:pt-12 border-t border-primary-foreground/10">
          {ctaStats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-primary-foreground tracking-tighter">
                {s.value}
              </p>
              <p className="text-xs font-mono text-primary-foreground/40 uppercase tracking-widest mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default CTASection;
