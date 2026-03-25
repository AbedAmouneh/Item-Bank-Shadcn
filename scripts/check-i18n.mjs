/**
 * check-i18n.mjs
 *
 * Compares every translation namespace in public/locales/en/ against
 * public/locales/ar/ and reports any keys that are missing in either direction.
 *
 * Usage:
 *   node scripts/check-i18n.mjs
 *   pnpm check-i18n
 *
 * Exit code 0 → all namespaces are complete.
 * Exit code 1 → at least one key is missing somewhere.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../public/locales');
const enDir = join(localesDir, 'en');
const arDir = join(localesDir, 'ar');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Recursively walks a nested object and returns every leaf key as a
 * dot-separated path string. Empty objects are also reported as leaves so
 * completely untranslated sections are visible.
 *
 * Example: { nav: { home: "Home" } } → ["nav.home"]
 */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const children = flattenKeys(v, full);
      if (children.length === 0) {
        // Empty object — report the parent path itself
        keys.push(full);
      } else {
        keys.push(...children);
      }
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

// ANSI colour helpers (no deps)
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const dim    = (s) => `\x1b[2m${s}\x1b[0m`;

// ─── main ────────────────────────────────────────────────────────────────────

// Gather all namespaces from the EN folder (EN is the source of truth).
const namespaces = readdirSync(enDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''))
  .sort();

// Also check whether AR has extra namespaces EN doesn't know about.
const arNamespaces = existsSync(arDir)
  ? readdirSync(arDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
  : [];

const allNamespaces = [...new Set([...namespaces, ...arNamespaces])].sort();

let totalMissingInAr = 0;
let totalMissingInEn = 0;
let totalKeys = 0;

console.log(bold('\n🌐  i18n Key Checker — EN ↔ AR\n'));
console.log(dim('─'.repeat(55)));

for (const ns of allNamespaces) {
  const enPath = join(enDir, `${ns}.json`);
  const arPath = join(arDir, `${ns}.json`);

  const enData = loadJson(enPath);
  const arData = loadJson(arPath);

  if (!enData && !arData) {
    console.log(red(`\n❌  ${ns}.json — could not read either language file`));
    continue;
  }

  const enKeys = enData ? new Set(flattenKeys(enData)) : new Set();
  const arKeys = arData ? new Set(flattenKeys(arData)) : new Set();

  const missingInAr = [...enKeys].filter((k) => !arKeys.has(k)).sort();
  const missingInEn = [...arKeys].filter((k) => !enKeys.has(k)).sort();

  totalMissingInAr += missingInAr.length;
  totalMissingInEn += missingInEn.length;
  totalKeys += enKeys.size;

  const nsLabel = bold(`📁  ${ns}.json`);
  const stats = dim(`EN: ${enKeys.size} keys  |  AR: ${arKeys.size} keys`);
  console.log(`\n${nsLabel}  ${stats}`);

  if (!enData) {
    console.log(yellow('   ⚠️  No EN file — skipping'));
    continue;
  }
  if (!arData) {
    console.log(red(`   ❌  AR file is missing entirely (${enKeys.size} keys untranslated)`));
    missingInAr.forEach((k) => console.log(red(`      - ${k}`)));
    continue;
  }

  if (missingInAr.length === 0 && missingInEn.length === 0) {
    console.log(green('   ✅  All keys match'));
  }

  if (missingInAr.length > 0) {
    console.log(red(`   ❌  Missing in AR (${missingInAr.length}):`));
    missingInAr.forEach((k) => console.log(red(`      - ${k}`)));
  }

  if (missingInEn.length > 0) {
    console.log(yellow(`   ⚠️  Extra in AR / not in EN (${missingInEn.length}):`));
    missingInEn.forEach((k) => console.log(yellow(`      + ${k}`)));
  }
}

// ─── summary ────────────────────────────────────────────────────────────────

console.log(`\n${dim('─'.repeat(55))}`);
console.log(bold('Summary'));
console.log(`  Total EN keys checked : ${totalKeys}`);
console.log(
  `  Missing in AR         : ${totalMissingInAr === 0 ? green('0 ✅') : red(String(totalMissingInAr))}`
);
console.log(
  `  Extra in AR / not EN  : ${totalMissingInEn === 0 ? green('0 ✅') : yellow(String(totalMissingInEn))}`
);

if (totalMissingInAr === 0 && totalMissingInEn === 0) {
  console.log(green(bold('\n🎉  All translations are complete!\n')));
  process.exit(0);
} else {
  console.log(red(bold('\n💥  Translation gaps found — see above.\n')));
  process.exit(1);
}
