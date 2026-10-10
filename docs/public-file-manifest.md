# 拟公开文件清单（public-file-manifest）


**审查者**：独立 Coding Agent（`/root/portfolio_review`）。**日期**：2026-10-10。
**清单口径**：`main` 工作树在 2026-10-10 的**预冻结**快照，随后经**发布准备**增量修订
（删除拟议 `LICENSE`、新增 Pages workflow、修正目标子路径）。哈希以冻结时复扫为准（见第 5 节）。

> 说明：**已发布**（2026-10-10）。仓库 `https://github.com/Fpj5085/lumen-research-workbench`
> （public），站点 `https://fpj5085.github.io/lumen-research-workbench/`，初始 commit
> `637dabbcdc3e3bea922929e15ab4f38e9e07f10a`，Actions run `38046892528` success。
> 本清单的哈希以**该已发布提交之后**的工作树为准。

---

## 1. 拟公开文件（逐文件，含 SHA-256 前 16 位与字节数）

### 1.1 根目录

| 文件 | 字节 | SHA-256(16) | 来源 |
| --- | --- | --- | --- |
| `.gitignore` | 652 | `08B0C73050C7B531` | 原创（新增 `qa/.audit-venv/` 排除） |
| `README.md` | 13892 | `41CBCC3C9E2B42C7` | 原创（发布准备修订；作者贡献采用第一人称叙述） |

> `LICENSE` **不在本清单内**：该文件已在发布准备中删除，第一版不附开源许可证（见下）。

> **第一版不附开源许可证**：`LICENSE` 已按发布准备要求删除，仓库内不存在任何
> `LICENSE*` 文件，也没有 `package.json` / `pyproject.toml` 的开源许可字段。第三方依赖
> 各自的许可证不受影响，见第 3 节。

### 1.2 `docs/`

| 文件 | 字节 | SHA-256(16) | 来源 |
| --- | --- | --- | --- |
| `docs/verification.md` | 14630 | `526E6E59E5962D95` | 原创（发布准备修订 + 发布后补测口径） |
| `docs/security-review.md` | 18059 | `DA374DC638DB41FE` | 原创（发布准备修订 + 独立审查者第 6 节 + 发布状态回填） |
| `docs/file-origins.md` | 5977 | `0BAB7B4A22A73E99` | 原创（发布准备修订） |
| `docs/public-file-manifest.md` | — | （自指，见下注） | 原创（本文件） |

| `docs/screenshots/desktop-engineering.png` | 1939750 | `B20914392D5A3264` | 自生成（含作者贡献修订与 Python Lab 面板） |
| `docs/screenshots/desktop-history.png` | 274320 | `8A27CE30F5200C43` | 自生成 |
| `docs/screenshots/desktop-home.png` | 970563 | `DEE57A1154C5BF83` | 自生成 |
| `docs/screenshots/desktop-leaderboard.png` | 709683 | `B78021A76425DAE6` | 自生成 |
| `docs/screenshots/desktop-stock-detail.png` | 415609 | `BEBBD55D1225FEFB` | 自生成 |
| `docs/screenshots/desktop-tasks-blocked.png` | 715299 | `A2228BF4FF80EF10` | 自生成 |
| `docs/screenshots/desktop-watchlist.png` | 514505 | `984D7EBA34B49C15` | 自生成 |
| `docs/screenshots/mobile-home-390.png` | 949701 | `AC027B6C6919548F` | 自生成 |
| `docs/screenshots/mobile-tasks-390.png` | 526124 | `24758FA345FAFCE8` | 自生成 |

> 注：`public-file-manifest.md` 记录自己的哈希会形成自指，故留空。其余三个 `docs/*.md`
> 的哈希在 2026-10-10 最后一次编辑后计算。若此后仍有编辑，请在冻结时按第 5 节命令重新生成全部哈希。

### 1.3 `frontend/` 源码与配置

