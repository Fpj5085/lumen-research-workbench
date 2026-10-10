# Pages workflow 说明与版本依据

**日期**：2026-10-10。**范围**：仅静态层 `frontend/`；**不**调用 `python-lab`，**不**部署 Python 服务。

## 1. 为什么是这个形状

GitHub 官方文档 *Using custom workflows with GitHub Pages* 给出的三步式是
`configure-pages` → `upload-pages-artifact` → `deploy-pages`，并要求 deploy job 至少具备
`pages: write` 与 `id-token: write`、绑定 `github-pages` environment、用 `needs` 指向 build job。
本 workflow 逐条照此实现（build job 与 deploy job 分离，权限按 job 最小化）。

来源：`github/docs` 仓库 `content/pages/getting-started-with-github-pages/
using-custom-workflows-with-github-pages.md`（main 分支，2026-10-10 读取）。

## 2. Action 版本核对（一手来源：各官方仓库的 release / action.yml）

| Action | 采用 | 最新 release | 运行时 | 依据 |
| --- | --- | --- | --- | --- |
| `actions/checkout` | `@v6` | `v7.0.1` | `node24`（v6 起） | 官方 release 列表；`action.yml` `runs.using: node24` |
| `actions/setup-node` | `@v7` | `v7.1.0` | `node24` | 官方 release 列表；`action.yml` |
| `actions/configure-pages` | `@v6` | `v6.0.0` | `node24` | 官方 release 列表（v6 变更日志：upgrade to node 24） |
| `actions/upload-pages-artifact` | `@v5` | `v5.0.0` | composite | 官方 release 列表；`action.yml` 为 composite，无运行时 |
| `actions/deploy-pages` | `@v5` | `v5.0.1` | `node24` | 官方 release 列表；`action.yml` `runs.using: node24` |

说明：`checkout` 选 `v6`（而非最新 `v7`）是因为本仓库只用最基础的 checkout 行为，
`v7` 的新特性（fork PR 检出策略、ESM 迁移）与本 workflow 无关；`v6` 同为 `node24` 运行时。
`configure-pages`/`deploy-pages` 在 `v5` 及更早为 `node20`，`v6`/`v5` 已升到 `node24`。
**所有引用都使用 major tag**（官方发布的浮动主版本标签），不使用 `@main` 或未固定分支。

## 3. 与官方 starter workflow 的差异（有意为之）

`actions/starter-workflows` 的 `pages/static.yml` 仍写 `checkout@v4` / `configure-pages@v5` /
`upload-pages-artifact@v3` / `deploy-pages@v5`，并在单 job 内直接上传整个仓库。本 workflow
改为 build/deploy 两 job 且只上传 `frontend/dist`，因此版本按上表独立核对，不照抄 starter。

## 4. Pages 侧配置（发布时执行，见发布命令文档）

workflow 本身不启用 Pages：`configure-pages` 的 `enablement` 默认为 `false`，
且用 `GITHUB_TOKEN` 无法开启（需 PAT 或 GitHub App 的相应权限）。发布前需先用
`gh api` 把仓库的 Pages 源设为 `workflow`（`build_type: workflow`）。

目标：仓库 `Fpj5085/lumen-research-workbench`，站点
`https://fpj5085.github.io/lumen-research-workbench/`，子路径 `/lumen-research-workbench/`。

## 5. 未在本机验证的部分（如实声明）

本机未执行 `act`/CI 复现，也未 push：workflow 的语法与 action 版本来自官方文档与官方仓库元数据，
**运行结果尚未验证**。首次 push 后必须查看 Actions 运行结论，再确认 Pages 站点可访问。
