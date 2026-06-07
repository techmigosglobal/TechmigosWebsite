import { defineConfig } from 'astro/config';

const siteUrl = process.env.PUBLIC_SITE_URL?.trim() || 'https://www.techmigos.com';

export default defineConfig({
  output: 'static',
  site: siteUrl,
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    domains: ['images.unsplash.com', 'picsum.photos'],
  },
  vite: {
    ssr: {
      noExternal: ['lucide-react'],
    },
  },
});
