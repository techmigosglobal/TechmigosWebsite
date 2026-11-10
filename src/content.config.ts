import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const sharedSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(''),
  pubDate: z.coerce.date(),
  draft: z.boolean().default(false),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: sharedSchema.extend({
    author: z.string(),
    authorRole: z.string().optional(),
    authorBio: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
    relatedSlugs: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    readTime: z.number().int().positive().optional(),
  }),
});

const careers = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/careers' }),
  schema: sharedSchema.extend({
    department: z.string(),
    location: z.string().optional(),
    type: z.string().optional(),
    salary: z.string().optional(),
    applicationMethod: z.enum(['form', 'email']).default('form'),
  }),
});

export const collections = { blog, careers };
