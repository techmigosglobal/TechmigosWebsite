import React from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { AuthProvider } from '@/contexts/AuthContext';
import SchemaInjector from '@/components/SchemaInjector';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollProgress from '@/components/ui/ScrollProgress';
import {
  createOrganizationSchema,
  createWebPageSchema,
  createSoftwareApplicationSchema,
} from '@/lib/schema/schemas';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: '/manifest.json',
  title: 'SchoolDesk — School Management Made Simple',
  description:
    'SchoolDesk helps schools digitize academics, finance, transport, and communication in one platform. Trusted by 200+ schools with 4.9★ rating.',
  keywords: [
    'school management',
    'education platform',
    'school software',
    'academic management',
    'finance management',
  ],
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
  openGraph: {
    title: 'SchoolDesk — School Management Platform',
    description:
      'Digitize academics, finance, transport, and communication. Trusted by 200+ schools.',
    type: 'website',
    url: siteUrl,
    siteName: 'SchoolDesk',
    images: [
      {
        url: `${siteUrl}/assets/images/app_logo.png`,
        width: 1200,
        height: 630,
        alt: 'SchoolDesk - School Management Platform for academics, finance, transport, and communication',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SchoolDesk — School Management Platform',
    description:
      'Digitize academics, finance, transport, and communication. Trusted by 200+ schools.',
    images: [`${siteUrl}/assets/images/app_logo.png`],
    creator: '@schooldesk',
  },
  alternates: {
    canonical: siteUrl,
  },
};

const schemas = {
  organization: createOrganizationSchema(siteUrl),
  webpage: createWebPageSchema(
    siteUrl,
    'SchoolDesk — School Management Made Simple',
    'SchoolDesk helps schools digitize academics, finance, transport, and communication in one platform. Trusted by 200+ schools with 4.9★ rating.'
  ),
  softwareApplication: createSoftwareApplicationSchema(siteUrl),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        {/* Critical resource hints — resolved before any render */}
        <link rel="preconnect" href="https://img.rocket.new" />
        <link rel="dns-prefetch" href="https://img.rocket.new" />

        {/* Supabase */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />

        {/* Google Fonts CDN (DM Sans is loaded via next/font but fallback CDN may be hit) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Schema Injection */}
        <SchemaInjector schemas={schemas} />
      </head>
      <body className={dmSans.className}>
        <ScrollProgress />
        <AuthProvider>{children}</AuthProvider>
        <ScrollToTop />
      </body>
    </html>
  );
}
