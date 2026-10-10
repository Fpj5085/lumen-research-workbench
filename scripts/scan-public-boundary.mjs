#!/usr/bin/env node
/**
 * Reviewer-owned public-boundary scanner for the demo tree.
 *
 * It reports ONLY path + line + category. It never prints the matched value, so a
 * finding cannot leak a credential into a public report or into this tool output.
 *
 * Usage: node scripts/scan-public-boundary.mjs [rootDir] [--json out.json]
 *
 * LIMITS (stated explicitly, not a blanket guarantee):
 *  - Regex/entropy heuristics only; they cannot prove the absence of secrets.
 *  - Only scans the working tree; it does not read git history, packed objects,
 *    ignored/untracked artefacts outside the tree, or binary internals.
 *  - Binary files are inventoried (size/hash) but not content-scanned.
 *  - A clean report means "no known pattern matched", not "certified safe to publish".
 */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd();
const jsonFlag = process.argv.indexOf('--json');
const jsonOut = jsonFlag >= 0 ? process.argv[jsonFlag + 1] : null;

const SKIP_DIRS = new Set([
  'node_modules',
  '.venv',
  'venv',
  // Reviewer-only pip-audit toolchain (public tool, never published).
  '.audit-venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.git',
  'test-results',
  'playwright-report',
  // Local verification receipts keep absolute machine paths and are never published;
  // they are listed as non-public artefacts in docs/public-file-manifest.md instead.
  '.local-verification',
]);

// The scanner's own rule table necessarily contains the very patterns it hunts for.
const SKIP_FILES = new Set(['scripts/scan-public-boundary.mjs']);

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss',
  '.html', '.htm', '.md', '.txt', '.yml', '.yaml', '.toml', '.ini', '.cfg',
  '.py', '.sh', '.ps1', '.bat', '.cmd', '.env', '.example', '.gitignore',
  '.svg', '.xml', '.map', '.lock', '.editorconfig', '.npmrc',
]);

