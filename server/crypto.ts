/** Web Crypto helpers (available in Cloudflare Workers and Node 20+). */

const enc = new TextEncoder();

export function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));
export const randomToken = (n = 32) => toBase64Url(randomBytes(n));

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return toBase64Url(new Uint8Array(digest));
}

/** Constant-time comparison of two byte arrays. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a[i % (a.length || 1)] ?? 0) ^ (b[i % (b.length || 1)] ?? 0);
  return diff === 0;
}

export const timingSafeEqualStr = (a: string, b: string) => timingSafeEqual(enc.encode(a), enc.encode(b));

/**
 * Password hashing: PBKDF2-HMAC-SHA256, 16-byte random salt, 256-bit key.
 * Format: pbkdf2_sha256$<iterations>$<salt b64url>$<hash b64url>
 * Accepted iteration counts: 10,000–100,000 (100,000 is the Workers runtime maximum).
 * `npm run admin:hash` produces 100,000 iterations for a chosen password (Workers Paid),
 * or 20,000 iterations for a generated 144-bit password (Workers Free, 10 ms CPU limit).
 */
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** A well-formed dummy hash, verified against when the username is wrong so timing is uniform. */
const DUMMY_HASH = 'pbkdf2_sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  const parts = (stored ?? DUMMY_HASH).split('$');
  const valid = parts.length === 4 && parts[0] === 'pbkdf2_sha256';
  const [, iter, saltB64, hashB64] = valid ? parts : DUMMY_HASH.split('$');
  const iterations = Number(iter);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 100_000) return false;
  const actual = await pbkdf2(password, fromBase64Url(saltB64), iterations);
  return valid && stored !== undefined && timingSafeEqual(actual, fromBase64Url(hashB64));
}