| 文件 | 字节 | SHA-256(16) | 来源 |
| --- | --- | --- | --- |
| `frontend/.gitignore` | 51 | `A14871E7DC7BBEE6` | 原创 |
| `frontend/index.html` | 799 | `EA323EB0CE3BF373` | 原创 |
| `frontend/package.json` | 737 | `F6D9945B9C7D0565` | 原创（`vitest` 已升 `^5.0.3`） |
| `frontend/package-lock.json` | 70983 | `72820F103B6D2CDF` | 自生成（`tinypool` 条目已移除） |
| `frontend/tsconfig.json` | 691 | `8FAB8662CD907943` | 原创 |
| `frontend/vite.config.ts` | 500 | `0C32442E7EE0ED7C` | 原创 |
| `frontend/vitest.config.ts` | 412 | `EBD3AA86460BF5D2` | 原创 |
| `frontend/README.md` | 2914 | `97461EA0AE61DC54` | 原创（新增环境与依赖版本表） |
| `frontend/docs/architecture.md` | 3212 | `989C6AC8A94239AD` | 原创 |
| `frontend/docs/demo-boundaries.md` | 2061 | `407B51EFE0ED0C2F` | 原创 |
| `frontend/docs/test-contract.md` | 16360 | `5BBDEC2081CD6C24` | 原创 |
| `frontend/public/favicon.svg` | 363 | `D1FC40391D0C363E` | 原创 |
| `frontend/src/App.tsx` | 1448 | `0C85B0441BE377B5` | 原创 |
| `frontend/src/main.tsx` | 337 | `7D9E41DAED0B6421` | 原创 |
| `frontend/src/vite-env.d.ts` | 38 | `65996936FBB04291` | 原创 |
| `frontend/src/contracts/types.ts` | 2862 | `DF9D3DADD07AA69A` | 原创 |
| `frontend/src/simulation/calendar.ts` | 1310 | `AB6BE4C4504D01B4` | 原创 |
| `frontend/src/simulation/generator.ts` | 5580 | `FD74BB3EDBFAA2C3` | 原创 |
| `frontend/src/simulation/leaderboard.ts` | 4783 | `CDEC49715BED6ADD` | 原创 |
| `frontend/src/simulation/prng.ts` | 1354 | `B8249AA653F4E82D` | 原创 |
| `frontend/src/simulation/scenarios.ts` | 3383 | `0B1592FBE3707356` | 原创 |
| `frontend/src/simulation/state-machine.ts` | 12757 | `CF129AB6A62E0BCE` | 原创 |
| `frontend/src/state/navigation.ts` | 293 | `EA2DB61CF12F1C7D` | 原创 |
| `frontend/src/state/router.ts` | 1567 | `EB04B3E91054878D` | 原创 |
| `frontend/src/state/store.tsx` | 6166 | `DC539BB90B1EC2DF` | 原创 |
| `frontend/src/state/use-hash-route.ts` | 462 | `CAB2A8645DAC30D0` | 原创 |
| `frontend/src/styles/global.css` | 15211 | `283C1FD01D5AFE51` | 原创 |
| `frontend/src/components/AppFooter.tsx` | 616 | `118767FAF23ED444` | 原创 |
| `frontend/src/components/AppHeader.tsx` | 2134 | `C3A68A01DC4E519D` | 原创 |
| `frontend/src/components/BrandMark.tsx` | 567 | `7D172851393D8944` | 原创 |
| `frontend/src/components/CandlestickChart.tsx` | 6715 | `EA25901D7792FEC3` | 原创 |
| `frontend/src/components/ReceiptList.tsx` | 878 | `A462A6AF06B91B2F` | 原创 |
| `frontend/src/components/Sparkline.tsx` | 1125 | `9520C6DE34AA30F9` | 原创 |
| `frontend/src/components/StageFlow.tsx` | 1634 | `E54D00D16F64BD39` | 原创 |
| `frontend/src/components/StagePointerDiagram.tsx` | 3255 | `97B9CC429081EB68` | 原创 |
| `frontend/src/components/StatusBadge.tsx` | 423 | `801FDD4388542FA5` | 原创 |
| `frontend/src/components/SyntheticBadge.tsx` | 169 | `AC7EB7BD8852225C` | 原创 |
| `frontend/src/content/python-lab.ts` | 4880 | `E3326637777201C2` | 原创 |
| `frontend/src/pages/EngineeringPage.tsx` | 13699 | `CC58D4591C9FD456` | 原创（作者贡献文案修订） |
| `frontend/src/pages/HistoryPage.tsx` | 2659 | `4392B7049D08BD2C` | 原创 |
| `frontend/src/pages/HomePage.tsx` | 12172 | `DC78046E4CE48C11` | 原创 |
| `frontend/src/pages/LeaderboardPage.tsx` | 8766 | `E53966AE2D9459E6` | 原创 |
| `frontend/src/pages/StockPage.tsx` | 6943 | `EE4425168FFF6565` | 原创 |
| `frontend/src/pages/TasksPage.tsx` | 7397 | `C01DB8CBF7AE6D3F` | 原创 |
| `frontend/src/pages/WatchlistPage.tsx` | 6353 | `96A34B85AE4317A9` | 原创 |
| `frontend/tests/unit/generator.test.ts` | 4190 | `501938AB49B1653B` | 原创 |
| `frontend/tests/unit/leaderboard.test.ts` | 4629 | `773193002EA80E81` | 原创 |
| `frontend/tests/unit/prng.test.ts` | 1678 | `8346E1E8E082627D` | 原创 |
| `frontend/tests/unit/router.test.ts` | 1889 | `109069BB03AE4307` | 原创 |
| `frontend/tests/unit/state-machine.test.ts` | 8999 | `45CF1CFDFB9AC1D4` | 原创 |

