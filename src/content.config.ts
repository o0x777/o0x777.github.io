import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  // One folder per post: src/content/posts/<name>/index.md + its images
  loader: glob({ pattern: '**/index.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    // Last segment of the URL: /YYYY/MM/DD/<slug>/
    slug: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    description: z.string().default(''),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
