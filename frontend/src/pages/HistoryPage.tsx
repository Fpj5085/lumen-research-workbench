import { formatCn } from '../simulation/calendar';
import { useApp } from '../state/store';

export function HistoryPage() {
  const { history, pointer, run } = useApp();

  return (
    <div className="stack" data-testid="page-history">
      <div className="stack stack--sm">
        <h1 data-testid="history-title">历史快照</h1>
        <p className="muted">
          历史快照始终标注「历史 / 非最新」与原日期。保留历史不等于把旧结果发布为最新结果。
        </p>
        <p className="small">
          当前已发布指针：<span className="mono">{pointer.release}</span> · 数据日期{' '}
          <span className="mono">{pointer.dataDate}</span> · 研究日期{' '}
          <span className="mono">{pointer.researchDate}</span>
        </p>
        {run.verdict === 'BLOCKED' ? (
          <p className="notice notice--warn">
            最近一次模拟运行未发布，指针保持 {pointer.release}；最新结果区显示未发布。
          </p>
        ) : null}
      </div>

      <section className="card stack">
        <div className="card__head">
          <h2>快照列表</h2>
          <span className="small muted">共 {history.length} 条</span>
        </div>
        <ul className="bullet-list bullet-list--plain" data-testid="history-snapshot-list">
          {history.map((snapshot) => (
            <li
              key={snapshot.release}
              className="stage-item"
              data-testid="history-snapshot-item"
              data-release={snapshot.release}
              data-data-date={snapshot.dataDate}
            >
              <span className="stage-index" aria-hidden="true">
                {snapshot.dataDate.slice(5, 7)}
              </span>
              <span className="stage-body">
                <span className="stage-body__title">
                  <span className="badge badge--skipped" data-testid="history-not-latest-badge">
                    历史 / 非最新
                  </span>
                  <strong className="mono">{snapshot.release}</strong>
                </span>
                <span className="stage-body__note">
                  数据日期 {snapshot.dataDate}（{formatCn(snapshot.dataDate)}）· 研究日期{' '}
                  {snapshot.researchDate} · {snapshot.note}
                </span>
              </span>
              <span className="stage-item__aside small muted">仅存档</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="disclaimer">历史快照只读；本演示不提供把历史快照重新发布为最新的操作。</p>
    </div>
  );
}
