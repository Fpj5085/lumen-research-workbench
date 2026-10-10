import type { SortKey } from '../simulation/leaderboard';
import {
  applyQuery,
  formatPct,
  formatTurnover,
  formatVolume,
  paginate,
  SORT_LABELS,
  TURNOVER_OPTIONS,
  TREND_OPTIONS,
} from '../simulation/leaderboard';
import { blockReasonText } from '../simulation/state-machine';
import { useApp } from '../state/store';

const HEADERS: readonly { readonly key: string; readonly label: string }[] = [
  { key: 'symbol', label: '标识' },
  { key: 'name', label: '名称' },
  { key: 'close', label: '收盘价' },
  { key: 'change', label: '涨跌幅' },
  { key: 'volume', label: '成交量' },
  { key: 'turnover', label: '成交额' },
  { key: 'score', label: '展示分' },
  { key: 'trend', label: '趋势' },
];

export function LeaderboardPage() {
  const { rows, pointer, query, updateQuery, resetQuery, run, lastBlocked } = useApp();
  const filtered = applyQuery(rows, query);
  const paged = paginate(filtered, query);

  return (
    <div className="stack" data-testid="page-leaderboard">
      <div className="stack stack--sm">
        <h1 data-testid="leaderboard-title">模拟榜单</h1>
        <p className="muted">
          榜单由已发布指针对应的数据快照派生。排序与筛选只使用展示字段，不含任何私有研究评分。
        </p>
        <p className="small">
          已发布版本：<span className="mono" data-testid="leaderboard-release-version">{pointer.release}</span>
          {' · '}
          数据日期：<span className="mono" data-testid="leaderboard-data-date">{pointer.dataDate}</span>
          {' · '}
          研究日期：<span className="mono">{pointer.researchDate}</span>
        </p>
      </div>

      {lastBlocked ? (
        <div className="notice notice--warn" data-testid="leaderboard-unpublished">
          <strong>最新一次模拟运行：未发布。</strong>{' '}
          {blockReasonText(lastBlocked.code)}
          <p className="small muted" data-testid="leaderboard-historical-note">
            当前展示的是历史已发布版本 {pointer.release}（数据日期 {pointer.dataDate}），
            并非最新结果，也未重新标注日期。
          </p>
        </div>
      ) : null}

      <section className="card stack">
        <div className="toolbar">
          <div className="field">
            <label htmlFor="lb-search">关键字</label>
            <input
              id="lb-search"
              data-testid="leaderboard-filter-search"
              type="search"
              placeholder="标识 / 名称 / 行业"
              value={query.keyword}
              onChange={(event) => updateQuery({ keyword: event.target.value, page: 1 })}
            />
          </div>
          <div className="field">
            <label htmlFor="lb-trend">趋势</label>
            <select
              id="lb-trend"
              data-testid="leaderboard-filter-trend"
              value={query.trend}
              onChange={(event) => updateQuery({ trend: event.target.value as typeof query.trend, page: 1 })}
            >
              {TREND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lb-turnover">最小成交额</label>
            <select
              id="lb-turnover"
              data-testid="leaderboard-filter-turnover"
              value={String(query.minTurnover)}
              onChange={(event) => updateQuery({ minTurnover: Number(event.target.value), page: 1 })}
            >
              {TURNOVER_OPTIONS.map((option) => (
                <option key={option.value} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lb-sort">排序字段</label>
            <select
              id="lb-sort"
              data-testid="leaderboard-sort-key"
              value={query.sortKey}
              onChange={(event) => updateQuery({ sortKey: event.target.value as SortKey, page: 1 })}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn"
            data-testid="leaderboard-sort-dir"
            data-dir={query.sortDir}
            onClick={() => updateQuery({ sortDir: query.sortDir === 'desc' ? 'asc' : 'desc' })}
          >
            {query.sortDir === 'desc' ? '降序' : '升序'}
          </button>
          <button type="button" className="btn btn--ghost" data-testid="leaderboard-filter-reset" onClick={resetQuery}>
            重置筛选
          </button>
        </div>

        <p className="small muted" data-testid="leaderboard-count" data-matched={paged.matched} data-total={rows.length}>
          命中 {paged.matched} / {rows.length}
        </p>

        <div className="table-wrap">
          <table className="data-table" data-testid="leaderboard-table">
            <caption className="small muted" style={{ captionSide: 'top', textAlign: 'left', padding: '0 0 8px' }}>
              合成榜单 · 版本 {pointer.release} · 数据日期 {pointer.dataDate}
            </caption>
            <thead>
              <tr>
                {HEADERS.map((header) => (
                  <th key={header.key} data-testid={`leaderboard-head-${header.key}`} scope="col">
                    {header.label}
                  </th>
                ))}
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
                <tr key={row.symbol} data-testid="leaderboard-row" data-symbol={row.symbol}>
                  <td className="mono">{row.symbol}</td>
                  <td>
                    {row.name}
                    <span className="muted small"> · {row.sector}</span>
                  </td>
                  <td className="num" data-testid="leaderboard-cell-close">{row.close.toFixed(2)}</td>
                  <td
                    className={`num ${row.changePct >= 0 ? 'up' : 'down'}`}
                    data-testid="leaderboard-cell-change"
                  >
                    {formatPct(row.changePct)}
                  </td>
                  <td className="num">{formatVolume(row.volume)}</td>
                  <td className="num">{formatTurnover(row.turnover)}</td>
                  <td className="num" data-testid="leaderboard-cell-score">{row.displayScore.toFixed(1)}</td>
                  <td data-testid="leaderboard-cell-trend">{row.trend}</td>
                  <td>
                    <a
                      data-testid="leaderboard-detail-link"
                      data-symbol={row.symbol}
                      href={`#/stock/${row.symbol}`}
                    >
                      查看详情
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paged.matched === 0 ? (
          <p className="notice" data-testid="leaderboard-empty">
            没有符合当前筛选条件的合成标的。可点击「重置筛选」恢复默认视图。
          </p>
        ) : null}

        <nav className="toolbar" data-testid="leaderboard-pagination" aria-label="榜单分页">
          <button
            type="button"
            className="btn"
            data-testid="leaderboard-page-prev"
            disabled={paged.page <= 1}
            onClick={() => updateQuery({ page: paged.page - 1 })}
          >
            上一页
          </button>
          <span
            className="mono small"
            data-testid="leaderboard-page-indicator"
            data-page={paged.page}
            data-page-count={paged.pageCount}
          >
            第 {paged.page} / {paged.pageCount} 页
          </span>
          <button
            type="button"
            className="btn"
            data-testid="leaderboard-page-next"
            disabled={paged.page >= paged.pageCount}
            onClick={() => updateQuery({ page: paged.page + 1 })}
          >
            下一页
          </button>
        </nav>
      </section>

      <p className="disclaimer">
        榜单为合成数据派生的展示结果；未发布时不会用旧版本冒充最新结果。
        {run.verdict === 'PENDING' ? '（尚未运行任务演示）' : ''}
      </p>
    </div>
  );
}
