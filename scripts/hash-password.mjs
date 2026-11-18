/**
 * Generate the ADMIN_PASSWORD_HASH secret for the admin dashboard.
 *
 *   npm run admin:hash                  # Workers Paid: you choose the password (hidden prompt),
 *                                       # PBKDF2-SHA256 with 100,000 iterations (~19 ms CPU)
 *   npm run admin:hash -- --free-plan   # Workers Free: a 144-bit random password is GENERATED
 *                                       # and hashed with 20,000 iterations (~4 ms CPU)
 *
 * Why --free-plan is not weaker: Cloudflare's Free plan allows 10 ms of CPU per
 * request, which a 100,000-iteration check exceeds. Offline guessing cost is
 * (password entropy) x (iterations). A strong human password (~50 bits) at
 * 100,000 iterations costs ~2^67 guesses' worth of work; a generated 144-bit
 * password at 20,000 iterations costs ~2^158. The free-plan mode therefore always
 * generates the password itself, so a low iteration count is never paired with a
 * guessable password.
 *
 * Output format (same as server/crypto.ts): pbkdf2_sha256$<iterations>$<salt>$<hash>
 * Nothing is written to disk. Store only the hash, as a Cloudflare Pages secret.
 */
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const PAID_ITERATIONS = 100_000; // maximum supported by the Workers runtime
const FREE_ITERATIONS = 20_000;
const MIN_PASSWORD_LENGTH = 12;
const b64url = (b) => Buffer.from(b).toString('base64url');

async function hash(password, iterations) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2_sha256$${iterations}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`;
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : '');
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, '');
}

if (process.argv.includes('--free-plan')) {
  // 18 random bytes → 24 base64url characters → 144 bits of entropy.
  const password = b64url(crypto.getRandomValues(new Uint8Array(18)));
  const result = await hash(password, FREE_ITERATIONS);
  console.error('\nGenerated admin password (shown once — save it in your password manager now):\n');
  console.error(`  ${password}\n`);
  console.error('ADMIN_PASSWORD_HASH (store this as the Cloudflare secret):\n');
  console.log(result);
  process.exit(0);
}

let password;
if (!process.stdin.isTTY) {
  // Non-interactive use: printf '%s' "$PASSWORD" | npm run -s admin:hash
  password = await readStdin();
} else {
  password = await ask('New admin password: ');
  const again = await ask('Repeat password:    ');
  if (password !== again) {
    console.error('Passwords do not match.');
    process.exit(1);
  }
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}
console.log(await hash(password, PAID_ITERATIONS));
