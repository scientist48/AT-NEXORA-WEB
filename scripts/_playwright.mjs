/** Resolve Playwright from the project if installed, otherwise from the global npm root. */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  pw = require(path.join(globalRoot, 'playwright'));
}
export const chromium = pw.chromium;
