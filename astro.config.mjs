import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://techmigos.com',
  integrations: [
    tailwind(),
    mdx(),
    sitemap(),
  ],
  image: {
    domains: ['images.unsplash.com', 'picsum.photos'],
  },
  vite: {
    ssr: {
      noExternal: ['lucide-react']
    }
  }
});
