/** Shared HTTP helpers for Cloudflare Pages Functions. Web-standard APIs only. */

export interface Env {
  DB?: D1Database;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  CONTACT_ALLOWED_ORIGINS?: string;
}

export const securityHeaders: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'same-origin',
};

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

export const errorJson = (status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  json(status, { ok: false, code, message, ...extra }, headers);

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Collapse whitespace and strip control characters. */
export function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string') return '';
  const pattern = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  let out = value.normalize('NFC').replace(/\r\n?/g, '\n').replace(pattern, ' ');
  out = multiline ? out.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n') : out.replace(/\s+/g, ' ');
  return out.trim().slice(0, max);
}

/** Same-origin check. Requests without an Origin header are allowed only when `allowMissing` is true. */
export function originAllowed(request: Request, env: Env, allowMissing: boolean): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return allowMissing;
  if (origin === new URL(request.url).origin) return true;
  const extra = (env.CONTACT_ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  return extra.includes(origin);
}

/** Read a request body with a hard byte limit. Returns null when the limit is exceeded. */
export async function readBody(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export const clientIp = (request: Request) => request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
