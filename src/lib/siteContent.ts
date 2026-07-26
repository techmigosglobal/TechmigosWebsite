import fs from 'node:fs/promises';
import path from 'node:path';

export type ProjectResult = {
  metric: string;
  label: string;
};

export type Project = {
  slug: string;
  title: string;
  category: string;
  emoji: string;
  tags: string[];
  image: string;
  description: string;
  result: string;
  overview: string;
  challenge: string;
  solution: string;
  results: ProjectResult[];
  timeline: string;
  team: string;
  services: string;
  featured?: boolean;
  href?: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  result: string;
};

export type SiteContent = {
  clientNames: string[];
  testimonials: Testimonial[];
  projects: Project[];
};

export type SiteContentValidationResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string> };

const DEFAULT_CONTENT: SiteContent = {
  clientNames: [],
  testimonials: [],
  projects: [
    {
      slug: 'hastkala',
      title: 'Hastkala',
      category: 'E-Commerce',
      emoji: '🏺',
      tags: ['Next.js', 'Tailwind CSS', 'E-Commerce'],
      image: 'https://ecommerce-site-taupe-seven.vercel.app/indian-artisan-handcrafted-pottery-weaving-textile.jpg',
      description: 'A handcrafted Indian artisan marketplace celebrating 2,000+ craftspeople across 25+ states, with rich product filtering and cultural storytelling.',
      result: 'Live Product',
      overview: 'Hastkala is a full-featured e-commerce marketplace built by TechMigos to showcase and sell handcrafted Indian artisan goods — from terracotta pottery to Kantha textiles and Brass lamps.',
      challenge: 'The client needed a culturally rich, conversion-optimised storefront for artisan goods that conveyed craftsmanship and trust while supporting advanced product discovery.',
      solution: 'We built a modern Next.js storefront with live category filters, price-range slider, discount badges, wishlist, and a narrative-first hero that puts artisan stories at the centre.',
      results: [
        { metric: '50+', label: 'Product SKUs' },
        { metric: '4', label: 'Categories' },
        { metric: '25+', label: 'States Represented' },
        { metric: '2,000+', label: 'Artisans Supported' },
      ],
      timeline: '6 weeks',
      team: '3 engineers',
      services: 'E-Commerce Web Development',
      featured: true,
      href: '/portfolio/hastkala',
    },
    {
      slug: 'focusflow',
      title: 'FocusFlow',
      category: 'Mobile App',
      emoji: '🎯',
      tags: ['React Native', 'Productivity', 'UX Design'],
      image: '/images/portfolio/focusflow/screenshots/screen-01.webp',
      description: 'A mindful productivity mobile app combining Pomodoro timers, ambient sound, task breakdown tools, and daily habit streaks in one calm interface.',
      result: 'Mobile App',
      overview: 'FocusFlow helps knowledge workers beat procrastination through structured focus sessions, mood-based session setup, and a gentle daily goal framework.',
      challenge: 'Most productivity apps are noisy and anxiety-inducing. Users needed a tool that encouraged starting, not perfect planning.',
      solution: 'We designed a calm, single-action-per-screen flow with Tiny Start / Deep Work session modes, ambient soundscapes, and a streak system that rewards consistency.',
      results: [
        { metric: '25+', label: 'Screens Designed' },
        { metric: '3', label: 'Session Modes' },
        { metric: '6', label: 'Ambient Soundscapes' },
        { metric: '7-day', label: 'Streak System' },
      ],
      timeline: '8 weeks',
      team: '2 engineers + 1 designer',
      services: 'Mobile App Development & UX Design',
      featured: true,
      href: '/portfolio/focusflow',
    },
    {
      slug: 'notiva',
      title: 'Notiva',
      category: 'Mobile App',
      emoji: '📝',
      tags: ['Flutter', 'Notes', 'Organization'],
      image: '/images/portfolio/notiva/screenshots/screen-01.webp',
      description: 'A clean, fast note-taking mobile app with rich text, tags, and smart search — designed for students and professionals who think in notes.',
      result: 'Mobile App',
      overview: 'Notiva is a Flutter-based mobile notes app prioritising speed and simplicity, with rich text editing, tag-based organization, and instant full-text search.',
      challenge: 'Existing note apps were either too complex or too bare. Users needed something structured but fast.',
      solution: 'We built a minimal UI with card-based notes, colour coding, tag filtering, and offline-first sync — optimised for one-hand mobile use.',
      results: [
        { metric: 'Offline-first', label: 'Architecture' },
        { metric: 'Full-text', label: 'Search Engine' },
        { metric: '<100ms', label: 'Note Open Time' },
        { metric: 'iOS + Android', label: 'Platforms' },
      ],
      timeline: '6 weeks',
      team: '2 engineers',
      services: 'Mobile App Development',
      featured: false,
      href: '/portfolio/notiva',
    },
    {
      slug: 'spendscanr',
      title: 'SpendScanr',
      category: 'Fintech App',
      emoji: '💸',
      tags: ['React Native', 'Fintech', 'Data Viz'],
      image: '/images/portfolio/spendscanr/screenshots/screen-01.webp',
      description: 'A personal finance tracker that scans receipts, categorises spending automatically, and gives weekly AI-powered insights on money habits.',
      result: 'Mobile App',
      overview: 'SpendScanr makes expense tracking effortless through receipt OCR, automatic categorisation, and visual spending breakdowns.',
      challenge: 'Users abandoned manual expense trackers because entry friction was too high. They needed an automatic capture flow.',
      solution: 'We implemented receipt scanning with OCR, smart category inference, and a weekly digest with actionable savings nudges.',
      results: [
        { metric: 'OCR', label: 'Receipt Scanning' },
        { metric: 'Auto', label: 'Categorisation' },
        { metric: 'Weekly', label: 'AI Digest' },
        { metric: '12+', label: 'Spend Categories' },
      ],
      timeline: '10 weeks',
      team: '3 engineers',
      services: 'Fintech Mobile App Development',
      featured: false,
      href: '/portfolio/spendscanr',
    },
    {
      slug: 'focus-today',
      title: 'FocusToday',
      category: 'Mobile App',
      emoji: '☀️',
      tags: ['React Native', 'Habits', 'Daily Planning'],
      image: '/images/portfolio/focus-today/screenshots/screen-01.webp',
      description: 'A daily intention-setting app that helps you plan your top 3 priorities each morning and reflect on progress every evening.',
      result: 'Mobile App',
      overview: 'FocusToday is a morning ritual app that anchors productivity through a guided daily planning flow, evening reflection, and a simple priority queue.',
      challenge: 'Users had lots of tasks but no single place to decide what truly mattered each day — leading to busyness without progress.',
      solution: 'We designed a 2-minute morning flow to set top 3 goals and a 1-minute evening reflection that tracked completion and mood over time.',
      results: [
        { metric: 'Morning', label: 'Planning Flow' },
        { metric: 'Evening', label: 'Reflection Ritual' },
        { metric: 'Top 3', label: 'Priority System' },
        { metric: 'Streak', label: 'Habit Tracking' },
      ],
      timeline: '5 weeks',
      team: '2 engineers',
      services: 'Mobile App Development',
      featured: false,
      href: '/portfolio/focus-today',
    },
    {
      slug: 'techmigos-hub',
      title: 'TechMigos Hub',
      category: 'Internal Platform',
      emoji: '🛠️',
      tags: ['Astro', 'Supabase', 'CRM'],
      image: '/images/portfolio/techmigos-hub/screenshots/screen-01.webp',
      description: 'TechMigos internal operations platform — project tracking, client management, employee directory, invoicing, and analytics in one unified portal.',
      result: 'Internal Tool',
      overview: 'TechMigos Hub is our own internal CRM and operations platform built on Astro + Supabase, giving the team a single place to manage projects, clients, finances, and communication.',
      challenge: 'Growing operations across multiple clients needed better visibility, structured project tracking, and a centralised client communication hub.',
      solution: 'We built a full CRM with role-based access, project pipelines, client portals, invoice generation, and analytics dashboards — all on our existing Astro stack.',
      results: [
        { metric: '12+', label: 'Feature Modules' },
        { metric: 'Role-based', label: 'Access Control' },
        { metric: 'Real-time', label: 'Supabase Backend' },
        { metric: 'PDF', label: 'Invoice Generation' },
      ],
      timeline: '12 weeks',
      team: '3 engineers',
      services: 'Internal Platform Engineering',
      featured: false,
      href: '/portfolio/techmigos-hub',
    },
  ],
};

