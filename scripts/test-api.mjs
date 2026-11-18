/**
 * Integration tests for the contact endpoint and the admin API.
 *
 * Run against `wrangler pages dev` with a LOCAL D1 database (never production):
 *
 *   npm run build && npm run preview:cf              # terminal 1 (needs .dev.vars)
 *   ADMIN_TEST_USERNAME=... ADMIN_TEST_PASSWORD=... npm run test:api   # terminal 2
 *
 * The suite writes, updates and deletes test inquiries, resets rate-limit
 * counters and expires sessions through `wrangler d1 execute --local`, so it
 * refuses to run unless the base URL is localhost.
 */
import { execFileSync } from 'node:child_process';

const BASE = (process.argv[2] ?? 'http://localhost:8788').replace(/\/$/, '');
const USER = process.env.ADMIN_TEST_USERNAME;
const PASS = process.env.ADMIN_TEST_PASSWORD;
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error('Refusing to run: test:api only targets a local wrangler server.');
  process.exit(2);
}
if (!USER || !PASS) {
  console.error('Set ADMIN_TEST_USERNAME and ADMIN_TEST_PASSWORD (matching .dev.vars).');
  process.exit(2);
}

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
const section = (t) => console.log(`\n${t}`);

function sql(command) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'at-nexora-inquiries', '--local', '--json', '--command', command], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(out.slice(out.indexOf('[')))[0]?.results ?? [];
}

const ORIGIN = BASE;
async function req(path, { method = 'GET', body, headers = {}, cookie, raw = false } = {}) {
  const h = { Origin: ORIGIN, ...headers };
  if (body !== undefined && !raw) h['Content-Type'] ??= 'application/json';
  if (cookie) h.Cookie = cookie;
  const res = await fetch(BASE + path, { method, headers: h, body: raw || body === undefined ? body : JSON.stringify(body), redirect: 'manual' });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, headers: res.headers, json, text };
}

const unique = () => Math.random().toString(36).slice(2, 10);
const valid = (over = {}) => ({
  name: 'Ayesha Khan',
  email: 'Ayesha.Khan@Example.com',
  company: 'Example Logistics',
  service: 'Data Intelligence',
  budget: '$5,000 – $15,000',
  message: `We need an operations dashboard for our warehouse team. Ref ${unique()}`,
  consent: true,
  website: '',
  elapsed: 9000,
  ...over,
});

// Start from a clean slate for repeatable results (local database only).
sql('DELETE FROM inquiries; DELETE FROM rate_limits; DELETE FROM admin_sessions;');

