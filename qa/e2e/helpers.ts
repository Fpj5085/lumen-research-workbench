import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Reviewer-owned helpers. Selectors are resolved from a candidate list so the QA
 * harness tolerates naming choices made by the implementers, while still failing
 * loudly (with a full data-testid dump) when a required hook is missing.
 */

export const ORIGIN = process.env.QA_ORIGIN ?? 'http://127.0.0.1:4173';

export async function dumpTestIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]'))
      .map((el) => el.getAttribute('data-testid') ?? '')
      .filter(Boolean)
      .sort(),
  );
}

async function firstVisible(page: Page, selectors: string[]): Promise<Locator | null> {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    try {
      if ((await loc.count()) > 0 && (await loc.isVisible())) return loc;
    } catch {
      /* keep probing */
    }
  }
  return null;
}

export async function resolve(page: Page, name: string, candidates: string[]): Promise<Locator> {
  const loc = await firstVisible(page, candidates);
  if (!loc) {
    const ids = await dumpTestIds(page);
    throw new Error(
      `QA selector "${name}" not found.\nTried: ${candidates.join(' | ')}\n` +
        `Present data-testid values: ${ids.length ? ids.join(', ') : '(none)'}`,
    );
  }
  return loc;
}

const T = (id: string) => `[data-testid="${id}"]`;

export const SEL = {
  app: [T('app-root'), '#root'],
  nav: [T('site-nav'), 'nav'],
  // The persistent synthetic-data disclaimer is `synthetic-badge` in the contract;
  // keep generic fallbacks so a rename still surfaces as a clear QA failure.
  disclaimer: [T('synthetic-badge'), T('synthetic-disclaimer'), T('demo-disclaimer')],

  pageHome: [T('page-home')],
  pageLeaderboard: [T('page-leaderboard')],
  pageStock: [T('page-stock')],
  pageWatchlist: [T('page-watchlist')],
  pageTasks: [T('page-tasks')],
  pageEngineering: [T('page-engineering')],
  pageHistory: [T('page-history')],

  highlights: [T('home-highlight-1'), T('home-highlight-2'), T('home-highlight-3')],
  heroFigure: [T('home-hero-figure')],
  stagePointerFigure: [T('home-stage-pointer-figure')],
  stagePointerRelease: [T('home-stage-pointer-release')],
  layerStatic: [T('portfolio-layer-static')],
  layerStaticOpenTasks: [T('portfolio-layer-static-open-tasks')],
  layerPython: [T('portfolio-layer-python')],
  layerPythonOpenEngineering: [T('portfolio-layer-python-open-engineering')],
  homePath: (n: string) => [T(`home-path-${n}`)],
  homePathOpen: (n: string) => [T(`home-path-${n}-open`)],
  homeOpenTasks: [T('home-open-tasks')],
  homeOpenLeaderboard: [T('home-open-leaderboard')],
  homeReleaseState: [T('home-release-state')],
  homeStatDataDate: [T('home-stat-data-date')],
  homeStatResearchDate: [T('home-stat-research-date')],
  homeStatReleaseVersion: [T('home-stat-release-version')],

  scenarioSelect: [T('tasks-scenario-select')],
  scenarioButton: (name: string) => [T(`tasks-scenario-option-${name}`)],
  runButton: [T('tasks-run')],
  resetButton: [T('tasks-reset')],
  stageList: [T('tasks-stage-list')],
  stage: (name: string) => [T(`tasks-stage-${name}`)],
  stageStatus: [T('tasks-stage-status')],
  gateVerdict: [T('tasks-gate-verdict')],
  tasksPointerRelease: [T('tasks-pointer-release')],
  tasksDataDate: [T('tasks-data-date')],
  tasksResearchDate: [T('tasks-research-date')],
  latestUnpublished: [T('tasks-latest-unpublished')],
  latestPublished: [T('tasks-latest-published')],
  receiptItem: [T('tasks-receipt-item')],
  runId: [T('tasks-run-id')],
  repeatNote: [T('tasks-repeat-note')],

  leaderboardRow: [T('leaderboard-row')],
  leaderboardTable: [T('leaderboard-table')],
  leaderboardCount: [T('leaderboard-count')],
  leaderboardEmpty: [T('leaderboard-empty')],
  leaderboardReleaseVersion: [T('leaderboard-release-version')],
  leaderboardDataDate: [T('leaderboard-data-date')],
  leaderboardUnpublished: [T('leaderboard-unpublished')],
  leaderboardHistoricalNote: [T('leaderboard-historical-note')],
  sortKey: [T('leaderboard-sort-key')],
  sortDir: [T('leaderboard-sort-dir')],
  filterSearch: [T('leaderboard-filter-search')],
  filterTrend: [T('leaderboard-filter-trend')],
  filterTurnover: [T('leaderboard-filter-turnover')],
  filterReset: [T('leaderboard-filter-reset')],
  pagination: [T('leaderboard-pagination')],
  pagePrev: [T('leaderboard-page-prev')],
  pageNext: [T('leaderboard-page-next')],
  pageIndicator: [T('leaderboard-page-indicator')],
  detailLink: [T('leaderboard-detail-link')],

  stockChartSvg: [T('stock-chart-svg')],
  stockChartContainer: [T('stock-chart-container')],
  stockRangeSwitch: [T('stock-range-switch')],
  stockRange: (n: string) => [T(`stock-range-${n}`)],
  stockSymbol: [T('stock-symbol')],
  stockVersionBanner: [T('stock-version-banner')],
  stockUnknown: [T('stock-unknown')],
  watchAdd: [T('stock-add-watch')],
  watchRemove: [T('stock-remove-watch')],
  watchState: [T('stock-watch-state')],

  watchList: [T('watchlist-list')],
  watchItem: [T('watchlist-item')],
  watchlistReset: [T('watchlist-reset')],
  holdingsPanel: [T('holdings-panel')],
  holdingItem: [T('holding-item')],

  historySnapshotList: [T('history-snapshot-list')],
  historySnapshotItem: [T('history-snapshot-item')],
  historyNotLatestBadge: [T('history-not-latest-badge')],

  engineeringPythonLab: [T('engineering-python-lab')],
  pythonLabSummary: [T('python-lab-summary')],
  pythonLabEndpointTable: [T('python-lab-endpoint-table')],
  pythonLabCommands: [T('python-lab-commands')],
  pythonLabVerification: [T('python-lab-verification')],
  pythonLabVerificationNotes: [T('python-lab-verification-notes')],
  pythonLabLimitation: [T('python-lab-limitation')],
  pythonLabDecoupling: [T('python-lab-decoupling')],
};

