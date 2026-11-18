// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Canonical site URL.
 * 1. SITE_URL     — set this in Cloudflare Pages (build variable) once a custom domain exists.
 * 2. CF_PAGES_URL — injected by Cloudflare Pages builds. It is deployment-specific
 *                   (https://<hash>.<project>.pages.dev), so the hash label is removed to get
 *                   the stable project address (https://<project>.pages.dev).
 * 3. Local placeholder — only used for local builds; never treated as a real domain.
 */
function resolveSite() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.CF_PAGES_URL) {
    const url = new URL(process.env.CF_PAGES_URL);
    const labels = url.hostname.split('.');
    if (labels.length === 4 && url.hostname.endsWith('.pages.dev')) url.hostname = labels.slice(1).join('.');
    return url.origin;
  }
  return 'http://localhost:4321';
}
const site = resolveSite().replace(/\/$/, '');

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
