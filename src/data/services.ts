export interface Service {
  slug: 'web' | 'mobile' | 'qa' | 'backend' | 'ai' | 'consulting';
  icon: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string[];
  deliverables: string[];
  techStack: string[];
  engagement: string[];
}

export const services: Service[] = [
  {
    slug: 'web', icon: 'web', title: 'Web application development', shortTitle: 'Web applications',
    summary: 'Purpose-built web experiences for customer-facing products and operational tools.',
    description: ['We design and build web applications around the workflow they need to support, from a focused first release to a platform that can evolve with the business.', 'The work pairs accessible interfaces with clear data and integration boundaries so teams can operate, measure, and improve the product after launch.'],
    deliverables: ['Product discovery and technical planning', 'Responsive web application interfaces', 'API and third-party integrations', 'Performance and accessibility review'],
    techStack: ['Astro', 'React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL'],
    engagement: ['Clarify the user journey and success criteria', 'Shape an implementation plan around the real constraints', 'Build, test, and hand over a maintainable product'],
  },
  {
    slug: 'mobile', icon: 'mobile', title: 'Mobile app development', shortTitle: 'Mobile apps',
    summary: 'Mobile product work for iOS, Android, and cross-platform experiences.',
    description: ['We build mobile experiences with the platform conventions, device constraints, and daily habits of the user in mind.', 'A mobile engagement can cover product flows, application UI, backend integration, release preparation, and the quality checks needed before distribution.'],
    deliverables: ['Mobile product and interaction design', 'Cross-platform or native app implementation', 'Backend integration and offline-aware flows', 'Release-readiness and regression testing'],
    techStack: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'Firebase', 'Supabase'],
    engagement: ['Identify the essential mobile workflow first', 'Prototype the critical states before scaling the screen system', 'Validate on real device sizes and operating conditions'],
  },
  {
    slug: 'qa', icon: 'qa', title: 'Quality assurance and testing', shortTitle: 'Quality assurance',
    summary: 'Practical test strategy and release confidence for digital products.',
    description: ['Quality work starts by identifying the journeys that cannot fail and building coverage around them.', 'We combine exploratory testing with repeatable browser, API, and regression checks so teams can release with a clear view of risk.'],
    deliverables: ['Test strategy and risk mapping', 'Exploratory and regression testing', 'Browser and API automation', 'Release-readiness reporting'],
    techStack: ['Playwright', 'Cypress', 'Postman', 'Jest', 'k6'],
    engagement: ['Map critical workflows and their failure modes', 'Create repeatable checks for high-risk paths', 'Report findings with reproduction steps and impact'],
  },
  {
    slug: 'backend', icon: 'backend', title: 'Backend development', shortTitle: 'Backend systems',
    summary: 'Secure, understandable foundations for product workflows and integrations.',
    description: ['We design backend systems around clear domain boundaries, reliable data handling, and the operational needs of the people who maintain them.', 'Whether the work is new development or a focused modernization, the aim is a system that is easier to change without losing control of security or quality.'],
    deliverables: ['API and data-model design', 'Authentication and authorization flows', 'Integrations and asynchronous processing', 'Observability and reliability foundations'],
    techStack: ['Node.js', 'Python', 'PostgreSQL', 'Supabase', 'Redis', 'REST'],
    engagement: ['Document the core entities and permissions', 'Build interfaces that are explicit about failure states', 'Validate operational and security assumptions before release'],
  },
  {
    slug: 'ai', icon: 'ai', title: 'AI product integration', shortTitle: 'AI integration',
    summary: 'Useful AI features grounded in product context, safety, and measurable utility.',
    description: ['AI work is most valuable when it is attached to a real user decision or operational bottleneck, not when it is added as a novelty.', 'We help define where AI can assist, connect it responsibly to the product, and build the review paths users need to stay in control.'],
    deliverables: ['AI opportunity and workflow assessment', 'LLM-assisted product features', 'Evaluation and guardrail design', 'Integration with existing application systems'],
    techStack: ['Python', 'OpenAI', 'LLMs', 'Embeddings', 'APIs', 'Evaluation workflows'],
    engagement: ['Choose a narrow, valuable workflow to validate', 'Design human review and failure handling up front', 'Measure usefulness before expanding the feature'],
  },
  {
    slug: 'consulting', icon: 'consulting', title: 'Technology consulting and training', shortTitle: 'Consulting and training',
    summary: 'Clear technical guidance for product teams, schools, and institutions.',
    description: ['We provide practical support for technology decisions, architecture reviews, digital readiness, and technical learning sessions.', 'For education teams, this can include teacher training, field guidance, and conversations that make modern tools more approachable.'],
    deliverables: ['Technology and architecture assessment', 'Digital-readiness workshops', 'Teacher training and technical guidance', 'Actionable improvement roadmap'],
    techStack: ['System design', 'Technical training', 'Education technology', 'Architecture review'],
    engagement: ['Understand the current operating context', 'Make trade-offs explicit and actionable', 'Leave the team with a clear next-step plan'],
  },
];

export const serviceBySlug = Object.fromEntries(services.map((service) => [service.slug, service])) as Record<Service['slug'], Service>;
