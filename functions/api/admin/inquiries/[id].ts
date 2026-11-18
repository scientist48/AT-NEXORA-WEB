/**
 * GET    /api/admin/inquiries/:id  — full inquiry
 * PATCH  /api/admin/inquiries/:id  { status?, notes? }
 * DELETE /api/admin/inquiries/:id  — permanent deletion
 * Authentication and CSRF are enforced by ../_middleware.ts.
 */
import { errorJson, json, readBody, type Env } from '../../../../server/http';
import { ID_PATTERN, INQUIRY_COLUMNS, STATUSES, type InquiryRow } from '../../../../server/inquiries';
import type { AdminData } from '../_middleware';

type Ctx = EventContext<Env, 'id', AdminData>;

const idFrom = (params: Ctx['params']) => {
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return typeof id === 'string' && ID_PATTERN.test(id) ? id : null;
};

const load = (db: D1Database, id: string) => db.prepare(`SELECT ${INQUIRY_COLUMNS} FROM inquiries WHERE id = ?1`).bind(id).first<InquiryRow>();

export const onRequestGet = async ({ env, params }: Ctx) => {
  const id = idFrom(params);
  if (!id) return errorJson(404, 'not_found', 'Inquiry not found.');
  const row = await load(env.DB!, id);
  return row ? json(200, { ok: true, item: row }) : errorJson(404, 'not_found', 'Inquiry not found.');
};

export const onRequestPatch = async ({ request, env, params }: Ctx) => {
  const id = idFrom(params);
  if (!id) return errorJson(404, 'not_found', 'Inquiry not found.');
  const raw = await readBody(request, 16 * 1024);
  if (raw === null) return errorJson(413, 'too_large', 'Request too large.');
  let body: { status?: unknown; notes?: unknown };
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return errorJson(400, 'invalid_body', 'The request could not be read.');
  }

  const sets: string[] = [];
  const args: string[] = [];
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !(STATUSES as readonly string[]).includes(body.status)) {
      return errorJson(422, 'validation_failed', 'Unknown status.');
    }
    args.push(body.status);
    sets.push(`status = ?${args.length}`);
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') return errorJson(422, 'validation_failed', 'Notes must be text.');
    const notes = body.notes.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if (notes.length > 10000) return errorJson(422, 'validation_failed', 'Notes must be under 10,000 characters.');
    args.push(notes);
    sets.push(`notes = ?${args.length}`);
  }
  if (!sets.length) return errorJson(422, 'validation_failed', 'Nothing to update.');

  args.push(new Date().toISOString());
  sets.push(`updated_at = ?${args.length}`);
  args.push(id);
  const result = await env.DB!.prepare(`UPDATE inquiries SET ${sets.join(', ')} WHERE id = ?${args.length}`).bind(...args).run();
  if ((result.meta?.changes ?? 0) !== 1) return errorJson(404, 'not_found', 'Inquiry not found.');
  return json(200, { ok: true, item: await load(env.DB!, id) });
};

export const onRequestDelete = async ({ env, params }: Ctx) => {
  const id = idFrom(params);
  if (!id) return errorJson(404, 'not_found', 'Inquiry not found.');
  const result = await env.DB!.prepare('DELETE FROM inquiries WHERE id = ?1').bind(id).run();
  if ((result.meta?.changes ?? 0) !== 1) return errorJson(404, 'not_found', 'Inquiry not found.');
  return json(200, { ok: true, id });
};

export const onRequest = async () => errorJson(405, 'method_not_allowed', 'Method not allowed.', {}, { Allow: 'GET, PATCH, DELETE' });
