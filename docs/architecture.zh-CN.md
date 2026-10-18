# 架构与运维

[English page](architecture.md)

Python 包负责指数计算，React 前端展示审核后的公开 JSON。浏览器不计算收益，也不接触行情服务凭据。

## 路径与产物

CLI 默认写入仓库的 `artifacts/`，不是 `docs/`。通过 `--output-dir` 显式选择其他目录。动物园公开快照使用 `published/`，植物园使用 `published/plant/`。

| 输出目录下的相对路径 | 用途 |
| --- | --- |
| `data/nav.csv` | 净值、每日收益和增量计算输入 |
| `data/latest.json`、`history.json`、`constituents.json`、`changes.json`、`metadata.json` | 前端读取的 5 个公开 JSON 快照 |
| `data/chart.png`、`data/badges/*.json` | 可选分享图（`--chart`）和 shields.io 徽章 |
| `manifests/` | 持仓、成分、变更和规则快照，用于审计与恢复计算状态 |

`published/` 及审核后的 manifests 已入库。前端通过 `web/scripts/copy-published-data.mjs` 将所需公开数据复制到生成目录 `web/public/data/`。`web/dist/`、`.build/` 和原始行情缓存 `data/cache/` 不入库。`docs/` 是维护中的源文档。

新写入 CSV 使用 `benchmark_ret` 和 `benchmark_nav`。JSON 使用 `benchmark_nav`、`benchmark_daily` 和 `benchmark_excess`。读取旧 NAV 文件时仍兼容归一化 `hs300_*` 列。

## 计算与恢复

每日计算和回填共用 `runner.compute_day`。`PortfolioState` 保存严格版、扩展版的持仓、固定权重、停牌计数及最近有效价格和复权因子。再平衡当日仍用旧篮子计算收益，新权重次日生效。数值和资格规则见[方法说明](methodology.zh-CN.md)。

每日启动读取上一交易日持仓快照。旧快照缺少估值字段时，从历史行情恢复。回填在选定日期范围内逐日传递状态。`--backfill-mode missing` 只跳过该范围内已有结果，不会自动扩大范围查找全部历史缺口。规则、基准或收益口径变更后应使用 `all` 重算，并通过 PR 审核快照。

## 数据源与 Token

- `TUSHARE_TOKEN` 是主凭据。
- `TUSHARE_TOKEN_2` 是可选备用凭据。
- `TUSHARE_API_URL` 只配置备用端地址。

主请求失败时可向配置的备用客户端回退一次，计算契约不变。凭据和私有服务配置不得进入公开快照或源码。

## 使用细节

```bash
uv run zoo-index --help
uv run zoo-audit --help
uv run zoo-chart --help
```

常用参数包括 `--date`、`--rules`、`--output-dir`、`--start-date`、`--backfill`、`--backfill-years`、`--backfill-mode`、`--backfill-write-snapshots`、`--no-rules-snapshot`、`--no-cache`、`--force-refresh`、`--benchmark`、`--benchmark-source` 和 `--benchmark-label`。不带数量的 `--backfill` 选择 5 年。默认基准是复权收益口径的 ETF `510300.SH`；保留默认代码并选择 `--benchmark-source index` 时，改用沪深 300 指数 `000300.SH`。

`zoo-audit` 支持 `--input` 和 `--namechange-input` 离线输入。可选 `--llm` 依次尝试 Gemini、配置的固定 OpenRouter 模型和 `openrouter/free`。报告保存输入、规则哈希及模型和 prompt 标识，不改变词表或公开成分。见[名称审计审核流程](audit-review.md)。

每日与回填模式下，`zoo-index` 都只在传入 `--chart` 时生成 `data/chart.png`。默认保留已有 PNG，旧图片可能过时。`zoo-chart` 仍是显式重绘命令。PNG 渲染需要 Noto Sans CJK 或 Source Han Sans CN。Debian/Ubuntu 用户应先安装 `fonts-noto-cjk`，再启动 Python。字体仅影响展示，不改变公开 JSON 或净值。

只重绘图表，不请求 Tushare：

```bash
uv run zoo-chart --nav published/data/nav.csv --out /path/to/generated/chart.png
```

## 部署

`daily.yml` 每周一至周五 08:10 UTC，即北京时间 16:10 运行。默认使用 `missing` 模式，只回填 1 个交易日，不是全历史修复。手动触发可增加 `backfill_days`、选择 `all`，或用 `publish_only` 重建已合并快照而不重新计算、提交数据。

定时运行默认不生成 PNG。`missing` 回填没有缺失日期时，即使指定 `--chart` 也会跳过输出生成，重绘已有净值请用 `zoo-chart`。手动触发可开启 `chart`，安装所需字体，并在计算写出产物时生成动物园、植物园 PNG。

当前动物园命令使用 `--delisting-policy last_price_proxy`，写入 `published/`，metadata 标记 `evidence_tier=research_proxy`。植物园写入 `published/plant/`，使用默认 `strict` 策略。两者证据等级不同。前端展示代理序列标识，消费者也必须保留该标识，不能把代理估值当作已核实现金结算或可执行业绩。

计算后，工作流写入和校验 provenance，以 bot 身份提交审核后的 `published/` 变更，构建前端并部署 GitHub Pages。本地源码和快照修改按 [AGENTS.md](../AGENTS.md) 的分支、PR 流程交付；定时 bot 流程不构成本地直接推送 `main` 的授权。

`deploy-cloudflare.yml` 构建已合并的公开快照，需要 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。计算工作流需要 `TUSHARE_TOKEN`。本次审计不运行部署或真实行情请求。

## 语言与验证

网页支持 `en-US` 和 `zh-CN`。有效 `?lang=` 优先于保存的 `a-share-zoo-locale` 偏好；其他情况使用已保存的中文偏好或英文 fallback。语言只改变同一份 JSON 的展示。CLI 帮助和诊断仍包含中文，没有 locale 参数。

Python 与前端检查见根 [README](../README.md#verification)。固定 runtime/platform 契约的 `formal` extra 要求 Python 3.12 及以上。正式 runtime 作业使用显式配置的仓库外 `ZOO_BACKTEST_RUNTIME_ROOT`，不能写入公开快照。合成测试不等同于真实数据重算、结算校验或部署验证。
