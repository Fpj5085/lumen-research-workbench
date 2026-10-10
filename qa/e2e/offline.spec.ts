import { expect, test } from '@playwright/test';
import { SEL, gotoHash, resolve } from './helpers';

/**
 * Two distinct offline properties are verified separately:
 *
 *  A. "external internet blocked, local static origin still reachable" — every request
 *     whose host is not the QA origin (and not a browser-internal scheme) is aborted at
 *     the network layer, yet the page must load and stay interactive. This proves the
 *     site does not depend on any third-party host (CDN, font, market-data, AI, telemetry).
 *
 *  B. "page already loaded, then the browser goes fully offline" — after a successful
 *     load the context is switched to offline; in-page interactions must keep working
 *     from already-loaded assets and local state. A subsequent hard reload is NOT a
 *     requirement (this is not a PWA) and is only recorded, not asserted.
 */

test.describe('offline behaviour', () => {
  test('A: third-party hosts blocked, local origin still serves the app', async ({ page, context }) => {
    const origin = new URL(process.env.QA_ORIGIN ?? 'http://127.0.0.1:4173').origin;
    const blocked: string[] = [];

    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) {
        return route.continue();
      }
      let sameOrigin = false;
      try {
        sameOrigin = new URL(url).origin === origin;
      } catch {
        sameOrigin = false;
      }
      if (sameOrigin) return route.continue();
      blocked.push(url);
      return route.abort('failed');
    });

    await gotoHash(page, '#/');
    await expect(await resolve(page, 'disclaimer', SEL.disclaimer)).toBeVisible();
    await gotoHash(page, '#/leaderboard');
    await expect(page.locator(SEL.leaderboardRow[0]).first()).toBeVisible();
    await gotoHash(page, '#/tasks');
    const select = await resolve(page, 'scenario-select', SEL.scenarioSelect);
    await select.selectOption({ value: 'research_failed' }).catch(async () => {
      await select.selectOption({ label: /research/i });
    });
    await (await resolve(page, 'run-button', SEL.runButton)).click();
    await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toBeVisible({ timeout: 30_000 });

    // Record the blocked third-party hosts (informational; not necessarily fatal on its own).
    // eslint-disable-next-line no-console
    console.log('QA_OFFLINE_A_BLOCKED_HOSTS=' + JSON.stringify(blocked));
  });

  test('B: after load, browser offline still interactive (no reload required)', async ({ page, context }) => {
    await gotoHash(page, '#/');
    await expect(await resolve(page, 'disclaimer', SEL.disclaimer)).toBeVisible();

    await context.setOffline(true);
    try {
      // In-page navigation (hash routing) must still work with no network at all.
      await page.evaluate(() => {
        window.location.hash = '#/leaderboard';
      });
      await expect(page.locator(SEL.leaderboardRow[0]).first()).toBeVisible({ timeout: 15_000 });

      await page.evaluate(() => {
        window.location.hash = '#/tasks';
      });
      const select = await resolve(page, 'scenario-select', SEL.scenarioSelect);
      await select.selectOption({ value: 'version_mismatch' }).catch(async () => {
        await select.selectOption({ label: /version/i });
      });
      await (await resolve(page, 'run-button', SEL.runButton)).click();
      await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toBeVisible({ timeout: 30_000 });

      // Informational only: a hard reload while offline is not a required capability.
      const reloadResult = await page
        .reload({ timeout: 8_000 })
        .then(() => 'RELOAD_OK')
        .catch((e: Error) => `RELOAD_FAILED(${e.message.split('\n')[0]})`);
      // eslint-disable-next-line no-console
      console.log('QA_OFFLINE_B_RELOAD=' + reloadResult);
    } finally {
      await context.setOffline(false);
    }
  });
});
