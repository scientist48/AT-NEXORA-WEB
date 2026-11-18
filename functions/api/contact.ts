/**
 * POST /api/contact — Cloudflare Pages Function
 *
 * Validates a project enquiry and stores it in Cloudflare D1 (binding `DB`).
 * The database is the source of truth: no email is sent. Success is reported
 * only after D1 confirms the insert.
 *
 * Protection: same-origin check, 16 KB body limit, strict server-side
 * validation, honeypot + minimum fill time, link-spam heuristic, duplicate
 * detection (same email + message within 24 h) and durable per-IP rate
 * limiting (5 submissions / 10 min) stored in D1.
 */
import { company, inquiryBudgets, inquiryServices } from '../../src/content/site';
import { sha256 } from '../../server/crypto';
import { clean, clientIp, errorJson, escapeHtml, json, originAllowed, readBody, securityHeaders, type Env } from '../../server/http';
import { newInquiryId } from '../../server/inquiries';
import { hit, retryAfter } from '../../server/rate-limit';

const MAX_BODY_BYTES = 16 * 1024;
const MIN_FILL_MS = 2500;
const RATE = { max: 5, windowMs: 10 * 60 * 1000 };
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Fields = 'name' | 'email' | 'company' | 'service' | 'budget' | 'message' | 'consent';

/** Plain HTML reply for browsers that submitted the form without JavaScript. */
function html(status: number, title: string, message: string) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | AT NEXORA Technologies</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F8FC;color:#101827;font:17px/1.6 system-ui,sans-serif;padding:24px}main{max-width:34rem}h1{color:#142B4A;font-size:2rem;line-height:1.1;margin:0 0 .75rem}a{color:#142B4A;font-weight:600}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/contact/">Back to the contact page</a> · <a href="${company.emailHref}">${company.email}</a></p></main></body></html>`;
  return new Response(page, { status, headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

function looksLikeSpam(message: string): boolean {
  const links = message.match(/https?:\/\/|www\./gi)?.length ?? 0;
  return links > 3 || /\[url=|<a\s+href=|<script/i.test(message);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentType = request.headers.get('Content-Type') ?? '';
  const isForm = contentType.includes('application/x-www-form-urlencoded');
  const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
    isForm ? html(status, 'Your message was not sent', message) : errorJson(status, code, message, extra, headers);

  if (!originAllowed(request, env, true)) return fail(403, 'forbidden_origin', 'This request is not allowed from this origin.');

  const raw = await readBody(request, MAX_BODY_BYTES);
  if (raw === null) return fail(413, 'too_large', 'The submitted data is too large.');

  let input: Record<string, unknown>;
  try {
    if (contentType.includes('application/json')) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      input = parsed as Record<string, unknown>;
    } else if (isForm) {
      input = Object.fromEntries(new URLSearchParams(raw));
    } else {
      return fail(415, 'unsupported_media_type', 'Unsupported content type.');
    }
  } catch {
    return fail(400, 'invalid_body', 'The request could not be read.');
  }

  // Spam traps: respond like a success but store nothing.
  const honeypot = clean(input.website, 200);
  const elapsed = Number(input.elapsed);
  if (honeypot || (Number.isFinite(elapsed) && elapsed > 0 && elapsed < MIN_FILL_MS)) {
    return isForm ? html(200, 'Thank you', 'Your enquiry has been received.') : json(200, { ok: true });
  }

  const data = {
    name: clean(input.name, 100),
    email: clean(input.email, 254).toLowerCase(),
    company: clean(input.company, 120),
    service: clean(input.service, 80),
    budget: clean(input.budget, 80),
    message: clean(input.message, 4000, true),
    consent: input.consent === true || input.consent === 'yes' || input.consent === 'on' || input.consent === 'true',
  };

  const errors: Partial<Record<Fields, string>> = {};
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

  const db = env.DB;
  if (!db) {
    console.error('contact: D1 binding "DB" is not configured');
    return fail(503, 'storage_unavailable', `We could not save your enquiry right now. Please email ${company.email} or message us on WhatsApp.`);
  }

  try {
    const ipKey = `contact:${await sha256(clientIp(request))}`;
    const window = await hit(db, ipKey, RATE.windowMs);
    if (window.count > RATE.max) {
      return fail(429, 'rate_limited', 'Too many enquiries from this connection. Please try again in a few minutes.', {}, { 'Retry-After': retryAfter(window) });
    }

    const fingerprint = await sha256(`${data.email}\n${data.message.toLowerCase().replace(/\s+/g, ' ')}`);
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const existing = await db
      .prepare('SELECT id FROM inquiries WHERE fingerprint = ?1 AND created_at >= ?2 LIMIT 1')
      .bind(fingerprint, since)
      .first<{ id: string }>();
    if (existing) {
      return isForm
        ? html(200, 'Already received', `We already have this enquiry (reference ${existing.id}) and will reply soon.`)
        : json(409, { ok: false, code: 'duplicate', id: existing.id, message: 'We have already received this enquiry and will reply soon.' });
    }

    const insert = (id: string) =>
      db
        .prepare('INSERT INTO inquiries (id, name, email, company, service, budget, message, consent, fingerprint) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)')
        .bind(id, data.name, data.email, data.company, data.service, data.budget, data.message, fingerprint)
        .run();

    let id = newInquiryId();
    let result: D1Result;
    try {
      result = await insert(id);
    } catch (e) {
      if (!String(e).includes('UNIQUE')) throw e;
      id = newInquiryId(); // astronomically rare ID collision: retry once
      result = await insert(id);
    }
    if (!result.success || (result.meta?.changes ?? 0) !== 1) throw new Error('insert reported no change');

    return isForm
      ? html(201, 'Enquiry received', `Thank you. Your enquiry has been saved with reference ${id}. We will reply by email.`)
      : json(201, { ok: true, id });
  } catch (error) {
    console.error('contact: database error', error instanceof Error ? error.message : error);
    return fail(500, 'storage_failed', `Your enquiry could not be saved. Please try again, or email ${company.email}.`);
  }
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...securityHeaders, Allow: 'POST, OPTIONS' } });
  return errorJson(405, 'method_not_allowed', 'Use POST.', {}, { Allow: 'POST, OPTIONS' });
};
