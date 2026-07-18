/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#0F172A',
          slate: '#475569',
          teal: '#0F766E',
          mist: '#CCFBF1',
        },
        surface: {
          base: '#FFFFFF',
          muted: '#F8FAFC',
          inverse: '#0F172A',
        },
        content: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
          inverse: '#F8FAFC',
        },
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        accent: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-sm': ['clamp(2.25rem, 5vw, 3.75rem)', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '800' }],
        'display-lg': ['clamp(3rem, 7vw, 5.5rem)', { lineHeight: '0.98', letterSpacing: '-0.05em', fontWeight: '800' }],
      },
      borderRadius: {
        'ui-sm': '0.375rem',
        'ui-md': '0.625rem',
        'ui-lg': '1rem',
        'ui-xl': '1.5rem',
      },
      animation: {
        'blob':           'blob 7s infinite',
        'float':          'float 6s ease-in-out infinite',
        'float-slow':     'float-slow 8s ease-in-out infinite',
        'spin-slow':      'spin-slow 20s linear infinite',
        'pulse-glow':     'pulse-glow 2.5s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'morph':          'morph 8s ease-in-out infinite',
        'marquee':        'marquee 25s linear infinite',
        'slide-in-bottom':'slide-in-bottom 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'count-up':       'count-up 1.8s ease-out both',
        'orbit':          'orbit 12s linear infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%':      { transform: 'translate(20px, -30px) scale(1.1)' },
          '50%':      { transform: 'translate(-20px, 20px) scale(0.9)' },
          '75%':      { transform: 'translate(30px, 10px) scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%':      { transform: 'translateY(-14px) rotate(2deg)' },
          '66%':      { transform: 'translateY(-7px) rotate(-1deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79,70,229,0.3)' },
          '50%':      { boxShadow: '0 0 50px rgba(79,70,229,0.6), 0 0 80px rgba(6,182,212,0.3)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'gradient-shift': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        morph: {
          '0%':   { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%':  { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'slide-in-bottom': {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        orbit: {
          from: { transform: 'rotate(0deg) translateX(120px) rotate(0deg)' },
          to:   { transform: 'rotate(360deg) translateX(120px) rotate(-360deg)' },
        },
      },
      backgroundSize: {
        '300%': '300%',
        '200%': '200%',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ui-standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'ui-emphasized': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'ui-sm': '0 1px 2px rgba(15, 23, 42, 0.06)',
        'ui-card': '0 12px 30px rgba(15, 23, 42, 0.08)',
        'ui-card-hover': '0 18px 42px rgba(15, 23, 42, 0.12)',
        'glow-primary': '0 0 30px rgba(79,70,229,0.3), 0 0 60px rgba(79,70,229,0.1)',
        'glow-accent':  '0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(6,182,212,0.1)',
        'glow-lg':      '0 20px 60px rgba(79,70,229,0.2)',
      },
      transitionDuration: {
        'ui-fast': '150ms',
        'ui-normal': '220ms',
        'ui-slow': '360ms',
      },
      zIndex: {
        header: '40',
        overlay: '50',
        modal: '60',
        toast: '70',
      },
    },
  },
  plugins: [
    // Scrollbar-hide utility
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.perspective': {
          perspective: '1000px',
        },
        '.preserve-3d': {
          'transform-style': 'preserve-3d',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.line-clamp-2': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '2',
        },
        '.line-clamp-3': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '3',
        },
      });
    },
  ],
}
