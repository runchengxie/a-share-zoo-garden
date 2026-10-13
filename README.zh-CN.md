# A 股动物园与植物园

[English README](README.md)

[GitHub Pages 在线预览](https://runchengxie.github.io/a-share-zoo-garden/) · [Cloudflare Pages 在线预览](https://a-share-zoo-garden.pages.dev/)

把 A 股简称里含动物词或植物词的股票收编成主题组合，按固定规则每日更新，并与沪深300对比。动物园与植物园分别维护严格、扩展两层候选组合。

两套指数和沪深300 ETF 基准统一从 2021 年 1 月 4 日收盘净值 1 开始，首日建仓，下一交易日起计算收益。早于已知词表版本的历史区间属于事后规则回放。

> 本项目仅供娱乐与研究，不构成任何投资建议。

## 它能做什么

- 严格动物园 / 扩展动物园双指数，与沪深300对照
- 第一版植物园规则：只启用明确的多字植物词，暂不纳入容易误匹配的单字词
- 规则词表 + 强制名单，结果可复现
- 每日生成净值、曲线图、徽章与网页
- 可选生成含换手、交易成本的可交易回测诊断
- 可选运行名称审计，发现规则漏收与疑似误收
- 网页按研究报告式信息层级展示指数快照、净值、调仓、成分与方法

## 快速开始

### 1. 安装依赖

需要 [uv](https://docs.astral.sh/uv/)。

```bash
uv sync
```

### 2. 配置 Tushare Token

```bash
export TUSHARE_TOKEN=你的token
```

主 Token 偶发限流或失败时，可再设一个备用 Token 走转发代理，由程序自动回退（机制见 [docs/architecture.zh-CN.md](docs/architecture.zh-CN.md#数据源与-token)）：

```bash
export TUSHARE_TOKEN_2=转发代理给你的key
export TUSHARE_API_URL=https://<转发代理地址>
```

### 3. 跑一次

```bash
uv run zoo-index
```

不指定日期时，默认使用上海时区下最近一个完整交易日（当天数据未就绪会回退到上一交易日）。图像与网页数据由脚本生成，初次运行后才会显示。

### 4. 看结果（本地预览网页）

```bash
cd web
npm install
npm run dev
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `uv run zoo-index` | 更新最近一个交易日 |
| `uv run zoo-index --backfill` | 回填最近 5 年历史 |
| `uv run zoo-index --start-date 20210104 --backfill-mode all` | 从共同起点全量重算，首日收盘净值为 1 |
| `uv run zoo-chart` | 仅重绘图表，不调用 Tushare |
| `uv run zoo-audit --date YYYYMMDD` | 生成确定性收录审核候选 |
| `make daily` / `make backfill` / `make chart` / `make test` | Makefile 快捷命令 |

更多命令行参数（回填天数、缓存、基准切换、快照等）见 [docs/architecture.zh-CN.md](docs/architecture.zh-CN.md#使用细节)。

名称审计默认只生成本地 `artifacts/audit/` 报告，不修改规则和指数成分。配置 `GEMINI_API_KEY` 或 `OPENROUTER_API_KEY` 后，可追加 `--llm` 进行批量语义复核，LLM 失败不会影响 `zoo-index`。

植物园当前使用独立的 [plant_rules.yml](plant_rules.yml) 词表。它与动物园共享匹配、上市状态、ST、流动性和复权收益计算逻辑。主输出结构按动物园、植物园两个主题分别组织，每个主题含严格、扩展两种变体。

理论指数使用 `zoo_strict_ret` 与 `zoo_extended_ret` 等毛收益字段。若在根目录 `backtest.yml` 中开启可交易回测，还会额外输出换手、佣金、印花税、滑点和成本后净值字段，默认配置不会改变理论指数。

## 规则、产物与架构

- 收录规则与指数方法：见 [docs/methodology.zh-CN.md](docs/methodology.zh-CN.md)
- 产物结构、数据流、部署与 Token 机制：见 [docs/architecture.zh-CN.md](docs/architecture.zh-CN.md)

## 部署

项目同时部署到 GitHub Pages 和 Cloudflare Pages。`.github/workflows/daily.yml` 在每个交易日收盘后计算数据并部署 GitHub Pages。`.github/workflows/deploy-cloudflare.yml` 在 `main` 更新后使用仓库中的 `published/data` 构建并部署 Cloudflare Pages。GitHub Actions 需要配置 `TUSHARE_TOKEN`、`CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。细节见 [docs/architecture.zh-CN.md](docs/architecture.zh-CN.md#部署)。

## 开发与测试

Python 计算与数据逻辑：

```bash
uv sync --frozen --extra formal
uv run --extra formal ruff format --check .
uv run --extra formal ruff check .
uv run --extra formal ty check
uv run --extra formal pytest
```

前端视觉契约与生产构建：

```bash
cd web
npm ci
npm test
npm run build
```

`formal` extra 在 Python 3.12 及以上安装固定版本的执行与契约依赖。较旧的受支持 Python 版本会跳过需要 `backtest_runtime` 的测试。`.github/workflows/ci.yml` 执行上述 Python 检查和前端检查。`uv audit --frozen` 报告依赖漏洞，但不阻断 CI。pytest 输出覆盖率，当前没有最低覆盖率门槛。

网页默认使用 `en-US`，并提供 `zh-CN` 切换。有效的 `?lang=` 参数优先于保存的 `a-share-zoo-locale` 偏好。未知值使用已保存的偏好，或回退到英文。语言只改变同一份公开 JSON 快照的展示。
