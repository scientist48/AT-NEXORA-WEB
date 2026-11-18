/**
 * POST /api/contact — Cloudflare Pages Function
 *
 * Validates a project enquiry and delivers it by email through the Resend REST API.
 *
 * Required environment variables (Cloudflare Pages → Settings → Variables and Secrets):
 *   RESEND_API_KEY       Resend API key (store as an encrypted secret)
 *   CONTACT_FROM_EMAIL   Sender on a domain verified in Resend,
 *                        e.g. "AT NEXORA Website <website@your-domain.com>"
 * Optional:
 *   CONTACT_ALLOWED_ORIGINS  Comma-separated extra origins allowed to POST
 *   RATE_LIMIT_KV            KV namespace binding for durable rate limiting
 *
 * The function never reports success unless Resend accepted the message.
 */
import { company, inquiryBudgets, inquiryServices } from '../../src/content/site';

interface Env {
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_ALLOWED_ORIGINS?: string;
  RATE_LIMIT_KV?: KVNamespace;
}

const RECIPIENT = company.email;
const MAX_BODY_BYTES = 16 * 1024;
const MIN_FILL_MS = 2500;
const RATE_LIMIT = { max: 5, windowSeconds: 600 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Fields = 'name' | 'email' | 'company' | 'service' | 'budget' | 'message' | 'consent';
type Errors = Partial<Record<Fields, string>>;

const baseHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex',
};

function json(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...baseHeaders, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

/** Plain HTML reply for browsers that submitted the form without JavaScript. */
function html(status: number, title: string, message: string) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | AT NEXORA Technologies</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F8FC;color:#101827;font:17px/1.6 system-ui,sans-serif;padding:24px}main{max-width:34rem}h1{color:#142B4A;font-size:2rem;line-height:1.1;margin:0 0 .75rem}a{color:#142B4A;font-weight:600}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/contact/">Back to the contact page</a> · <a href="mailto:${RECIPIENT}">${RECIPIENT}</a></p></main></body></html>`;
  return new Response(page, { status, headers: { ...baseHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Collapse whitespace and strip control characters (prevents header injection). */
function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string') return '';
  const pattern = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  let out = value.replace(/\r\n?/g, '\n').replace(pattern, ' ');
  out = multiline ? out.replace(/\n{4,}/g, '\n\n\n') : out.replace(/\s+/g, ' ');
  return out.trim().slice(0, max);
}

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // same-origin form posts from some browsers, curl, etc.
  const self = new URL(request.url).origin;
  if (origin === self) return true;
  const extra = (env.CONTACT_ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  return extra.includes(origin);
}

/** Best-effort limiter. Durable when RATE_LIMIT_KV is bound, per-isolate otherwise. */
const memory = new Map<string, { count: number; resetAt: number }>();

async function rateLimited(ip: string, env: Env): Promise<boolean> {
  const now = Date.now();
  const key = `contact:${ip}`;

  if (env.RATE_LIMIT_KV) {
    try {
      const raw = await env.RATE_LIMIT_KV.get(key);
      const entry = raw ? (JSON.parse(raw) as { count: number; resetAt: number }) : null;
      if (entry && entry.resetAt > now) {
        if (entry.count >= RATE_LIMIT.max) return true;
        entry.count += 1;
        await env.RATE_LIMIT_KV.put(key, JSON.stringify(entry), { expiration: Math.ceil(entry.resetAt / 1000) + 60 });
        return false;
      }
      await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT.windowSeconds * 1000 }), {
        expirationTtl: RATE_LIMIT.windowSeconds + 60,
      });
      return false;
    } catch {
      // fall through to the in-memory limiter
    }
  }

  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  const entry = memory.get(key);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT.max) return true;
    entry.count += 1;
    return false;
  }
  memory.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowSeconds * 1000 });
  return false;
}

