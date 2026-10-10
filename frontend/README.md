# LUMEN · 合成研究工作台（前端）

离线可运行的静态前端，用来演示一个「多阶段日更 + 版本一致性 + 失败拒绝发布」的
研究工作台体验。所有标的、价格、榜单、观察、持仓、运行记录与回执都是本项目
从零构造的合成数据；页面不连接任何后端服务，也不调用任何远程接口。

## 常驻声明

> 合成数据 · 模拟执行

页面顶部常驻该声明。所有阶段推进、模拟耗时、失败回执均由浏览器内的
TypeScript 纯状态机生成，不代表 Python 服务、定时任务或真实队列的执行结果。

## 快速开始

```bash
npm install
npm run dev        # 本地开发预览，默认 http://127.0.0.1:5173/
npm run typecheck  # 类型检查
npm run test       # 纯 TS 单元测试（状态机 / 生成器 / 契约 / 榜单）
npm run build      # 类型检查 + 生产构建，产物在 dist/
npm run preview    # 预览构建产物，默认 http://127.0.0.1:4173/
```

## 环境与依赖

| 项 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | 24.15.0（本机实测） | Vitest 5.0.3 要求 `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`，满足 |
| npm | 11.14.1（本机实测） | 使用 lockfile v3 |
| Vite | 7.3.7 | Vitest 5 的 peer 要求为 `^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`，满足 |
| TypeScript | 5.9.3 | 严格模式 |
| Vitest | 5.0.3 | 测试运行器（node 环境，纯函数单测） |
| React / React DOM | 19.x | 运行期依赖 |

`npm audit`（全量，含 dev 依赖）当前为 **0 漏洞**。此前 3 项告警
（`tinypool` critical ×2、`@vitest/mocker` moderate）来自旧版 Vitest 3.2.7 的传递依赖，
升级到 Vitest 5.0.3 后该依赖已不在依赖树中，单元测试行为未做任何规避性改动。

## 浏览路径

- 1 分钟：首页定位与模拟声明 → 模拟榜单 → 一个虚构标的详情 → 工程亮点。
- 3 分钟：任务演示 → 选择「研究未完成」→ 查看阻断与回执 → 切回正常场景。
- 5 分钟：工程说明 → 状态转移与测试 → 数据生成方法 → 贡献与局限。

## 目录

```text
src/
  contracts/     Demo 自有类型与不变量校验
  simulation/    PRNG、OHLCV 生成器、榜单派生、六阶段状态机、场景与回执
  state/         React 上下文存储与 hash 路由
  components/    图表与展示组件（原创 SVG）
  pages/         首页 / 榜单 / 详情 / 观察持仓 / 任务演示 / 工程说明 / 历史
docs/
  test-contract.md   各页面 selector 契约（供 QA 使用）
  architecture.md    模块边界与数据流
  demo-boundaries.md 模拟边界与来源声明
tests/unit/          纯函数单元测试
```

## 边界

本目录不含任何私有项目的代码、数据、策略命名、阈值、日志、回执原件或截图；
合成数据生成器没有真实行情导入分支。详情见 `docs/demo-boundaries.md`。
