import { expect, test } from '@playwright/test';
import { SEL, expectNoHorizontalOverflow, gotoHash, resolve, trackCrossOrigin } from './helpers';

test.describe('desktop flow', () => {
  test('home: loads with disclaimer, highlights and published state', async ({ page }) => {
    const external: string[] = [];
    trackCrossOrigin(page, external);
    await gotoHash(page, '#/');
    await expect(await resolve(page, 'page-home', SEL.pageHome)).toBeVisible();
    await expect(await resolve(page, 'disclaimer', SEL.disclaimer)).toBeVisible();
    for (const id of SEL.highlights) {
      await expect(page.locator(id)).toHaveCount(1);
    }
    const releaseState = await resolve(page, 'home-release-state', SEL.homeReleaseState);
    await expect(releaseState).toHaveAttribute('data-published', /true|false/);
    await expect(await resolve(page, 'data-date', SEL.homeStatDataDate)).toBeVisible();
    await expect(await resolve(page, 'release-version', SEL.homeStatReleaseVersion)).toBeVisible();
    expect(external, `cross-origin requests on home: ${external.join(', ')}`).toEqual([]);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: 'results/shot-desktop-home.png', fullPage: true });
  });

  test('leaderboard: filter, sort, paginate, open detail, chart, watch', async ({ page }) => {
    const external: string[] = [];
    trackCrossOrigin(page, external);
    await gotoHash(page, '#/leaderboard');
    await expect(await resolve(page, 'page-leaderboard', SEL.pageLeaderboard)).toBeVisible();

    const rows = page.locator(SEL.leaderboardRow[0]);
    await expect(rows.first()).toBeVisible();
    const count = await resolve(page, 'leaderboard-count', SEL.leaderboardCount);
    await expect(count).toHaveAttribute('data-total', /\d+/);
    const total = Number(await count.getAttribute('data-total'));
    expect(total, 'synthetic universe should be positive').toBeGreaterThan(0);
    expect(await rows.count(), 'default page size is 20').toBeLessThanOrEqual(20);

    const next = await resolve(page, 'page-next', SEL.pageNext);
    if (await next.isEnabled()) {
      await next.click();
      await page.waitForTimeout(200);
      await expect(await resolve(page, 'page-indicator', SEL.pageIndicator)).toHaveAttribute('data-page', '2');
      await (await resolve(page, 'page-prev', SEL.pagePrev)).click();
      await page.waitForTimeout(200);
    }

    const sortKey = await resolve(page, 'sort-key', SEL.sortKey);
    const beforeOrder = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-symbol')));
    await sortKey.selectOption('changePct');
    await page.waitForTimeout(200);
    await (await resolve(page, 'sort-dir', SEL.sortDir)).click();
    await page.waitForTimeout(200);
    const afterOrder = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-symbol')));
    expect(afterOrder.join(','), 'changing sort key+direction should reorder rows').not.toBe(beforeOrder.join(','));

    const search = await resolve(page, 'filter-search', SEL.filterSearch);
    await search.fill('DEMO001');
    await page.waitForTimeout(200);
    const matched = Number(await count.getAttribute('data-matched'));
    expect(matched, 'filtering by a single symbol should narrow the result set').toBeLessThan(total);
    await search.fill('ZZZ-NO-SUCH-SYMBOL');
    await page.waitForTimeout(200);
    await expect(await resolve(page, 'leaderboard-empty', SEL.leaderboardEmpty)).toBeVisible();
    await (await resolve(page, 'filter-reset', SEL.filterReset)).click();
    await page.waitForTimeout(200);
    await expect(page.locator(SEL.leaderboardEmpty[0])).toHaveCount(0);

    await (await resolve(page, 'detail-link', SEL.detailLink)).first().click();
    await expect(await resolve(page, 'page-stock', SEL.pageStock)).toBeVisible({ timeout: 15_000 });
    const svg = await resolve(page, 'chart-svg', SEL.stockChartSvg);
    await expect(svg).toBeVisible();
    const bars = Number(await svg.getAttribute('data-bars'));
    expect(bars, 'chart should render a non-empty bar series').toBeGreaterThan(0);

    await (await resolve(page, 'range-60', SEL.stockRange('60'))).click();
    await page.waitForTimeout(200);
    await expect(page.locator(SEL.stockRange('60')[0])).toHaveAttribute('aria-pressed', 'true');

    const add = await resolve(page, 'add-watch', SEL.watchAdd);
    if (await add.isEnabled()) {
      await add.click();
      await page.waitForTimeout(200);
    }
    await expect(await resolve(page, 'watch-state', SEL.watchState)).toHaveAttribute('data-watching', 'true');

    await gotoHash(page, '#/watchlist');
    await expect(await resolve(page, 'page-watchlist', SEL.pageWatchlist)).toBeVisible();
    await expect(await resolve(page, 'watchlist-list', SEL.watchList)).toBeVisible();
    await expect(await resolve(page, 'holdings-panel', SEL.holdingsPanel)).toBeVisible();
    expect(await page.locator(SEL.holdingItem[0]).count(), '3 synthetic holdings').toBe(3);

    expect(external, `cross-origin requests: ${external.join(', ')}`).toEqual([]);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: 'results/shot-desktop-watchlist.png', fullPage: true });
  });

  for (const [scenario, expectedCode] of [
    ['normal', 'OK'],
    ['research_failed', 'RESEARCH_INCOMPLETE'],
    ['version_mismatch', 'VERSION_MISMATCH'],
    ['data_failed', 'DATA_VALIDATION_FAILED'],
  ] as const) {
    test(`task scenario ${scenario}: verdict, pointer invariant, latest region`, async ({ page }) => {
      const external: string[] = [];
      trackCrossOrigin(page, external);
      await gotoHash(page, '#/tasks');
      await expect(await resolve(page, 'page-tasks', SEL.pageTasks)).toBeVisible();

      const pointer = await resolve(page, 'pointer-release', SEL.tasksPointerRelease);
      const pointerBefore = (await pointer.innerText()).trim();

      await (await resolve(page, 'scenario-select', SEL.scenarioSelect)).selectOption(scenario);
      await (await resolve(page, 'run-button', SEL.runButton)).click();

      const verdict = await resolve(page, 'gate-verdict', SEL.gateVerdict);
      await expect(verdict).toBeVisible({ timeout: 30_000 });
      await expect(verdict).toHaveAttribute('data-code', expectedCode);
      await expect(verdict).toHaveAttribute('data-verdict', scenario === 'normal' ? 'SUCCESS' : 'BLOCKED');

      if (scenario === 'normal') {
        await expect(await resolve(page, 'latest-published', SEL.latestPublished)).toBeVisible();
        await expect(page.locator(SEL.latestUnpublished[0])).toHaveCount(0);
      } else {
        await expect(await resolve(page, 'latest-unpublished', SEL.latestUnpublished)).toBeVisible();
        await expect(page.locator(SEL.latestPublished[0])).toHaveCount(0);
        const pointerAfter = (await pointer.innerText()).trim();
        expect(pointerAfter, `published pointer must not advance on ${scenario}`).toBe(pointerBefore);
        await page.screenshot({ path: `results/shot-desktop-blocked-${scenario}.png`, fullPage: true });
      }
      expect(external, `cross-origin requests: ${external.join(', ')}`).toEqual([]);
      await expectNoHorizontalOverflow(page);
    });
  }

  test('blocked run keeps leaderboard on the old published data date', async ({ page }) => {
    await gotoHash(page, '#/leaderboard');
    const dataDate = await resolve(page, 'leaderboard-data-date', SEL.leaderboardDataDate);
    const dateBefore = (await dataDate.innerText()).trim();

    await gotoHash(page, '#/tasks');
    await (await resolve(page, 'scenario-select', SEL.scenarioSelect)).selectOption('research_failed');
    await (await resolve(page, 'run-button', SEL.runButton)).click();
    await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toHaveAttribute('data-verdict', 'BLOCKED', {
      timeout: 30_000,
    });

    await gotoHash(page, '#/leaderboard');
    await expect(await resolve(page, 'leaderboard-unpublished', SEL.leaderboardUnpublished)).toBeVisible();
    await expect(await resolve(page, 'historical-note', SEL.leaderboardHistoricalNote)).toBeVisible();
    const dateAfter = (await (await resolve(page, 'leaderboard-data-date', SEL.leaderboardDataDate)).innerText()).trim();
    expect(dateAfter, 'leaderboard must keep serving the last published data date').toBe(dateBefore);
  });

  test('normal run advances the leaderboard to the new release', async ({ page }) => {
    await gotoHash(page, '#/leaderboard');
    const release = await resolve(page, 'leaderboard-release-version', SEL.leaderboardReleaseVersion);
    const releaseBefore = (await release.innerText()).trim();
    const dateBefore = (
      await (await resolve(page, 'leaderboard-data-date', SEL.leaderboardDataDate)).innerText()
    ).trim();

    await gotoHash(page, '#/tasks');
    await (await resolve(page, 'scenario-select', SEL.scenarioSelect)).selectOption('normal');
    await (await resolve(page, 'run-button', SEL.runButton)).click();
    await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toHaveAttribute('data-verdict', 'SUCCESS', {
      timeout: 30_000,
    });
    await gotoHash(page, '#/leaderboard');
    // Assert the *behaviour* (pointer advanced to a new release/date) rather than any
    // hard-coded release id, so identifier renames cannot silently invalidate this test.
    const releaseAfter = (
      await (await resolve(page, 'leaderboard-release-version', SEL.leaderboardReleaseVersion)).innerText()
    ).trim();
    const dateAfter = (
      await (await resolve(page, 'leaderboard-data-date', SEL.leaderboardDataDate)).innerText()
    ).trim();
    expect(releaseAfter, 'a successful run must advance the published release id').not.toBe(releaseBefore);
    expect(dateAfter, 'a successful run must advance the published data date').not.toBe(dateBefore);
    await expect(page.locator(SEL.leaderboardUnpublished[0])).toHaveCount(0);
  });

  test('history page always labels snapshots as historical / not latest', async ({ page }) => {
    await gotoHash(page, '#/history');
    await expect(await resolve(page, 'page-history', SEL.pageHistory)).toBeVisible();
    const items = page.locator(SEL.historySnapshotItem[0]);
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);
    const badges = page.locator(SEL.historyNotLatestBadge[0]);
    expect(await badges.count(), 'every snapshot row must carry the historical badge').toBe(await items.count());
  });

  test('reset restores the initial state after a blocked run', async ({ page }) => {
    await gotoHash(page, '#/tasks');
    const pointer = await resolve(page, 'pointer-release', SEL.tasksPointerRelease);
    const pointerBefore = (await pointer.innerText()).trim();
    const runId = await resolve(page, 'run-id', SEL.runId);
    await (await resolve(page, 'scenario-select', SEL.scenarioSelect)).selectOption('version_mismatch');
    await (await resolve(page, 'run-button', SEL.runButton)).click();
    await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toHaveAttribute('data-verdict', 'BLOCKED', {
      timeout: 30_000,
    });
    await (await resolve(page, 'reset-button', SEL.resetButton)).click();
    await page.waitForTimeout(300);

    // After reset the contract returns to the *pre-run* state: verdict PENDING, a fresh
    // run id, and a latest region that reads "未发布（尚未运行）" rather than a block reason.
    await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toHaveAttribute('data-verdict', 'PENDING');
    await expect(runId).toHaveText(/run-0000/);
    await expect(await resolve(page, 'latest-unpublished', SEL.latestUnpublished)).toContainText('尚未运行');
    await expect(page.locator(SEL.latestPublished[0])).toHaveCount(0);
    expect((await pointer.innerText()).trim(), 'reset must not change the published pointer').toBe(pointerBefore);
    await expectNoHorizontalOverflow(page);
  });

  test('repeated blocked runs stay idempotent (no phantom publish)', async ({ page }) => {
    await gotoHash(page, '#/tasks');
    const pointer = await resolve(page, 'pointer-release', SEL.tasksPointerRelease);
    const pointerBefore = (await pointer.innerText()).trim();
    for (let i = 0; i < 3; i += 1) {
      await (await resolve(page, 'scenario-select', SEL.scenarioSelect)).selectOption('research_failed');
      await (await resolve(page, 'run-button', SEL.runButton)).click();
      await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toHaveAttribute('data-verdict', 'BLOCKED', {
        timeout: 30_000,
      });
    }
    expect((await pointer.innerText()).trim(), 'repeated blocked runs must not advance the pointer').toBe(pointerBefore);
    await expect(await resolve(page, 'latest-unpublished', SEL.latestUnpublished)).toBeVisible();
  });

  test('unknown hash falls back to the home page', async ({ page }) => {
    await gotoHash(page, '#/no-such-route');
    await expect(await resolve(page, 'page-home', SEL.pageHome)).toBeVisible();
  });
});