// Each rule: category + regex. Values are never emitted.
const RULES = [
  { category: 'secret:private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { category: 'secret:aws-access-key-id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { category: 'secret:github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { category: 'secret:slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { category: 'secret:openai-style-key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { category: 'secret:google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { category: 'secret:jwt-literal', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { category: 'secret:assigned-credential', re: /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|pwd)\s*[:=]\s*["'][^"'\s]{8,}["']/i },
  { category: 'secret:connection-string', re: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|mssql):\/\/[^\s:@/]+:[^\s:@/]+@/i },
  { category: 'secret:basic-auth-header', re: /Authorization\s*:\s*Basic\s+[A-Za-z0-9+/=]{12,}/i },
  { category: 'net:absolute-http-url', re: /https?:\/\/[A-Za-z0-9.-]+/ },
  { category: 'net:ws-url', re: /wss?:\/\/[A-Za-z0-9.-]+/ },
  { category: 'net:nonstandard-host-port', re: /\b(?:localhost|127\.0\.0\.1):(?!5173\b|4173\b|8001\b|4180\b)\d{2,5}\b/ },
  { category: 'private:source-project-name', re: /stock-monitor(?!-demo)/ },
  { category: 'private:workspace-path', re: /Gu Piao|D:[\\/]{1,2}Gu/ },
  { category: 'private:handoff-artifact', re: /HANDOFF|AI_CONTEXT|OPENCODE_DEBUG|CURRENT_STATE|NEXT_ACTION|phase5c|phase4|phase2g|stage2b/i },
  { category: 'private:strategy-naming', re: /出水芙蓉|峰回路转|龙战于野|否极泰来|事不过三|亢龙有悔|神龙摆尾|鱼跃龙门|七星落长空|死灰复燃|柳暗花明|一箭双雕|梯云纵|羽黑八法|葛氏八法|买一|买二|卖一|卖二/ },
  { category: 'real:ashare-6digit-code', re: /(?<![0-9A-Za-z.])(?:60|68|00|30|43|83|87|92)\d{4}(?![0-9A-Za-z])/ },
  { category: 'real:index-code', re: /(?<![0-9A-Za-z.])(?:000001|399001|399006|000300|000905)(?![0-9A-Za-z])/ },
  {
    category: 'real:company-suffix',
    re: /(?:股份|集团有限公司|证券|基金管理有限公司)/,
    // Prose about scanning ("真实证券标识", "证券代码", "上市公司名称") is not a
    // company name; without this guard the scanner flags its own documentation.
    unless: /真实证券|证券标识|证券代码|上市公司名称|公司后缀/,
  },
  { category: 'personal:cn-id-number', re: /(?<![0-9])\d{17}[0-9Xx](?![0-9])/ },
  { category: 'personal:cn-mobile', re: /(?<![0-9])1[3-9]\d{9}(?![0-9])/ },
  { category: 'personal:email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

// Hosts that are legitimate in a purely local static demo.
const ALLOWED_HOSTS = new Set([
  'localhost', '127.0.0.1', '::1',
  // `http://demo` is an httpx ASGITransport base_url placeholder used by the test
  // suite; it never resolves or performs network I/O.
  'demo',
  'www.w3.org', 'w3.org',
  'react.dev', 'reactjs.org',
  'vitejs.dev', 'vitest.dev', 'playwright.dev', 'nodejs.org',
  'github.com', 'docs.github.com', 'pages.github.com',
  'registry.npmjs.org', 'npmjs.com',
  'developer.mozilla.org', 'mdn.mozilla.org',
  'json-schema.org', 'schema.org',
]);

// RFC 2606 / RFC 6761 reserved names are guaranteed non-routable and are used
// deliberately as test fixtures (e.g. an Origin header in a CORS assertion).
const RESERVED_TLDS = ['.example', '.invalid', '.test', '.localhost', '.example.com', '.example.org', '.example.net'];
function isReservedHost(host) {
  return RESERVED_TLDS.some((tld) => host === tld.slice(1) || host.endsWith(tld));
}

const findings = [];
const symlinks = [];
const binaries = [];
const fileCount = { text: 0, binary: 0 };
let totalBytes = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    let st;
    try {
      st = lstatSync(abs);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) {
      symlinks.push(relative(root, abs).split(sep).join('/'));
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      const relDir = relative(root, abs).split(sep).join('/');
      // QA raw receipts / screenshots are reviewer-owned and excluded from the public
      // manifest; scanning them would also make the report self-referential.
      if (relDir === 'qa/results') continue;
      walk(abs);
      continue;
    }
    if (!st.isFile()) continue;
    totalBytes += st.size;
    const rel = relative(root, abs).split(sep).join('/');
    const ext = extname(name).toLowerCase();
    if (SKIP_FILES.has(rel)) continue;
    // Lockfiles legitimately carry registry/opencollective donation URLs; they are
    // dependency metadata, not site egress. Recorded but not treated as site findings.
    const isLockfile = /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock)$/.test(rel);
    const isText = TEXT_EXT.has(ext) || !ext;
    if (!isText) {
      fileCount.binary += 1;
      binaries.push({
        path: rel,
        bytes: st.size,
        sha256: createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 16),
      });
      continue;
    }
    fileCount.text += 1;
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (content.includes('\u0000')) {
      fileCount.text -= 1;
      fileCount.binary += 1;
      binaries.push({ path: rel, bytes: st.size, sha256: 'binary-with-nul' });
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (const rule of RULES) {
      for (let i = 0; i < lines.length; i += 1) {
        if (!rule.re.test(lines[i])) continue;
        let allowed = false;
        if (isLockfile && rule.category.startsWith('net:')) allowed = true;
        if (isLockfile && rule.category.startsWith('personal:')) allowed = true;
        if (rule.unless && rule.unless.test(lines[i])) allowed = true;
        if (rule.category === 'net:absolute-http-url' || rule.category === 'net:ws-url') {
          const m = lines[i].match(/https?:\/\/([A-Za-z0-9.-]+)|wss?:\/\/([A-Za-z0-9.-]+)/);
          const host = (m?.[1] ?? m?.[2] ?? '').toLowerCase();
          if (ALLOWED_HOSTS.has(host) || isReservedHost(host)) allowed = true;
        }
        if (allowed) continue;
        findings.push({ category: rule.category, path: rel, line: i + 1 });
      }
    }
  }
}

try {
  if (!statSync(root).isDirectory()) throw new Error('not a directory');
} catch {
  console.error(`[scan] root not found or not a directory: ${root}`);
  process.exit(2);
}
walk(root);

const byCategory = {};
for (const f of findings) byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;

const report = {
  root,
  scannedAt: new Date().toISOString(),
  files: fileCount,
  totalBytes,
  symlinks,
  binaries,
  findingCount: findings.length,
  byCategory,
  findings,
  limitations: [
    'Regex/heuristic scan only; cannot prove absence of secrets or private content.',
    'Working tree only; git history, packed objects and ignored paths outside the tree are not scanned.',
    'Binary files are inventoried by size/hash but not content-scanned.',
    'No network egress test is performed here; see qa/e2e/offline.spec.ts.',
  ],
};

console.log(`[scan] root=${root}`);
console.log(`[scan] text files=${fileCount.text} binary files=${fileCount.binary} bytes=${totalBytes}`);
console.log(`[scan] symlinks/junctions=${symlinks.length} findings=${findings.length}`);
console.log(`[scan] by category: ${JSON.stringify(byCategory)}`);
if (symlinks.length) console.log(`[scan] symlink paths: ${symlinks.join(', ')}`);
for (const f of findings.slice(0, 200)) {
  console.log(`[finding] ${f.category} :: ${f.path}:${f.line}`);
}
if (findings.length > 200) console.log(`[scan] ... ${findings.length - 200} more findings omitted from console (see --json)`);
if (jsonOut) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  console.log(`[scan] json written to ${jsonOut}`);
}
process.exit(findings.length ? 1 : 0);
