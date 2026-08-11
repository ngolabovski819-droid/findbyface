import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    updated: z.string().optional(),
    author: z.string().default('Nick'),
    image: z.string().optional(),
    summary: z.string().optional(),
    disclaimer: z.string().optional(),
    references: z
      .array(
        z.object({
          title: z.string(),
          description: z.string(),
          url: z.string(),
        }),
      )
      .optional(),
  }),
});

export const collections = { blog };