/* ───────────── Contact endpoint ───────────── */
section('Contact endpoint');
{
  let r = await req('/api/contact');
  check('GET is rejected with 405', r.status === 405, r.status);

  r = await req('/api/contact', { method: 'POST', body: 'hello', raw: true, headers: { 'Content-Type': 'text/plain' } });
  check('unsupported content type → 415', r.status === 415, r.status);

  r = await req('/api/contact', { method: 'POST', body: '{not json', raw: true, headers: { 'Content-Type': 'application/json' } });
  check('malformed JSON → 400', r.status === 400, r.status);

  r = await req('/api/contact', { method: 'POST', body: {} });
  check('empty submission → 422', r.status === 422, r.status);
  check('422 lists every required field', ['name', 'email', 'service', 'budget', 'message', 'consent'].every((f) => r.json?.errors?.[f]), JSON.stringify(r.json?.errors));

  r = await req('/api/contact', { method: 'POST', body: valid({ email: 'not-an-email', service: 'Free website', budget: '1 million' }) });
  check('invalid email/service/budget rejected', r.status === 422 && r.json.errors.email && r.json.errors.service && r.json.errors.budget, JSON.stringify(r.json));

  r = await req('/api/contact', { method: 'POST', body: valid({ consent: false }) });
  check('missing consent rejected', r.status === 422 && r.json.errors.consent);

  r = await req('/api/contact', { method: 'POST', body: valid({ message: 'see http://a.io http://b.io http://c.io http://d.io now' }) });
  check('link spam rejected', r.status === 422 && r.json.errors.message);

  r = await req('/api/contact', { method: 'POST', body: valid(), headers: { Origin: 'https://evil.example' } });
  check('foreign Origin → 403', r.status === 403, r.status);

  r = await req('/api/contact', { method: 'POST', body: valid({ message: 'x'.repeat(20_000) }) });
  check('body over 16 KB → 413', r.status === 413, r.status);

  r = await req('/api/contact', { method: 'POST', body: valid({ website: 'http://spam.example' }) });
  check('honeypot filled → silent 200', r.status === 200 && r.json?.ok === true && !r.json.id);
  r = await req('/api/contact', { method: 'POST', body: valid({ elapsed: 400 }) });
  check('submitted too fast → silent 200', r.status === 200 && r.json?.ok === true && !r.json.id);
  check('spam traps stored nothing', sql('SELECT COUNT(*) AS n FROM inquiries')[0].n === 0);

  const good = valid({ name: '  Ayesha   Khan  ', company: "O'Brien; DROP TABLE inquiries;--" });
  r = await req('/api/contact', { method: 'POST', body: good });
  check('valid submission → 201 with reference ID', r.status === 201 && /^NX-[0-9A-HJKMNP-TV-Z]{8}$/.test(r.json?.id ?? ''), `${r.status} ${r.text}`);
  const firstId = r.json?.id;
  const row = sql(`SELECT * FROM inquiries WHERE id = '${firstId}'`)[0];
  check('row inserted in D1', !!row);
  check('name whitespace normalised', row?.name === 'Ayesha Khan', row?.name);
  check('email lower-cased', row?.email === 'ayesha.khan@example.com', row?.email);
  check('SQL-like text stored literally (parameterised)', row?.company === "O'Brien; DROP TABLE inquiries;--", row?.company);
  check('default status is "new"', row?.status === 'new');
  check('timestamps recorded', /^\d{4}-\d{2}-\d{2}T/.test(row?.created_at ?? '') && row?.created_at === row?.updated_at);

  r = await req('/api/contact', { method: 'POST', body: { ...good, email: 'AYESHA.KHAN@example.com', message: `  ${good.message.toUpperCase()}  ` } });
  check('duplicate (same email+message) → 409 with original ID', r.status === 409 && r.json?.id === firstId, `${r.status} ${r.text}`);
  check('duplicate not stored', sql('SELECT COUNT(*) AS n FROM inquiries')[0].n === 1);

  const form = new URLSearchParams({ ...valid({ consent: 'yes' }), elapsed: '9000' }).toString();
  r = await req('/api/contact', { method: 'POST', body: form, raw: true, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  check('no-JavaScript form post → 201 HTML confirmation', r.status === 201 && r.text.includes('reference NX-'), r.status);

  let x = await req('/api/contact', { method: 'POST', body: valid({ message: `<script>alert(1)</script> please build us a portal ${unique()}` }) });
  check('<script> in description rejected as spam', x.status === 422 && x.json.errors.message);
  x = await req('/api/contact', { method: 'POST', body: valid({ name: '<img src=x onerror=alert(1)>' }) });
  check('HTML in fields stored as inert text', x.status === 201 && sql(`SELECT name FROM inquiries WHERE id='${x.json.id}'`)[0]?.name === '<img src=x onerror=alert(1)>', x.text);

  // Rate limit: 5 per 10 minutes per IP (fresh window).
  sql('DELETE FROM rate_limits');
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await req('/api/contact', { method: 'POST', body: valid() })).status);
  check('6th submission in window → 429', statuses.slice(0, 5).every((s) => s === 201) && statuses[5] === 429, statuses.join(','));
  r = await req('/api/contact', { method: 'POST', body: valid() });
  check('429 includes Retry-After', r.status === 429 && Number(r.headers.get('retry-after')) > 0);
  sql('DELETE FROM rate_limits');
}