### 1.4 `python-lab/` 源码与配置

| 文件 | 字节 | SHA-256(16) | 来源 |
| --- | --- | --- | --- |
| `python-lab/.gitignore` | 79 | `D15BA73D614B32DC` | 原创 |
| `python-lab/pyproject.toml` | 868 | `513E4F76E951A246` | 原创（dev extra `pytest>=9.0.3,<10.0`） |
| `python-lab/requirements.txt` | 182 | `B7C1A23AF81845DF` | 原创 |
| `python-lab/requirements-dev.txt` | 496 | `F5FCCFB4C7717E49` | 原创（`pytest>=9.0.3,<10.0`、显式 `anyio`） |
| `python-lab/README.md` | 10858 | `8C62ECC0140710DE` | 原创 |
| `python-lab/src/demo_lab/__init__.py` | 557 | `82AFA3EAD5ED5E26` | 原创 |
| `python-lab/src/demo_lab/__main__.py` | 1042 | `5F0E2D896E4ED530` | 原创 |
| `python-lab/src/demo_lab/app.py` | 5065 | `7748ED1C32D90115` | 原创 |
| `python-lab/src/demo_lab/canonical.py` | 2202 | `59D7E12CB2B01F89` | 原创 |
| `python-lab/src/demo_lab/models.py` | 4354 | `30265727423661A4` | 原创 |
| `python-lab/src/demo_lab/store.py` | 17158 | `F27065CBB100A75C` | 原创 |
| `python-lab/src/demo_lab/synthetic.py` | 8380 | `9C9F9E6A59B159A2` | 原创 |
| `python-lab/tests/__init__.py` | 51 | `2646670DE66E6229` | 原创 |
| `python-lab/tests/conftest.py` | 1004 | `B0C7DFEB51DFB53C` | 原创 |
| `python-lab/tests/test_api_contract.py` | 3858 | `2ACD87B20298A414` | 原创 |
| `python-lab/tests/test_canonical.py` | 1376 | `1851018649FC9F80` | 原创 |
| `python-lab/tests/test_concurrency.py` | 4095 | `A27E30948D9E4318` | 原创 |
| `python-lab/tests/test_idempotency.py` | 2952 | `C0520A0959CB289D` | 原创 |
| `python-lab/tests/test_immutability.py` | 1854 | `F1A2C462E7F4FE47` | 原创 |
| `python-lab/tests/test_publish_gate.py` | 6965 | `9BB9E0E8DC63C387` | 原创 |
| `python-lab/tests/test_synthetic.py` | 3114 | `A35ABCE8EDE797D8` | 原创 |
| `python-lab/scripts/verify.ps1` | 1385 | `12F1B14AF3149B40` | 原创 |
| `python-lab/scripts/live_smoke.py` | 8299 | `095E2C8AC3C429E6` | 原创 |
| `python-lab/scripts/clean_local_artifacts.py` | 1509 | `EA00E3D4E836D720` | 原创 |

