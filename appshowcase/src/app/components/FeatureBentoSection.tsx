'use client';

import React, { useEffect, useRef, memo } from 'react';
import Icon from '@/components/ui/AppIcon';

/*
BENTO GRID AUDIT — 6 cards, 3-col desktop grid:
Array has 6 cards: [Attendance, Finance, LiveLearning, SmartSecurity, OfflineMode, CustomRoles]

Row 1: [col-1-2: Attendance cs-2 rs-1] [col-3: Finance cs-1 rs-2]
Row 2: [col-1: LiveLearning cs-1]  [col-2: SmartSecurity cs-1]  [col-3: ← Finance continues]
Row 3: [col-1: OfflineMode cs-1]   [col-2-3: CustomRoles cs-2]

Placed 6/6 cards ✓
*/

const bentoCards = [
  {
    id: 'attendance',
    icon: 'ClipboardDocumentCheckIcon' as const,
    title: 'Smart Attendance',
    description:
      'One-tap attendance for teachers. Works offline. Auto-syncs when back online. Parents get instant alerts.',
    stat: '< 30s',
    statLabel: 'per class',
    accentColor: '#F59E0B',
    colSpan: 'lg:col-span-2',
    rowSpan: '',
    dark: false,
  },
  {
    id: 'finance',
    icon: 'BanknotesIcon' as const,
    title: 'Integrated Finance',
    description:
      'Customizable invoices, automated recurring charges, and parent payments — no extra accounting software needed.',
    stat: '100%',
    statLabel: 'fee visibility',
    accentColor: '#10B981',
    colSpan: 'lg:col-span-1',
    rowSpan: 'lg:row-span-2',
    dark: true,
  },
  {
    id: 'learning',
    icon: 'VideoCameraIcon' as const,
    title: 'Live Learning',
    description:
      'Join Google Meet or Zoom in one tap. Access subject-wise PDFs, videos, and notes from a searchable library.',
    stat: '∞',
    statLabel: 'content library',
    accentColor: '#8B5CF6',
    colSpan: 'lg:col-span-1',
    rowSpan: '',
    dark: false,
  },
  {
    id: 'security',
    icon: 'ShieldCheckIcon' as const,
    title: 'Smart Security',
    description:
      'Role-based access, OTP verification, IP restrictions, and automated cloud backups keep your data safe 24×7.',
    stat: '24/7',
    statLabel: 'protection',
    accentColor: '#EF4444',
    colSpan: 'lg:col-span-1',
    rowSpan: '',
    dark: false,
  },
  {
    id: 'offline',
    icon: 'WifiIcon' as const,
    title: 'Offline Mode',
    description:
      'Attendance and Smart ID payments work without internet. Critical features never go down, even in low-connectivity areas.',
    stat: '0',
    statLabel: 'downtime risk',
    accentColor: '#06B6D4',
    colSpan: 'lg:col-span-1',
    rowSpan: '',
    dark: false,
  },
  {
    id: 'roles',
    icon: 'UsersIcon' as const,
    title: 'Custom Roles',
    description:
      'Define exactly what Head Teachers, Matrons, Janitors, and any custom staff role can view or manage. Granular permissions for every position.',
    stat: '∞',
    statLabel: 'role types',
    accentColor: '#F59E0B',
    colSpan: 'lg:col-span-2',
    rowSpan: '',
    dark: false,
  },
];

