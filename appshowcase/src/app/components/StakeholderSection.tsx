'use client';

import React, { useEffect, useRef, memo } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

const stakeholders = [
  {
    role: 'Administrators',
    icon: 'BuildingOffice2Icon' as const,
    tagline: 'Live school summary. Always in control.',
    description:
      'See every department at a glance — fee collections, attendance rates, staff activity, and student progress in one live dashboard. Make decisions faster with data you can actually trust.',
    outcomes: [
      'Live financial and academic dashboards',
      'Custom roles and permissions for every staff member',
      'QR-based visitor management with audit trail',
      'Automated cloud backup — never lose data',
      'Multi-branch management from a single login',
      'Instant reports: daily, weekly, and monthly summaries',
    ],

    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_16b0648e6-1768136751414.png',
    imageAlt:
      'Modern school administrator working at a bright, organized desk with dual monitors showing management dashboards',
    accent: '#1C2B3A',
    flip: false,
  },
  {
    role: 'Teachers',
    icon: 'AcademicCapIcon' as const,
    tagline: 'Less admin. More teaching.',
    description:
      "Take attendance in under 30 seconds, assign homework with deadlines and rubrics, and track every student's progress without leaving SchoolDesk. Spend your energy where it matters — in the classroom.",
    outcomes: [
      'One-tap attendance (works offline)',
      'Homework with rubrics, deadlines, and auto-grading',
      'Student progress tracking with remarks',
      'Class announcements and curriculum management',
      'Subject-wise content library for sharing resources',
      'Parent communication directly from the teacher portal',
    ],

    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_101336450-1772141567927.png',
    imageAlt:
      'Teacher in a bright modern classroom engaging with students, natural light coming through windows',
    accent: '#3B82F6',
    flip: true,
  },
  {
    role: 'Parents',
    icon: 'HeartIcon' as const,
    tagline: "Never miss a moment in your child's school life.",
    description:
      "Track your child's attendance, check homework deadlines, view fee status, and receive instant alerts for circulars and events — all from your phone. Stay connected without calling the school. Your child's timetable, test results, and study materials are always just a tap away.",
    outcomes: [
      'Real-time attendance and academic updates',
      'Fee payment and tracking from mobile',
      'Smart alerts for circulars and events',
      'Direct communication with teachers',
      "View child's timetable, homework, and test results",
      'Access subject-wise content library (PDFs, videos, notes)',
      'Online test results with instant trends and insights',
    ],

    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1a1124d7d-1764671589216.png',
    imageAlt:
      "Parent happily reviewing their child's school progress on a smartphone in a bright home environment",
    accent: '#10B981',
    flip: false,
  },
];

const StakeholderSection = memo(function StakeholderSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    el.querySelectorAll('.reveal').forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="stakeholders" ref={sectionRef} className="border-b border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 sm:px-10 py-8 md:py-14">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-3">
            03 / For Every Stakeholder
          </span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground max-w-lg">
              One Platform. <span className="text-accent">Every Role.</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-sm leading-relaxed">
              From the principal&apos;s office to the parent&apos;s phone — SchoolDesk works for
              everyone, without everyone needing training.
            </p>
          </div>
        </div>
      </div>

      {/* Stakeholder rows */}
      {stakeholders.map((s, i) => (
        <div
          key={s.role}
          className={`stakeholder-row reveal border-b last:border-b-0 border-border transition-colors duration-300 ${
            i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-10 py-10 md:py-16">
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center ${
                s.flip ? 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1' : ''
              }`}
            >
              {/* Text side */}
              <div className="flex flex-col gap-5 justify-between h-full">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${s.accent}15` } as React.CSSProperties}
                    >
                      <Icon
                        name={s.icon}
                        size={20}
                        style={{ color: s.accent } as React.CSSProperties}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className="text-xs font-mono font-bold uppercase tracking-widest"
                      style={{ color: s.accent } as React.CSSProperties}
                    >
                      {s.role}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 leading-tight">
                    {s.tagline}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
                <ul className="flex flex-col gap-2.5 mt-2">
                  {s.outcomes.map((o, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <div
                        className="mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${s.accent}15` } as React.CSSProperties}
                      >
                        <Icon
                          name="CheckIcon"
                          size={11}
                          style={{ color: s.accent } as React.CSSProperties}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-sm text-foreground">{o}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image side */}
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl shadow-foreground/10 group">
                  <AppImage
                    src={s.image}
                    alt={s.imageAlt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    loading="lazy"
                  />

                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
                    aria-hidden="true"
                  />

                  <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${s.accent}20` } as React.CSSProperties}
                    >
                      <Icon
                        name={s.icon}
                        size={14}
                        style={{ color: s.accent } as React.CSSProperties}
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{s.role}</p>
                      <p className="text-[10px] text-muted-foreground">SchoolDesk user</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
});

export default StakeholderSection;
