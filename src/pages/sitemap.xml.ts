import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { loadSiteContent } from '../lib/siteContent';

export const prerender = true;

const SITE = 'https://techmigos.com';

function abs(path: string) {
  return `${SITE}${path}`;
}

function urlTag(
  url: string,
  {
    lastmod = new Date().toISOString(),
    changefreq,
    priority,
  }: { lastmod?: string; changefreq?: string; priority?: string } = {},
) {
  return `<url><loc>${url}</loc><lastmod>${lastmod}</lastmod>${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}${priority ? `<priority>${priority}</priority>` : ''}</url>`;
}

export const GET: APIRoute = async () => {
  const [blogPosts, careerPosts, siteContent] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('careers', ({ data }) => !data.draft),
    loadSiteContent(),
  ]);

  const staticPaths = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/about', changefreq: 'monthly', priority: '0.7' },
    { path: '/services', changefreq: 'weekly', priority: '0.9' },
    { path: '/portfolio', changefreq: 'weekly', priority: '0.9' },
    { path: '/blog', changefreq: 'weekly', priority: '0.9' },
    { path: '/careers', changefreq: 'weekly', priority: '0.8' },
    { path: '/contact', changefreq: 'monthly', priority: '0.8' },
    { path: '/support', changefreq: 'monthly', priority: '0.8' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
    { path: '/terms', changefreq: 'yearly', priority: '0.4' },
    { path: '/showcase', changefreq: 'weekly', priority: '1.0' },
  ];

  const urls = [
    ...staticPaths.map((item) =>
      urlTag(abs(item.path), {
        changefreq: item.changefreq,
        priority: item.priority,
      }),
    ),
    ...blogPosts.map((post) =>
      urlTag(abs(`/blog/${post.slug}`), {
        lastmod: post.data.pubDate.toISOString(),
        changefreq: 'monthly',
        priority: '0.8',
      }),
    ),
    ...careerPosts.map((job) =>
      urlTag(abs(`/careers/${job.slug}`), {
        lastmod: job.data.pubDate.toISOString(),
        changefreq: 'weekly',
        priority: '0.7',
      }),
    ),
    ...siteContent.projects.map((project) =>
      urlTag(abs(`/portfolio/${project.slug}`), {
        changefreq: 'monthly',
        priority: '0.8',
      }),
    ),
  ];

  const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">${urls.join('')}</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
