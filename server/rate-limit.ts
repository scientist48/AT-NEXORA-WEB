/** Durable fixed-window rate limiting backed by the D1 `rate_limits` table. */

export interface Window {
  count: number;
  resetAt: number;
}

/** Increment the counter for `key` and return the new window state (atomic upsert). */
export async function hit(db: D1Database, key: string, windowMs: number): Promise<Window> {
  const now = Date.now();
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         count    = CASE WHEN rate_limits.reset_at <= ?3 THEN 1  ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= ?3 THEN ?2 ELSE rate_limits.reset_at END
       RETURNING count, reset_at`,
    )
    .bind(key, now + windowMs, now)
    .first<{ count: number; reset_at: number }>();
  return { count: row?.count ?? 1, resetAt: row?.reset_at ?? now + windowMs };
}

/** Read the current count for `key` without incrementing it. */
export async function peek(db: D1Database, key: string): Promise<Window | null> {
  const row = await db
    .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?1 AND reset_at > ?2')
    .bind(key, Date.now())
    .first<{ count: number; reset_at: number }>();
  return row ? { count: row.count, resetAt: row.reset_at } : null;
}

export const clear = (db: D1Database, key: string) => db.prepare('DELETE FROM rate_limits WHERE key = ?1').bind(key).run();

/** Opportunistic cleanup of expired windows (cheap, indexed). */
export const sweep = (db: D1Database) => db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?1').bind(Date.now()).run();

export const retryAfter = (w: Window) => String(Math.max(1, Math.ceil((w.resetAt - Date.now()) / 1000)));
