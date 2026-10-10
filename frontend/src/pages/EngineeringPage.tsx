import { BARS_PER_STOCK, DEMO_SEED, SERIES_END_DATE } from '../simulation/generator';
import { SCENARIOS, STAGE_LABELS, STAGE_ORDER } from '../simulation/scenarios';
import {
  PY_LAB_COMMANDS,
  PY_LAB_DECOUPLING,
  PY_LAB_ENDPOINTS,
  PY_LAB_LIMITATION,
  PY_LAB_PROPERTIES,
  PY_LAB_STAGES,
  PY_LAB_SUMMARY,
  PY_LAB_TITLE,
  PY_LAB_VERIFICATION,
} from '../content/python-lab';

const TRANSITIONS: readonly { readonly from: string; readonly condition: string; readonly to: string }[] = [
  { from: '数据生成', condition: '合成数据构造完成', to: '数据校验' },
  { from: '数据校验', condition: 'OHLC 自洽且根数正确', to: '研究任务' },
  { from: '数据校验', condition: '自洽性检查失败', to: 'BLOCKED（下游跳过）' },
  { from: '研究任务', condition: '研究完成且输入版本等于数据日期', to: '一致性门禁' },
  { from: '研究任务', condition: '研究未完成', to: 'BLOCKED（RESEARCH_INCOMPLETE）' },
  { from: '一致性门禁', condition: '研究完整且输入摘要一致', to: '候选快照' },
  { from: '一致性门禁', condition: '输入版本与数据日期不一致', to: 'BLOCKED（VERSION_MISMATCH）' },
  { from: '候选快照', condition: '快照生成成功', to: '发布' },
  { from: '发布', condition: '发布成功', to: '指针推进到新版本' },
  { from: '任意阶段', condition: '终态为 BLOCKED', to: '指针保持不变' },
];

const DIAGRAM = [
  '静态展示层（frontend/，浏览器内运行，无后端连接）',
  '  合成数据生成器（固定 seed，纯函数）',
  '          │',
  '          ├── 合约层 contracts/types.ts：Demo 自有类型',
  '          ├── 榜单派生 simulation/leaderboard.ts：排序 / 筛选 / 分页',
  '          └── 状态机 simulation/state-machine.ts：六阶段 + 门禁 + 指针',
  '                      │',
  '                React 状态容器 state/store.tsx',
  '                      │',
  '          ┌───────────┼────────────┬───────────────┐',
  '       首页/榜单    详情/图表    观察与持仓      任务演示',
  '     （展示派生）  （SVG 原创）  （内存状态）   （模拟回执）',
  '',
  '本地 Python 实验（python-lab/，仅本机运行）',
  '  FastAPI 服务 + 内存 store + pytest 套件',
  '  与上面的静态层互不调用：前端不发请求，服务不装 CORS',
].join('\n');

