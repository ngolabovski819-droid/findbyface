import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogSchema = z.object({
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
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/blog' }),
  schema: blogSchema,
});

// Spanish posts live in their own collection so nothing that consumes `blog`
// (sitemap, blog index, getStaticPaths) can ever leak a Spanish post into an
// English list. The filename IS the Spanish URL slug; `translationOf` names the
// English post id this translates, which drives the hreflang pairing.
const blogEs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/blog-es' }),
  schema: blogSchema.extend({ translationOf: z.string() }),
});

export const collections = { blog, blogEs };
