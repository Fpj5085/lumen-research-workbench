import { expect, test } from '@playwright/test';
import { SEL, expectNoHorizontalOverflow, gotoHash, resolve, trackCrossOrigin } from './helpers';

/**
 * Reviewer-owned checks for the two-layer portfolio integration:
 * the home page must present BOTH the static in-browser demo and the local Python
 * experiment as distinct layers, and the engineering page must describe the Python
 * lab with its real endpoints/commands/limitations — without ever claiming the two
 * layers call each other, and without any network egress.
 */

test.describe('two-layer integration', () => {
  test('home presents both layers with clickable entry points', async ({ page }) => {
    const external: string[] = [];
    trackCrossOrigin(page, external);
    await gotoHash(page, '#/');

    await expect(await resolve(page, 'layer-static', SEL.layerStatic)).toBeVisible();
    await expect(await resolve(page, 'layer-python', SEL.layerPython)).toBeVisible();
    await expect(await resolve(page, 'hero-figure', SEL.heroFigure)).toBeVisible();
    await expect(await resolve(page, 'stage-pointer-figure', SEL.stagePointerFigure)).toBeVisible();

    // The 1/3/5 path cards must be present and each must carry a working entry point.
    for (const n of ['1', '3', '5']) {
      await expect(await resolve(page, `path-${n}`, SEL.homePath(n))).toBeVisible();
      await expect(await resolve(page, `path-${n}-open`, SEL.homePathOpen(n))).toBeVisible();
    }

    // Static-layer entry point routes to the task demo.
    await (await resolve(page, 'layer-static-open-tasks', SEL.layerStaticOpenTasks)).click();
    await expect(await resolve(page, 'page-tasks', SEL.pageTasks)).toBeVisible({ timeout: 15_000 });

    // Python-layer entry point routes to the engineering page.
    await gotoHash(page, '#/');
    await (await resolve(page, 'layer-python-open-engineering', SEL.layerPythonOpenEngineering)).click();
    await expect(await resolve(page, 'page-engineering', SEL.pageEngineering)).toBeVisible({ timeout: 15_000 });

    expect(external, `cross-origin requests: ${external.join(', ')}`).toEqual([]);
    await expectNoHorizontalOverflow(page);
  });

  test('engineering page documents the real Python lab contract', async ({ page }) => {
    const external: string[] = [];
    trackCrossOrigin(page, external);
    await gotoHash(page, '#/engineering');

    const lab = await resolve(page, 'engineering-python-lab', SEL.engineeringPythonLab);
    await expect(lab).toBeVisible();
    await expect(await resolve(page, 'python-lab-summary', SEL.pythonLabSummary)).toBeVisible();
    await expect(await resolve(page, 'endpoint-table', SEL.pythonLabEndpointTable)).toBeVisible();
    await expect(await resolve(page, 'commands', SEL.pythonLabCommands)).toBeVisible();
    const verification = await resolve(page, 'verification', SEL.pythonLabVerification);
    await expect(verification).toBeVisible();
    await expect(await resolve(page, 'verification-notes', SEL.pythonLabVerificationNotes)).toBeVisible();
    await expect(await resolve(page, 'limitation', SEL.pythonLabLimitation)).toBeVisible();
    await expect(await resolve(page, 'decoupling', SEL.pythonLabDecoupling)).toBeVisible();

    // The documented endpoints must be the real ones.
    const labText = await lab.innerText();
    for (const endpoint of ['/health', '/demo/runs', '/demo/published']) {
      expect(labText, `engineering page should document ${endpoint}`).toContain(endpoint);
    }
    // Idempotency must be stated as a real requirement, not glossed over.
    expect(labText.toLowerCase(), 'the page should mention the idempotency key requirement').toContain('idempotency');

    // The displayed pytest receipt must be the reviewer-verified current one, not the
    // superseded pre-fix value, and the environment/date must match the independent run.
    const verificationText = await verification.innerText();
    expect(verificationText, 'engineering panel must show the current verified pytest receipt').toContain(
      '72 passed, 1 warning in 1.77s',
    );
    expect(verificationText, 'engineering panel must show the verified pytest version').toContain('9.1.1');
    expect(verificationText, 'engineering panel must date the verification').toContain('2026-10-10');
    expect(verificationText, 'the superseded receipt value must no longer be shown').not.toContain('2.50s');

    const notesText = await (await resolve(page, 'verification-notes', SEL.pythonLabVerificationNotes)).innerText();
    expect(notesText, 'notes must state the warning is third-party, not zero-warning').toMatch(/第三方|不是「零告警」/);

    expect(external, `cross-origin requests: ${external.join(', ')}`).toEqual([]);
    await expectNoHorizontalOverflow(page);
  });

  test('static layer never contacts the Python service', async ({ page }) => {
    const external: string[] = [];
    const nonLocal: string[] = [];
    trackCrossOrigin(page, external);
    page.on('request', (req) => {
      const url = req.url();
      // The Python lab runs on loopback port 8001; the static site must never touch it
      // (or any other loopback port that is not the QA origin).
      if (/^https?:\/\/(127\.0\.0\.1|localhost):8001\b/.test(url)) nonLocal.push(url);
    });

    for (const hash of ['#/', '#/leaderboard', '#/tasks', '#/engineering', '#/watchlist', '#/history', '#/stock/DEMO007']) {
      await gotoHash(page, hash);
    }

    expect(nonLocal, `static site must not call the Python lab: ${nonLocal.join(', ')}`).toEqual([]);
    expect(external, `cross-origin requests: ${external.join(', ')}`).toEqual([]);
  });

  test('hero pointer figure stays consistent with the real published pointer', async ({ page }) => {
    // After a successful run advances the pointer, the home hero mini-diagram must not
    // keep showing a stale hard-coded snapshot id. Three observable values must agree:
    //   hero figure data-pointer  ==  home stat release version  ==  tasks pointer release
    await gotoHash(page, '#/');
    const figure = await resolve(page, 'stage-pointer-release', SEL.stagePointerRelease);
    const stat = await resolve(page, 'home-stat-release-version', SEL.homeStatReleaseVersion);
    const before = {
      figure: await figure.getAttribute('data-pointer'),
      stat: (await stat.innerText()).trim(),
    };
    expect(before.figure, 'hero figure and home stat must agree before any run').toBe(before.stat);

    await gotoHash(page, '#/tasks');
    await (await resolve(page, 'scenario-select', SEL.scenarioSelect)).selectOption('normal');
    await (await resolve(page, 'run-button', SEL.runButton)).click();
    await expect(await resolve(page, 'gate-verdict', SEL.gateVerdict)).toHaveAttribute('data-verdict', 'SUCCESS', {
      timeout: 30_000,
    });
    const tasksPointer = (await (await resolve(page, 'pointer-release', SEL.tasksPointerRelease)).innerText()).trim();

    await gotoHash(page, '#/');
    const figureAfter = await (await resolve(page, 'stage-pointer-release', SEL.stagePointerRelease)).getAttribute(
      'data-pointer',
    );
    const statAfter = (await (await resolve(page, 'home-stat-release-version', SEL.homeStatReleaseVersion)).innerText()).trim();

    expect(statAfter, 'the home stat must reflect the advanced pointer').not.toBe(before.stat);
    expect(figureAfter, 'hero figure must follow the advanced pointer, not a hard-coded id').toBe(statAfter);
    expect(figureAfter, 'hero figure must agree with the tasks page pointer').toBe(tasksPointer);
  });
});
