import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // Allow all requests to pass through
  // Astro will handle routing
  return next();
});
