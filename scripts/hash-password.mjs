/**
 * Generate the ADMIN_PASSWORD_HASH secret for the admin dashboard.
 *
 *   npm run admin:hash            # prompts for the password (input hidden)
 *
 * The output uses the same PBKDF2-HMAC-SHA256 format as server/crypto.ts:
 *   pbkdf2_sha256$100000$<salt>$<hash>
 * The plaintext password is never written anywhere. Store only the hash,
 * as a Cloudflare Pages secret — never commit it.
 */
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const ITERATIONS = 100_000;
const b64url = (b) => Buffer.from(b).toString('base64url');

async function hash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return `pbkdf2_sha256$${ITERATIONS}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`;
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
if (password.length < 12) {
  console.error('Use at least 12 characters.');
  process.exit(1);
}
console.log(await hash(password));
