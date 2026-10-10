# LUMEN 前端 selector 契约（供独立 QA 使用）

READY: 2026-10-10T05:55:00Z

本文档是前端与 QA 工装之间的唯一契约。实现必须与本文一致；若实现需要调整，
先改本文档再改实现，并在「变更记录」追加一行。

约定：

- 所有交互控件都是语义元素：`<button>`、`<nav>`、`<a>`、`<h1>–<h3>`、`<table>`、
  `<select>`、`<input>`。`data-testid` 只做定位，不替代语义。
- 需要断言的动态值同时写入 `data-*` 属性（例如 `data-status`、`data-published`、
  `data-verdict`），避免只靠文本匹配。
- 页面全部离线：不请求任何远程字体、图片、CDN、API。`base: './'`，
  `dist` 静态预览与 `vite dev` 行为一致（见第 3 节）。

## 1. 路由（hash）

| 路径 | 页面 | 页面根 testid |
| --- | --- | --- |
| `#/` | 首页 | `page-home` |
| `#/leaderboard` | 模拟榜单 | `page-leaderboard` |
| `#/stock/:symbol` | 虚构标的详情（例如 `#/stock/DEMO007`） | `page-stock` |
| `#/watchlist` | 观察与持仓示意 | `page-watchlist` |
| `#/tasks` | 任务演示（六阶段状态机） | `page-tasks` |
| `#/engineering` | 工程说明 | `page-engineering` |
| `#/history` | 历史快照 | `page-history` |

未知 hash 落到首页，且仍渲染 `page-home`。哈希变化不触发整页刷新。

## 2. 全局

| testid | 元素 | 说明 |
| --- | --- | --- |
| `app-root` | `div` | 应用根容器 |
| `site-nav` | `nav` | 主导航 |
| `nav-home` `nav-leaderboard` `nav-watchlist` `nav-tasks` `nav-engineering` | `a` | 导航链接（`href="#/..."`），当前页带 `aria-current="page"` |
| `synthetic-badge` | `span` | 常驻声明「合成数据 · 模拟执行」，每页都存在 |
| `nav-open-tasks` | `button` | 导航内「演示日更」入口，等价于跳转 `#/tasks` |
| `skip-to-content` | `a` | 跳转到 `main` 的跳过链接 |

## 3. 运行环境预期

以下在 `npm run build` 产物 + `npm run preview`（`http://127.0.0.1:4173/`）与
`npm run dev`（`http://127.0.0.1:5173/`）下都必须成立，无 dev-only 场景：

- 七个页面直接访问 hash 均可渲染；`#/stock/DEMO007` 直接刷新可渲染。
- 图表为内联 SVG，无 canvas 时序依赖、无异步数据加载。
- 状态只在内存中，**不使用** `localStorage`/`sessionStorage`；刷新即回到初始状态，
  因此测试之间只需刷新页面即可隔离。
- 页面无任何非 `127.0.0.1`/`localhost` 网络请求。

## 4. 首页 `page-home`

| testid | 元素 | 说明 |
| --- | --- | --- |
| `home-title` | `h1` | 定位标题 |
| `home-pitch` | `p` | 一句话介绍 |
| `home-highlight-list` | `ul` | 工程亮点列表容器 |
| `home-highlight-1` `home-highlight-2` `home-highlight-3` | `li` | 三张工程亮点卡 |
| `home-path-list` | `ul` | 1/3/5 分钟浏览路径 |
| `home-path-1` `home-path-3` `home-path-5` | `li` | 三条路径（可点击入口卡） |
| `home-path-1-open` `home-path-3-open` `home-path-5-open` | `button` | 路径卡内入口：分别跳 `#/leaderboard`、`#/tasks`、`#/engineering` |
| `home-open-tasks` | `button` | 「演示日更」入口，点击进入 `#/tasks` |
| `home-open-leaderboard` | `button` | 进入 `#/leaderboard` |
| `home-hero-figure` | `figure` | hero 右区微型示意图容器（桌面在右，窄屏堆叠到下方） |
| `home-stage-pointer-figure` | `svg` | 阶段与指针示意图（原创 SVG，非装饰性位图） |
| `home-stage-pointer-release` | `text` | 图内快照 ID，**动态绑定当前已发布指针**（`data-pointer` 与文本同值）；正常场景发布后与 `home-stat-release-version`、`tasks-pointer-release` 一致 |
| `portfolio-layer-static` | `article` | 双层作品卡第 1 层：浏览器内静态体验 |
| `portfolio-layer-static-open-tasks` | `button` | 第 1 层卡内入口，跳 `#/tasks` |
| `portfolio-layer-python` | `article` | 双层作品卡第 2 层：本地 Python 实验 |
| `portfolio-layer-python-open-engineering` | `a` | 第 2 层卡内入口，`href="#/engineering"` |
| `home-stat-data-date` | `dd` | 当前数据日期 |
| `home-stat-research-date` | `dd` | 当前研究日期（未完成时文本为「未完成」） |
| `home-stat-release-version` | `dd` | 当前已发布版本号（未发布时文本为「未发布」） |
| `home-release-state` | `p` | 文本含 `已发布` 或 `未发布`，并带 `data-published="true|false"` |

