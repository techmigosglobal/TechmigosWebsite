'use client';

import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { smoothScrollTo } from '@/lib/scroll-utils';

export default function Footer() {
  interface NavLink {
    label: string;
    id?: string;
    href?: string;
  }

  const links: NavLink[] = [
    { label: 'Showcase', id: 'showcase' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Book a Demo', id: 'demo' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ];

  const socials = [
    {
      icon: 'GlobeAltIcon' as const,
      href: 'https://www.techmigos.com',
      label: 'TechMigos Website',
    },
    { icon: 'EnvelopeIcon' as const, href: 'mailto:info@techmigos.com', label: 'Email TechMigos' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: NavLink) => {
    if (link.id) {
      e.preventDefault();
      smoothScrollTo(link.id, 64);
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-6">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo + Links */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Link href="/" className="flex items-center gap-2" onClick={handleLogoClick}>
                <AppLogo size={28} />
                <span className="font-bold text-sm tracking-tight text-foreground hidden sm:block">
                  SchoolDesk
                </span>
              </Link>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {links.map((link) =>
                  link.id ? (
                    <a
                      key={link.label}
                      href={`#${link.id}`}
                      onClick={(e) => handleLinkClick(e, link)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:text-foreground"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href || '#'}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:text-foreground"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </nav>
            </div>

            {/* Right: Socials */}
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  <Icon name={s.icon} size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/60" />

          {/* Bottom row — TechMigos branding */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© 2026 SchoolDesk. All rights reserved.</span>
            <span className="flex items-center gap-1.5">
              Built with ❤️ by{' '}
              <a
                href="https://www.techmigos.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-accent transition-colors underline underline-offset-2"
              >
                TechMigos
              </a>
              · info@techmigos.com
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
