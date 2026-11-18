/**
 * POST /api/admin/login  { username, password }
 * Credentials come from server-side secrets ADMIN_USERNAME and ADMIN_PASSWORD_HASH.
 * Failed attempts are limited per IP (5 / 15 min) and per username (10 / 15 min).
 */
import { sha256, timingSafeEqualStr, verifyPassword } from '../../../server/crypto';
import { clean, clientIp, errorJson, json, originAllowed, readBody, type Env } from '../../../server/http';
import { clear, hit, peek, retryAfter, sweep } from '../../../server/rate-limit';
import { SESSION_TTL_MS, createSession, sessionCookie } from '../../../server/session';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_PER_USER = 10;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB!;
  if (!originAllowed(request, env, false)) return errorJson(403, 'forbidden_origin', 'Cross-origin request rejected.');
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) return errorJson(415, 'unsupported_media_type', 'Send JSON.');
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH) {
    console.error('admin: ADMIN_USERNAME / ADMIN_PASSWORD_HASH secrets are not configured');
    return errorJson(503, 'not_configured', 'Admin access has not been configured on the server.');
  }

  const raw = await readBody(request, 4 * 1024);
  if (raw === null) return errorJson(413, 'too_large', 'Request too large.');
  let body: { username?: unknown; password?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return errorJson(400, 'invalid_body', 'The request could not be read.');
  }
  const username = clean(body.username, 100).toLowerCase();
  const password = typeof body.password === 'string' ? body.password.slice(0, 256) : '';
  if (!username || !password) return errorJson(422, 'validation_failed', 'Enter your username and password.');

  const ipKey = `login:ip:${await sha256(clientIp(request))}`;
  const userKey = `login:user:${await sha256(username)}`;
  const [ipWin, userWin] = await Promise.all([peek(db, ipKey), peek(db, userKey)]);
  const blocked = [ipWin && ipWin.count >= MAX_PER_IP ? ipWin : null, userWin && userWin.count >= MAX_PER_USER ? userWin : null].find(Boolean);
  if (blocked) {
    return errorJson(429, 'rate_limited', 'Too many failed sign-in attempts. Try again later.', {}, { 'Retry-After': retryAfter(blocked) });
  }

  const userOk = timingSafeEqualStr(username, env.ADMIN_USERNAME.trim().toLowerCase());
  const passOk = await verifyPassword(password, userOk ? env.ADMIN_PASSWORD_HASH.trim() : undefined);

  if (!(userOk && passOk)) {
    await Promise.all([hit(db, ipKey, WINDOW_MS), hit(db, userKey, WINDOW_MS)]);
    return errorJson(401, 'invalid_credentials', 'Incorrect username or password.');
  }

  await Promise.all([clear(db, ipKey), clear(db, userKey), sweep(db)]);
  const { token, csrfToken } = await createSession(db, username);
  return json(200, { ok: true, username, csrfToken }, { 'Set-Cookie': sessionCookie(token, SESSION_TTL_MS / 1000) });
};

export const onRequest: PagesFunction<Env> = async () => errorJson(405, 'method_not_allowed', 'Use POST.', {}, { Allow: 'POST' });
