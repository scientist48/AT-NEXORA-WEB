/** GET /api/admin/session — returns the signed-in user and the CSRF token for this session. */
import { json, type Env } from '../../../server/http';
import type { AdminData } from './_middleware';

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ data }) =>
  json(200, { ok: true, username: data.session.username, csrfToken: data.session.csrfToken, expiresAt: data.session.expiresAt });
