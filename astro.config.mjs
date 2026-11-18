// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Canonical site URL.
 * 1. SITE_URL          — set this in Cloudflare Pages (production) once the real URL is known.
 * 2. CF_PAGES_URL      — injected automatically by Cloudflare Pages builds (deployment URL).
 * 3. Local placeholder — only used for local builds; never treated as a real domain.
 */
const site = (process.env.SITE_URL || process.env.CF_PAGES_URL || 'http://localhost:4321').replace(/\/$/, '');

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/404') && !page.includes('/admin/') })],
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 1200 },
  },
});