const DATA_FILE = process.env.SITE_CONTENT_PATH ?? path.join(process.cwd(), 'data', 'site-content.json');
const FEATURED_PROJECT_ORDER = new Map([
  ['hastkala', 0],
  ['focusflow', 1],
  ['notiva', 2],
  ['spendscanr', 3],
  ['focus-today', 4],
  ['techmigos-hub', 5],
]);


function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item))
    .filter(Boolean);
}

function sanitizeResults(value: unknown): ProjectResult[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const data = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
      return {
        metric: cleanString(data.metric),
        label: cleanString(data.label),
      };
    })
    .filter((item) => item.metric && item.label);
}

function sanitizeTestimonials(value: unknown): Testimonial[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const data = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
      return {
        quote: cleanString(data.quote),
        name: cleanString(data.name),
        role: cleanString(data.role),
        company: cleanString(data.company),
        avatar: cleanString(data.avatar),
        result: cleanString(data.result),
      };
    })
    .filter((item) => item.quote && item.name && item.role && item.company && item.avatar && item.result);
}

function sanitizeProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const data = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};

      return {
        slug: cleanString(data.slug),
        title: cleanString(data.title),
        category: cleanString(data.category),
        emoji: cleanString(data.emoji),
        tags: asStringArray(data.tags),
        image: cleanString(data.image),
        description: cleanString(data.description),
        result: cleanString(data.result),
        overview: cleanString(data.overview),
        challenge: cleanString(data.challenge),
        solution: cleanString(data.solution),
        results: sanitizeResults(data.results),
        timeline: cleanString(data.timeline),
        team: cleanString(data.team),
        services: cleanString(data.services),
        featured: Boolean(data.featured),
        href: data.href ? cleanString(data.href) : undefined,
      };
    })
    .filter((item) => {
      return (
        item.slug &&
        item.title &&
        item.category &&
        item.emoji &&
        item.tags.length > 0 &&
        item.image &&
        item.description &&
        item.result &&
        item.overview &&
        item.challenge &&
        item.solution &&
        item.results.length > 0 &&
        item.timeline &&
        item.team &&
        item.services
      );
    })
    .sort((a, b) => {
      const aPriority = FEATURED_PROJECT_ORDER.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
      const bPriority = FEATURED_PROJECT_ORDER.get(b.slug) ?? Number.MAX_SAFE_INTEGER;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return 0;
    });
}

