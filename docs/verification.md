# 独立验收记录（verification）

**审查者**：独立 Coding Agent（`/root/portfolio_review`），与前端实现者 `/root/portfolio_frontend`、
Python 实现者 `/root/portfolio_python` 分离。**不是人类审查**，也不能替代人类判断。

**日期**：2026-10-10（Asia/Shanghai）。**环境**：Windows，PowerShell；Node v24.15.0、npm 11.14.1、
Python 3.12.10、git 2.54.0；浏览器用本机已安装的 Edge（`channel: msedge`），不下载额外浏览器。

**记录原则**：下面每条都是本次**实际复跑**的字面输出与退出码。凡未执行的项，一律显式写
「未覆盖」，不用推断代替证据。原始回执另存 `qa/results/`（属不公开清单）。

---

## 1. 前端静态站（`frontend/`）

### 1.1 类型检查 / 单元测试 / 构建

| # | 命令（cwd = `stock-monitor-demo/frontend`） | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | `tsc --noEmit`，无输出 | **0** |
| 2 | `npm run test` | `RUN v5.0.3`，`Test Files 5 passed (5)` / `Tests 53 passed (53)` | **0** |
| 3 | `npm run build` | `✓ 56 modules transformed`；`dist/index.html 0.90 kB`、`dist/assets/index-CFEluCgZ.css 11.33 kB`、`dist/assets/index-Bi6ZfU9Z.js 296.09 kB`；`✓ built in 879ms` | **0** |

首轮（13:5x）曾得到两个**真实缺陷**，已由前端实现者修复并复验通过：

```
src/components/CandlestickChart.tsx(60,9): error TS6133: 'closes' is declared but its value is never read.
src/main.tsx(4,8): error TS2307: Cannot find module './styles/global.css' or its corresponding type declarations.
```

以及 `npm run test` 当时的 `No test files found, exiting with code 1`（`tests/unit/**` 尚不存在）。
修复后上表 1–3 全部通过。**保留此段是为了如实记录「曾失败 → 修复 → 复验」的过程**，
而不是只留最终绿灯。

### 1.2 锁文件可复现安装

在独立临时副本中验证（避免影响实现者正在使用的 `node_modules`）：

**当前（最终 lock，vitest 5.0.3）**

| 命令 | 字面结果 | 退出码 |
| --- | --- | --- |
| 复制 `frontend/package.json` + `package-lock.json` 到 `qa/results/npm-ci-probe-final/`，再 `npm ci --no-audit --no-fund --prefix <probe>` | `added 87 packages in 3s` | **0** |

复核：该副本的 `package-lock.json` 中 `vitest` 为 `5.0.3`、`tinypool` 条目**不存在**，
与当前依赖树一致。

**历史记录（早期 lock，vitest 3.2.7，已过时）**

| 命令 | 字面结果 | 退出码 |
| --- | --- | --- |
| 同法在 `qa/results/npm-ci-probe/` 复跑（当时 lock） | `added 105 packages in 3s` | **0** |

说明：`105 packages` 属于**依赖升级之前**的旧 lock（当时含 `tinypool` 等），已不再代表当前状态；
保留此行仅为记录过程。另：直接在 `frontend/` 运行 `npm ci` 会因实现者的 dev 服务器占用
`node_modules/@esbuild/win32-x64/esbuild.exe` 而报 `EPERM: unlink`（退出码 -4048）——这是 Windows
文件占用，不是锁文件缺陷，故一律在副本中验证。

### 1.3 浏览器端到端（Playwright，正式 `dist` 预览 `http://127.0.0.1:4173`）

| # | 命令（cwd = `stock-monitor-demo/qa`） | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 4 | `npx playwright test --project=desktop-chromium --project=mobile-390`（合并复跑，含双层集成与指针一致性） | `1 skipped` / `22 passed (52.9s)` | **0** |
| 5 | `$env:QA_SUBPATH_URL='http://127.0.0.1:4180/lumen-synthetic-research-workbench/#/leaderboard'; npx playwright test --project=desktop-chromium e2e/subpath.spec.ts` | `1 passed (1.4s)` | **0** |