### 1.5 `qa/` 与 `scripts/`（审查者工装）

| 文件 | 字节 | SHA-256(16) | 来源 |
| --- | --- | --- | --- |
| `qa/package.json` | 527 | `7F6785BF35144CBB` | 原创 |
| `qa/package-lock.json` | 1707 | `645F33054971EE55` | 自生成 |
| `qa/playwright.config.ts` | 1367 | `4C0DEBE84A213D0E` | 原创 |
| `qa/e2e/helpers.ts` | 7570 | `7F1FA6154AC9CCDA` | 原创 |
| `qa/e2e/flow.spec.ts` | 13016 | `25498B44D4DE73A2` | 原创 |
| `qa/e2e/integration.spec.ts` | 7512 | `F9F19786C6C9A796` | 原创（双层集成 + 指针一致性检查） |
| `qa/e2e/mobile.spec.ts` | 2123 | `45E077819B46B1DE` | 原创 |
| `qa/e2e/offline.spec.ts` | 4009 | `7BC35DAFF7691FC5` | 原创 |
| `qa/e2e/subpath.spec.ts` | 2085 | `601E3C3B05DFE48A` | 原创（发布准备修订：示例路径改为目标仓库名） |
| `qa/python/test_python_lab_contract.py` | 7811 | `FA2C5E86F33C7813` | 原创 |
| `qa/tools/capture-screenshots.mjs` | 3310 | `2619680B051A9DEF` | 原创 |
| `qa/tools/check-pointer-consistency.mjs` | 3155 | `718B200E71D4F2FC` | 原创（hero 示意图与真实指针一致性有界检查） |
| `scripts/scan-public-boundary.mjs` | 10475 | `024776A290B7C5E5` | 原创 |
| `scripts/serve-subpath.mjs` | 2641 | `A5065554939BCC23` | 原创（发布准备修订：默认仓库名改为目标仓库名） |

**公开清单合计**：约 78 个文本文件 + 9 张 PNG 截图（预冻结约 77 个文本 + 9 PNG；发布准备
删除 `LICENSE`、新增 2 个 `.github/workflows/` 文件）。

### 1.6 发布准备修订表（2026-10-10）

本节只登记**发布准备**实际改动/新增的条目，其余文件哈希沿用预冻结快照。

| 文件 | 字节 | SHA-256(16) | 变更 |
| --- | --- | --- | --- |
| `LICENSE` | — | — | **删除**（第一版不附开源许可证） |
| `README.md` | 13892 | `41CBCC3C9E2B42C7` | 许可证、发布结果与在线链接；贡献章节改为作者主导的需求、架构方向、验收要求与发布决策，简述 AI 辅助开发 |
| `.github/workflows/pages.yml` | 2583 | `0F9E4EF573F601CC` | 新增：Pages 构建 + 部署（仅 `frontend/`） |
| `.github/workflows/README.md` | 3782 | `D3FE27C6823FD918` | 新增：action 版本一手来源与 Pages 配置说明；第 5 节由「未验证」回填为真实运行结论 |
| `docs/verification.md` | 14630 | `526E6E59E5962D95` | 子路径行标注为历史回执原文并加发布后补测；未覆盖项更新为已执行（含线上子路径 1 passed） |
| `docs/security-review.md` | 18059 | `DA374DC638DB41FE` | git status 行标注为历史原文；第 5 节改为发布准备状态；独立审查者追加第 6 节；发布状态回填为已完成 |
| `docs/file-origins.md` | 5977 | `0BAB7B4A22A73E99` | 删除 `LICENSE` 行；新增 `.github/workflows/pages.yml` 行 |
| `docs/public-file-manifest.md` | — | （自指，留空） | 本文件：删除 `LICENSE` 条目、新增 workflow 与本节、刷新全部被改行哈希 |
| `scripts/serve-subpath.mjs` | 2641 | `A5065554939BCC23` | 默认仓库名改为 `lumen-research-workbench` |
| `qa/e2e/subpath.spec.ts` | 2085 | `601E3C3B05DFE48A` | 注释中的示例子路径与启动命令改为目标仓库名 |

