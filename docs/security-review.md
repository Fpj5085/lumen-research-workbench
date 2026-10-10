# 公开边界与安全审查（security-review）

**审查者**：独立 Coding Agent（`/root/portfolio_review`）。**日期**：2026-10-10。

本文件区分**两类不同的检查**，它们的结论**不能互相推导**：

- **A. 代码 / 隐私公开边界扫描**——找「不该公开的内容」（私有路径、秘密、真实标识）。
- **B. 依赖漏洞审计**——找「公开依赖里已知的 CVE」。

> 边界扫描 `findings=0` **不**等于依赖安全；依赖审计无高危**也**不**等于仓库无隐私残留。
> 两者各自只覆盖自己的问题域。

---

## 1. A 类：公开边界扫描（已执行）

**工具**：`scripts/scan-public-boundary.mjs`（审查者编写，仓库内可复跑）。
**范围**：整个 `stock-monitor-demo` 工作树，含 `frontend/src`、`frontend/dist`、
`python-lab/src`、`python-lab/tests`、`qa/`、`scripts/`、`docs/`、根文件。

| # | 命令（cwd = `stock-monitor-demo`） | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 1 | `node scripts/scan-public-boundary.mjs . --json qa/results/boundary-scan.json`（**最终复扫**） | `text files=98 binary files=9 bytes=7728798` / `symlinks/junctions=0 findings=0` / `by category: {}` | **0** |

> 首轮扫描时目录更小（当时为 `text files=89 ... bytes=6241017`），因为 `docs/` 与部分文件尚未创建；
> 上表为**最终**计数。

扫描的类别（每类命中只输出**路径 + 行号 + 类别**，从不打印匹配值）：

| 组 | 类别 |
| --- | --- |
| 秘密 | 私钥块、AWS Access Key ID、GitHub token、Slack token、OpenAI 风格 key、Google API key、JWT 字面量、赋值型凭据（`api_key=`/`password=` 等）、数据库连接串、Basic 认证头 |
| 网络 | 绝对 `http(s)://` / `ws(s)://` URL、非标准主机端口 |
| 私有 | 私有项目名（以本 Demo 名为后缀者除外）、本机工作区路径、私有交接件关键词、私有策略命名列表 |
| 真实标识 | A 股 6 位代码、指数代码、上市公司名称后缀词 |
| 个人信息 | 身份证号、手机号、邮箱 |

**扫描过程中发现并已修复的 1 个真实边界问题**（保留记录，不隐去）：

| 类别 | 位置（修复前） | 问题 | 处理 |
| --- | --- | --- | --- |
| `private:source-project-name` | `python-lab/src/demo_lab/app.py:44` | FastAPI `title` 含私有原项目目录名，公开 Swagger 标题会暴露 | 已改为 `LUMEN Python Lab (synthetic demo)`；`store.py:44` 的 `SERVICE_NAME` 一并改为 `lumen-python-lab` |

复扫结果：`findings=0`（退出码 0）。

### 1.1 来源判定（未读取私有仓库做对比）

按任务要求，**没有**读取私有仓库做逐文件 diff。改用以下**可自证**的证据判定独立性：

- **来源记录**：逐文件来源见 `docs/file-origins.md`；全部标注「从零写 / 自生成 / 第三方依赖」。
- **路径与秘密扫描**：上表第 1 项，私有路径与私有项目名零命中。
- **真实标识扫描**：A 股代码 / 指数代码 / 公司后缀零命中；标的为 `DEMO001`–`DEMO024`。
- **外呼网络测试**：浏览器 e2e 中断言零非同源请求（`docs/verification.md` 1.4 节，`QA_OFFLINE_A_BLOCKED_HOSTS=[]`）。
- **无 symlink 依赖**：扫描报告 `symlinks/junctions=0`；目录内不存在指向私有目录的链接。
- **无 `.git` 复用**：新目录的 Git 历史为空（见第 4 节）。

### 1.2 明确的局限（不声称万能保证）

