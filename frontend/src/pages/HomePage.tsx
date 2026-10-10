import type { RunState } from '../contracts/types';
import { formatCn } from '../simulation/calendar';
import { navigateTo } from '../state/navigation';
import { Sparkline } from '../components/Sparkline';
import { StagePointerDiagram } from '../components/StagePointerDiagram';
import { PY_LAB_SUMMARY, PY_LAB_TITLE } from '../content/python-lab';
import { useApp } from '../state/store';

function releaseStateText(run: RunState): string {
  if (run.verdict === 'BLOCKED') return '最近一次模拟运行未发布；当前榜单仍为历史版本。';
  if (run.verdict === 'SUCCESS') return '最近一次模拟运行已发布新版本。';
  return '尚未运行演示；当前榜单为已发布的历史版本。';
}

export function HomePage() {
  const { pointer, rows, run, series } = useApp();
  const sample = series.slice(0, 3);
  const published = run.verdict !== 'BLOCKED';

  return (
    <div className="stack" data-testid="page-home">
      <section className="card card--ink stack">
        <div className="hero">
          <div className="stack">
            <p className="eyebrow" style={{ color: 'rgba(20,194,172,0.9)' }}>
              2027 届 · Python 后端 / 软件工程 · 求职演示
            </p>
            <h1 data-testid="home-title">LUMEN 合成研究工作台</h1>
            <p data-testid="home-pitch" style={{ maxWidth: '62ch' }}>
              一个用独立合成数据演示「多阶段日更 → 数据校验 → 研究任务 → 一致性门禁 → 候选快照 →
              发布」的股票研究工作台。重点不是收益，而是数据与研究分层、版本一致性与失败时拒绝发布。
            </p>
            <div className="pill-group">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="home-open-tasks"
                onClick={() => navigateTo({ kind: 'tasks' })}
              >
                演示日更
              </button>
              <button
                type="button"
                className="btn btn--on-ink"
                data-testid="home-open-leaderboard"
                onClick={() => navigateTo({ kind: 'leaderboard' })}
              >
                查看模拟榜单
              </button>
            </div>
            <dl className="stat-list">
              <div className="stat">
                <dt>数据日期</dt>
                <dd data-testid="home-stat-data-date">{pointer.dataDate}</dd>
              </div>
              <div className="stat">
                <dt>研究日期</dt>
                <dd data-testid="home-stat-research-date">{pointer.researchDate}</dd>
              </div>
              <div className="stat">
                <dt>已发布版本</dt>
                <dd data-testid="home-stat-release-version">{pointer.release}</dd>
              </div>
              <div className="stat">
                <dt>合成规模</dt>
                <dd>24 标的 × 180 根</dd>
              </div>
            </dl>
            <p className="small" data-testid="home-release-state" data-published={String(published)}>
              {releaseStateText(run)}
            </p>
          </div>
          <figure className="hero__figure" data-testid="home-hero-figure">
            <StagePointerDiagram pointerRelease={pointer.release} />
            <figcaption className="small" style={{ color: 'rgba(244,248,251,0.66)' }}>
              示意：阶段可能阻断，已发布指针不因此推进。
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="stack">
        <div className="card__head">
          <h2>双层作品</h2>
          <span className="muted small">两层各自独立，互不调用</span>
        </div>
        <div className="grid grid--2">
          <article className="card stack stack--sm" data-testid="portfolio-layer-static">
            <span className="eyebrow">第 1 层 · 你现在看到的</span>
            <h3>浏览器内静态体验</h3>
            <p className="small muted">
              本 React/TypeScript 站点：七个页面、固定 seed 的 24 个虚构标的与 4,320 根合成 K 线、
              六阶段状态机、发布门禁与历史快照。全部在浏览器内存中运行，纯静态托管。
            </p>
            <ul className="bullet-list small">
              <li>无后端连接：页面不向任何服务发起请求，也没有接口地址可配置。</li>
              <li>状态只存在当前会话内存，刷新即复位。</li>
              <li>用「演示日更」即可走完正常与三种阻断路径。</li>
            </ul>
            <div className="pill-group">
              <button
                type="button"
                className="btn btn--ghost"
                data-testid="portfolio-layer-static-open-tasks"
                onClick={() => navigateTo({ kind: 'tasks' })}
              >
                进入任务演示
              </button>
            </div>
          </article>
          <article className="card stack stack--sm" data-testid="portfolio-layer-python">
            <span className="eyebrow">第 2 层 · 同仓库的本地实验</span>
            <h3>{PY_LAB_TITLE}</h3>
            <p className="small muted">{PY_LAB_SUMMARY}</p>
            <ul className="bullet-list small">
              <li>真实可运行的 FastAPI 服务与 pytest 套件，只在你自己机器上跑。</li>
              <li>覆盖幂等重放、409 冲突、SHA-256 数据版本与失败指针不变。</li>
              <li>与本静态站点互不调用：前端不请求它，它也不装 CORS。</li>
            </ul>
            <div className="pill-group">
              <a
                className="btn btn--ghost"
                data-testid="portfolio-layer-python-open-engineering"
                href="#/engineering"
              >
                查看 Python Lab 面板
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="grid grid--3">
        <div className="card stack stack--sm">
          <span className="eyebrow">亮点 1</span>
          <h3>阶段化日更与失败关闭</h3>
          <p className="small muted">
            六个阶段各自有明确状态与回执。任一阶段失败时下游跳过，运行以 BLOCKED 收尾，不产生伪成功。
          </p>
        </div>
        <div className="card stack stack--sm">
          <span className="eyebrow">亮点 2</span>
          <h3>版本一致性门禁</h3>
          <p className="small muted">
            发布前校验研究完整性与输入数据版本。研究未完成或版本不匹配时保留已发布指针，不把旧结果贴上最新日期。
          </p>
        </div>
        <div className="card stack stack--sm">
          <span className="eyebrow">亮点 3</span>
          <h3>可复现的合成数据</h3>
          <p className="small muted">
            固定 seed 与纯函数生成器：24 个虚构标的、每个 180 根 OHLCV，两次生成结果完全一致。
          </p>
        </div>
      </section>

      <section className="card stack">
        <div className="card__head">
          <h2>工程亮点卡</h2>
          <span className="muted small">每项都可在本仓库复现</span>
        </div>
        <ul className="bullet-list" data-testid="home-highlight-list">
          <li data-testid="home-highlight-1">
            <strong>纯函数状态机：</strong>阶段推进是 <span className="mono">tick(state)</span> 的纯函数，
            相同输入必然得到相同输出，可直接单元测试。
          </li>
          <li data-testid="home-highlight-2">
            <strong>契约先行：</strong>Demo 自有类型与不变量校验独立于展示层；
            <span className="mono"> docs/test-contract.md</span> 描述全部可测试 selector。
          </li>
          <li data-testid="home-highlight-3">
            <strong>离线优先：</strong>无远程字体、图片、CDN 或 API；构建产物为纯静态文件，
            断网后交互仍然成立。
          </li>
        </ul>
      </section>

      <section className="card stack">
        <div className="card__head">
          <h2>1 / 3 / 5 分钟浏览路径</h2>
          <span className="muted small">每张卡都可直接进入对应页面</span>
        </div>
        <ul className="grid grid--3 path-list" data-testid="home-path-list">
          <li className="card card--flat path-card stack stack--sm" data-testid="home-path-1">
            <span className="eyebrow">1 分钟 · 看懂定位</span>
            <h3>这是做什么的</h3>
            <p className="small muted">
              首页定位与模拟声明 → 模拟榜单 → 一个虚构标的详情 → 工程亮点。
            </p>
            <div className="pill-group">
              <button
                type="button"
                className="btn"
                data-testid="home-path-1-open"
                onClick={() => navigateTo({ kind: 'leaderboard' })}
              >
                看模拟榜单
              </button>
            </div>
          </li>
          <li className="card card--flat path-card stack stack--sm" data-testid="home-path-3">
            <span className="eyebrow">3 分钟 · 看懂门禁</span>
            <h3>失败时拒绝发布</h3>
            <p className="small muted">
              任务演示 → 选择「研究未完成」→ 查看阻断与回执 → 切回正常场景。
            </p>
            <div className="pill-group">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="home-path-3-open"
                onClick={() => navigateTo({ kind: 'tasks' })}
              >
                演示日更
              </button>
            </div>
          </li>
          <li className="card card--flat path-card stack stack--sm" data-testid="home-path-5">
            <span className="eyebrow">5 分钟 · 看懂工程</span>
            <h3>设计与验证证据</h3>
            <p className="small muted">
              工程说明 → 状态转移表与测试 → 数据生成方法 → Python Lab → 贡献与局限。
            </p>
            <div className="pill-group">
              <button
                type="button"
                className="btn"
                data-testid="home-path-5-open"
                onClick={() => navigateTo({ kind: 'engineering' })}
              >
                看工程说明
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section className="card stack">
        <div className="card__head">
          <h2>榜单预览</h2>
          <span className="muted small">数据日期 {formatCn(pointer.dataDate)}</span>
        </div>
        <div className="grid grid--3">
          {sample.map((item) => {
            const closes = item.bars.slice(-30).map((bar) => bar.close);
            return (
              <div key={item.meta.symbol} className="stack stack--sm">
                <span className="mono small muted">{item.meta.symbol}</span>
                <strong>{item.meta.name}</strong>
                <Sparkline values={closes} label={`${item.meta.name} 近 30 根合成收盘价走势`} />
                <span className="small muted">{item.meta.sector} · {item.meta.trend}</span>
              </div>
            );
          })}
        </div>
        <p className="small muted">
          当前榜单共 {rows.length} 行，来自已发布指针 {pointer.release}（数据日期 {pointer.dataDate}）。
        </p>
      </section>

      <p className="disclaimer">
        声明：全部标的、价格、榜单、账户与运行记录均为独立构造的模拟数据；非实时行情；
        当前交互在浏览器内执行，无生产后端连接。原私有项目仅作为高层背景，
        其代码、数据、策略命名、阈值与日志均未进入本演示。
      </p>
    </div>
  );
}
