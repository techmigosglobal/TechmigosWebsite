import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

const localPhpBackendUrl = process.env.LOCAL_PHP_BACKEND_URL?.trim();

export default defineConfig({
  output: 'hybrid',
  adapter: node({
    mode: 'standalone',
  }),
  site: 'https://techmigos.com',
  integrations: [
    tailwind(),
    mdx(),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    domains: ['images.unsplash.com', 'picsum.photos'],
  },
  vite: {
    server: localPhpBackendUrl
      ? {
          proxy: {
            '/api': {
              target: localPhpBackendUrl,
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
    ssr: {
      noExternal: ['lucide-react']
    }
  }
});
