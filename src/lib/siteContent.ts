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
{ok: true;} |
{ok: false;fieldErrors: Record<string, string>;};

const DEFAULT_CONTENT: SiteContent = {
  clientNames: ['TechCorp', 'Innovate', 'FutureFin', 'HealthSys', 'RetailGo', 'CloudNine', 'StartupX', 'DataFlow'],
  testimonials: [
  {
    quote: 'TechMigos transformed our outdated platform into a modern, scalable solution. The team was professional and truly understood our vision.',
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'Nexus Financial',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8bf2849-1768315662831.png",
    result: '+200% Performance'
  },
  {
    quote: 'Working with TechMigos felt like having an extension of our own team. They delivered a mobile app that exceeded our expectations.',
    name: 'Marcus Rodriguez',
    role: 'Founder',
    company: 'HealthFirst',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1a1ed503f-1774283906420.png",
    result: '50k+ Downloads'
  },
  {
    quote: 'Their AI expertise helped us implement features we did not think were possible. They are innovative and execution-focused.',
    name: 'Emily Watson',
    role: 'VP Product',
    company: 'RetailMax',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_177c87ef5-1769233350641.png",
    result: '3x User Growth'
  },
  {
    quote: 'From discovery to launch, every phase was executed with precision. Our conversion rates increased by 40% after redesign.',
    name: 'David Park',
    role: 'CEO',
    company: 'GreenTech Solutions',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_122094d48-1768528897064.png",
    result: '+40% Conversions'
  }],

  projects: [
  {
    slug: 'fintech-dashboard',
    title: 'Fintech Dashboard',
    category: 'Web',
    emoji: '📊',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c6640352-1764708424932.png",
    description: 'A real-time trading platform with advanced analytics and portfolio management.',
    result: '+200% Performance',
    overview: 'We partnered with Nexus Financial to build a trading platform that handles millions of daily transactions with real-time analytics.',
    challenge: 'Legacy systems caused slow trade execution and could not scale past 10,000 concurrent users.',
    solution: 'We built a microservices architecture with WebSocket streaming, optimized database access, and a high-performance React frontend.',
    results: [
    { metric: '99.99%', label: 'Uptime' },
    { metric: '50ms', label: 'Avg. Latency' },
    { metric: '100K+', label: 'Concurrent Users' },
    { metric: '40%', label: 'Revenue Increase' }],

    timeline: '6 months',
    team: '8 engineers',
    services: 'Full-Stack Development',
    featured: true
  },
  {
    slug: 'healthtrack-app',
    title: 'HealthTrack App',
    category: 'Mobile',
    emoji: '🏃',
    tags: ['React Native', 'Firebase', 'AI'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1390919a8-1772098068487.png",
    description: 'Personalized health monitoring with AI-powered insights and recommendations.',
    result: '50k+ Downloads',
    overview: 'HealthFirst needed a health monitoring app that integrates with wearables and provides personalized insights.',
    challenge: 'Users were overwhelmed by raw health data and generic advice from competitor apps.',
    solution: 'We built a React Native app with Firebase backend and personalized AI recommendations using behavior data.',
    results: [
    { metric: '4.9★', label: 'App Store Rating' },
    { metric: '2M+', label: 'Downloads' },
    { metric: '85%', label: 'Daily Active Users' },
    { metric: '60%', label: 'User Engagement' }],

    timeline: '8 months',
    team: '6 engineers + 1 ML specialist',
    services: 'Mobile Product Development',
    featured: true
  },
  {
    slug: 'ecommerce-platform',
    title: 'E-Commerce Platform',
    category: 'Web',
    emoji: '🛍️',
    tags: ['Next.js', 'Stripe', 'Tailwind'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_139804bb8-1773028207217.png",
    description: 'Omnichannel retail solution with seamless checkout and inventory management.',
    result: '3x Conversions',
    overview: 'RetailMax needed to unify online and in-store experiences with a resilient modern platform.',
    challenge: 'The previous stack failed during peak campaigns and checkout friction drove high abandonment.',
    solution: 'We built a headless commerce platform with SSR, optimized checkout, and auto-scaling infrastructure.',
    results: [
    { metric: '99.95%', label: 'Uptime' },
    { metric: '3.2%', label: 'Cart Abandonment' },
    { metric: '250%', label: 'Sales Increase' },
    { metric: '<1s', label: 'Page Load Time' }],

    timeline: '5 months',
    team: '5 engineers',
    services: 'Commerce Engineering',
    featured: true
  },
  {
    slug: 'logistics-ai',
    title: 'Logistics AI',
    category: 'AI/ML',
    emoji: '🤖',
    tags: ['Python', 'TensorFlow', 'AWS'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_14411e979-1780170036256.png",
    description: 'AI-powered route optimization reducing delivery times by 40%.',
    result: '40% Faster Delivery',
    overview: 'An intelligent logistics engine that optimizes routes in near real time across multiple constraints.',
    challenge: 'Manual planning and legacy heuristics produced delays and fuel waste across regions.',
    solution: 'We delivered an ML-driven optimization service with live telemetry and automated re-routing.',
    results: [
    { metric: '40%', label: 'Faster Delivery' },
    { metric: '22%', label: 'Fuel Savings' },
    { metric: '98%', label: 'On-time Rate' },
    { metric: '3x', label: 'Planner Productivity' }],

    timeline: '4 months',
    team: '4 engineers + 2 data scientists',
    services: 'AI Product Engineering'
  },
  {
    slug: 'fitness-app',
    title: 'FitLife App',
    category: 'Mobile',
    emoji: '💪',
    tags: ['Flutter', 'Firebase', 'HealthKit'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_10fae1f63-1766563416194.png",
    description: 'Comprehensive fitness tracking with personalized AI workout plans.',
    result: '4.9★ App Store',
    overview: 'A fitness companion app designed for daily habit coaching and performance tracking.',
    challenge: 'Existing apps had weak retention because plans were generic and motivation features were shallow.',
    solution: 'We built adaptive plans, social challenges, and strong wearable integrations for long-term engagement.',
    results: [
    { metric: '4.9★', label: 'Store Rating' },
    { metric: '68%', label: '30-day Retention' },
    { metric: '120K+', label: 'Monthly Active Users' },
    { metric: '2.5x', label: 'Session Duration' }],

    timeline: '6 months',
    team: '5 engineers + 1 designer',
    services: 'Mobile Product Development'
  },
  {
    slug: 'saas-dashboard',
    title: 'SaaS Analytics',
    category: 'Web',
    emoji: '📈',
    tags: ['Vue.js', 'D3.js', 'PostgreSQL'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_105ad1e1b-1772111917180.png",
    description: 'Business intelligence dashboard with real-time metrics and custom reporting.',
    result: '10x Data Insights',
    overview: 'A scalable analytics cockpit for product, sales, and operations teams.',
    challenge: 'Teams relied on delayed manual reports and lacked shared definitions of key business metrics.',
    solution: 'We implemented real-time ingestion, custom report builders, and role-based dashboards.',
    results: [
    { metric: '10x', label: 'Insight Speed' },
    { metric: '70%', label: 'Reporting Time Saved' },
    { metric: '99.9%', label: 'Pipeline Reliability' },
    { metric: '35%', label: 'Decision Cycle Cut' }],

    timeline: '5 months',
    team: '5 engineers',
    services: 'Data Platform Engineering'
  }]

};

const DATA_FILE = process.env.SITE_CONTENT_PATH ?? path.join(process.cwd(), 'data', 'site-content.json');
const FEATURED_PROJECT_ORDER = new Map([
['focus-today', 0],
['school-desk', 1],
['focusflow', 2]]
);

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.
  map((item) => cleanString(item)).
  filter(Boolean);
}

function sanitizeResults(value: unknown): ProjectResult[] {
  if (!Array.isArray(value)) return [];
  return value.
  map((item) => {
    const data = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
    return {
      metric: cleanString(data.metric),
      label: cleanString(data.label)
    };
  }).
  filter((item) => item.metric && item.label);
}

function sanitizeTestimonials(value: unknown): Testimonial[] {
  if (!Array.isArray(value)) return [];
  return value.
  map((item) => {
    const data = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
    return {
      quote: cleanString(data.quote),
      name: cleanString(data.name),
      role: cleanString(data.role),
      company: cleanString(data.company),
      avatar: cleanString(data.avatar),
      result: cleanString(data.result)
    };
  }).
  filter((item) => item.quote && item.name && item.role && item.company && item.avatar && item.result);
}

function sanitizeProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];

  return value.
  map((item) => {
    const data = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};

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
      href: data.href ? cleanString(data.href) : undefined
    };
  }).
  filter((item) => {
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
      item.services);

  }).
  sort((a, b) => {
    const aPriority = FEATURED_PROJECT_ORDER.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = FEATURED_PROJECT_ORDER.get(b.slug) ?? Number.MAX_SAFE_INTEGER;

    if (aPriority !== bPriority) return aPriority - bPriority;
    return 0;
  });
}

export function sanitizeSiteContent(value: unknown): SiteContent {
  const data = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

  const content: SiteContent = {
    clientNames: asStringArray(data.clientNames),
    testimonials: sanitizeTestimonials(data.testimonials),
    projects: sanitizeProjects(data.projects)
  };

  if (!content.clientNames.length) content.clientNames = DEFAULT_CONTENT.clientNames;
  if (!content.testimonials.length) content.testimonials = DEFAULT_CONTENT.testimonials;
  if (!content.projects.length) content.projects = DEFAULT_CONTENT.projects;

  return content;
}

export function validateSiteContentPayload(value: unknown): SiteContentValidationResult {
  const errors: Record<string, string> = {};
  const data = typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;

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
      const row = typeof item === 'object' && item !== null ? item as Record<string, unknown> : null;
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
      const row = typeof item === 'object' && item !== null ? item as Record<string, unknown> : null;
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
      'services'] as
      const;

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