未改动文件（含 `frontend/**`、`python-lab/**`、截图、其余 `qa/**`）哈希保持第 1.1–1.5 节的值。
第 1.3 节的集成修正说明仍成立：首页示意图动态绑定发布指针，Python 实验面板采用独立复核回执。

`scripts/scan-public-boundary.mjs` **未修改**（哈希仍为 `024776A290B7C5E5`）：曾试加自有 Pages 主机
白名单，随后**回退**，保持 `net:absolute-http-url` 宽泛规则不放行。发布准备后复扫为
`findings=7`（全部为该类别），**不是 0**；7 条逐行复核均为自有目标站点 URL 或 `127.0.0.1`
回环示例，逐条处置见 `qa/results/release-record-2026-10-10.md` 1.3 节。push 前须重跑并逐条复核。

---

## 2. 明确**不公开**的内容（不进入公开仓库 / 清单）

| 类别 | 路径 / 模式 | 原因 |
| --- | --- | --- |
| 依赖目录 | `frontend/node_modules/**`、`qa/node_modules/**`、`python-lab/.venv/**` | 由锁文件复现，体积大且非本项目代码 |
| 构建产物 | `frontend/dist/**` | 构建输出；且产物会内联源码文案，不作为清单项 |
| Python 缓存与元数据 | `python-lab/.pytest_cache/**`、`**/__pycache__/**`、`python-lab/src/*.egg-info/**` | 本机生成 |
| 本地验证回执 | `python-lab/.local-verification/**` | **含本机绝对路径**（已隐去具体路径） |
| QA 原始回执 | `qa/results/**`（含 `playwright-report.json`、`boundary-scan.json`、`npm-audit-*.json`、`npm-ci-probe/`、`shot-*.png`） | 审查过程原始材料，含本机路径与临时副本 |
| Playwright 临时产物 | `qa/test-results/**`、`qa/playwright-report/**`、`**/*.zip`（trace） | 测试运行副产物 |
| 编辑器 / 系统 | `.idea/`、`.vscode/`、`*.log`、`.DS_Store`、`Thumbs.db` | 噪声 |

这些路径已在根 `.gitignore` 中排除（依赖、产物、缓存、QA 回执等）。

---

## 3. 依赖与许可证注意事项

### 3.1 前端运行时依赖（进入 `dist/`）

| 包 | 许可证 |
| --- | --- |
| `react`、`react-dom`、`scheduler` | MIT |
| 其余 4 条 prod 依赖链（`@babel/*`、`js-tokens` 等） | MIT |

### 3.2 前端开发依赖（**不**进入产物）

共 137 条依赖（含 prod / dev / optional，Vitest 5 升级后总数由 155 降至 137）。
许可证分布（由 `package-lock.json` 元信息统计）：

| 许可证 | 代表包 | 注意事项 |
| --- | --- | --- |
| MIT | 127 条，绝大多数（`vite`、`vitest`、`@types/*`、`rollup`、`esbuild` 等） | 无额外义务，保留版权声明即可 |
| ISC | 5 条：`electron-to-chromium`、`lru-cache`、`picocolors`、`semver`、`yallist` | 与 MIT 类似，宽松 |
| Apache-2.0 | `typescript`、`baseline-browser-mapping`、`expect-type` | **含专利授权条款**；再分发需保留 NOTICE（如有）与许可证全文 |
| BSD-3-Clause | `source-map-js` | 需保留版权声明与免责声明，且**不得**用作者名背书 |
| CC-BY-4.0 | `caniuse-lite` | **数据文件**，署名要求；若打包其数据需注明来源 |
| 平台专用二进制（optional） | `@esbuild/*`、`@rollup/rollup-*`、`@napi-rs/lzma-*` | 仅安装当前平台，MIT |