function looksLikeSpam(message: string): boolean {
  const links = message.match(/https?:\/\/|www\./gi)?.length ?? 0;
  return links > 3 || /\[url=|<a\s+href=/i.test(message);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentType = request.headers.get('Content-Type') ?? '';
  const isForm = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
  const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
    isForm ? html(status, 'Your message was not sent', message) : json(status, { ok: false, code, message, ...extra }, headers);

  if (!originAllowed(request, env)) return fail(403, 'forbidden_origin', 'This request is not allowed from this origin.');

  // ── Size limits ─────────────────────────────────────────────
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) return fail(413, 'too_large', 'The submitted data is too large.');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return fail(413, 'too_large', 'The submitted data is too large.');

  // ── Parse ───────────────────────────────────────────────────
  let input: Record<string, unknown>;
  try {
    if (contentType.includes('application/json')) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      input = parsed as Record<string, unknown>;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      input = Object.fromEntries(new URLSearchParams(raw));
    } else {
      return fail(415, 'unsupported_media_type', 'Unsupported content type.');
    }
  } catch {
    return fail(400, 'invalid_body', 'The request could not be read.');
  }

  // ── Spam traps: answer like a success, deliver nothing ──────
  const honeypot = clean(input.website, 200);
  const elapsed = Number(input.elapsed);
  const tooFast = Number.isFinite(elapsed) && elapsed > 0 && elapsed < MIN_FILL_MS;
  if (honeypot || tooFast) {
    return isForm ? html(200, 'Thank you', 'Your enquiry has been received.') : json(200, { ok: true });
  }

  // ── Validate ────────────────────────────────────────────────
  const data = {
    name: clean(input.name, 100),
    email: clean(input.email, 254).toLowerCase(),
    company: clean(input.company, 120),
    service: clean(input.service, 80),
    budget: clean(input.budget, 80),
    message: clean(input.message, 4000, true),
    consent: input.consent === true || input.consent === 'yes' || input.consent === 'on' || input.consent === 'true',
  };

  const errors: Errors = {};
  if (data.name.length < 2) errors.name = 'Please enter your full name.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (!(inquiryServices as readonly string[]).includes(data.service)) errors.service = 'Please select the service you need.';
  if (!(inquiryBudgets as readonly string[]).includes(data.budget)) errors.budget = 'Please select a budget range.';
  if (data.message.length < 20) errors.message = 'Please describe your project in at least 20 characters.';
  else if (looksLikeSpam(data.message)) errors.message = 'Please remove some of the links from your description.';
  if (!data.consent) errors.consent = 'Please confirm that we may use your details to reply.';

  if (Object.keys(errors).length > 0) {
    return fail(422, 'validation_failed', 'Please check the highlighted fields and try again.', { errors });
  }

  // ── Rate limit ──────────────────────────────────────────────
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (await rateLimited(ip, env)) {
    return fail(429, 'rate_limited', 'Too many enquiries from this connection. Please try again in a few minutes.', {}, {
      'Retry-After': String(RATE_LIMIT.windowSeconds),
    });
  }

  // ── Configuration ───────────────────────────────────────────
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL) {
    console.error('contact: RESEND_API_KEY and/or CONTACT_FROM_EMAIL are not configured');
    return fail(503, 'not_configured', `Email delivery is not configured. Please email ${RECIPIENT} directly.`);
  }

  // ── Deliver through Resend ──────────────────────────────────
  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ['Company', data.company || '—'],
    ['Service required', data.service],
    ['Budget range', data.budget],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nProject description:\n${data.message}\n\n—\nSent from the AT NEXORA Technologies website contact form.`;
  const htmlBody = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#101827;max-width:640px">
<h2 style="color:#142B4A;margin:0 0 16px">New project enquiry</h2>
<table style="border-collapse:collapse;width:100%">${rows
    .map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #E5E9F2;color:#46536a;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:8px 0;border-bottom:1px solid #E5E9F2">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
<h3 style="color:#142B4A;margin:24px 0 8px">Project description</h3>
<p style="white-space:pre-wrap;line-height:1.6;margin:0">${escapeHtml(data.message)}</p>
<p style="color:#46536a;font-size:13px;margin-top:24px">Sent from the AT NEXORA Technologies website contact form. Reply to this email to answer ${escapeHtml(data.name)}.</p>
</div>`;

  let delivered = false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [RECIPIENT],
        reply_to: data.email,
        subject: `New enquiry: ${data.service} — ${data.name}`,
        text,
        html: htmlBody,
      }),
    });
    delivered = response.ok;
    if (!response.ok) {
      // Log the provider status for operators; never forward provider details to the browser.
      console.error('contact: Resend rejected the message', response.status, (await response.text()).slice(0, 500));
    }
  } catch (error) {
    console.error('contact: Resend request failed', error instanceof Error ? error.message : error);
  }

  if (!delivered) {
    return fail(502, 'delivery_failed', `We could not deliver your message. Please email ${RECIPIENT} directly.`);
  }

  return isForm
    ? html(200, 'Enquiry sent', 'Thank you. Your message has been delivered to our team and we will reply by email.')
    : json(200, { ok: true });
};

/** Every other method is rejected. */
export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...baseHeaders, Allow: 'POST, OPTIONS' } });
  }
  return json(405, { ok: false, code: 'method_not_allowed', message: 'Use POST.' }, { Allow: 'POST, OPTIONS' });
};