> 该行是**历史回执原文**，其中的子路径 `lumen-synthetic-research-workbench` 是当时的占位仓库名。
> 发布准备已把默认仓库名改为目标仓库 `lumen-research-workbench`
> （`scripts/serve-subpath.mjs`、`qa/e2e/subpath.spec.ts`）；目标站点
> `https://fpj5085.github.io/lumen-research-workbench/` 当时**尚未部署**。**发布后已补测**：
> 针对线上站点的子路径用例 `1 passed`（首次因 CDN 冷启动失败一次，随后连续复跑通过），
> 见 `qa/results/release-verify-2026-10-10/06-live-subpath.txt`（ignored）。

> 第 2–5 项在**前端依赖升级（vitest 3→5）之后**重新独立复跑，结果不变；
> `vitest.config.ts` 与 5 个单测文件哈希未变，说明测试行为未被规避。

桌面用例覆盖：首页声明与工程亮点卡、**双层作品卡与 1/3/5 路径入口（点击跳转正确）**、
**工程页展示 Python Lab 的真实端点/命令/局限**、**静态层从不请求 8001**、
榜单筛选/排序/分页/详情图/周期切换/加入观察、
四个场景的门禁结论与**已发布指针不变量**、阻断后榜单仍停在旧数据日期、正常运行推进指针、
历史快照逐条带「历史 / 非最新」、重置回到初始态、重复阻断运行不产生伪发布、未知 hash 回首页。

移动端（390×844）覆盖：首页、榜单、任务阻断、详情图，逐页断言
`documentElement.scrollWidth <= clientWidth`（无整页水平溢出）。

子路径用例使用审查者自建的无 rewrite 静态服务器（`scripts/serve-subpath.mjs`），
模拟 GitHub Pages 项目站 `/<repo>/`：hash 深链直达、刷新、资源全部 200、无 4xx。

### 1.4 离线行为（两种性质分别验证）

| # | 场景 | 做法 | 字面结果 | 结论 |
| --- | --- | --- | --- | --- |
| 7 | A：外网被断，本地静态源仍可访问 | `context.route('**/*')` 放行同源、`abort` 其余全部请求 | `QA_OFFLINE_A_BLOCKED_HOSTS=[]`，测试通过 | 页面**零**非同源请求；不依赖任何 CDN/字体/行情/AI 主机 |
| 8 | B：页面加载后浏览器完全 offline | `context.setOffline(true)` 后仅做页内 hash 导航与交互 | 通过；`QA_OFFLINE_B_RELOAD=RELOAD_FAILED(page.reload: net::ERR_INTERNET_DISCONNECTED)` | 已加载后交互成立；**断网重载失败属预期**，本项目不是 PWA，重载能力**不作为**要求 |

区分说明（按父代理要求）：A 证明「没有第三方依赖」，B 证明「加载后不依赖网络」；
「缓存后重载」不在必测范围，仅作记录。

### 1.5 截图

| 命令（cwd = `stock-monitor-demo`） | 字面结果 | 退出码 |
| --- | --- | --- |
| `node qa/tools/capture-screenshots.mjs` | 9 张写入 `docs/screenshots/`（工程页已按最新构建重拍） | **0** |

均为本 Demo **自己渲染**的新画面（桌面首页、榜单、详情、观察、历史、工程说明、
任务拒发布 BLOCKED、移动端首页与任务），**不含**任何私有项目素材或第三方课程图表。

---

## 2. Python 实验（`python-lab/`）

| # | 命令（cwd = `stock-monitor-demo/python-lab`） | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 9 | `.venv\Scripts\python.exe -m pytest -q` | `72 passed, 1 warning in 1.77s`（pytest 9.1.1） | **0** |
| 10 | `.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider ..\qa\python\test_python_lab_contract.py`（审查者独立编写，不依赖实现者测试细节） | `20 passed, 1 warning in 1.33s` | **0** |
| 11 | `.venv\Scripts\python.exe -m demo_lab --port 8001`（真实 uvicorn）后 `.venv\Scripts\python.exe scripts/live_smoke.py` | `checks: 12  passed: 12  failed: 0` / `live smoke test: OK` | **0** |

