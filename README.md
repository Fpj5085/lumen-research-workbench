# LUMEN · 合成研究工作台（求职 Demo）

一个**离线可运行**的作品集演示：用独立构造的合成数据，演示一条研究工作台的
关键工程属性——**多阶段日更、版本一致性、失败拒绝发布、历史快照不被冒充为最新**。

> 全部标的、价格、榜单、观察、持仓、运行记录与回执均为本项目从零构造的**合成数据**，
> 不是实时行情，也不是投资建议。示例日期取自虚构日历（2030 年），非实际交易日。
> 页面在浏览器内运行，不请求任何后端服务。

本仓库包含三块**性质不同**的内容，请先分清，再决定看哪一块：

| 层 | 位置 | 是什么 | 不是什么 |
| --- | --- | --- | --- |
| ① 私有背景（仅高层说明） | 本文「私有背景」一节 | 对本人一个私有项目的**高层、已审计**技术概括 | 不是可运行代码，不是当前生产状态证明 |
| ② 公开静态模拟 | `frontend/` | 纯前端、纯合成数据的静态演示站 | 不请求 Python，不连行情源，无后端 |
| ③ 公开 Python 实验 | `python-lab/` | 小型本地 FastAPI 实验，演示内存状态生命周期、幂等与 409 | 不是生产服务，不是私有后端开源 |

---

## 1 分钟 / 3 分钟 / 5 分钟浏览路径

| 时间 | 路线 | 应获得的理解 |
| --- | --- | --- |
| 1 分钟 | 首页定位与模拟声明 → 模拟榜单 → 一只虚构标的详情 → 工程亮点 | 做什么、全部是模拟、核心价值是可靠性 |
| 3 分钟 | 任务演示 → 选「研究未完成」→ 查看阻断 → 切回正常场景 | 数据更新 ≠ 研究发布；失败时旧结果不会冒充最新 |
| 5 分钟 | 工程说明 → 状态转移与测试 → 数据生成方法 → 贡献与局限 | 亮点可在独立仓库复现，而不是只靠截图或自述 |

页面：首页 `#/`、榜单 `#/leaderboard`、标的详情 `#/stock/DEMO007`、观察与持仓
`#/watchlist`、任务演示 `#/tasks`、工程说明 `#/engineering`、历史快照 `#/history`。

---

## 快速开始（可复制命令）

**环境要求**：Node.js **24 LTS**（本机实测 24.15.0，npm 11.14.1）、Python 3.12。
测试工具链 Vitest 5.0.3 的 engines 为 `^22.12.0 || ^24.0.0 || >=26.0.0`，
因此 Node 20 及更早版本**不满足**，请使用 22.12+ / 24 / 26+。

### Windows PowerShell

```powershell
# 在【独立终端】中执行；起点是仓库根目录（repo root），再 cd 进子目录。
# 以下 frontend 与 python-lab 是两个独立的交付层，各自单独执行、互不依赖。

# 静态演示前端
cd frontend
npm ci
npm run typecheck
npm run test
npm run build
npm run preview        # http://127.0.0.1:4173/
```

```powershell
# Python 实验（第二层交付：独立终端、独立虚拟环境；不是可选项）
cd python-lab
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pip install -e .
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m demo_lab --port 8001   # 仅本机回环
```

### macOS / Linux

```bash
# 在独立终端中执行，起点为仓库根目录（repo root）；两层各自独立、互不依赖。
cd frontend
npm ci
npm run typecheck
npm run test
npm run build
npm run preview        # http://127.0.0.1:4173/
```

```bash
# Python 实验是第二层交付（独立终端、独立虚拟环境），不是可选项。
cd python-lab
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pip install -e .
.venv/bin/python -m pytest -q
.venv/bin/python -m demo_lab --port 8001   # 仅本机回环
```

> 端口约定：静态预览 `4173`（`npm run preview`）、开发预览 `5173`（`npm run dev`）、
> Python 实验 `8001`（仅本机）。三者互不依赖；前端**不会**调用 `8001`。

---

## ② 公开静态模拟（`frontend/`）

- React 19 + TypeScript 5.9 + Vite 7，hash 路由，`base: './'`，可部署在任意子路径。
- 全部数据由固定 seed 的本地生成器构造：24 个虚构标的（`DEMO001`–`DEMO024`）×
  180 根日 K 线。图表为原创内联 SVG。