## 5. 模拟榜单 `page-leaderboard`

| testid | 元素 | 说明 |
| --- | --- | --- |
| `leaderboard-title` | `h1` | 标题 |
| `leaderboard-release-version` | `span` | 当前**已发布**快照 ID（初始 `demo-snapshot-002`；正常发布后 `demo-snapshot-003`） |
| `leaderboard-data-date` | `span` | 已发布榜单的数据日期（初始 `2030-11-29`） |
| `leaderboard-unpublished` | `div` | **仅当最近一次演示运行被阻断时存在**，含文本「未发布」与阻断原因 |
| `leaderboard-historical-note` | `p` | 位于 `leaderboard-unpublished` 内，文本含「历史」与旧数据日期 |
| `leaderboard-filter-search` | `input` | 关键字筛选（匹配 symbol 或名称） |
| `leaderboard-filter-trend` | `select` | 趋势筛选，option value：`全部` `上行` `震荡` `回调` |
| `leaderboard-filter-turnover` | `select` | 最小成交额筛选（单位：万元），option value：`0` `2000` `5000` `10000` |
| `leaderboard-sort-key` | `select` | 排序字段，option value：`displayScore` `changePct` `volume` `turnover` `close` `symbol` |
| `leaderboard-sort-dir` | `button` | 切换升降序，文本 `降序` / `升序`，带 `data-dir="desc|asc"` |
| `leaderboard-filter-reset` | `button` | 重置筛选与排序 |
| `leaderboard-count` | `p` | 命中行数，形如 `命中 12 / 24`，带 `data-total` 与 `data-matched` |
| `leaderboard-table` | `table` | 榜单表格 |
| `leaderboard-head-symbol` `leaderboard-head-name` `leaderboard-head-close` `leaderboard-head-change` `leaderboard-head-volume` `leaderboard-head-turnover` `leaderboard-head-score` `leaderboard-head-trend` | `th` | 表头单元格 |
| `leaderboard-row` | `tr` | 数据行，每行带 `data-symbol` |
| `leaderboard-cell-close` `leaderboard-cell-change` `leaderboard-cell-score` `leaderboard-cell-trend` | `td` | 行内单元格（行内可重复） |
| `leaderboard-detail-link` | `a` | 行内进入详情，`href="#/stock/<symbol>"`，带 `data-symbol` |
| `leaderboard-empty` | `p` | 无命中时显示（有命中时不存在） |
| `leaderboard-pagination` | `nav` | 分页容器 |
| `leaderboard-page-prev` `leaderboard-page-next` | `button` | 上一页/下一页，越界时 `disabled` |
| `leaderboard-page-indicator` | `span` | 形如 `第 1 / 2 页`，带 `data-page` 与 `data-page-count` |

默认排序：`displayScore` 降序；默认页大小 20；24 个合成标的因此是 2 页。

榜单数据来源 = **已发布指针**对应的数据日期（初始 D1=`2030-11-29`）。被阻断的演示运行
不会改写该指针，因此榜单仍显示 D1 数据，并在 `leaderboard-unpublished` 中说明「本次未发布」。

## 6. 标的详情 `page-stock`

| testid | 元素 | 说明 |
| --- | --- | --- |
| `stock-title` | `h1` | 名称 |
| `stock-symbol` | `span` | 虚构标识，形如 `DEMO007`，带 `data-symbol` |
| `stock-version-banner` | `p` | 数据版本说明；带 `data-published="true|false"` |
| `stock-chart-container` | `div` | 图表容器 |
| `stock-chart-svg` | `svg` | K 线/价格 SVG，带 `data-bars="<渲染根数>"` |
| `stock-chart-legend` | `ul` | 图例 |
| `stock-range-switch` | `div` | 周期切换容器（`role="group"`） |
| `stock-range-20` `stock-range-60` `stock-range-120` `stock-range-180` | `button` | 周期按钮，当前项 `aria-pressed="true"` |
| `stock-stat-close` `stock-stat-change` `stock-stat-high` `stock-stat-low` `stock-stat-volume` | `dd` | 统计值 |
| `stock-add-watch` | `button` | 加入观察；已在观察中时 `disabled` |
| `stock-remove-watch` | `button` | 移出观察；不在观察中时 `disabled` |
| `stock-watch-state` | `span` | `data-watching="true|false"` |
| `stock-unknown` | `div` | 未知 symbol 时显示（合法 symbol 时不存在） |