> 第 9–11 项在 **`pytest` 依赖修复（8.4.2 → 9.1.1）之后**重新独立复跑，结果不变。
> 修复只改依赖约束（`requirements-dev.txt` / `pyproject.toml`），**未改**任何实现或测试源码
> （`python-lab/src/**`、`python-lab/tests/**` 哈希与修复前一致，见 `public-file-manifest.md`）。

第 10 项独立断言的行为（均为黑盒：只看 HTTP 状态码与响应体）：

- `/health` 自述 `synchronous-in-process` / `queue=none` / `persistence=in-memory-only`；
- 初始 `published` 为 `null`，**不**用旧快照冒充最新；
- `research_failed` / `version_mismatch` / `data_invalid` 三场景均 `blocked`，且已发布指针**逐字节不变**；
- 被阻断的运行仍可 `GET /demo/runs/{id}` 查询（拒绝是可审计的）；
- 同 key 同 payload 返回**完全相同**的回执且 `run_count` 不增；同 key 不同 payload → **409** + `idempotency_key_reused`；
- 缺 key / 过短 key / 未知字段 → 422；
- 数据版本由内容派生：同 seed 相同、异 seed 不同；`expected_data_version` 不符 → `data_version_mismatch` 且指针不动；
- 重复发布同一版本 → `no_change` + `already_published`；
- 阶段顺序含 `publish`，阻断时 `publish=skipped`；
- 快照 `row_count == len(rows)`；未知 run_id → 404；
- 8 线程并发同 payload：仅 1 次 `published`，`publish_count == 1`；
- **无 CORS 头**（无中间件，`Origin` 不被回显）；根路径 `demo_only=true`。

### 2.1 第三方依赖弃用告警（如实记录，未消除）

两次 pytest 都产生**同一个**告警，来源是第三方库而非本项目代码：

```
.venv\Lib\site-packages\fastapi\testclient.py:1
  StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
```

影响与处理：这是 `fastapi`/`starlette` 与 `httpx` 之间的上游弃用提示，出现在
`TestClient` 导入路径上。本次**未**修改依赖版本去消除它（会引入未验证的版本变动）。
记录为已知噪音，不影响上述 72/20/12 项的结论。

### 2.2 同步内存锁与单进程边界

独立核实（读实现 + 并发测试）：`store.py` 用单个可重入锁 `RLock` 保护每次读写，
整次 run 在持锁期间执行，因此**幂等原子**、**发布单飞**。这是**单进程内存态**设计：
多 worker 各自持有独立 store，故本项目**不适用**多进程部署。它不是后台队列，
也不是工作流引擎——「阶段」是同进程内的函数调用。以上与 README 表述一致。

---

## 3. 未覆盖项（显式声明，不用推断代替）

| 项 | 状态 | 原因 |
| --- | --- | --- |
| 依赖漏洞审计（Python） | **已跑且已修复，见 `security-review.md` 3.3 节** | 首轮发现 `pytest` PYSEC-2026-1845；修复后 dev / runtime / venv 三路审计均 0 |
| 依赖漏洞审计（Node） | **已跑，见 `security-review.md` 3.1–3.2 节** | 前端全量 0 告警；与「代码/隐私边界扫描」是**两类不同检查**，结论不互相推导 |
| 生产并发 / 容量 / 延迟 | **未覆盖** | 无生产服务可测；本地 demo 数字不能外推 |
| 真实行情准确性 / 投资价值 | **不适用** | 全部为合成数据 |
| 人工验收 | **未完成** | 由用户本人执行 |
| 公开仓库 / Pages / 部署 | **已执行（2026-10-10）** | 仓库 public、Pages `build_type=workflow`、run `38046892528` success |
| 目标 Pages 站点子路径复测 | **已覆盖（发布后）** | 线上 `subpath.spec.ts` 1 passed；线上全量浏览器套件仍未重跑 |

### 3.1 已协调关闭的文案项（保留历史）

