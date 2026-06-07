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

## Environment Variables

Set these in the Vercel project settings under "Environment Variables":

### Main Astro Site
```
NODE_ENV=production
PUBLIC_SITE_URL=https://www.techmigos.com
PUBLIC_API_BASE_URL=https://n2hhxvw3.ap-southeast.insforge.app
```

## Build Configuration

- **Node.js Version**: 20.x
- **Output Mode**: Static HTML generated into `dist`
- **Runtime API**: Public forms call the InsForge backend directly

## Automatic Deployments

- Pushes to `main` branch automatically trigger deployments
- Preview deployments are created for pull requests
- Failed builds are reported in GitHub

## Database & API Backend

- Production public form API calls route to InsForge.
- The removed showcase sub-application is no longer part of this deployment.

## Monitoring

After deployment:
1. Check the deployment logs in Vercel
2. Verify all pages load correctly
3. Test contact, newsletter, and careers form submission
4. Verify environment variables are loaded

## Troubleshooting

**Build fails after dependency changes:**
- Run `npm install` locally to refresh `package-lock.json`.
- Confirm `npm run validate` passes before deploying.

**Environment variables not loading:**
- Verify variables are set in Vercel project settings (not in .env file)
- Redeploy after adding/changing environment variables

**Form submissions not working:**
- Check that `PUBLIC_API_BASE_URL` points to the InsForge backend.
- Confirm `INSFORGE_API_KEY` and `CSRF_SECRET` are configured in InsForge function secrets.