/* ───────────── Admin: unauthenticated access ───────────── */
section('Admin — unauthenticated access');
const anyId = sql('SELECT id FROM inquiries LIMIT 1')[0].id;
{
  const probes = [
    ['GET', '/api/admin/session'],
    ['GET', '/api/admin/inquiries'],
    ['GET', `/api/admin/inquiries/${anyId}`],
    ['PATCH', `/api/admin/inquiries/${anyId}`, { status: 'archived' }],
    ['DELETE', `/api/admin/inquiries/${anyId}`],
    ['POST', '/api/admin/logout'],
  ];
  for (const [method, path, body] of probes) {
    const r = await req(path, { method, body });
    check(`${method} ${path.replace(anyId, ':id')} → 401`, r.status === 401, r.status);
  }
  const forged = await req('/api/admin/inquiries', { cookie: '__Host-nx_admin=' + 'A'.repeat(43) });
  check('forged session cookie → 401', forged.status === 401);
  check('inquiry untouched by unauthenticated requests', sql(`SELECT status FROM inquiries WHERE id='${anyId}'`)[0]?.status === 'new');

  let r = await req('/admin/');
  check('/admin/ redirects to login', r.status === 302 && r.headers.get('location')?.endsWith('/admin/login/'), `${r.status} ${r.headers.get('location')}`);
  r = await req('/admin/login/');
  check('/admin/login/ is reachable', r.status === 200 && r.text.includes('Sign in'));
  check('admin pages are noindex + no-store', r.headers.get('x-robots-tag')?.includes('noindex') && r.headers.get('cache-control')?.includes('no-store'));
}

