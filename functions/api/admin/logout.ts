/** POST /api/admin/logout — destroys the current session (CSRF-protected by the middleware). */
import { json, type Env } from '../../../server/http';
import { clearedSessionCookie, destroySession } from '../../../server/session';
import type { AdminData } from './_middleware';

export const onRequestPost: PagesFunction<Env, string, AdminData> = async ({ env, data }) => {
  await destroySession(env.DB!, data.session.tokenHash);
  return json(200, { ok: true }, { 'Set-Cookie': clearedSessionCookie() });
};
