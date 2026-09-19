import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const sharedSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  draft: z.boolean().default(false),
});

const blog = defineCollection({
  type: 'content',
  schema: sharedSchema.extend({
    author: z.string(),
    authorRole: z.string().optional(),
    authorBio: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    readTime: z.number().int().positive().optional(),
  }),
});

const careers = defineCollection({
  type: 'content',
  schema: sharedSchema.extend({
    department: z.string(),
    location: z.string(),
    type: z.string(),
    salary: z.string().optional(),
  }),
});

export const collections = { blog, careers };