## 7. 观察与持仓 `page-watchlist`

| testid | 元素 | 说明 |
| --- | --- | --- |
| `watchlist-title` | `h1` | 标题 |
| `watchlist-count` | `p` | 观察数量，带 `data-count` |
| `watchlist-list` | `ul` | 观察列表 |
| `watchlist-item` | `li` | 每项带 `data-symbol` |
| `watchlist-remove` | `button` | 每项移除按钮，带 `data-symbol` |
| `watchlist-empty` | `p` | 观察为空时显示 |
| `watchlist-reset` | `button` | 恢复初始观察与持仓 |
| `holdings-panel` | `section` | 持仓示意区 |
| `holdings-count` | `p` | 持仓数量，带 `data-count`（初始 3） |
| `holding-item` | `li` | 每项带 `data-symbol` |
| `holdings-notice` | `p` | 「仅示意、不接账户、不提供下单」声明 |

## 8. 任务演示 `page-tasks`

| testid | 元素 | 说明 |
| --- | --- | --- |
| `tasks-title` | `h1` | 标题 |
| `tasks-scenario-select` | `select` | 场景选择，option value：`normal` `research_failed` `version_mismatch` `data_failed` |
| `tasks-scenario-option-normal` `tasks-scenario-option-research_failed` `tasks-scenario-option-version_mismatch` `tasks-scenario-option-data_failed` | `button` | 场景快捷按钮，选中项 `aria-pressed="true"` |
| `tasks-scenario-desc` | `p` | 场景说明 |
| `tasks-run` | `button` | 运行演示；运行中 `disabled` |
| `tasks-reset` | `button` | 重置到初始态（未运行） |
| `tasks-run-id` | `span` | 形如 `run-0001`，带 `data-run-id` |
| `tasks-stage-list` | `ol` | 六阶段列表 |
| `tasks-stage-ingest` `tasks-stage-validate` `tasks-stage-compute` `tasks-stage-gate` `tasks-stage-candidate` `tasks-stage-publish` | `li` | 阶段节点，带 `data-stage` 与 `data-status` |
| `tasks-stage-status` | `span` | 阶段内状态徽标（阶段内可重复），带 `data-status` |
| `tasks-stage-note` | `span` | 阶段内说明（阶段内可重复） |
| `tasks-gate-verdict` | `p` | 门禁结论，文本含 `SUCCESS` 或 `BLOCKED`，带 `data-verdict="SUCCESS|BLOCKED|PENDING"` 与 `data-code` |
| `tasks-release-version` | `dd` | 当前已发布版本，未发布时文本 `未发布` |
| `tasks-data-date` | `dd` | 数据日期 |
| `tasks-research-date` | `dd` | 研究日期，未完成时 `未完成` |
| `tasks-pointer-release` | `dd` | 发布指针版本（失败时保持不变） |
| `tasks-latest-region` | `section` | 最新结果区 |
| `tasks-latest-unpublished` | `div` | **仅当最新结果未发布时存在**，文本含「未发布」与原因 |
| `tasks-latest-published` | `div` | **仅当最新结果已发布时存在**，带 `data-release` 与 `data-data-date` |
| `tasks-receipt-list` | `ul` | 回执列表 |
| `tasks-receipt-item` | `li` | 每条回执带 `data-level="info|warn|error|ok"` |
| `tasks-history-link` | `a` | 跳转 `#/history` |
| `tasks-repeat-note` | `p` | 重复运行说明，带 `data-run-count` |

阶段状态取值（`data-status`）：`pending` `running` `ok` `failed` `blocked` `skipped`。

六阶段顺序：`ingest`（数据生成）→ `validate`（数据校验）→ `compute`（研究任务）→
`gate`（一致性门禁）→ `candidate`（候选快照）→ `publish`（发布）。
注意 QA 清单里的 `ingest/validate/compute/gate/publish` 五个之外，`candidate` 是本实现的
第六个节点，同样带 `data-testid`。

场景 → 结果（可断言）：

| 场景 | `tasks-gate-verdict` | `data-verdict` | `data-code` | 发布 | 指针 |
| --- | --- | --- | --- | --- | --- |
| `normal` | `门禁结论：SUCCESS` | `SUCCESS` | `OK` | 新快照 `demo-snapshot-003`（数据日期 `2030-12-31`） | 推进 |
| `research_failed` | 含 `BLOCKED` | `BLOCKED` | `RESEARCH_INCOMPLETE` | 未发布 | 不变 |
| `version_mismatch` | 含 `BLOCKED` | `BLOCKED` | `VERSION_MISMATCH` | 未发布 | 不变 |
| `data_failed` | 含 `BLOCKED` | `BLOCKED` | `DATA_VALIDATION_FAILED` | 未发布 | 不变 |

