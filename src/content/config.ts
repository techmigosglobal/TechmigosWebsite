import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string(),
    authorRole: z.string().optional(),
    authorBio: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    heroImage: z.string().optional(),
    readTime: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const careers = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    department: z.string(),
    location: z.string(),
    type: z.enum(['Full-time', 'Part-time', 'Contract']),
    salary: z.string().optional(),
    pubDate: z.date(),
    draft: z.boolean().default(false),
    description: z.string(),
    responsibilities: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional(),
    niceToHave: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, careers };
