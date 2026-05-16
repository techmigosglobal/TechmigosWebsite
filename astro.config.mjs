import { defineConfig } from 'astro/config';

const localPhpBackendUrl = process.env.LOCAL_PHP_BACKEND_URL?.trim();
const siteUrl = process.env.PUBLIC_SITE_URL?.trim() || 'https://www.techmigos.com';
const enableDevProxy = process.argv.some((arg) => arg === 'dev' || arg.endsWith('/dev'));

const devProxy = {
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
};

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
    server: {
      proxy: enableDevProxy ? devProxy : undefined,
    },
    ssr: {
      noExternal: ['lucide-react'],
    },
  },
});
