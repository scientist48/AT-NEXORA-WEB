/**
 * Guards every /api/admin/* endpoint.
 *  - D1 must be bound.
 *  - A valid, unexpired session cookie is required (except for /login).
 *  - State-changing requests must come from this origin and carry the
 *    session's CSRF token in the X-CSRF-Token header.
 */
import { errorJson, originAllowed, type Env } from '../../../server/http';
import { timingSafeEqualStr } from '../../../server/crypto';
import { getSession, type Session } from '../../../server/session';

export type AdminData = { session: Session };

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export const onRequest: PagesFunction<Env, string, AdminData> = async (context) => {
  try {
    return await guard(context);
  } catch (error) {
    // Never leak stack traces or SQL errors to the browser.
    console.error('admin api: unhandled error', error instanceof Error ? error.message : error);
    return errorJson(500, 'server_error', 'Something went wrong on the server. Please try again.');
  }
};

async function guard(context: EventContext<Env, string, AdminData>): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorJson(503, 'storage_unavailable', 'Database is not configured.');

  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  if (path === '/api/admin/login') return context.next();

  const session = await getSession(env.DB, request);
  if (!session) return errorJson(401, 'unauthorized', 'Please sign in.');

  if (!SAFE.has(request.method)) {
    if (!originAllowed(request, env, false)) return errorJson(403, 'forbidden_origin', 'Cross-origin request rejected.');
    const token = request.headers.get('X-CSRF-Token') ?? '';
    if (!token || !timingSafeEqualStr(token, session.csrfToken)) return errorJson(403, 'csrf_failed', 'Security token missing or invalid. Reload the page.');
  }

  context.data.session = session;
  return context.next();
}