### 3.3 QA 工装依赖

| 包 | 许可证 |
| --- | --- |
| `@playwright/test`、`playwright`、`playwright-core` | Apache-2.0 |

### 3.4 Python 依赖

| 包 | 许可证（上游） | 注意事项 |
| --- | --- | --- |
| `fastapi`、`starlette`、`pydantic`、`pydantic-core`、`uvicorn` | MIT / BSD-3-Clause（`pydantic` 系列为 MIT，`starlette` 为 BSD-3-Clause） | 宽松；保留声明 |
| `httpx`、`httpcore`、`h11`、`anyio`、`idna`、`certifi`、`sniffio` 类 | BSD-3-Clause / MIT / MPL-2.0（`certifi` 为 MPL-2.0） | `certifi` 为 **MPL-2.0**，再分发需注意文件级 copyleft |
| `pytest`、`pluggy`、`iniconfig`、`packaging`、`Pygments`、`colorama`、`click` | MIT / BSD | 宽松 |
| `opentelemetry-api` | Apache-2.0 | 专利授权条款 |

> **注意**：以上许可证信息取自各包元数据，**未**逐包核对 `LICENSE` 原文，也**未**生成完整
> NOTICE 文件。若公开仓库需要正式的第三方许可清单，应在发布前用
> `npx license-checker --summary` / `pip-licenses` 之类工具生成并人工复核。这是**待办**，
> 不是已完成的合规结论。

---

## 4. 截图审查

| 截图 | 内容 | 审查结论 |
| --- | --- | --- |
| `desktop-home.png` | 首页：定位、常驻模拟声明、工程亮点、1/3/5 路径 | 无真实证券标识、无第三方图表 |
| `desktop-leaderboard.png` | 榜单：`DEMO0xx` 虚构标的、排序/筛选/分页 | 全为合成数据 |
| `desktop-stock-detail.png` | 详情：自绘 K 线 SVG + 统计 | 自绘图表，非行情截图 |
| `desktop-watchlist.png` | 观察与持仓示意 | 明示「仅示意、不接账户、不下单」 |
| `desktop-tasks-blocked.png` | **任务拒发布（BLOCKED）** | 关键画面：门禁阻断 + 指针保持 |
| `desktop-history.png` | 历史快照 | 逐条带「历史 / 非最新」 |
| `desktop-engineering.png` | 工程说明 | 高层概念，未含私有实现细节 |
| `mobile-home-390.png` | 移动端首页 | 无整页水平溢出 |
| `mobile-tasks-390.png` | 移动端任务 | 同上 |

全部为 `qa/tools/capture-screenshots.mjs` 于 2026-10-10 在本机渲染的**新画面**；
**未**复用任何私有项目截图或第三方课程图表。截图内出现的日期为虚构 2030 日历，页面已常驻声明
「示例日期为虚构日历，非实际交易日」。

---

## 5. 冻结时复扫命令（公开前执行）

```powershell
cd '<repo-root>'
node scripts/scan-public-boundary.mjs . --json qa/results/boundary-scan.json
git status --porcelain
git remote -v
git log --oneline
```

预期：扫描 `findings=0`、`symlinks/junctions=0`；`git remote -v` 无输出；
`git log` 在首次提交前仍为「no commits yet」。

**当前实际值（发布准备后）**：扫描为 `exit=1`、`findings=7`，全部属于 `net:absolute-http-url`
（自有目标站点 URL 与 `127.0.0.1` 回环示例），**不是 0**；逐条处置见
`qa/results/release-record-2026-10-10.md` 1.3 节。push 前须重跑并逐条复核，不得据旧记录声称 0。
若此后仍有文件改动，第 1 节与 1.6 节的哈希需重新生成。
