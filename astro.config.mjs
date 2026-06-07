import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 30,
  }),
  site: 'https://findbyface.org',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
    }),
  ],
});
