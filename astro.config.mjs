import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

const localPhpBackendUrl = process.env.LOCAL_PHP_BACKEND_URL?.trim();

export default defineConfig({
  output: 'static',
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
      server: {
          proxy: {
            '/showcase': {
              target: 'http://127.0.0.1:4028',
              changeOrigin: true,
              secure: false,
            },
            ...(localPhpBackendUrl ? {
              '/api': {
                target: localPhpBackendUrl,
                changeOrigin: true,
                secure: false,
              },
            } : {}),
          },
        },
    ssr: {
      noExternal: ['lucide-react']
    }
  }
});