const FeatureBentoSection = memo(function FeatureBentoSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll('.reveal').forEach((card, i) => {
              setTimeout(() => card.classList.add('active'), i * 80);
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
      id="features"
      ref={sectionRef}
      className="border-b border-border bg-secondary/20 py-12 md:py-24 px-4 sm:px-6 lg:px-10"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="reveal mb-10 md:mb-16">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-3">
            02 / Core Features
          </span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground max-w-lg">
              Built for Every Corner of School Life
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-sm leading-relaxed">
              Six powerful modules. One login. No switching between apps, tabs, or spreadsheets.
            </p>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Attendance cs-2 */}
          <div
            className={`reveal bento-card ${bentoCards[0].colSpan} ${bentoCards[0].rowSpan} bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden relative group`}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 transition-opacity duration-300 group-hover:opacity-20"
              style={{ backgroundColor: bentoCards[0].accentColor } as React.CSSProperties}
              aria-hidden="true"
            />
            <div className="flex items-start justify-between mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${bentoCards[0].accentColor}15` } as React.CSSProperties}
              >
                <Icon
                  name={bentoCards[0].icon}
                  size={24}
                  style={{ color: bentoCards[0].accentColor } as React.CSSProperties}
                  aria-hidden="true"
                />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tracking-tighter text-foreground">
                  {bentoCards[0].stat}
                </p>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {bentoCards[0].statLabel}
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{bentoCards[0].title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {bentoCards[0].description}
            </p>
          </div>

          {/* Card 2: Finance cs-1 rs-2 (dark) */}
          <div
            className={`reveal bento-card ${bentoCards[1].colSpan} ${bentoCards[1].rowSpan} bg-primary border border-primary rounded-2xl p-6 sm:p-8 overflow-hidden relative group flex flex-col justify-between`}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10"
              style={{ backgroundColor: bentoCards[1].accentColor } as React.CSSProperties}
            />
            <div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                style={{ backgroundColor: `${bentoCards[1].accentColor}25` } as React.CSSProperties}
              >
                <Icon
                  name={bentoCards[1].icon}
                  size={24}
                  style={{ color: bentoCards[1].accentColor } as React.CSSProperties}
                />
              </div>
              <h3 className="text-xl font-bold text-primary-foreground mb-2">
                {bentoCards[1].title}
              </h3>
              <p className="text-sm text-primary-foreground/60 leading-relaxed">
                {bentoCards[1].description}
              </p>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-bold tracking-tighter text-primary-foreground">
                {bentoCards[1].stat}
              </p>
              <span className="text-xs font-mono text-primary-foreground/50 uppercase tracking-wider">
                {bentoCards[1].statLabel}
              </span>
            </div>
          </div>

          {/* Card 3: Live Learning cs-1 */}
          <div
            className={`reveal bento-card ${bentoCards[2].colSpan} bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden relative group`}
          >
            <div
              className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300"
              style={{ backgroundColor: bentoCards[2].accentColor } as React.CSSProperties}
            />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${bentoCards[2].accentColor}15` } as React.CSSProperties}
            >
              <Icon
                name={bentoCards[2].icon}
                size={24}
                style={{ color: bentoCards[2].accentColor } as React.CSSProperties}
              />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{bentoCards[2].title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {bentoCards[2].description}
            </p>
            <div>
              <p className="text-3xl font-bold tracking-tighter text-foreground">
                {bentoCards[2].stat}
              </p>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {bentoCards[2].statLabel}
              </span>
            </div>
          </div>

          {/* Card 4: Smart Security cs-1 */}
          <div
            className={`reveal bento-card ${bentoCards[3].colSpan} bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden relative group`}
          >
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ backgroundColor: bentoCards[3].accentColor } as React.CSSProperties}
            />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${bentoCards[3].accentColor}15` } as React.CSSProperties}
            >
              <Icon
                name={bentoCards[3].icon}
                size={24}
                style={{ color: bentoCards[3].accentColor } as React.CSSProperties}
              />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{bentoCards[3].title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {bentoCards[3].description}
            </p>
            <div>
              <p className="text-3xl font-bold tracking-tighter text-foreground">
                {bentoCards[3].stat}
              </p>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {bentoCards[3].statLabel}
              </span>
            </div>
          </div>

          {/* Card 5: Offline Mode cs-1 */}
          <div
            className={`reveal bento-card ${bentoCards[4].colSpan} bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden relative group dot-pattern`}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative z-10"
              style={{ backgroundColor: `${bentoCards[4].accentColor}15` } as React.CSSProperties}
            >
              <Icon
                name={bentoCards[4].icon}
                size={24}
                style={{ color: bentoCards[4].accentColor } as React.CSSProperties}
              />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 relative z-10">
              {bentoCards[4].title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 relative z-10">
              {bentoCards[4].description}
            </p>
            <div className="relative z-10">
              <p className="text-3xl font-bold tracking-tighter text-foreground">
                {bentoCards[4].stat}
              </p>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {bentoCards[4].statLabel}
              </span>
            </div>
          </div>

          {/* Card 6: Custom Roles cs-2 */}
          <div
            className={`reveal bento-card ${bentoCards[5].colSpan} bg-secondary border border-border rounded-2xl p-6 sm:p-8 overflow-hidden relative group`}
          >
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ backgroundColor: bentoCards[5].accentColor } as React.CSSProperties}
            />
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
              <div className="flex-1">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={
                    { backgroundColor: `${bentoCards[5].accentColor}15` } as React.CSSProperties
                  }
                >
                  <Icon
                    name={bentoCards[5].icon}
                    size={24}
                    style={{ color: bentoCards[5].accentColor } as React.CSSProperties}
                  />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{bentoCards[5].title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {bentoCards[5].description}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-4xl font-bold tracking-tighter text-foreground">
                  {bentoCards[5].stat}
                </p>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {bentoCards[5].statLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default FeatureBentoSection;
