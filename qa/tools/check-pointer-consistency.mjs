#!/usr/bin/env node
/**
 * Reviewer-owned bounded check: after a successful run advances the published pointer,
 * the home hero mini-diagram must not keep showing a stale hard-coded snapshot id.
 *
 * Compares three observable values on the home page after a `normal` run:
 *   1. home-stage-pointer-figure  (hero mini-diagram text)
 *   2. home-stat-release-version  (home stat list)
 *   3. tasks-pointer-release      (tasks page pointer)
 *
 * Usage: node qa/tools/check-pointer-consistency.mjs
 */
import { chromium } from 'playwright-core';

const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:4173';
const channel = process.env.QA_BROWSER_CHANNEL ?? 'msedge';
const ID = /demo-snapshot-\d+|snapshot-[\w.-]+/;

const browser = await chromium.launch({ channel });
let exitCode = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const homePointer = async () => {
    await page.goto(`${origin}/#/`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="home-stage-pointer-figure"]');
    // Preferred: the explicit data-pointer attribute. Fall back to parsing the SVG
    // text so the check still works if the attribute is ever renamed.
    const attr = await page
      .locator('[data-testid="home-stage-pointer-release"]')
      .getAttribute('data-pointer')
      .catch(() => null);
    // <svg> is not an HTMLElement, so innerText() is unavailable; read textContent.
    const svgText = (await page.locator('[data-testid="home-stage-pointer-figure"]').textContent()) ?? '';
    const stat = (await page.locator('[data-testid="home-stat-release-version"]').innerText()).trim();
    return { svg: attr ?? (svgText.match(ID) ?? [null])[0], stat };
  };

  const before = await homePointer();
  console.log(`[pointer] before run: figure=${before.svg} home-stat=${before.stat}`);

  await page.goto(`${origin}/#/tasks`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="tasks-scenario-select"]');
  await page.selectOption('[data-testid="tasks-scenario-select"]', 'normal');
  await page.click('[data-testid="tasks-run"]');
  await page.waitForFunction(
    () => document.querySelector('[data-testid="tasks-gate-verdict"]')?.getAttribute('data-verdict') === 'SUCCESS',
    undefined,
    { timeout: 30_000 },
  );
  const tasksPointer = (await page.locator('[data-testid="tasks-pointer-release"]').innerText()).trim();

  const after = await homePointer();
  console.log(`[pointer] after  run: figure=${after.svg} home-stat=${after.stat} tasks-pointer=${tasksPointer}`);

  const mismatches = [];
  if (after.svg !== after.stat) mismatches.push(`hero figure "${after.svg}" != home stat "${after.stat}"`);
  if (after.stat !== tasksPointer) mismatches.push(`home stat "${after.stat}" != tasks pointer "${tasksPointer}"`);

  if (mismatches.length) {
    console.log(`[pointer] RESULT: INCONSISTENT -> ${mismatches.join(' ; ')}`);
    exitCode = 1;
  } else {
    console.log(`[pointer] RESULT: CONSISTENT at ${after.stat}`);
  }
  await context.close();
} finally {
  await browser.close();
}
process.exit(exitCode);
