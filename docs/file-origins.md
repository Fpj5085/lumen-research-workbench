# 逐文件来源记录（file-origins）

**审查者**：独立 Coding Agent（`/root/portfolio_review`）。**日期**：2026-10-10。

判定口径只有三类：

- **`原创`**——为本次 Demo 从零撰写，无外部来源。
- **`自生成`**——由本仓库脚本 / 构建工具在本地生成（可复跑）。
- **`依赖`**——来自公开包管理器的第三方包（许可证见 `docs/public-file-manifest.md`）。

**方法说明（重要）**：按任务要求，**没有**读取私有仓库做逐文件对比。因此本表的「原创」
结论来自四条**可自证**证据，而不是与私有仓库的 diff：

1. 内容扫描零命中私有路径、私有项目名、私有策略命名与真实证券标识（见 `security-review.md` 第 1 节）；
2. 目录内 `symlinks/junctions=0`，不存在指向私有目录的链接；
3. 新目录 Git 历史为空（零 commit、零 remote），未复制 `.git`；
4. 全部源文件由实现者在本会话内新建（`frontend/`、`python-lab/` 目录在本轮开始时**不存在**）。

> 局限：上述是**文件级**独立性判定，不是逐行版权比对；它不能替代人工审读。

---

## 1. 根目录

| 文件 | 来源 | 说明 |
| --- | --- | --- |
| `README.md` | 原创 | 审查者撰写；三层结构、启动命令、贡献与局限 |
| `.gitignore` | 原创 | 审查者撰写；排除 `node_modules`/`.venv`/`dist`/QA 回执等 |
| `.github/workflows/pages.yml` | 原创 | 发布准备新增；GitHub Pages 构建与部署（仅静态层 `frontend/`） |

## 2. `docs/`（审查者所有）

| 文件 | 来源 | 说明 |
| --- | --- | --- |
| `docs/verification.md` | 原创 | 本次独立复跑的命令、字面结果、退出码 |
| `docs/security-review.md` | 原创 | 公开边界扫描 + 依赖审计（两类分开） |
| `docs/file-origins.md` | 原创 | 本文件 |
| `docs/public-file-manifest.md` | 原创 | 逐文件清单：公开 / 不公开 |
| `docs/screenshots/*.png`（9 张） | 自生成 | 由 `qa/tools/capture-screenshots.mjs` 用本机 Edge 渲染本 Demo 页面截图；**非**私有素材 |

## 3. `frontend/`（前端实现者所有）

| 文件 | 来源 |
| --- | --- |
| `frontend/package.json`、`tsconfig.json`、`vite.config.ts`、`vitest.config.ts`、`index.html`、`.gitignore` | 原创 |
| `frontend/package-lock.json` | 自生成（`npm install` 解析依赖） |
| `frontend/README.md`、`frontend/docs/architecture.md`、`frontend/docs/demo-boundaries.md`、`frontend/docs/test-contract.md` | 原创 |
| `frontend/public/favicon.svg` | 原创（自绘 SVG） |
| `frontend/src/main.tsx`、`App.tsx`、`vite-env.d.ts` | 原创 |
| `frontend/src/contracts/types.ts` | 原创 |
| `frontend/src/simulation/*.ts`（`prng`、`calendar`、`generator`、`leaderboard`、`scenarios`、`state-machine`） | 原创 |
| `frontend/src/state/*.ts(x)`（`navigation`、`router`、`store`、`use-hash-route`） | 原创 |
| `frontend/src/components/*.tsx`（`AppHeader`、`AppFooter`、`BrandMark`、`CandlestickChart`、`Sparkline`、`StageFlow`、`StagePointerDiagram`、`ReceiptList`、`StatusBadge`、`SyntheticBadge`） | 原创（图表为自绘内联 SVG，未用图表库） |
| `frontend/src/content/python-lab.ts` | 原创（Python 实验的展示文案与命令，来源于 `python-lab/README.md` 的公开内容） |
| `frontend/src/pages/*.tsx`（7 个页面） | 原创 |
| `frontend/src/styles/global.css` | 原创 |
| `frontend/tests/unit/*.test.ts`（5 个） | 原创 |
| `frontend/node_modules/**` | 依赖 | 不公开 |
| `frontend/dist/**` | 自生成 | 构建产物；不进入公开清单 |

## 4. `python-lab/`（Python 实现者所有）

| 文件 | 来源 |
| --- | --- |
| `python-lab/pyproject.toml`、`requirements.txt`、`requirements-dev.txt`、`.gitignore` | 原创 |
| `python-lab/README.md` | 原创 |
| `python-lab/src/demo_lab/__init__.py`、`__main__.py`、`app.py`、`canonical.py`、`models.py`、`store.py`、`synthetic.py` | 原创 |
| `python-lab/tests/__init__.py`、`conftest.py`、`test_*.py`（7 个） | 原创 |
| `python-lab/scripts/verify.ps1`、`live_smoke.py`、`clean_local_artifacts.py` | 原创 |
| `python-lab/.venv/**` | 依赖 | 不公开 |
| `python-lab/.pytest_cache/**`、`__pycache__/**`、`*.egg-info/**` | 自生成 | 不公开 |
| `python-lab/.local-verification/**` | 自生成 | 含本机绝对路径，不公开 |

## 5. `qa/`（审查者所有，独立于实现者）

| 文件 | 来源 | 说明 |
| --- | --- | --- |
| `qa/package.json`、`playwright.config.ts` | 原创 | QA 工装配置 |
| `qa/package-lock.json` | 自生成 | |
| `qa/e2e/helpers.ts`、`flow.spec.ts`、`integration.spec.ts`、`mobile.spec.ts`、`offline.spec.ts`、`subpath.spec.ts` | 原创 | 独立 e2e（`integration.spec.ts` 覆盖双层作品集集成） |
| `qa/python/test_python_lab_contract.py` | 原创 | 独立黑盒契约测试 |
| `qa/tools/capture-screenshots.mjs` | 原创 | 截图脚本 |
| `qa/results/**`（含原始回执、JSON、截图、`npm-ci-probe/`） | 自生成 | **不公开** |
| `qa/node_modules/**` | 依赖 | 不公开 |
| `qa/.audit-venv/**`（公开工具 `pip-audit 2.10.1`） | 依赖 | **不公开**；仅用于依赖 CVE 审计 |

## 6. `scripts/`（审查者所有）

| 文件 | 来源 | 说明 |
| --- | --- | --- |
| `scripts/scan-public-boundary.mjs` | 原创 | 边界扫描器 |
| `scripts/serve-subpath.mjs` | 原创 | 无 rewrite 子路径静态服务器（模拟 Pages 项目站） |

---

## 7. 明确不存在的来源

以下内容在本目录中**零出现**（已由扫描与清单双重确认）：

- 私有仓库的源码、数据、规则、阈值、策略命名；
- 私有项目的日志、回执原件、截图与交接类文档；
- 第三方课程文档（`.docx`/`.pptx`/`.pdf`/`.xlsx`）与讲师人名；
- 真实证券代码、真实上市公司名称、真实行情；
- 凭据、内部地址、私有绝对路径（源码与文档中）。