export function EngineeringPage() {
  return (
    <div className="stack" data-testid="page-engineering">
      <div className="stack stack--sm">
        <h1 data-testid="engineering-title">工程说明</h1>
        <p className="muted">
          这里说明演示的模块边界、状态转移、验证办法与已知局限。所有描述对应本仓库内可复现的代码，
          不引用任何私有实现细节。
        </p>
      </div>

      <section className="card stack" data-testid="engineering-architecture">
        <h2>架构与数据流</h2>
        <pre
          className="mono small"
          style={{ margin: 0, overflowX: 'auto', background: 'var(--paper-200)', padding: 12, borderRadius: 10 }}
        >
          {DIAGRAM}
        </pre>
        <ul className="bullet-list">
          <li>状态机与生成器都是纯 TypeScript 模块，不依赖 React，可单独单元测试。</li>
          <li>展示层只消费派生结果：榜单、图表与任务状态引用同一份合成数据。</li>
          <li>
            <strong>静态展示层</strong>没有后端连接、没有数据库、没有网络请求，构建产物是纯静态文件；
            同仓库另有第 2 层本地 Python 实验，两层互不调用（见下方 Python Lab 面板）。
          </li>
        </ul>
      </section>

      <section className="card stack" data-testid="engineering-python-lab">
        <div className="card__head">
          <h2>Python Lab（第 2 层：本地实验）</h2>
          <span className="small muted">真实可运行 · 仅本机</span>
        </div>
        <p data-testid="python-lab-summary">{PY_LAB_SUMMARY}</p>
        <p className="small muted">{PY_LAB_TITLE} 的流水线阶段：<span className="mono">{PY_LAB_STAGES}</span></p>

        <h3>端点</h3>
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth: 480 }} data-testid="python-lab-endpoint-table">
            <thead>
              <tr>
                <th scope="col">方法</th>
                <th scope="col">路径</th>
                <th scope="col">说明</th>
              </tr>
            </thead>
            <tbody>
              {PY_LAB_ENDPOINTS.map((endpoint) => (
                <tr key={endpoint.method + endpoint.path}>
                  <td className="mono" style={{ textAlign: 'left' }}>
                    {endpoint.method}
                  </td>
                  <td className="mono" style={{ textAlign: 'left' }}>
                    {endpoint.path}
                  </td>
                  <td style={{ textAlign: 'left' }}>{endpoint.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>启动与测试命令</h3>
        <pre
          className="mono small"
          data-testid="python-lab-commands"
          style={{ margin: 0, overflowX: 'auto', background: 'var(--paper-200)', padding: 12, borderRadius: 10 }}
        >
          {PY_LAB_COMMANDS.join('\n')}
        </pre>
        <p className="small" data-testid="python-lab-verification">
          独立复核结果（{PY_LAB_VERIFICATION.verifiedDate}）：{' '}
          <span className="mono">{PY_LAB_VERIFICATION.command}</span> →{' '}
          <span className="mono">{PY_LAB_VERIFICATION.literal}</span>，即{' '}
          <span className="mono">{PY_LAB_VERIFICATION.passed} passed</span> /{' '}
          <span className="mono">{PY_LAB_VERIFICATION.warnings} warning</span>，退出码{' '}
          <span className="mono">{PY_LAB_VERIFICATION.exitCode}</span>。环境：pytest{' '}
          <span className="mono">{PY_LAB_VERIFICATION.pytest}</span>、Python{' '}
          {PY_LAB_VERIFICATION.python}。
        </p>
        <p className="small muted" data-testid="python-lab-verification-notes">
          {PY_LAB_VERIFICATION.warningNote}
          {PY_LAB_VERIFICATION.timingNote}
          {PY_LAB_VERIFICATION.liveSmoke}
        </p>

        <h3>四个关键性质</h3>
        <div className="grid grid--2">
          {PY_LAB_PROPERTIES.map((property) => (
            <article key={property.testId} className="card card--flat stack stack--sm" data-testid={property.testId}>
              <h4 style={{ margin: 0, fontSize: '0.98rem' }}>{property.title}</h4>
              <p className="small muted">{property.body}</p>
            </article>
          ))}
        </div>

        <p className="notice" data-testid="python-lab-limitation">
          <strong>局限（如实说明）：</strong>
          {PY_LAB_LIMITATION}
        </p>
        <p className="small muted" data-testid="python-lab-decoupling">
          {PY_LAB_DECOUPLING}
        </p>
      </section>

      <section className="card stack" data-testid="engineering-state-table">
        <h2>状态转移表</h2>
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th scope="col">当前阶段</th>
                <th scope="col">条件</th>
                <th scope="col">下一步</th>
              </tr>
            </thead>
            <tbody>
              {TRANSITIONS.map((row, index) => (
                <tr key={row.from + '-' + index}>
                  <td style={{ textAlign: 'left' }}>{row.from}</td>
                  <td style={{ textAlign: 'left' }}>{row.condition}</td>
                  <td style={{ textAlign: 'left' }} className="mono small">
                    {row.to}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          阶段顺序：{STAGE_ORDER.map((id) => STAGE_LABELS[id]).join(' → ')}。
        </p>
      </section>

      <section className="card stack" data-testid="engineering-verification">
        <h2>验证办法</h2>
        <ul className="bullet-list">
          <li>
            <span className="mono">npm run typecheck</span>：TypeScript 严格模式，不使用宽松逃逸。
          </li>
          <li>
            <span className="mono">npm run test</span>：纯函数单元测试，覆盖生成器不变量、种子可复现、
            榜单排序筛选分页、四场景状态机终态与指针行为。
          </li>
          <li>
            <span className="mono">npm run build</span>：先类型检查再打包，产物落在 <span className="mono">dist/</span>。
          </li>
          <li>
            <span className="mono">npm run preview</span>：以静态服务器复验构建产物，行为与 dev 一致。
          </li>
        </ul>
        <p className="small muted">
          <strong>分层说明：</strong>本静态展示层不包含 e2e 用例；浏览器端验收由独立 Agent 的
          Playwright 工装完成（不在本目录内），selector 契约见{' '}
          <span className="mono">docs/test-contract.md</span>。Python 实验层另有自己的 pytest 套件。
        </p>
      </section>

      <section className="card stack" data-testid="engineering-generator-note">
        <h2>数据生成方法</h2>
        <p>
          生成器使用固定 seed <span className="mono">{DEMO_SEED}</span> 的 mulberry32 伪随机数与
          Box–Muller 正态样本，为 24 个虚构标的各生成 <span className="mono">{BARS_PER_STOCK}</span> 根
          日 K 线（共 4,320 根），最后一根为 <span className="mono">{SERIES_END_DATE}</span>。
        </p>
        <ul className="bullet-list">
          <li>价格随机游走只用于产生可读的图形，不是市场模型，也不含任何私有策略公式。</li>
          <li>每根 K 线满足 low ≤ min(open, close) ≤ max(open, close) ≤ high，成交量与波动幅度相关。</li>
          <li>相同 seed 与相同标的定义必然产生完全相同的序列，摘要函数用于对比两次生成结果。</li>
          <li>交易日历只跳过周末，不引入真实节假日表，避免与真实市场日期混淆。</li>
        </ul>
      </section>

      <section className="card stack" data-testid="engineering-tradeoffs">
        <h2>权衡</h2>
        <ul className="bullet-list">
          <li>
            <strong>浏览器内模拟与真实服务：</strong>选择浏览器内纯函数模拟，换取离线可运行与零部署依赖；
            代价是无法证明真实并发、调度与持久化能力。
          </li>
          <li>
            <strong>原创 SVG 与图表库：</strong>手写 SVG 让依赖更少、渲染路径可预测；
            代价是缺少缩放、十字光标等高级交互。
          </li>
          <li>
            <strong>内存状态与持久化：</strong>不使用 localStorage，刷新即复位，便于演示与测试隔离；
            代价是无法跨会话保留观察列表。
          </li>
          <li>
            <strong>hash 路由：</strong>静态托管无需服务端 rewrite，子路径下直达链接可用。
          </li>
        </ul>
      </section>

      <section className="card stack" data-testid="engineering-contributions">
        <h2>我的工作与工程取舍</h2>
        <ul className="bullet-list">
          <li>
            <strong>需求与产品设计：</strong>我确定目标受众与 1／3／5 分钟浏览路径，规划榜单、详情、观察与任务演示的功能范围。
          </li>
          <li>
            <strong>架构与工程要求：</strong>我明确静态体验与 FastAPI 本地实验的双层结构，将版本一致性、失败拒绝发布、幂等与冲突处理设为核心展示与验收目标。
          </li>
          <li>
            <strong>公开与交付：</strong>我要求数据从零合成、私有实现隔离，并确定独立仓库、GitHub Pages 与第一版不附开源许可证的发布方式。
          </li>
          <li>
            <strong>开发方式：</strong>我使用 AI 编程工具辅助代码实现、测试与文档整理，并安排交叉检查；项目方向、核心需求与发布决策由我主导，不将 AI 辅助开发表述为全部代码手工编写。
          </li>
          <li>演示的数据、代码、图表与文案全部在本独立目录从零制作，未复制任何外部仓库内容。</li>
          <li>
            <strong>局限：</strong>本项目不包含真实行情、真实 AI 调用、真实账户或下单能力；
            阶段耗时是演示动画，不代表生产性能；Python 实验为内存单进程，不作队列化生产能力证明。
          </li>
          <li>静态模拟与本地实验通过，只证明其自身逻辑，不能推导出生产环境下的容量、准确性或投资价值。</li>
        </ul>
        <p className="small muted">
          当前覆盖的场景：{SCENARIOS.map((scenario) => scenario.label).join(' / ')}。
        </p>
      </section>

      <p className="disclaimer">
        本页描述仅适用于本 Demo 仓库的两层内容；任何外部系统的实现细节、规模数字与运行日志都不在本演示范围内。
      </p>
    </div>
  );
}
