import { WithContext, Organization, WebPage, SoftwareApplication } from 'schema-dts';

export const createOrganizationSchema = (siteUrl: string): WithContext<Organization> => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SchoolDesk',
  description: 'School Management Platform for academics, finance, transport, and communication',
  url: siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: `${siteUrl}/assets/images/app_logo.png`,
  },
  sameAs: [
    'https://twitter.com/schooldesk',
    'https://facebook.com/schooldesk',
    'https://linkedin.com/company/schooldesk',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    availableLanguage: ['en'],
  },
});

export const createWebPageSchema = (
  siteUrl: string,
  title: string,
  description: string
): WithContext<WebPage> => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: title,
  description: description,
  url: siteUrl,
  isPartOf: {
    '@type': 'WebSite',
    name: 'SchoolDesk',
    url: siteUrl,
  },
  datePublished: '2026-04-01',
  dateModified: '2026-05-16',
});

export const createSoftwareApplicationSchema = (
  siteUrl: string
): WithContext<SoftwareApplication> => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SchoolDesk',
  description:
    'School Management Platform - Digitize academics, finance, transport, and communication in one platform',
  url: siteUrl,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '200',
    bestRating: '5',
    worstRating: '1',
  },
  author: {
    '@type': 'Organization',
    name: 'SchoolDesk',
  },
  image: `${siteUrl}/assets/images/app_logo.png`,
});
