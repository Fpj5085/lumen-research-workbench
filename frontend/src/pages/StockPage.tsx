import { CandlestickChart } from '../components/CandlestickChart';
import { Sparkline } from '../components/Sparkline';
import { formatPct, formatTurnover, formatVolume } from '../simulation/leaderboard';
import { navigateTo } from '../state/navigation';
import { useApp, type ChartRange } from '../state/store';

const RANGES: readonly ChartRange[] = [20, 60, 120, 180] as const;

export function StockPage({ symbol }: { readonly symbol: string }) {
  const { seriesFor, pointer, watchlist, addWatch, removeWatch, chartRange, setChartRange, run } = useApp();
  const series = seriesFor(symbol);

  if (!series) {
    return (
      <div className="stack" data-testid="page-stock">
        <div className="notice notice--warn" data-testid="stock-unknown">
          未找到合成标的 <span className="mono">{symbol}</span>。本演示只有 DEMO001–DEMO024。
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => navigateTo({ kind: 'leaderboard' })}>
              返回模拟榜单
            </button>
          </div>
        </div>
      </div>
    );
  }

  const bars = series.bars;
  const last = bars[bars.length - 1];
  const previous = bars[bars.length - 2];
  const changePct = last && previous ? ((last.close - previous.close) / previous.close) * 100 : 0;
  const visible = bars.slice(Math.max(0, bars.length - chartRange));
  const windowHigh = Math.max(...visible.map((bar) => bar.high));
  const windowLow = Math.min(...visible.map((bar) => bar.low));
  const windowVolume = visible.reduce((sum, bar) => sum + bar.volume, 0);
  const watching = watchlist.includes(series.meta.symbol);

  return (
    <div className="stack" data-testid="page-stock">
      <div className="stack stack--sm">
        <p className="eyebrow">虚构标的详情</p>
        <h1 data-testid="stock-title">{series.meta.name}</h1>
        <p className="small muted">
          <span className="mono" data-testid="stock-symbol" data-symbol={series.meta.symbol}>
            {series.meta.symbol}
          </span>
          {' · '}
          {series.meta.sector}
          {' · '}
          趋势 {series.meta.trend}
        </p>
        <p
          className="small"
          data-testid="stock-version-banner"
          data-published={String(run.verdict !== 'BLOCKED')}
        >
          数据序列：{bars.length} 根合成日 K（{bars[0]?.date} → {last?.date}）；
          已发布指针对应数据日期 {pointer.dataDate}。
          {run.verdict === 'BLOCKED'
            ? ' 最新一次模拟运行未发布，详情页仍展示完整合成序列，榜单口径保持历史版本。'
            : ''}
        </p>
        <p className="muted small">{series.meta.tagline}</p>
      </div>

      <section className="card stack">
        <div className="card__head">
          <h2>价格与成交量</h2>
          <div className="pill-group" data-testid="stock-range-switch" role="group" aria-label="周期切换">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                className="pill"
                data-testid={`stock-range-${range}`}
                aria-pressed={chartRange === range}
                onClick={() => setChartRange(range)}
              >
                最近 {range} 根
              </button>
            ))}
          </div>
        </div>
        <CandlestickChart bars={bars} visible={chartRange} symbol={series.meta.symbol} />
        <ul className="legend" data-testid="stock-chart-legend">
          <li>
            <span className="legend__swatch" style={{ background: '#d4556b' }} /> 阳线（收 ≥ 开）
          </li>
          <li>
            <span className="legend__swatch" style={{ background: '#0e9e8c' }} /> 阴线（收 &lt; 开）
          </li>
          <li>
            <span className="legend__swatch" style={{ background: '#0b7f71' }} /> 收盘价折线
          </li>
          <li>下方柱形为成交量（合成值）</li>
        </ul>
      </section>

      <section className="card stack">
        <h2>区间统计</h2>
        <dl className="stat-list">
          <div className="stat">
            <dt>最新收盘</dt>
            <dd className="num" data-testid="stock-stat-close">{last ? last.close.toFixed(2) : '—'}</dd>
          </div>
          <div className="stat">
            <dt>日涨跌</dt>
            <dd className={`num ${changePct >= 0 ? 'up' : 'down'}`} data-testid="stock-stat-change">
              {formatPct(changePct)}
            </dd>
          </div>
          <div className="stat">
            <dt>区间最高</dt>
            <dd className="num" data-testid="stock-stat-high">{windowHigh.toFixed(2)}</dd>
          </div>
          <div className="stat">
            <dt>区间最低</dt>
            <dd className="num" data-testid="stock-stat-low">{windowLow.toFixed(2)}</dd>
          </div>
          <div className="stat">
            <dt>区间成交额</dt>
            <dd className="num" data-testid="stock-stat-volume">{formatTurnover(windowVolume * (last?.close ?? 0))}</dd>
          </div>
          <div className="stat">
            <dt>最新成交量</dt>
            <dd className="num">{last ? formatVolume(last.volume) : '—'}</dd>
          </div>
        </dl>
        <div className="grid grid--2">
          <div className="stack stack--sm">
            <span className="small muted">近 30 根收盘价</span>
            <Sparkline
              values={bars.slice(-30).map((bar) => bar.close)}
              width={280}
              height={56}
              label={`${series.meta.name} 近 30 根收盘价`}
            />
          </div>
          <div className="stack stack--sm">
            <span className="small muted">观察状态</span>
            <span className="small" data-testid="stock-watch-state" data-watching={String(watching)}>
              {watching ? '已在观察列表中' : '不在观察列表中'}
            </span>
            <div className="pill-group">
              <button
                type="button"
                className="btn"
                data-testid="stock-add-watch"
                disabled={watching}
                onClick={() => addWatch(series.meta.symbol)}
              >
                加入观察
              </button>
              <button
                type="button"
                className="btn btn--danger"
                data-testid="stock-remove-watch"
                disabled={!watching}
                onClick={() => removeWatch(series.meta.symbol)}
              >
                移出观察
              </button>
            </div>
          </div>
        </div>
      </section>

      <p className="disclaimer">
        本页 K 线由固定 seed 的合成生成器产生，不是市场模型，也不对应任何真实公司或行情。
      </p>
    </div>
  );
}
