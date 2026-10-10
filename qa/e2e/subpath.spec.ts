import { expect, test } from '@playwright/test';
import { SEL, dumpTestIds, trackCrossOrigin } from './helpers';

/**
 * Sub-path hosting check (GitHub Pages project sites live at /<repo>/).
 * Requires QA_SUBPATH_URL, e.g. http://127.0.0.1:4180/lumen-research-workbench/#/leaderboard
 * Start the server with: node scripts/serve-subpath.mjs 4180 lumen-research-workbench
 * Target Pages site (not yet deployed): https://fpj5085.github.io/lumen-research-workbench/
 * Skipped (with an explicit reason) when QA_SUBPATH_URL is not provided.
 */

const subpathURL = process.env.QA_SUBPATH_URL;

test.describe('sub-path hosting', () => {
  test.skip(!subpathURL, 'QA_SUBPATH_URL not set - sub-path check skipped by configuration');

  test('hash deep-link, assets and refresh work under a repository sub-path', async ({ page }) => {
    const external: string[] = [];
    trackCrossOrigin(page, external, subpathURL as string);

    const failures: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`);
    });

    // Direct deep link (not a click-through) to a nested hash route.
    await page.goto(subpathURL as string, { waitUntil: 'load' });
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 15_000 });

    const ids = await dumpTestIds(page);
    expect(ids.length, 'app should render under the sub-path').toBeGreaterThan(0);
    expect(failures, `failed asset loads: ${failures.join(', ')}`).toEqual([]);

    // Reload the same deep link (hash routing must not require a server rewrite).
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 15_000 });

    // Navigate to the leaderboard via hash and confirm rows render.
    await page.evaluate(() => {
      window.location.hash = '#/leaderboard';
    });
    await expect(page.locator(SEL.leaderboardRow[0]).first()).toBeVisible({ timeout: 15_000 });

    expect(external, `cross-origin requests: ${external.join(', ')}`).toEqual([]);
  });
});
