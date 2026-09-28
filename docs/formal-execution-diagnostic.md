# 动物园公共执行模拟诊断

`zoo-formal-diagnostic` 从固定离线缓存逐日恢复严格版和扩展版目标。每次目标变更记录独立的 `research.clock.v1`，次一交易日才允许提交订单。目标、行情和时钟以内容哈希输入提交给 `quant-backtest-runtime` 的多决策任务，worker 调用 `quant-platform` 的逐日执行模拟器计算订单、成交和账本。诊断产物写在仓库外的空目录，不覆盖公开指数净值。

```bash
uv sync --extra formal
uv run --extra formal zoo-formal-diagnostic \
  --cache-dir /path/to/cache --calendar-nav /path/to/nav.csv \
  --rules rules.yml --limit-asset /path/to/a_share_limit_status_latest \
  --output-dir /path/to/empty-output \
  --start 20251222 --end 20260625
```

该额外依赖需要 Python 3.12 或更新版本。`--limit-asset` 指向市场数据平台已发布的涨跌停资产目录，缺少日期分区或股票限价时会停止。省略此参数可运行不含涨跌停约束的诊断，但输出会明确标注此缺口。

输出目录中的 `.runtime/` 保存本次任务的 SQLite 状态、哈希输入和经校验的原始结果；`strict/` 与 `extended/` 保存验证后复制的五张诊断表和时钟。`summary.json` 中的 `runtime_job_id` 可回查任务。worker 失败或结果哈希校验失败时，不发布对应变体的诊断表。此运行方式使用本次输出目录中的隔离状态，不会写入生产运行时的任务库。

使用 2026-09-28 发布的证券和更名快照，2025-12-22 至 2026-06-25 的诊断得到严格版终值 0.9353、扩展版 0.9524。严格版有 1 次目标变更，扩展版有 5 次。结果 `summary.json` 的 SHA-256 为 `87c3b7a5cc8e730e49077dd46d61794c4b994266cf257e870b96936671a49d80`。旧输入下的 0.9142 和 0.9456 已被本次重算替代。这组数字仅用于发现机制差异。

同一批输入延长至 2026-07-10 时，诊断得到严格版 0.9153、扩展版 0.9110，`summary.json` 的 SHA-256 为 `73f06e1bdc96dae857d9bd6bb70086a5375023c38573e071691664c942d14499`。本次目标、订单和成交记录均没有 `600599.SH` 与 `300029.SZ`。新的更名快照显示 `600599.SH` 在 2025-05-06 至 2026-05-31 简称为 `*ST熊猫`，随后于 2026-06-01 进入退市整理期。

接入退市退出审计后，使用同批输入延至 2026-09-04，严格版终值 1.14395、扩展版 0.94710，与接入前一致。两版的审计列表均为空，因为没有样本期内退市的目标证券。现在已具备在出现这类目标时核对模拟卖出是否完成的门禁，但本次样本不能提供真实持仓退出或退市现金结算的证据，因此仍不能恢复公开净值。

此前 2025-12-22 至 2026-09-04 的诊断终值和原指数窗口比较已撤回。重新核对发现 `600599.SH` 在 2026-06-26、`300029.SZ` 在 2026-07-10 退市当天缺行情且无停牌记录，现有数据也没有可核实的退市现金结算。旧计算把这类持仓当日收益贡献记为零。旧输入跨越 2026-06-26 的运行写出 `blocked` 收据。网页暂不展示动物园的当前净值，并将曲线和历史表截止在 2026-06-25。仓库内的原始公开快照仍保留待核实日期，读取该 JSON 时也须遵守此边界。

该诊断使用 20:00 作为假设的决策截止时间，用 `close × adj_factor` 作为价格代理。现有缓存没有每项输入的真实可用时间、原始公司行动事件及退市结算事件。即使接入每日涨跌停资产，结果也不具备时点合规证明，不能作为正式可交易业绩或替换公开净值。其他缺行情但无停牌证据的情况仍需逐项核对。

## 跨项目市场事件契约

| 事件 | 本仓合成校验 | 公共执行引擎与 PBROE 对应约束 |
|---|---|---|
| 历史 ST 与简称未知 | `test_exception_rebalance.py`、`test_index.py` | PBROE 的 `test_data_coverage.py` 拒绝未知历史简称 |
| 停牌 | `test_index.py`、`test_formal_execution.py` | 公共引擎保留持仓且阻止交易，PBROE 缺日线按冻结处理 |
| 退市 | `test_exception_rebalance.py`、`test_formal_execution.py` 校验缺行情且无结算时停止 | PBROE 的 `test_backtest.py` 使用最后估值转现金代理 |
| 涨跌停 | `test_formal_execution.py` 校验可选已发布资产和缺状态拒绝，实盘数据诊断启用约束 | 公共引擎 `test_execution_sim_market_rules.py`，PBROE 缺状态即停止 |
| 除权分红 | `test_index.py` 校验复权比率代理 | 公共引擎 `test_execution_corporate_actions.py` 接受显式事件，PBROE `test_daily_factor_returns.py` 校验复权代理 |

各仓库使用同一事件分类核对，以上差异是证据边界。公共执行引擎的逐次时钟约束由 `test_sequenced_execution_backend.py` 校验。
