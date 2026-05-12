'use client';

import React, { useEffect, useRef, memo } from 'react';
import Icon from '@/components/ui/AppIcon';
// import AppImage from '@/components/ui/AppImage';

// const testimonials = [
// {
//   quote:
//   'Very simple to use — the user interface was the most friendly compared to every other system we reviewed. It was very easy for all staff to get used to it within the first week.',
//   author: 'Priya Nambiar',
//   role: 'Principal',
//   school: 'Sunrise International School, Kochi',
//   avatar:
//   "https://img.rocket.new/generatedImages/rocket_gen_img_1da182dfe-1772094493607.png",
//   avatarAlt: 'Indian woman in professional attire, school principal headshot with warm smile',
//   rating: 5
// },
// {
//   quote:
//   'SchoolDesk scales with us. We went from 300 to 1,100 students and performance never dipped — even during peak result days when every parent is checking the app simultaneously.',
//   author: 'Rajesh Menon',
//   role: 'Director of Operations',
//   school: 'Horizon Academy Group, Bangalore',
//   avatar:
//   "https://img.rocket.new/generatedImages/rocket_gen_img_1e7bca6b4-1763295393217.png",
//   avatarAlt: 'Indian man in business casual, school director headshot with confident expression',
//   rating: 5
// }];

const trustStats = [
  { value: '5+', label: 'Years in Operation', icon: 'CalendarIcon' as const },
  { value: '200+', label: 'Schools Onboarded', icon: 'BuildingOffice2Icon' as const },
  { value: '50k+', label: 'Active Users', icon: 'UserGroupIcon' as const },
  { value: '99.9%', label: 'Platform Uptime', icon: 'SignalIcon' as const },
];

const SocialProofSection = memo(function SocialProofSection() {
  const sectionRef = useRef<HTMLElement>(null);

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
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="social-proof"
      ref={sectionRef}
      className="border-b border-border bg-secondary/30 py-12 md:py-24 px-4 sm:px-6 lg:px-10"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="reveal mb-10 md:mb-16">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-3">
            04 / Trusted by Schools
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground max-w-lg">
            Schools That Switched <span className="text-accent">Never Looked Back</span>
          </h2>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {trustStats.map((stat) => (
            <div
              key={stat.label}
              className="reveal bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col gap-3 group hover:border-accent/40 transition-colors duration-300"
            >
              <Icon
                name={stat.icon}
                size={22}
                className="text-muted-foreground group-hover:text-accent transition-colors duration-300"
                aria-hidden="true"
              />
              <div>
                <p className="text-3xl sm:text-4xl font-bold tracking-tighter text-foreground">
                  {stat.value}
                </p>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mt-1">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials — commented out */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 md:mt-16">
          {testimonials.map((t, i) =>
          <div
            key={t.author}
            className={`reveal ${i === 1 ? 'reveal-delay-2' : ''} bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-6 hover:shadow-lg hover:shadow-foreground/5 transition-all duration-300`}>
              <div className="flex items-center gap-1" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, j) =>
              <Icon key={j} name="StarIcon" size={16} variant="solid" className="text-accent" aria-hidden="true" />
              )}
              </div>
              <blockquote className="text-base sm:text-lg text-foreground leading-relaxed font-medium flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-4 border-t border-border pt-5">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <AppImage src={t.avatar} alt={t.avatarAlt} fill className="object-cover" sizes="48px" loading="lazy" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                  <p className="text-xs text-accent font-medium mt-0.5">{t.school}</p>
                </div>
              </div>
            </div>
          )}
        </div> */}
      </div>
    </section>
  );
});

export default SocialProofSection;
