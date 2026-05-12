'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-500 hover:scale-110 hover:shadow-primary/20 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
      aria-label="Scroll to top"
    >
      <Icon name="ChevronUpIcon" size={24} />
    </button>
  );
}
