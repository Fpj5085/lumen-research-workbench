import { expect, test } from '@playwright/test';
import { SEL, expectNoHorizontalOverflow, gotoHash, resolve, trackCrossOrigin } from './helpers';

test.describe('mobile 390 flow', () => {
  test('home renders without full-page horizontal overflow', async ({ page }) => {
    const external: string[] = [];
    trackCrossOrigin(page, external);
    await gotoHash(page, '#/');
    await expect(await resolve(page, 'page-home', SEL.pageHome)).toBeVisible();
    await expect(await resolve(page, 'disclaimer', SEL.disclaimer)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: 'results/shot-mobile-home.png', fullPage: true });
    expect(external, `cross-origin requests: ${external.join(', ')}`).toEqual([]);
  });

  test('leaderboard stays usable and overflow-free on 390px', async ({ page }) => {
    await gotoHash(page, '#/leaderboard');
    await expect(await resolve(page, 'page-leaderboard', SEL.pageLeaderboard)).toBeVisible();
    await expect(page.locator(SEL.leaderboardRow[0]).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('tasks: blocked run works on 390px', async ({ page }) => {
    await gotoHash(page, '#/tasks');
    await (await resolve(page, 'scenario-select', SEL.scenarioSelect)).selectOption('research_failed');
    await (await resolve(page, 'run-button', SEL.runButton)).click();
    await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toHaveAttribute('data-verdict', 'BLOCKED', {
      timeout: 30_000,
    });
    await expect(await resolve(page, 'latest-unpublished', SEL.latestUnpublished)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: 'results/shot-mobile-blocked.png', fullPage: true });
  });

  test('stock detail chart fits the viewport', async ({ page }) => {
    await gotoHash(page, '#/stock/DEMO007');
    await expect(await resolve(page, 'page-stock', SEL.pageStock)).toBeVisible({ timeout: 15_000 });
    await expect(await resolve(page, 'chart-svg', SEL.stockChartSvg)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