export function sanitizeSiteContent(value: unknown): SiteContent {
  const data = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

  const content: SiteContent = {
    clientNames: asStringArray(data.clientNames),
    testimonials: sanitizeTestimonials(data.testimonials),
    projects: sanitizeProjects(data.projects),
  };

  if (!content.clientNames.length) content.clientNames = DEFAULT_CONTENT.clientNames;
  if (!content.testimonials.length) content.testimonials = DEFAULT_CONTENT.testimonials;
  if (!content.projects.length) content.projects = DEFAULT_CONTENT.projects;

  return content;
}

export function validateSiteContentPayload(value: unknown): SiteContentValidationResult {
  const errors: Record<string, string> = {};
  const data = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

  if (!data) {
    return { ok: false, fieldErrors: { root: 'Payload must be a JSON object.' } };
  }

  if (!Array.isArray(data.clientNames)) {
    errors.clientNames = 'Client names must be an array of strings.';
  }

  if (!Array.isArray(data.testimonials)) {
    errors.testimonials = 'Testimonials must be an array.';
  } else {
    data.testimonials.forEach((item, index) => {
      const row = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null;
      if (!row) {
        errors[`testimonials.${index}`] = 'Testimonial must be an object.';
        return;
      }
      const required = ['quote', 'name', 'role', 'company', 'avatar', 'result'] as const;
      required.forEach((key) => {
        if (!cleanString(row[key])) {
          errors[`testimonials.${index}.${key}`] = `Missing ${key}.`;
        }
      });
    });
  }

  if (!Array.isArray(data.projects)) {
    errors.projects = 'Projects must be an array.';
  } else {
    data.projects.forEach((item, index) => {
      const row = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null;
      if (!row) {
        errors[`projects.${index}`] = 'Project must be an object.';
        return;
      }
      const required = [
        'slug',
        'title',
        'category',
        'emoji',
        'image',
        'description',
        'result',
        'overview',
        'challenge',
        'solution',
        'timeline',
        'team',
        'services',
      ] as const;

      required.forEach((key) => {
        if (!cleanString(row[key])) {
          errors[`projects.${index}.${key}`] = `Missing ${key}.`;
        }
      });

      if (!Array.isArray(row.tags) || row.tags.map((tag) => cleanString(tag)).filter(Boolean).length === 0) {
        errors[`projects.${index}.tags`] = 'At least one tag is required.';
      }

      if (!Array.isArray(row.results) || sanitizeResults(row.results).length === 0) {
        errors[`projects.${index}.results`] = 'At least one result metric is required.';
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }

  return { ok: true };
}

export async function ensureContentFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_CONTENT, null, 2), 'utf-8');
  }
}

export async function loadSiteContent() {
  await ensureContentFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw);
  return sanitizeSiteContent(parsed);
}

export async function saveSiteContent(value: unknown) {
  const sanitized = sanitizeSiteContent(value);
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
  return sanitized;
}
