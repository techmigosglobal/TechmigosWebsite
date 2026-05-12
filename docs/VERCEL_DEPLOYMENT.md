# Vercel Deployment Guide

This website is configured for deployment on Vercel with automatic builds from the GitHub repository.

## Prerequisites

1. GitHub repository: `git@github.com:techmigosglobal/TechmigosWebsite.git`
2. Vercel account with access to the Techmigos organization
3. Domain configured in Vercel (techmigos.com)

## Deployment Setup

### Option 1: Deploy the Main Astro Site

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "New Project"
3. Select the `TechmigosWebsite` repository from GitHub
4. Configure the following:
   - **Framework Preset**: Astro
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Option 2: Deploy the Next.js App (AppShowcase)

For the `/showcase` sub-app in `appshowcase/`:

1. Create a new Vercel project for the appshowcase folder
2. Set **Root Directory** to `appshowcase`
3. Framework: Next.js
4. Build settings will auto-detect

## Environment Variables

Set these in the Vercel project settings under "Environment Variables":

### Main Astro Site
```
NODE_ENV=production
ADMIN_USERNAME=your-secure-username
ADMIN_PASSWORD=your-secure-password
ADMIN_SESSION_SECRET=your-random-32-char-secret
ADMIN_EMAIL=admin@techmigos.com
ADMIN_NAME=Your Name
```

### AppShowcase (if deployed separately)
```
NEXT_PUBLIC_SUPABASE_URL=https://cuuexziubzpqzkbwhrag.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from appshowcase/.env]
NEXT_PUBLIC_GA_MEASUREMENT_ID=[your-ga-id]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your-stripe-key]
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Build Configuration

- **Node.js Version**: 20.x
- **Output Mode**: Server-side rendering via Node adapter
- **Max Function Duration**: 60 seconds

## Automatic Deployments

- Pushes to `main` branch automatically trigger deployments
- Preview deployments are created for pull requests
- Failed builds are reported in GitHub

## Database & API Backend

- Production API calls route to the PHP backend
- Admin panel uses server-side validation via Astro API routes
- Supabase integration for the showcase app (if enabled)

## Monitoring

After deployment:
1. Check the deployment logs in Vercel
2. Verify all pages load correctly
3. Test admin login functionality
4. Verify environment variables are loaded

## Troubleshooting

**Build fails with adapter errors:**
- Ensure `@astrojs/node` is installed: `npm install @astrojs/node`
- Check astro.config.mjs uses `output: 'server'` and includes the Node adapter

**Environment variables not loading:**
- Verify variables are set in Vercel project settings (not in .env file)
- Redeploy after adding/changing environment variables

**API routes not working:**
- Check that the Node.js adapter is properly configured
- Verify CORS and cookie handling in Astro API routes
