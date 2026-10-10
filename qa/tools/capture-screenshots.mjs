#!/usr/bin/env node
/**
 * Reviewer-owned screenshot capture for the curated docs/screenshots/ set.
 *
 * These are freshly rendered captures of the DEMO's own synthetic UI. They are not
 * re-used assets from any private project. Requires the built static preview to be
 * serving at QA_ORIGIN (default http://127.0.0.1:4173).
 *
 * Usage: node qa/tools/capture-screenshots.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'docs', 'screenshots');
const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:4173';
const channel = process.env.QA_BROWSER_CHANNEL ?? 'msedge';

mkdirSync(outDir, { recursive: true });

const shots = [
  { file: 'desktop-home.png', hash: '#/', viewport: { width: 1440, height: 900 } },
  { file: 'desktop-leaderboard.png', hash: '#/leaderboard', viewport: { width: 1440, height: 900 } },
  { file: 'desktop-stock-detail.png', hash: '#/stock/DEMO007', viewport: { width: 1440, height: 900 } },
  { file: 'desktop-watchlist.png', hash: '#/watchlist', viewport: { width: 1440, height: 900 } },
  { file: 'desktop-history.png', hash: '#/history', viewport: { width: 1440, height: 900 } },
  { file: 'desktop-engineering.png', hash: '#/engineering', viewport: { width: 1440, height: 900 } },
  { file: 'mobile-home-390.png', hash: '#/', viewport: { width: 390, height: 844 } },
  { file: 'mobile-tasks-390.png', hash: '#/tasks', viewport: { width: 390, height: 844 } },
];

const browser = await chromium.launch({ channel });
try {
  for (const shot of shots) {
    const context = await browser.newContext({ viewport: shot.viewport, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(`${origin}/${shot.hash}`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15_000 });
    await page.waitForTimeout(250);
    const path = resolve(outDir, shot.file);
    await page.screenshot({ path, fullPage: true });
    console.log(`[shot] ${shot.file} <- ${shot.hash}`);
    await context.close();
  }

  // Blocked-publish capture: drive the tasks page to a BLOCKED verdict, then shoot.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${origin}/#/tasks`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="tasks-scenario-select"]');
  await page.selectOption('[data-testid="tasks-scenario-select"]', 'research_failed');
  await page.click('[data-testid="tasks-run"]');
  await page.waitForSelector('[data-testid="tasks-latest-unpublished"]', { timeout: 30_000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="tasks-gate-verdict"]')?.getAttribute('data-verdict') === 'BLOCKED',
    undefined,
    { timeout: 30_000 },
  );
  await page.screenshot({ path: resolve(outDir, 'desktop-tasks-blocked.png'), fullPage: true });
  console.log('[shot] desktop-tasks-blocked.png <- #/tasks (research_failed -> BLOCKED)');
  await context.close();
} finally {
  await browser.close();
}

console.log(`[shot] written to ${outDir}`);