初始指针快照为 `demo-snapshot-002`，数据日期 `2030-11-29`。

## 8.1 快照 ID 与示例日期（独立设计）

本 Demo 不复用任何外部发布批次编号或批次日期：

| 项 | 取值 |
| --- | --- |
| 快照 ID 命名 | `demo-snapshot-NNN`（`001` 最旧，`002` 初始指针，`003` 正常场景发布） |
| 初始指针快照 | `demo-snapshot-002`，数据日期 `2030-11-29` |
| 正常场景发布快照 | `demo-snapshot-003`，数据日期 `2030-12-31` |
| 合成序列区间 | `2030-04-24` → `2030-12-31`（180 根，全部落在 2030 虚构日历内） |
| 历史快照列表 | `demo-snapshot-002`（`2030-11-29`）、`demo-snapshot-001`（`2030-10-25`） |
| 示例日期性质 | 虚构日历（2030 年），**非实际交易日** |

页面顶部常驻补充声明 `example-date-notice`：示例日期为虚构日历（2030 年），非实际交易日。
被阻断场景的断言不受影响：`tasks-pointer-release` 保持 `demo-snapshot-002`。

## 9. 工程说明 `page-engineering` / 历史 `page-history`

| testid | 元素 | 说明 |
| --- | --- | --- |
| `engineering-title` | `h1` | 标题 |
| `engineering-architecture` | `section` | 架构与数据流 |
| `engineering-state-table` | `table` | 状态转移表 |
| `engineering-verification` | `section` | 验证办法 |
| `engineering-tradeoffs` | `section` | 权衡 |
| `engineering-contributions` | `section` | 贡献与局限 |
| `engineering-generator-note` | `p` | 数据生成方法说明（含 seed 与根数） |
| `engineering-python-lab` | `section` | Python Lab 面板（第 2 层：本地实验） |
| `python-lab-summary` | `p` | 实验定位说明 |
| `python-lab-endpoint-table` | `table` | 真实端点表（GET /health、POST /demo/runs、GET /demo/runs/{run_id}、GET /demo/runs、GET /demo/published） |
| `python-lab-commands` | `pre` | 真实启动与测试命令（venv / pip / pytest / uvicorn / live_smoke） |
| `python-lab-verification` | `p` | 独立复核的 pytest 字面结果：`72 passed, 1 warning in 1.77s`，退出码 0，pytest `9.1.1`，Python 3.12.10，复核日期 2026-10-10 |
| `python-lab-verification-notes` | `p` | 口径说明：那 1 条 warning 是第三方弃用提示（starlette.testclient / httpx），不是「零告警」；耗时是单次挂钟时长，不是性能声明；并附 live_smoke 说明 |
| `python-lab-property-idempotency` | `article` | 幂等重放 |
| `python-lab-property-conflict` | `article` | 409 冲突 |
| `python-lab-property-digest` | `article` | 摘要校验（规范化 JSON + SHA-256） |
| `python-lab-property-pointer` | `article` | 失败指针不变 |
| `python-lab-limitation` | `p` | 内存单进程局限说明 |
| `python-lab-decoupling` | `p` | 两层互不调用说明 |
| `history-title` | `h1` | 标题 |
| `history-snapshot-list` | `ul` | 历史快照列表 |
| `history-snapshot-item` | `li` | 每条带 `data-release` 与 `data-data-date` |
| `history-not-latest-badge` | `span` | 文本「历史 / 非最新」（列表内可重复） |

## 10. 变更记录

- 2026-10-10：首版契约，随前端初版实现一同发布。
- 2026-10-10：独立性修正，快照 ID 与示例日期改为本 Demo 自有设计（见 8.1）。
- 2026-10-10：双层作品集成修正，新增首页双层卡 / 路径入口卡 / hero 示意图，Engineering 新增 Python Lab 面板；
  selector 只新增、不改名、不删除。原「无后端 / 不包含 e2e」表述改为分层说明。
- 2026-10-10：依赖安全升级，Vitest 3.2.7 → 5.0.3（移除 `tinypool` 传递依赖），
  `npm audit` 全量归零；测试配置与单元测试行为未改，selector 无变化。
- 2026-10-10：Python Lab 验证文案收尾，改用独立复核的当前值
  （`72 passed, 1 warning in 1.77s`，pytest 9.1.1，复核日期 2026-10-10），
  并新增 `python-lab-verification-notes` 说明告警来源与耗时口径；原 `python-lab-verification` 保留。
- 2026-10-10：hero 示意图指针去硬编码。`StagePointerDiagram` 改为接收 `pointerRelease` prop，
  由首页传入 `pointer.release`；新增 `home-stage-pointer-release`（带 `data-pointer`）。
  修复前正常场景发布后图内仍显示 `demo-snapshot-002`，与统计卡 `demo-snapshot-003` 矛盾。
