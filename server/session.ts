/** Admin session handling. Tokens are random; only their SHA-256 hash is stored in D1. */
import { randomToken, sha256 } from './crypto';

export const SESSION_COOKIE = '__Host-nx_admin';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // absolute lifetime: 8 hours
export const SESSION_IDLE_MS = 60 * 60 * 1000; //   idle timeout: 1 hour
const TOUCH_INTERVAL_MS = 60 * 1000;

export interface Session {
  username: string;
  csrfToken: string;
  tokenHash: string;
  expiresAt: number;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}
export const clearedSessionCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function createSession(db: D1Database, username: string): Promise<{ token: string; csrfToken: string }> {
  const token = randomToken(32);
  const csrfToken = randomToken(32);
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?1 OR last_seen_at <= ?2').bind(now, now - SESSION_IDLE_MS),
    db
      .prepare('INSERT INTO admin_sessions (token_hash, username, csrf_token, created_at, expires_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?4)')
      .bind(await sha256(token), username, csrfToken, now, now + SESSION_TTL_MS),
  ]);
  return { token, csrfToken };
}

/** Validate the session cookie. Expired or idle sessions are deleted and rejected. */
export async function getSession(db: D1Database, request: Request): Promise<Session | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const tokenHash = await sha256(token);
  const row = await db
    .prepare('SELECT username, csrf_token, expires_at, last_seen_at FROM admin_sessions WHERE token_hash = ?1')
    .bind(tokenHash)
    .first<{ username: string; csrf_token: string; expires_at: number; last_seen_at: number }>();
  if (!row) return null;
  const now = Date.now();
  if (row.expires_at <= now || row.last_seen_at + SESSION_IDLE_MS <= now) {
    await db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?1').bind(tokenHash).run();
    return null;
  }
  if (now - row.last_seen_at > TOUCH_INTERVAL_MS) {
    await db.prepare('UPDATE admin_sessions SET last_seen_at = ?1 WHERE token_hash = ?2').bind(now, tokenHash).run();
  }
  return { username: row.username, csrfToken: row.csrf_token, tokenHash, expiresAt: row.expires_at };
}

export const destroySession = (db: D1Database, tokenHash: string) =>
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?1').bind(tokenHash).run();
