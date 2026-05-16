import React from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/tailwind.css';
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

const rootSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.techmigos.com').replace(
  /\/$/,
  ''
);
const showcaseUrl = `${rootSiteUrl}/showcase`;
const showcaseImageUrl = `${showcaseUrl}/assets/images/app_logo.png`;

export const metadata: Metadata = {
  metadataBase: new URL(rootSiteUrl),
  manifest: '/showcase/manifest.json',
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
    icon: [{ url: '/showcase/favicon.ico', type: 'image/x-icon' }],
  },
  openGraph: {
    title: 'SchoolDesk — School Management Platform',
    description:
      'Digitize academics, finance, transport, and communication. Trusted by 200+ schools.',
    type: 'website',
    url: showcaseUrl,
    siteName: 'SchoolDesk',
    images: [
      {
        url: showcaseImageUrl,
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
    images: [showcaseImageUrl],
    creator: '@schooldesk',
  },
  alternates: {
    canonical: showcaseUrl,
  },
};

const schemas = {
  organization: createOrganizationSchema(showcaseUrl),
  webpage: createWebPageSchema(
    showcaseUrl,
    'SchoolDesk — School Management Made Simple',
    'SchoolDesk helps schools digitize academics, finance, transport, and communication in one platform. Trusted by 200+ schools with 4.9★ rating.'
  ),
  softwareApplication: createSoftwareApplicationSchema(showcaseUrl),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        ) : null}

        {Object.entries(schemas).map(([id, schema]) => (
          <script
            key={id}
            id={`schema-${id}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className={dmSans.className}>
        <ScrollProgress />
        {children}
        <ScrollToTop />
      </body>
    </html>
  );
}
