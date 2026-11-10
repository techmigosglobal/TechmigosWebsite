import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { loadSiteContent } from '../lib/siteContent';

export const prerender = true;

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function urlTag(url: string, updated?: Date) {
  return `<url><loc>${escapeXml(url)}</loc>${updated ? `<lastmod>${updated.toISOString()}</lastmod>` : ''}</url>`;
}

export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => new URL(path, site || 'https://www.techmigos.com').href;
  const [blogPosts, careerPosts, siteContent] = await Promise.all([
    getCollection('blog', (entry) => !entry.data.draft),
    getCollection('careers', (entry) => !entry.data.draft),
    loadSiteContent(),
  ]);

  const staticPaths = ['/', '/about', '/services', '/work', '/blog', '/careers', '/contact', '/privacy', '/terms'];

  const urls = [
    ...staticPaths.map((path) => urlTag(abs(path))),
    ...blogPosts.map((post) => urlTag(abs(`/blog/${post.id}`), post.data.updatedDate ?? post.data.pubDate)),
    ...careerPosts.map((job) => urlTag(abs(`/careers/${job.id}`), job.data.pubDate)),
    ...siteContent.projects.map((project) => urlTag(abs(`/work/${project.slug}`))),
  ];

  const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">${urls.join('')}</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