- 不请求任何远程资源（无字体 CDN、无图片外链、无行情 API、无埋点），断网后交互仍成立。
- 不使用 `localStorage` / `sessionStorage`；刷新即回到初始演示状态。
- 核心演示：六阶段日更状态机（`ingest → validate → compute → gate → candidate → publish`），
  以及「数据更新但研究未完成 / 研究输入版本不匹配 / 数据校验失败」时的**拒绝发布**与
  **已发布指针保持不变**。

详见 [frontend/README.md](frontend/README.md)、[frontend/docs/architecture.md](frontend/docs/architecture.md)、
[frontend/docs/demo-boundaries.md](frontend/docs/demo-boundaries.md)。

## ③ 公开 Python 实验（`python-lab/`）

一个独立的小型 FastAPI 实验，用真实 HTTP 演示三件事：

1. **数据版本由内容派生**（规范化 JSON + SHA-256），不能手工指定；
2. **输入不一致时发布指针不移动**：`research_failed` / `version_mismatch` / `data_invalid`
   三种场景均返回 `blocked`，且已发布指针逐字节保持；被阻断的运行仍可查询，因此拒绝是可审计的；
3. **幂等**：`POST /demo/runs` 要求 `Idempotency-Key`；同 key 同 payload 返回完全相同的回执，
   同 key 不同 payload 返回 **HTTP 409**。

它是**本地、单进程、内存态**的实验：重启即清空，没有数据库、没有消息队列、没有后台 worker、
没有鉴权。它**不是**生产服务，也**不是**任何私有系统的开源版本。
静态站与它完全解耦：前端从不调用它。

详见 [python-lab/README.md](python-lab/README.md)。

---

## 私有背景（仅高层，已审计）

本人另有一个**私有**的 Python 项目，本 Demo 的选题来自它的工程思路。以下只写经静态审计确认的
**高层事实**，不包含代码、数据、规则、阈值、日志、截图、路径或凭据：

- 技术栈：Python 3.12、FastAPI、Pydantic v2、异步 SQLAlchemy、Alembic、pyarrow/Parquet，
  并启用严格的类型检查与迁移工具链。
- 任务分层：数据更新、完成检查、状态回执与告警是分离的步骤，而不是一个脚本。
- 发布完整性机制：在**已核实的那部分发布路径 / 静态分支**上，发布前会检查研究完整性，
  并校验研究所声明的输入版本与实际数据版本是否一致，不一致则拒绝继续。
  （这是对该分支的静态核实，**不**概括为「所有发布模式都执行同一检查」。）

**证据边界（重要）**：以上是**对源码与配置的静态核实**，核实日期 2026-10-10。
它**不等于**「当前生产环境全部检查通过」，也**不构成**运行回执或性能数据。
本 Demo 中的**行情、账户与任务模拟字段**（标的、价格、榜单、观察、持仓、运行记录与回执）
全部由本项目从零合成；而**软件版本号与真实测试回执**是本 Demo 自己实测得到的真实结果，
不是合成数据。两者都不引用私有项目的测试数字、规模数字或运行状态。

私有项目保持私有；本仓库不包含它的任何实现、数据或历史。

---

## 来源与贡献

**全部内容在独立目录从零制作**：界面、图表、数据生成器、状态机、契约、测试与文档均为原创；
未复制任何私有仓库的代码、数据、规则、截图、日志或 Git 历史，也不存在指向私有目录的
符号链接、workspace 依赖或运行时读取。逐文件来源记录见
[docs/file-origins.md](docs/file-origins.md)。

角色说明（如实记录，不夸大）：

- **决策者 / 负责人**：本人。确定受众、体验目标、阶段边界与公开红线，并对最终验收负责。
- **执行者**：Coding Agent，按用户给出的需求、边界与验收目标完成审计、实现与测试。
- **独立审查者**：**另一个 Coding Agent**，与实现者分离，负责独立复跑与公开边界审查。
  这一独立审查**不是**人类审查，也**不能**替代人类判断。
- **人工验收状态**：用户尚未完成人工验收。上一条不代表已经过人工审查，也不暗示用户
  已认可实现结果。

