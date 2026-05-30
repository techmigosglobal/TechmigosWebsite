'use client';

import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import AppLogo from './ui/AppLogo';
import Icon from './ui/AppIcon';
import { smoothScrollTo } from '../lib/scroll-utils';

// Static data outside component to prevent recreation on every render
interface NavLink {
  label: string;
  id?: string;
  href?: string;
}

const navLinks: NavLink[] = [
  { label: 'Showcase', id: 'showcase' },
  { label: 'For Schools', id: 'stakeholders' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'Contact', id: 'cta' },
];

const Header = memo(function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string | undefined) => {
    if (!id) return;
    e.preventDefault();
    smoothScrollTo(id, 64); // 64px for header height
    setMenuOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="SchoolDesk home"
            onClick={handleLogoClick}
          >
            <AppLogo
              size={32}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            <span className="font-bold text-base tracking-tight text-foreground hidden sm:block">
              SchoolDesk
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5" aria-label="Main navigation">
            {navLinks?.map((link) => (
              <a
                key={link?.id}
                href={`#${link?.id}`}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={(e) => handleNavClick(e, link?.id)}
              >
                {link?.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="#cta"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-4 text-xs font-medium text-foreground hover:bg-muted transition-all duration-200"
              onClick={(e) => handleNavClick(e, 'cta')}
            >
              Request Demo
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Icon
              name={menuOpen ? 'XMarkIcon' : 'Bars3Icon'}
              size={20}
              className="text-foreground"
              aria-hidden="true"
            />
          </button>
        </div>
      </header>
      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-background/95 backdrop-blur-md flex flex-col pt-16 px-6 transition-all duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      >
        <nav
          className={`flex flex-col gap-1 mt-4 transition-transform duration-500 ${
            menuOpen ? 'translate-y-0' : '-translate-y-4'
          }`}
          aria-label="Mobile navigation"
        >
          {navLinks?.map((link) => (
            <a
              key={link?.id}
              href={`#${link?.id}`}
              className="flex items-center h-11 text-base font-medium text-foreground hover:text-accent transition-colors border-b border-border"
              onClick={(e) => handleNavClick(e, link?.id)}
            >
              {link?.label}
            </a>
          ))}
        </nav>
        <div
          className={`flex flex-col gap-3 mt-6 transition-transform duration-500 delay-75 ${
            menuOpen ? 'translate-y-0' : '-translate-y-4'
          }`}
        >
          <a
            href="#cta"
            className="flex items-center justify-center h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            onClick={(e) => handleNavClick(e, 'cta')}
          >
            Request Demo
          </a>
        </div>
      </div>
    </>
  );
});

export default Header;
