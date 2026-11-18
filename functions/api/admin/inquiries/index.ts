/**
 * GET /api/admin/inquiries
 *   ?q=        search id, name, email, company and message
 *   &status=   new | contacted | in_progress | completed | archived
 *   &service=  exact service label
 *   &from= &to= YYYY-MM-DD (inclusive, UTC)
 *   &sort=     newest | oldest
 *   &page= &pageSize= (max 50)
 * Returns the page of inquiries, the total for the current filter, status counts and the latest five.
 */
import { clean, errorJson, json, type Env } from '../../../../server/http';
import { INQUIRY_COLUMNS, STATUSES, type InquiryRow } from '../../../../server/inquiries';
import type { AdminData } from '../_middleware';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ request, env }) => {
  const db = env.DB!;
  const p = new URL(request.url).searchParams;
  const q = clean(p.get('q'), 200);
  const status = p.get('status') ?? '';
  const service = clean(p.get('service'), 80);
  const from = p.get('from') ?? '';
  const to = p.get('to') ?? '';
  const sort = p.get('sort') === 'oldest' ? 'ASC' : 'DESC';
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(p.get('pageSize') ?? '20', 10) || 20));
  const page = Math.max(1, Number.parseInt(p.get('page') ?? '1', 10) || 1);

  if (status && !(STATUSES as readonly string[]).includes(status)) return errorJson(400, 'invalid_filter', 'Unknown status.');
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) return errorJson(400, 'invalid_filter', 'Dates must be YYYY-MM-DD.');

  const where: string[] = [];
  const args: (string | number)[] = [];
  const bind = (v: string | number) => {
    args.push(v);
    return `?${args.length}`;
  };
  if (q) {
    const like = bind(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(id LIKE ${like} ESCAPE '\\' OR name LIKE ${like} ESCAPE '\\' OR email LIKE ${like} ESCAPE '\\' OR company LIKE ${like} ESCAPE '\\' OR message LIKE ${like} ESCAPE '\\')`);
  }
  if (status) where.push(`status = ${bind(status)}`);
  if (service) where.push(`service = ${bind(service)}`);
  if (from) where.push(`created_at >= ${bind(`${from}T00:00:00.000Z`)}`);
  if (to) where.push(`created_at < ${bind(nextDay(to))}`);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const limit = bind(pageSize);
  const offset = bind((page - 1) * pageSize);
  const filterArgs = args.slice(0, args.length - 2);

  const [list, total, counts, recent] = await db.batch([
    db.prepare(`SELECT ${INQUIRY_COLUMNS} FROM inquiries ${whereSql} ORDER BY created_at ${sort}, id ${sort} LIMIT ${limit} OFFSET ${offset}`).bind(...args),
    db.prepare(`SELECT COUNT(*) AS n FROM inquiries ${whereSql}`).bind(...filterArgs),
    db.prepare('SELECT status, COUNT(*) AS n FROM inquiries GROUP BY status'),
    db.prepare('SELECT id, name, company, service, status, created_at FROM inquiries ORDER BY created_at DESC LIMIT 5'),
  ]);

  const stats: Record<string, number> = { total: 0, ...Object.fromEntries(STATUSES.map((s) => [s, 0])) };
  for (const row of counts.results as { status: string; n: number }[]) {
    stats[row.status] = row.n;
    stats.total += row.n;
  }
  const totalCount = (total.results[0] as { n: number } | undefined)?.n ?? 0;

  return json(200, {
    ok: true,
    items: list.results as unknown as InquiryRow[],
    total: totalCount,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(totalCount / pageSize)),
    stats,
    recent: recent.results,
  });
};
