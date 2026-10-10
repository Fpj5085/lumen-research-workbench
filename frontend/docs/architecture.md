# 模块边界与数据流

## 分层

```text
src/contracts/types.ts        Demo 自有类型（标的、K 线、榜单行、运行状态、回执、指针）
src/simulation/prng.ts        确定性 PRNG（mulberry32）、FNV-1a 散列、Box–Muller 正态样本
src/simulation/calendar.ts    合成交易日历（只跳过周末）
src/simulation/generator.ts   24 标的 × 180 根 OHLCV 生成器、摘要函数
src/simulation/leaderboard.ts 榜单派生、排序 / 筛选 / 分页、展示格式化
src/simulation/scenarios.ts   四个场景定义、六阶段顺序与标签
src/simulation/state-machine.ts  纯函数状态机：startRun / tick / runToCompletion、指针与历史合并
src/state/router.ts           hash 解析与 href 生成
src/state/store.tsx           React 上下文容器：内存状态与定时推进
src/components/               原创 SVG 图表与展示组件
src/pages/                    七个页面
```

依赖方向单向：`pages → components/state → simulation → contracts`。
`simulation/` 与 `contracts/` 不导入 React，可脱离浏览器测试。

## 数据流

1. `buildDataset()` 以固定 seed 生成 24 个 `StockSeries`，每个 180 根 K 线，共 4,320 根。
2. `buildLeaderboard(series, pointer.dataDate)` 按**已发布指针**的数据日期截取 K 线并派生榜单行。
3. `applyQuery` / `paginate` 在展示层做排序、筛选与分页；它们是纯函数，输入相同则输出相同。
4. 任务演示运行状态机 `startRun` → `tick`：每次只推进一个阶段，终态后停止。
5. 只有 `normal` 场景在终态产生 `publishedThisRun`；容器据此推进已发布指针并追加历史快照。

## 指针与版本一致性

- 已发布指针 `PublishedPointer` 由 `release / dataDate / researchDate` 三字段组成，
  其中 `release` 是本 Demo 自有的快照 ID `demo-snapshot-NNN`。
- 初始指针为 `demo-snapshot-002`，数据日期 `2030-11-29`，明确是历史快照而非最新。
- 示例日期取自虚构日历（2030 年），不是实际交易日，也不对应任何外部批次日期。
- 三个失败场景的终态都不写指针；页面在「最新结果区」显示未发布，并说明原因码。
- 榜单始终从指针派生，因此失败运行后榜单仍显示历史版本，并在 `leaderboard-unpublished`
  中说明「本次未发布」，避免旧结果冒充最新。
- 历史快照只读，始终带「历史 / 非最新」徽标与原日期。

## 状态机不变量

| 不变量 | 断言位置 |
| --- | --- |
| 相同输入得到相同输出 | `tests/unit/state-machine.test.ts` |
| `tick` 不修改传入对象 | 同上（JSON 快照对比） |
| 失败场景指针不变且发布事件为零 | 同上（三个失败场景逐一断言） |
| 失败后可再次正常发布 | 同上 |
| 重复运行不累积发布 | 同上 |
| 每个阶段与终态都有回执 | 同上 |

## 构建与部署边界

- `base: './'`，产物为相对路径，可直接在任意子路径的静态服务器下打开。
- hash 路由，无需服务端 rewrite；`dist/index.html` 直达 `#/stock/DEMO007` 可正常渲染。
- 无远程字体、图片、CDN、API；断网后交互仍成立。