/* ───────────── Admin: login ───────────── */
section('Admin — login');
let cookie = '';
let csrf = '';
{
  let r = await req('/api/admin/login', { method: 'POST', body: { username: USER, password: 'wrong-password' } });
  check('wrong password → 401', r.status === 401 && r.json?.code === 'invalid_credentials');
  check('failed login sets no cookie', !r.headers.get('set-cookie'));
  r = await req('/api/admin/login', { method: 'POST', body: { username: 'nobody', password: PASS } });
  check('unknown username → 401 (same message)', r.status === 401 && r.json?.message === 'Incorrect username or password.');
  r = await req('/api/admin/login', { method: 'POST', body: { username: '', password: '' } });
  check('missing credentials → 422', r.status === 422);
  r = await req('/api/admin/login', { method: 'POST', body: { username: USER, password: PASS }, headers: { Origin: 'https://evil.example' } });
  check('cross-origin login → 403', r.status === 403);
  r = await req('/api/admin/login', { method: 'POST', body: `username=${USER}&password=${PASS}`, raw: true, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  check('non-JSON login → 415', r.status === 415);
  r = await req('/api/admin/login');
  check('GET login → 405', r.status === 405);

  sql('DELETE FROM rate_limits');
  for (let i = 0; i < 5; i++) await req('/api/admin/login', { method: 'POST', body: { username: USER, password: `bad-${i}` } });
  r = await req('/api/admin/login', { method: 'POST', body: { username: USER, password: PASS } });
  check('after 5 failures even the right password → 429', r.status === 429 && Number(r.headers.get('retry-after')) > 0, r.status);
  sql('DELETE FROM rate_limits');

  r = await req('/api/admin/login', { method: 'POST', body: { username: USER.toUpperCase(), password: PASS } });
  const setCookie = r.headers.get('set-cookie') ?? '';
  check('correct credentials → 200', r.status === 200 && r.json?.ok === true, `${r.status} ${r.text}`);
  check('cookie is __Host-, HttpOnly, Secure, SameSite=Strict, Path=/', /^__Host-nx_admin=/.test(setCookie) && /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie) && /Path=\//.test(setCookie), setCookie);
  check('response contains no password material', !r.text.includes(PASS) && !r.text.includes('pbkdf2'));
  cookie = setCookie.split(';')[0];
  csrf = r.json?.csrfToken ?? '';
  check('CSRF token issued', csrf.length >= 40);
  const stored = sql('SELECT token_hash FROM admin_sessions');
  check('only a hash of the session token is stored', stored.length === 1 && stored[0].token_hash !== cookie.split('=')[1]);

  r = await req('/api/admin/session', { cookie });
  check('session endpoint returns user + CSRF', r.status === 200 && r.json?.username === USER.toLowerCase() && r.json?.csrfToken === csrf);
  r = await req('/admin/', { cookie });
  check('/admin/ served when signed in', r.status === 200 && r.text.includes('admin'));
  r = await req('/admin/login/', { cookie });
  check('/admin/login/ redirects signed-in user to dashboard', r.status === 302 && r.headers.get('location')?.endsWith('/admin/'));
}

/* ───────────── Admin: listing, search, filters ───────────── */
section('Admin — listing, search, filters, sorting, pagination');
{
  // Seed a few varied inquiries directly (fixed dates for filter tests).
  sql(`INSERT INTO inquiries (id, name, email, company, service, budget, message, fingerprint, status, created_at, updated_at) VALUES
    ('NX-AAAAAAA1','Bilal Ahmed','bilal@acme.test','Acme Retail','Digital Engineering','$50,000+','Need a multi-tenant SaaS platform for retailers','seed1','contacted','2026-01-10T09:00:00.000Z','2026-01-10T09:00:00.000Z'),
    ('NX-AAAAAAA2','Sara Malik','sara@globex.test','Globex','AI & Automation','Under $5,000','Customer support chatbot grounded in our FAQ 100% accurate','seed2','in_progress','2026-03-05T12:00:00.000Z','2026-03-05T12:00:00.000Z'),
    ('NX-AAAAAAA3','Omar Farooq','omar@initech.test','','AI & Automation','Not decided yet','Invoice automation with approvals','seed3','completed','2026-06-20T15:30:00.000Z','2026-06-20T15:30:00.000Z'),
    ('NX-AAAAAAA4','Hina Raza','hina@umbrella.test','Umbrella Co','Not sure yet','Not decided yet','General enquiry about working together','seed4','archived','2025-12-01T08:00:00.000Z','2025-12-01T08:00:00.000Z')`);
  const total = sql('SELECT COUNT(*) AS n FROM inquiries')[0].n;

  let r = await req('/api/admin/inquiries?pageSize=50', { cookie });
  check('list returns every inquiry', r.status === 200 && r.json.total === total && r.json.items.length === total, `${r.json?.total} vs ${total}`);
  const s = r.json.stats;
  check('stats per status add up to total', s.total === total && s.new + s.contacted + s.in_progress + s.completed + s.archived === total, JSON.stringify(s));
  check('stats correct for seeded statuses', s.contacted === 1 && s.in_progress === 1 && s.completed === 1 && s.archived === 1);
  check('recent overview has the 5 newest', r.json.recent.length === 5 && r.json.recent[0].created_at >= r.json.recent[4].created_at);
  check('fingerprint is not exposed', !('fingerprint' in r.json.items[0]));

  const search = async (q) => (await req(`/api/admin/inquiries?q=${encodeURIComponent(q)}`, { cookie })).json;
  check('search by name', (await search('bilal')).items.map((i) => i.id).join() === 'NX-AAAAAAA1');
  check('search by email', (await search('sara@globex')).items[0]?.id === 'NX-AAAAAAA2');
  check('search by company', (await search('umbrella')).items[0]?.id === 'NX-AAAAAAA4');
  check('search by message text', (await search('invoice automation')).items[0]?.id === 'NX-AAAAAAA3');
  check('search by inquiry ID', (await search('NX-AAAAAAA2')).total === 1);
  check('search is case-insensitive', (await search('GLOBEX')).total === 1);
  check('"%" is matched literally, not as a wildcard', (await search('100%')).total === 1 && (await search('%')).total === 1);
  check('no-match search returns empty list', (await search('zzzz-no-such-thing')).total === 0);

  const q = async (qs) => (await req(`/api/admin/inquiries?${qs}`, { cookie })).json;
  check('filter by status', (await q('status=completed')).items.every((i) => i.status === 'completed') && (await q('status=completed')).total === 1);
  check('filter by service', (await q('service=AI%20%26%20Automation')).total === 2);
  check('filter by date range', (await q('from=2026-01-01&to=2026-06-30')).total === 3);
  check('date range is inclusive of the end day', (await q('from=2026-06-20&to=2026-06-20')).total === 1);
  check('combined filters', (await q('status=in_progress&service=AI%20%26%20Automation&q=chatbot')).total === 1);
  r = await req('/api/admin/inquiries?status=bogus', { cookie });
  check('invalid status filter → 400', r.status === 400);
  r = await req('/api/admin/inquiries?from=01/01/2026', { cookie });
  check('invalid date filter → 400', r.status === 400);

  const newest = (await q('pageSize=50')).items.map((i) => i.id);
  const oldest = (await q('pageSize=50&sort=oldest')).items.map((i) => i.id);
  check('sort oldest is the reverse of newest', JSON.stringify(newest) === JSON.stringify([...oldest].reverse()));
  check('oldest-first starts with the earliest record', oldest[0] === 'NX-AAAAAAA4');

  const p1 = await q('pageSize=3&page=1');
  const p2 = await q('pageSize=3&page=2');
  check('pagination reports pages', p1.pages === Math.ceil(total / 3) && p1.items.length === 3);
  check('page 2 has different items', p2.items.length > 0 && !p2.items.some((i) => p1.items.find((j) => j.id === i.id)));
  check('pageSize capped at 50', (await q('pageSize=500')).pageSize === 50);
}

/* ───────────── Admin: details, updates, notes, delete ───────────── */
section('Admin — details, status updates, notes, deletion');
{
  const id = 'NX-AAAAAAA1';
  let r = await req(`/api/admin/inquiries/${id}`, { cookie });
  check('inquiry detail returns all fields', r.status === 200 && ['name', 'email', 'company', 'service', 'budget', 'message', 'status', 'notes', 'created_at', 'updated_at', 'consent'].every((k) => k in r.json.item));
  r = await req('/api/admin/inquiries/NX-ZZZZZZZZ', { cookie });
  check('unknown ID → 404', r.status === 404);
  r = await req("/api/admin/inquiries/1' OR '1'='1", { cookie });
  check('malformed ID → 404', r.status === 404);

  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status: 'completed' }, cookie });
  check('PATCH without CSRF token → 403', r.status === 403 && r.json?.code === 'csrf_failed');
  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status: 'completed' }, cookie, headers: { 'X-CSRF-Token': 'x'.repeat(43) } });
  check('PATCH with wrong CSRF token → 403', r.status === 403);
  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status: 'completed' }, cookie, headers: { 'X-CSRF-Token': csrf, Origin: 'https://evil.example' } });
  check('PATCH from foreign origin → 403', r.status === 403 && r.json?.code === 'forbidden_origin');
  check('rejected PATCHes changed nothing', sql(`SELECT status FROM inquiries WHERE id='${id}'`)[0].status === 'contacted');

  const auth = { cookie, headers: { 'X-CSRF-Token': csrf } };
  for (const status of ['new', 'contacted', 'in_progress', 'completed', 'archived']) {
    r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status }, ...auth });
    check(`status → ${status} persists`, r.status === 200 && sql(`SELECT status FROM inquiries WHERE id='${id}'`)[0].status === status);
  }
  const after = sql(`SELECT created_at, updated_at FROM inquiries WHERE id='${id}'`)[0];
  check('updated_at changes, created_at kept', after.updated_at > after.created_at && after.created_at === '2026-01-10T09:00:00.000Z');
  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status: 'deleted' }, ...auth });
  check('invalid status → 422', r.status === 422);

  const notes = 'Called on Monday.\nFollow up with a proposal by Friday. <b>not html</b>';
  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { notes }, ...auth });
  check('internal notes saved', r.status === 200 && r.json.item.notes === notes);
  r = await req(`/api/admin/inquiries/${id}`, { cookie });
  check('notes persist on reload', r.json.item.notes === notes);
  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { notes: 'Edited note' }, ...auth });
  check('notes can be edited', r.json?.item?.notes === 'Edited note');
  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { notes: 'n'.repeat(10_001) }, ...auth });
  check('notes over 10,000 chars → 422', r.status === 422);
  r = await req(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: {}, ...auth });
  check('empty PATCH → 422', r.status === 422);
  r = await req('/api/admin/inquiries/NX-ZZZZZZZZ', { method: 'PATCH', body: { status: 'new' }, ...auth });
  check('PATCH unknown ID → 404', r.status === 404);

  r = await req(`/api/admin/inquiries/${id}`, { method: 'DELETE', cookie });
  check('DELETE without CSRF → 403', r.status === 403);
  check('inquiry still exists after rejected DELETE', sql(`SELECT COUNT(*) AS n FROM inquiries WHERE id='${id}'`)[0].n === 1);
  const before = sql('SELECT COUNT(*) AS n FROM inquiries')[0].n;
  r = await req(`/api/admin/inquiries/${id}`, { method: 'DELETE', ...auth });
  check('DELETE with CSRF → 200', r.status === 200 && r.json?.id === id);
  check('row removed from D1', sql(`SELECT COUNT(*) AS n FROM inquiries WHERE id='${id}'`)[0].n === 0 && sql('SELECT COUNT(*) AS n FROM inquiries')[0].n === before - 1);
  r = await req(`/api/admin/inquiries/${id}`, { cookie });
  check('deleted inquiry → 404', r.status === 404);
  r = await req(`/api/admin/inquiries/${id}`, { method: 'DELETE', ...auth });
  check('second DELETE → 404', r.status === 404);
}