export async function gotoHash(page: Page, hash: string): Promise<void> {
  await page.goto(`${ORIGIN}/${hash}`, { waitUntil: 'load' });
  // NOTE: #root and [data-testid="app-root"] are nested, so a comma selector would
  // match two elements and trip Playwright strict mode. Wait on the app shell only.
  await expect(page.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 15_000 });
}

/** Records every request whose origin differs from the page origin. */
export function trackCrossOrigin(page: Page, sink: string[], expectedOriginUrl?: string): void {
  // Compare against a fixed expected origin, not page.url(): during the very first
  // navigation page.url() is still "about:blank" (origin "null") and would make
  // the document request itself look cross-origin. Pass expectedOriginUrl when the
  // suite runs against a non-default origin (e.g. the sub-path server).
  const expectedOrigin = new URL(expectedOriginUrl ?? ORIGIN).origin;
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return;
    try {
      const u = new URL(url);
      if (u.origin !== expectedOrigin) sink.push(`${req.method()} ${url}`);
    } catch {
      sink.push(`UNPARSEABLE ${url}`);
    }
  });
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    bodyScrollW: document.body.scrollWidth,
  }));
  expect(
    overflow.scrollW,
    `full-page horizontal overflow: scrollWidth=${overflow.scrollW} > clientWidth=${overflow.clientW}`,
  ).toBeLessThanOrEqual(overflow.clientW + 1);
}
