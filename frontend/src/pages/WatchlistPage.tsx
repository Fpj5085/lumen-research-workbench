import { formatPct, formatTurnover } from '../simulation/leaderboard';
import { navigateTo } from '../state/navigation';
import { useApp } from '../state/store';

export function WatchlistPage() {
  const { watchlist, holdings, rows, removeWatch, addWatch, resetAll, seriesFor, pointer } = useApp();
  const rowBySymbol = new Map(rows.map((row) => [row.symbol, row]));

  return (
    <div className="stack" data-testid="page-watchlist">
      <div className="stack stack--sm">
        <h1 data-testid="watchlist-title">观察与持仓示意</h1>
        <p className="muted">
          观察列表与持仓只保存在浏览器内存中，不接账户、不提供下单，也不写入任何存储。
        </p>
        <p className="small" data-testid="watchlist-count" data-count={watchlist.length}>
          观察 {watchlist.length} 个合成标的 · 数据日期 {pointer.dataDate}
        </p>
      </div>

      <section className="card stack">
        <div className="card__head">
          <h2>观察列表</h2>
          <button type="button" className="btn btn--ghost" data-testid="watchlist-reset" onClick={resetAll}>
            恢复初始观察与持仓
          </button>
        </div>
        {watchlist.length === 0 ? (
          <p className="notice" data-testid="watchlist-empty">
            观察列表为空。可在榜单或详情页重新加入，或点击「恢复初始观察与持仓」。
          </p>
        ) : (
          <ul className="bullet-list bullet-list--plain" data-testid="watchlist-list">
            {watchlist.map((symbol) => {
              const row = rowBySymbol.get(symbol);
              const series = seriesFor(symbol);
              return (
                <li key={symbol} className="stage-item" data-testid="watchlist-item" data-symbol={symbol}>
                  <span className="stage-index" aria-hidden="true">
                    {symbol.slice(-3)}
                  </span>
                  <span className="stage-body">
                    <span className="stage-body__title">
                      <a href={`#/stock/${symbol}`} className="mono">
                        {symbol}
                      </a>
                      <strong>{series?.meta.name ?? '合成标的'}</strong>
                      {row ? (
                        <span className={`small num ${row.changePct >= 0 ? 'up' : 'down'}`}>
                          {row.close.toFixed(2)} {formatPct(row.changePct)}
                        </span>
                      ) : null}
                    </span>
                    <span className="stage-body__note">
                      {series?.meta.sector} · 趋势 {series?.meta.trend}
                      {row ? ` · 成交额 ${formatTurnover(row.turnover)}` : ''}
                    </span>
                  </span>
                  <span className="stage-item__aside pill-group">
                    <button type="button" className="btn btn--ghost" onClick={() => navigateTo({ kind: 'stock', symbol })}>
                      详情
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      data-testid="watchlist-remove"
                      data-symbol={symbol}
                      onClick={() => removeWatch(symbol)}
                    >
                      移除
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {watchlist.length > 0 ? (
          <div className="pill-group">
            {['DEMO001', 'DEMO002', 'DEMO009']
              .filter((symbol) => !watchlist.includes(symbol))
              .map((symbol) => (
                <button key={symbol} type="button" className="btn btn--ghost" onClick={() => addWatch(symbol)}>
                  加入 {symbol}
                </button>
              ))}
          </div>
        ) : null}
      </section>

      <section className="card stack" data-testid="holdings-panel">
        <div className="card__head">
          <h2>持仓示意</h2>
          <p className="small" data-testid="holdings-count" data-count={holdings.length}>
            共 {holdings.length} 个虚构持仓
          </p>
        </div>
        <ul className="bullet-list bullet-list--plain">
          {holdings.map((holding) => {
            const series = seriesFor(holding.symbol);
            const row = rowBySymbol.get(holding.symbol);
            const cost = holding.cost * holding.shares;
            const market = (row?.close ?? holding.cost) * holding.shares;
            const pnl = market - cost;
            return (
              <li key={holding.symbol} className="stage-item" data-testid="holding-item" data-symbol={holding.symbol}>
                <span className="stage-index" aria-hidden="true">
                  {holding.symbol.slice(-3)}
                </span>
                <span className="stage-body">
                  <span className="stage-body__title">
                    <a href={`#/stock/${holding.symbol}`} className="mono">
                      {holding.symbol}
                    </a>
                    <strong>{series?.meta.name ?? '合成标的'}</strong>
                  </span>
                  <span className="stage-body__note">
                    虚构数量 {holding.shares.toLocaleString('en-US')} · 虚构成本 {holding.cost.toFixed(2)} · 按{' '}
                    {pointer.dataDate} 合成收盘价估算浮动 {pnl >= 0 ? '+' : ''}
                    {Math.round(pnl).toLocaleString('en-US')} 元
                  </span>
                </span>
                <span className="stage-item__aside small muted num">
                  {row ? `现价 ${row.close.toFixed(2)}` : '—'}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="notice" data-testid="holdings-notice">
          以上数量、成本与浮动均为合成示意值，仅用于演示本地状态管理；不接账户、不提供下单，也不代表任何真实持仓。
        </p>
      </section>

      <p className="disclaimer">
        观察与持仓状态只存在于当前浏览器会话内存；刷新页面即回到初始演示状态，不使用 localStorage。
      </p>
    </div>
  );
}