1. **启发式而非证明**：正则 + 熵规则只能说明「未命中已知模式」，**不能证明**不存在秘密或私有内容。
2. **只扫工作树**：不读 Git 历史、packed objects，也不扫工作树之外的被忽略路径。
3. **二进制不查内容**：二进制文件只登记大小与哈希（当前 9 个，均为本 Demo 自有 PNG 截图）。
4. **不做网络出口实测之外的流量分析**：仅断言浏览器请求的同源属性。
5. **未做人工逐行审读**：本报告由 Agent 生成，**不是**人类安全审计。

---

## 2. A 类补充：网络与外呼属性（已执行）

| 检查 | 证据 | 结果 |
| --- | --- | --- |
| 页面加载与交互期间是否有非同源请求 | `qa/e2e/offline.spec.ts` 用例 A | `QA_OFFLINE_A_BLOCKED_HOSTS=[]`，零非同源请求 |
| 断网后是否仍可交互 | 用例 B（`setOffline(true)`） | 通过 |
| 源码 / 产物中的外呼代码 | 静态扫描 + 实现者复核 | 无 `fetch` 指向外部主机、无 WebSocket、无 CDN/字体外链 |
| Python 实验是否被前端调用 | 无 CORS 中间件；前端不引用 8001 | 二者完全解耦 |

---

## 3. B 类：依赖漏洞审计（已执行，范围与结论如下）

原始 JSON 回执保存在 `qa/results/`（不公开）。使用 `npm audit`，**只读依赖元信息**，
不上传任何项目文件。

### 3.1 前端（`frontend/`）——当前状态：**0 告警**

| 命令 | 字面结果 | 退出码 |
| --- | --- | --- |
| `npm audit --omit=dev --json` | `"vulnerabilities": {}`，`total: 0` | **0** |
| `npm audit --json` | `{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}`，`totalDependencies: 137` | **0** |

**历史记录（已修复，非当前待决）**：首轮全量审计曾报 3 条告警，全部来自旧版
`vitest@3.2.7` 的传递依赖：

| 包 | 严重度 | 通告 | 影响范围 |
| --- | --- | --- | --- |
| `tinypool` | critical | GHSA-5gmw-xhrv-c9v3、GHSA-85c8-ppgw-ccpr（原型污染 → RCE） | `<=2.1.1`，经 `vitest` 引入 |
| `@vitest/mocker` | moderate | GHSA-82fw-gwwq-j7x9（路径穿越 / 任意文件读取） | `>=2.1.0 <4.1.11`，经 `vitest` 引入 |
| `vitest` | （继承上二者） | — | 修复建议为升到 `vitest@5.0.3` |

**处置（已完成并由审查者独立复验）**：前端实现者将 `vitest` 由 `^3.2.4` 升到 `^5.0.3`
（实际安装 5.0.3）。Vitest 4.1.11 与 5.0.3 都**不再依赖** `tinypool`，故属消除根因而非压制告警。

独立复核证据：

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 依赖树 | `node -e` 读取 `package-lock.json` | `vitest@5.0.3`、`@vitest/mocker@5.0.3`；`tinypool` 条目**不存在** |
| 全量审计 | `npm audit --json` | `total: 0` |
| 测试行为未被规避 | `npm run test` | `RUN v5.0.3`，`Tests 53 passed (53)`，退出码 0；`vitest.config.ts` 与 5 个测试文件哈希未变 |
| 运行时未受影响（升级当时） | `npm run build` | `dist/assets/index-DoJzCh1k.js 295.16 kB`、`index-CFEluCgZ.css 11.33 kB`——与升级前**同名同体积**，证明升级未触碰 runtime |

**结论**：3 条 dev 链告警已**修复**（不是「已接受」），当前前端全量审计为 0 漏洞。

> 注：此后为修正工程页回执文案与首页指针示意图，runtime bundle 正常地重新生成过两次
> （`index-DoJzCh1k.js` → `index-BafdRqNm.js` → **`index-Bi6ZfU9Z.js` 296.09 kB**，CSS 哈希始终未变）。
> **当前有效产物是 `index-Bi6ZfU9Z.js`**；`index-DoJzCh1k.js` 只是**依赖升级当时**用于证明
> 「升级未影响 runtime」的同名同体积证据，**不是**当前产物。

### 3.2 QA 工装（`qa/`）