| 项 | 位置 | 处理结果 |
| --- | --- | --- |
| 工程页展示的 pytest 回执（旧值） | `frontend/src/content/python-lab.ts` | **已修复**：由 `'72 passed, 1 warning in 2.50s'`（pytest 8.4.2 时期历史回执）改为独立复核值 `'72 passed, 1 warning in 1.77s'`，并新增 `python-lab-verification-notes`（pytest `9.1.1`、日期 `2026-10-10`、明确说明那 1 条 warning 是第三方弃用提示、**不是「零告警」**、耗时非性能指标） |

审查者已用 e2e 断言核对：工程页显示 `1.77s` / `9.1.1` / `2026-10-10`，且**不再包含** `2.50s`（见 `qa/e2e/integration.spec.ts`）。

### 3.2 已关闭的指针一致性缺陷（保留历史）

| 项 | 位置 | 状态 |
| --- | --- | --- |
| 首页 hero 微型示意图的快照 ID 与真实指针不一致 | `frontend/src/components/StagePointerDiagram.tsx`（原硬编码 `demo-snapshot-002`） | **已修复并复验**：组件改为接收 `pointerRelease` prop，由首页传入 `pointer.release`，并新增 `home-stage-pointer-release`（带 `data-pointer`） |

**修复前证据（保留）**：

```
[pointer] before run: figure=demo-snapshot-002 home-stat=demo-snapshot-002
[pointer] after  run: figure=demo-snapshot-002 home-stat=demo-snapshot-003 tasks-pointer=demo-snapshot-003
[pointer] RESULT: INCONSISTENT -> hero figure "demo-snapshot-002" != home stat "demo-snapshot-003"
退出码 1
```

**修复后复验（最终）**：

| # | 命令（cwd = `stock-monitor-demo`） | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 12 | `node qa/tools/check-pointer-consistency.mjs` | `figure=demo-snapshot-003 home-stat=demo-snapshot-003 tasks-pointer=demo-snapshot-003` / `RESULT: CONSISTENT at demo-snapshot-003` | **0** |

并已固化为常驻 e2e 断言：`qa/e2e/integration.spec.ts` 的
`hero pointer figure stays consistent with the real published pointer`
（断言 hero `data-pointer` == 首页统计 == 任务页指针，且运行后确实推进）。

**当前无开放的实现侧缺陷。**

---

## 4. 结论

- 前端：类型检查、53 项单元测试、构建、18 项桌面 e2e（含 4 项双层集成/一致性）、4 项移动 e2e、1 项子路径 e2e 全部通过（退出码 0）。
- Python：实现者 72 项 + 审查者独立 20 项 + 真实 socket 冒烟 12 项全部通过（退出码 0）。
- 离线与子路径属性成立；页面无任何非同源请求。
- 首轮发现的 2 个前端缺陷（typecheck 2 处 + 无单测）、工程页旧回执文案、hero 示意图硬编码指针
  共 3 类实现侧问题**均已修复并复验**（见 3.1 / 3.2 节）。**当前无开放的实现侧缺陷。**
- **已无未修复的依赖告警**：前端 `vitest` 链 3 条与 Python `pytest` 1 条均已修复并由审查者复测为 0。
- 上述通过**只**证明该 Demo 自身逻辑与静态托管属性，**不**证明生产可靠性、
  行情准确性或投资价值。依赖漏洞审计的覆盖范围见 `security-review.md`。

### 4.1 保留的本地预览（供用户即时体验）

| 项 | 值 |
| --- | --- |
| URL | `http://127.0.0.1:4173/`（仅绑定 `127.0.0.1`，未对外） |
| 服务进程 | PID `96224`（`node`，`vite preview`，由前端实现者启动） |
| 服务的产物 | `frontend/dist`，入口引用 `assets/index-Bi6ZfU9Z.js`（296.09 kB，当前构建） |
| 重启命令 | cwd = `frontend`，执行 `npm run preview` |

审查者自建的临时子路径服务器（`127.0.0.1:4180`）已在复验后关闭；Python 实验的 uvicorn（`127.0.0.1:8001`）也已停止。
