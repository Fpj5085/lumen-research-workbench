import { ReceiptList } from '../components/ReceiptList';
import { StageFlow } from '../components/StageFlow';
import type { ScenarioId } from '../contracts/types';
import { SCENARIOS } from '../simulation/scenarios';
import { blockReasonText, verdictText } from '../simulation/state-machine';
import { useApp } from '../state/store';

export function TasksPage() {
  const { run, running, startSimulation, resetSimulation, setScenario } = useApp();
  const active = SCENARIOS.find((item) => item.id === run.scenario) ?? SCENARIOS[0]!;
  const blocked = run.verdict === 'BLOCKED';
  const published = run.verdict === 'SUCCESS' && run.publishedThisRun !== null;
  const started = run.finished || running;

  return (
    <div className="stack" data-testid="page-tasks">
      <div className="stack stack--sm">
        <h1 data-testid="tasks-title">任务演示：六阶段日更</h1>
        <p className="muted">
          下面全部是浏览器内的模拟事件：阶段推进、耗时与回执都由纯 TypeScript 状态机生成，
          不代表 Python 服务、定时任务或真实队列的执行结果。
        </p>
      </div>

      <section className="card stack">
        <div className="card__head">
          <h2>场景选择</h2>
          <span className="small muted mono" data-testid="tasks-run-id" data-run-id={run.runId}>
            {run.runId}
          </span>
        </div>
        <div className="toolbar">
          <div className="field">
            <label htmlFor="tasks-scenario">预设场景</label>
            <select
              id="tasks-scenario"
              data-testid="tasks-scenario-select"
              value={run.scenario}
              disabled={running}
              onChange={(event) => setScenario(event.target.value as ScenarioId)}
            >
              {SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </div>
          <div className="pill-group">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className="pill"
                data-testid={'tasks-scenario-option-' + scenario.id}
                aria-pressed={run.scenario === scenario.id}
                disabled={running}
                onClick={() => setScenario(scenario.id)}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
        <p className="small muted" data-testid="tasks-scenario-desc">
          {active.summary}
        </p>
        <div className="pill-group">
          <button
            type="button"
            className="btn btn--primary"
            data-testid="tasks-run"
            disabled={running}
            onClick={startSimulation}
          >
            {running ? '运行中…' : '运行演示'}
          </button>
          <button type="button" className="btn btn--ghost" data-testid="tasks-reset" onClick={resetSimulation}>
            重置
          </button>
        </div>
        <p className="small muted" data-testid="tasks-repeat-note" data-run-count={run.runCount}>
          已运行 {run.runCount} 次。重复点击「运行演示」会生成新的 runId；每次运行都从全部阶段
          pending 开始，失败场景的已发布指针保持不变。
        </p>
      </section>

      <section className="card stack">
        <div className="card__head">
          <h2>阶段推进</h2>
          <span className="small muted">
            数据生成 → 数据校验 → 研究任务 → 一致性门禁 → 候选快照 → 发布
          </span>
        </div>
        <StageFlow stages={run.stages} />
      </section>

      <section className="card stack">
        <div className="card__head">
          <h2>门禁与发布状态</h2>
          <p
            className="verdict"
            data-testid="tasks-gate-verdict"
            data-verdict={run.verdict}
            data-code={run.blockCode}
          >
            {verdictText(run.verdict, run.blockCode)}
          </p>
        </div>
        <dl className="stat-list">
          <div className="stat">
            <dt>已发布版本</dt>
            <dd className="mono" data-testid="tasks-release-version">
              {run.pointer.release}
            </dd>
          </div>
          <div className="stat">
            <dt>本次数据日期</dt>
            <dd className="mono" data-testid="tasks-data-date">
              {started ? run.dataDate : '—'}
            </dd>
          </div>
          <div className="stat">
            <dt>本次研究日期</dt>
            <dd className="mono" data-testid="tasks-research-date">
              {started ? run.researchDate ?? '未完成' : '—'}
            </dd>
          </div>
          <div className="stat">
            <dt>发布指针</dt>
            <dd className="mono" data-testid="tasks-pointer-release">
              {run.pointer.release}
            </dd>
          </div>
        </dl>

        <section className="stack stack--sm" data-testid="tasks-latest-region">
          <h3>最新结果</h3>
          {published ? (
            <div
              className="notice notice--ok"
              data-testid="tasks-latest-published"
              data-release={run.pointer.release}
              data-data-date={run.pointer.dataDate}
            >
              已发布 <span className="mono">{run.pointer.release}</span>：数据日期 {run.pointer.dataDate}，
              研究日期 {run.pointer.researchDate}，两者一致。
            </div>
          ) : blocked ? (
            <div className="notice notice--warn" data-testid="tasks-latest-unpublished">
              <strong>最新结果：未发布。</strong> {blockReasonText(run.blockCode)}
              <p className="small muted">
                已发布指针保持 <span className="mono">{run.pointer.release}</span>（数据日期{' '}
                {run.pointer.dataDate}），本次没有产生新版本，也没有把旧研究重新标注为最新日期。
              </p>
            </div>
          ) : (
            <p className="notice" data-testid="tasks-latest-unpublished">
              最新结果：未发布（尚未运行）。当前已发布指针为{' '}
              <span className="mono">{run.pointer.release}</span>，数据日期 {run.pointer.dataDate}。
            </p>
          )}
          <p className="small muted">
            历史快照入口：
            <a data-testid="tasks-history-link" href="#/history">
              查看历史快照
            </a>
            （历史记录始终标注「历史 / 非最新」与原日期）。
          </p>
        </section>
      </section>

      <section className="card stack">
        <div className="card__head">
          <h2>模拟回执</h2>
          <span className="small muted">共 {run.receipts.length} 条</span>
        </div>
        <ReceiptList receipts={run.receipts} />
      </section>

      <p className="disclaimer">
        以上运行不调用任何后端接口，不写文件，也不访问网络。失败场景由独立单元测试覆盖，
        断言发布事件为零且指针不变。
      </p>
    </div>
  );
}
