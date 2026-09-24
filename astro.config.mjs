// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.0x777.me',
  trailingSlash: 'always',
  build: {
    // /2021/04/23/Necro僵尸网络/index.html — same URLs as the old Hexo site
    format: 'directory',
  },
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-black' },
      wrap: false,
    },
  },
});