| 命令 | 字面结果 | 退出码 |
| --- | --- | --- |
| `npm audit --omit=dev --json` | `"vulnerabilities": {}`，`total: 0` | **0** |
| `npm audit --json` | 同为零告警 | **0** |

`qa/` 只有 `@playwright/test` 一条 dev 依赖链（Apache-2.0）。

### 3.3 Python（`python-lab/`）——已执行

工具：`pip-audit 2.10.1`，安装在审查者自有目录 `qa/.audit-venv`（已加入 `.gitignore`，不公开）。
审计只读取 `python-lab` 的依赖元信息（包名与版本），**不**读取任何私有项目、**不**修改
`python-lab` 实现文件。使用公开漏洞库（PyPI / OSV）。

**当前状态：已修复（0 告警）**，由审查者独立复测确认：

| 命令 | 字面结果 | 退出码 |
| --- | --- | --- |
| `pip_audit -r python-lab/requirements-dev.txt` | `No known vulnerabilities found` | **0** |
| `pip_audit --path python-lab/.venv/Lib/site-packages` | `No known vulnerabilities found`；另注 `lumen-python-lab` 因不在 PyPI 被跳过 | **0** |
| `pip_audit -r python-lab/requirements.txt`（**runtime 依赖**） | `No known vulnerabilities found` | **0** |

**历史记录（已修复，非当前待决）**：首轮审计（修复前）报告 1 项：

| 包 | 版本 | 通告 | 修复版本 | 说明 |
| --- | --- | --- | --- | --- |
| `pytest` | 8.4.2 | `PYSEC-2026-1845` / `CVE-2025-71176` / `GHSA-6w46-j5rx-g56g` | 9.0.3 | pytest ≤ 9.0.2 在 UNIX 上使用 `/tmp/pytest-of-{user}` 目录模式，本地用户可造成拒绝服务或可能提权 |

当时字面输出为 `Found 2 known vulnerabilities in 1 package`，退出码 1；根因是
`requirements-dev.txt` 与 `pyproject.toml` 的 dev extra 都把 `pytest` 钉在 `>=8.0,<9.0`，
装不到修复版本 9.0.3。

**处置（已完成）**：Python 实现者把约束改为 `pytest>=9.0.3,<10.0`（`requirements-dev.txt`
与 `pyproject.toml` 同步），并显式声明 `anyio>=4.4,<5.0`。审查者复测：安装版本 `pytest 9.1.1`，
dev / runtime / 全 venv 三路审计均 `No known vulnerabilities found`（退出码 0），
且 `pytest -q` 仍为 `72 passed`（见 `verification.md` 第 2 节）。

原始 JSON 已存：`qa/results/pip-audit-python-lab-dev.json`、`qa/results/pip-audit-python-lab-venv.json`。

> 全包清单（`vulns: []`，即已查且无已知漏洞）：`fastapi 0.143.0`、`pydantic 2.14.0`、
> `pydantic-core 2.50.0`、`uvicorn 0.54.0`、`httpx 0.28.1`、`httpcore 1.0.9`、`starlette 1.7.0`、
> `anyio 4.15.1`、`certifi 2026.7.22`、`idna 3.20`、`h11 0.16.0`、`click 8.5.0`、
> `colorama 0.4.6`、`pluggy 1.6.0`、`iniconfig 2.3.1`、`Pygments 2.21.0`、
> `opentelemetry-api 1.45.1`、`typing-extensions 4.16.0`、`typing-inspection 0.4.4`、
> `annotated-doc 0.0.5`、`annotated-types 0.8.0`。

---

## 4. Git 历史与发布状态

按父代理指示，在**新目录**建立**空的新历史**（不复制 `.git`、不 commit、不设 remote、不 push）：

| # | 命令（cwd = `stock-monitor-demo`） | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 2 | `git init --initial-branch=main` | `Initialized empty Git repository in <repo-root>/.git/`（本机绝对路径已隐去） | **0** |
| 3 | `git remote -v` | 无输出（**无任何 remote**） | 0 |
| 4 | `git log --oneline` | `fatal: your current branch 'main' does not have any commits yet` | 128 |
| 5 | `git branch --show-current` | `main` | 0 |
（上表第 6 项的 `4 行` 是**早期快照**，当时 `docs/`、`README.md` 等尚未创建。）