## 验证状态（截至 2026-10-10）

**本次发布前本地复跑（2026-10-10，原始回执存 `qa/results/release-verify-2026-10-10/`，该目录被
`.gitignore` 排除）**：

| 命令（cwd） | 字面结果 | 退出码 |
| --- | --- | --- |
| `npm run typecheck`（`frontend`） | 无输出（`tsc --noEmit`） | **0** |
| `npm run test`（`frontend`） | `RUN v5.0.3`、`Test Files 5 passed (5)`、`Tests 53 passed (53)` | **0** |
| `npm run build`（`frontend`） | `✓ 56 modules transformed`、`dist/index.html 0.90 kB`、`dist/assets/index-CFEluCgZ.css 11.33 kB`、`dist/assets/index-Bi6ZfU9Z.js 296.09 kB`、`✓ built in 739ms` | **0** |
| `.venv\Scripts\python.exe -m pytest -q`（`python-lab`） | `72 passed, 1 warning in 2.70s`（warning 为第三方 `starlette`/`httpx` 弃用提示，非本项目告警） | **0** |

**发布状态：本地验证通过，尚未发布。** 仓库未创建、未 commit、未 push、Pages 未启用；
目标站点的实际访问与子路径行为**待发布后另行复测**，本文档不预先声称已通过。

- 独立审查者已在本机复跑前端 typecheck / 53 项单元测试 / 构建、22 项浏览器桌面与移动端流程
  通过、1 项条件跳过（子路径用例，未设 `QA_SUBPATH_URL` 时按配置跳过），另有一次
  单独带 `QA_SUBPATH_URL` 的子路径复跑通过；以及 Python 的 pytest 与真实 socket 冒烟测试。
  上述数字是**当时本机回执的历史口径**（详见 `docs/verification.md`），不是对
  `https://fpj5085.github.io/lumen-research-workbench/` 的测试结果——目标站点尚未部署，
  其子路径行为**待发布后另行复测**。
- 依赖审计：前端全量 `npm audit` = **0 漏洞**；Python **runtime** 与 **dev** 依赖审计均为 **0 漏洞**。
  首轮曾各发现前端 3 条（`vitest` 链）与 Python 1 条（`pytest` PYSEC-2026-1845）告警，
  均已修复并由独立审查者复测为 0（详见 `docs/security-review.md`）。
- 命令、字面结果、退出码与日期见 [docs/verification.md](docs/verification.md)；
  公开边界与安全审查见 [docs/security-review.md](docs/security-review.md)。
- **待用户实际验收**：上述结论来自自动与 Agent 审查，本人尚未完成人工验收。
- **发布状态**：公开发布已获授权；创建公开仓库、push、启用 Pages 与部署**尚未执行**。
  目标仓库 `Fpj5085/lumen-research-workbench`；Pages 站点
  `https://fpj5085.github.io/lumen-research-workbench/`。

## 局限

- 这是**静态演示 + 本地实验**，不证明生产并发、行情准确性、可用性或投资价值。
- Python 实验为单进程内存态，多 worker 不适用；「阶段」是同进程函数调用，不是工作流引擎。
- 自动扫描（正则 / 熵启发式）**不能证明**不存在秘密或私有内容，只能说明「未命中已知模式」。

## 许可证

本仓库**不附开源许可证**：仓库中不存在 `LICENSE` 文件，也**没有**声明 MIT、Apache-2.0
或其他开源授权条款。因此本项目按**保留所有权利**处理；未经版权人明确书面许可，
不授予复制、修改、分发或再许可的权利。

第三方依赖不受此影响，各自仍适用其上游许可证；清单见
[docs/public-file-manifest.md](docs/public-file-manifest.md) 的依赖小节。

## 部署（GitHub Pages）

静态层（`frontend/`）由 `.github/workflows/pages.yml` 构建并部署到 GitHub Pages：

- 目标仓库：`Fpj5085/lumen-research-workbench`
- 站点地址：`https://fpj5085.github.io/lumen-research-workbench/`
- 子路径：`/lumen-research-workbench/`（`vite.config.ts` 使用相对 `base: './'`，
  资源与 hash 路由都不依赖服务端 rewrite）

Python 实验（`python-lab/`）**不**参与该 workflow，也不部署到 Pages。
