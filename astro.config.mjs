import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 30,
  }),
  site: 'https://findbyface.org',
  // Creator photos are resized same-origin by Astro's built-in `/_image` sharp endpoint
  // (see src/utils/image.ts). It refuses any remote host not listed here — keep this to
  // the OnlyFans CDNs so the endpoint can't be used as an open resizer for other sites.
  image: {
    remotePatterns: [{ protocol: 'https', hostname: '**.onlyfans.com' }],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});