**最终复核（收尾时重跑）**：

| # | 命令 | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 7 | `git status --porcelain` | **8 行**未跟踪：`.gitignore`、`LICENSE`、`README.md`、`docs/`、`frontend/`、`python-lab/`、`qa/`、`scripts/` | 0 |

> 上表第 7 行是**历史回执原文**（当时 `LICENSE` 尚存在）。发布准备已删除该拟议 `LICENSE`，
> 并新增 `.github/workflows/`，因此当前未跟踪项为 `.github/`、`.gitignore`、`README.md`、
> `docs/`、`frontend/`、`python-lab/`、`qa/`、`scripts/`。
| 8 | `git remote -v` | 无输出（**无任何 remote**） | 0 |
| 9 | `git log --oneline` | `fatal: your current branch 'main' does not have any commits yet` | 128 |
| 10 | `git branch --show-current` | `main` | 0 |

**结论（发布前快照）**：Git 历史为**空的新历史**，分支 `main`，**零 commit、零 remote、未 push**。
私有仓库的 `.git` 未被复制或引用。第 4/9 项的退出码 128 是「尚无提交」的正常表现，不是错误。

---

## 5. 发布准备状态（安全相关）

1. **许可证**：**第一版不附开源许可证**。拟议 `LICENSE` 已按发布准备要求删除；仓库内不存在
   任何 `LICENSE*` 文件，也**没有** MIT / Apache-2.0 等开源授权声明（第三方依赖各自的
   许可证不受影响，见第 3 节）。
2. **公开动作**：公开发布已获授权（目标仓库 `Fpj5085/lumen-research-workbench`）；
   创建仓库、push、启用 Pages 与部署**当时尚未执行**；该步骤已于 2026-10-10 完成
   （commit `637dabbcdc3e3bea922929e15ab4f38e9e07f10a`，run `38046892528` success）。
3. **人工复核**：本报告为 Agent 产出，公开前建议由本人抽查 `docs/file-origins.md`
   与 `docs/public-file-manifest.md` 的清单。

已关闭项（不再待决）：

- 前端 `vitest` 链 3 条告警：升级 `vitest@5.0.3` **已修复**，当前全量 `npm audit` 为 0（3.1 节）。
- Python `pytest` CVE：放宽到 `pytest>=9.0.3` **已修复**，dev / runtime / venv 三路审计均 0（3.3 节）。

---

## 6. 发布前独立验收（浏览器 / 子路径 / Python 契约 / 边界）

**验收者**：独立 Coding Agent（`/root/release_review`）。**日期**：2026-10-10 18:54–19:05（+08:00）。
**性质**：只读验收。未执行 `npm ci` / `build` / `commit` / `push` / 上传；未访问私有项目；
仅操作本 Demo 自身进程。本节记录的是**可公开**的验收口径与结果。

### 6.1 浏览器端到端（复用已存在的 4173 preview）

| # | 命令 | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 1 | `npx playwright test`（`qa/`，channel `msedge`，1 worker，baseURL `http://127.0.0.1:4173`） | `22 passed` / `1 skipped` / 23 tests，53.3s | 0 |

覆盖范围：桌面流程 12 项（首页声明与发布态、榜单筛选/排序/分页/详情/图表/自选、四个任务场景
的 verdict 与 pointer 不变式、blocked run 保持旧发布日、normal run 推进新发布、历史页恒标
“历史/非最新”、reset、重复 blocked 幂等、未知 hash 回落首页）；两层集成 4 项（含
“静态层从不联系 Python 服务”）；离线 2 项（第三方 host 全阻断；断网后免刷新仍可交互）；
移动 390 4 项（无整页横向溢出、任务与详情可用）。

跳过 1 项为 `subpath.spec.ts`（未提供 `QA_SUBPATH_URL` 时的**配置性跳过**，不是失败），
该项在 6.2 单独复跑并通过。

### 6.2 子路径托管（GitHub Pages project site 语义）