/* ───────────── Admin: logout and expiry ───────────── */
section('Admin — logout and session expiry');
{
  let r = await req('/api/admin/logout', { method: 'POST', cookie });
  check('logout without CSRF → 403', r.status === 403);
  r = await req('/api/admin/logout', { method: 'POST', cookie, headers: { 'X-CSRF-Token': csrf } });
  check('logout → 200 and clears cookie', r.status === 200 && /Max-Age=0/.test(r.headers.get('set-cookie') ?? ''));
  r = await req('/api/admin/session', { cookie });
  check('old session rejected after logout', r.status === 401);
  check('session row deleted', sql('SELECT COUNT(*) AS n FROM admin_sessions')[0].n === 0);

  const login = async () => {
    const res = await req('/api/admin/login', { method: 'POST', body: { username: USER, password: PASS } });
    return (res.headers.get('set-cookie') ?? '').split(';')[0];
  };
  let c = await login();
  sql('UPDATE admin_sessions SET expires_at = 1');
  r = await req('/api/admin/inquiries', { cookie: c });
  check('absolute expiry enforced → 401', r.status === 401);
  check('expired session purged', sql('SELECT COUNT(*) AS n FROM admin_sessions')[0].n === 0);

  c = await login();
  sql(`UPDATE admin_sessions SET last_seen_at = ${Date.now() - 2 * 60 * 60 * 1000}`);
  r = await req('/api/admin/inquiries', { cookie: c });
  check('idle timeout enforced → 401', r.status === 401);
  r = await req('/admin/', { cookie: c });
  check('/admin/ redirects after expiry', r.status === 302);
}

sql('DELETE FROM rate_limits; DELETE FROM admin_sessions;');
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