| # | 命令 | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 2 | `node scripts/serve-subpath.mjs 4180 lumen-research-workbench frontend/dist` | 前缀外 `/` → 404；`/lumen-research-workbench/` → 200 | 0 |
| 3 | `QA_BASE_URL=http://127.0.0.1:4180/lumen-research-workbench/` + `QA_SUBPATH_URL=…/#/leaderboard` 后 `npx playwright test e2e/subpath.spec.ts` | `1 passed` | 0 |

该 spec 断言：直接深链可渲染、`reload` 无需服务器重写、hash 导航到榜单可出数据、
无任何 ≥400 响应、**跨源请求为 0**。服务器刻意不做 SPA fallback，与 Pages project site 行为一致。

### 6.3 Python 实验契约

| # | 命令 | 字面结果 | 退出码 |
| --- | --- | --- | --- |
| 4 | `python-lab\.venv python -m pytest tests -q` | `72 passed`（1 条 starlette/httpx 弃用告警） | 0 |
| 5 | `python -m pytest qa/python/test_python_lab_contract.py -q` | `20 passed`（collect-only 确认恰为 20 项） | 0 |

### 6.4 源 / 产物 / 暂存 / 新历史边界

- `LICENSE`：`Test-Path` = False；递归 `LICENSE*/COPYING*/NOTICE*` = 0；`git add --dry-run`
  中 `LICENSE` 计数 0。三个包清单均无 `license` 字段。
- Git：`## No commits yet on main`、0 tracked、`count-objects` 全 0（无新历史、无 stash）、无 remote。
- `git check-ignore` 逐项命中：`frontend/dist/` ← `frontend/.gitignore:2`；
  `python-lab/.local-verification/` ← `python-lab/.gitignore:6`；`qa/results/` ← `.gitignore:22`；
  `qa/node_modules/` ← `.gitignore:25`；`python-lab/.venv/` ← `python-lab/.gitignore:1`；
  `qa/.audit-venv/` ← `.gitignore:27`。
- `git add --dry-run --all` 共 105 项，其中命中
  `node_modules|dist/|venv|local-verification|qa/results|test-results|.env|secret|token|plan`
  的条目数 = **0** → 私有 plan、真实运行日志、本地回执、依赖目录与构建产物均**不进入** source git。
- `docs/screenshots/` 9 张 PNG 的 SHA-256(16) 与 `public-file-manifest.md` 完全一致
  （例：`desktop-engineering.png` 1870926 / `BFB67D639175059F`），即素材未变化，
  此前完成的独立视觉检查结论继续有效。

### 6.5 公开边界扫描 7 处 URL 命中的裁决（保留 scanner 原样）

`node scripts/scan-public-boundary.mjs` 报告 `findings=7`，全部属
`net:absolute-http-url`：`.github/workflows/README.md:43`、`docs/verification.md:69`、
`qa/e2e/subpath.spec.ts:8`、`README.md:167/177/199`、`scripts/serve-subpath.mjs:13`。

逐行核对上下文后判定为**真实误报**：全部是本站自有的未来 Pages 地址
`https://fpj5085.github.io/lumen-research-workbench/` 或本机 `http://127.0.0.1` 开发地址，
不含凭据、不指向第三方或生产端点、也不指向私有项目。该分类只是“任意绝对 http(s) URL”的
宽口径启发式，因此**不修改 scanner**，仅在此记录裁决。

> 提醒：扫描器只覆盖工作树——不读 git 历史、不内容扫描二进制（9 张 PNG）、不看被忽略文件。
> “未命中已知模式”不等于“已证明安全”。

### 6.6 待办与限制（不阻塞上述结论，但发布前需处理）

1. `docs/public-file-manifest.md` 的逐文件哈希表仍有 7 处与当前磁盘不一致
   （`README.md`、`docs/verification.md`、`docs/security-review.md`、`docs/file-origins.md`、
   `qa/e2e/subpath.spec.ts`、`scripts/serve-subpath.mjs` 等被后续修订的文件），
   属“冻结时需重算”的既有口径；宣布可发布前必须重算，否则表与快照不符。
2. `.github/workflows/pages.yml` 未在本机执行过（无 `act`、未 push），
   action 版本取自官方 release 元数据；首次 Actions 运行结论需人工查看。
3. 本节由 Agent 复跑得出，建议发布前由本人抽查关键命令。
