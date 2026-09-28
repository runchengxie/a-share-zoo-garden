# 动物园公共执行模拟诊断

`zoo-formal-diagnostic` 从固定离线缓存逐日恢复严格版和扩展版目标。每次目标变更记录独立的 `research.clock.v1`，次一交易日才允许提交订单，再交给 quant-platform 的逐日执行模拟器计算订单、成交和账本。诊断产物写在仓库外的空目录，不覆盖公开指数净值。

```bash
uv sync --extra formal
uv run --extra formal zoo-formal-diagnostic \
  --cache-dir /path/to/cache --calendar-nav /path/to/nav.csv \
  --rules rules.yml --limit-asset /path/to/a_share_limit_status_latest \
  --output-dir /path/to/empty-output \
  --start 20251222 --end 20260904
```

该额外依赖需要 Python 3.12 或更新版本。`--limit-asset` 指向市场数据平台已发布的涨跌停资产目录，缺少日期分区或股票限价时会停止。省略此参数可运行不含涨跌停约束的诊断，但输出会明确标注此缺口。

本机缓存的 2025-12-22 至 2026-09-04 区间回放，接入涨跌停资产后得到严格版终值 1.0718、扩展版 0.9623。未接入时分别为 1.0718 和 0.9787。原指数算法在同窗口的终值分别为 1.0218 和 0.9649。两者采用不同的调仓、流动性和收益核算方法，这组数字仅用于发现机制差异。

该诊断使用 20:00 作为假设的决策截止时间，用 `close × adj_factor` 作为价格代理。现有缓存没有每项输入的真实可用时间，也没有原始公司行动事件。即使接入每日涨跌停资产，结果也不具备时点合规证明，不能作为正式可交易业绩或替换公开净值。缺行情但未报告停牌的原指数告警仍需单独核对。

## 跨项目市场事件契约

| 事件 | 本仓合成校验 | 公共执行引擎与 PBROE 对应约束 |
|---|---|---|
| 历史 ST 与简称未知 | `test_exception_rebalance.py`、`test_index.py` | PBROE 的 `test_data_coverage.py` 拒绝未知历史简称 |
| 停牌 | `test_index.py`、`test_formal_execution.py` | 公共引擎保留持仓且阻止交易，PBROE 缺日线按冻结处理 |
| 退市 | `test_exception_rebalance.py` | PBROE 的 `test_backtest.py` 使用最后估值转现金代理 |
| 涨跌停 | `test_formal_execution.py` 校验可选已发布资产和缺状态拒绝，实盘数据诊断启用约束 | 公共引擎 `test_execution_sim_market_rules.py`，PBROE 缺状态即停止 |
| 除权分红 | `test_index.py` 校验复权比率代理 | 公共引擎 `test_execution_corporate_actions.py` 接受显式事件，PBROE `test_daily_factor_returns.py` 校验复权代理 |

各仓库使用同一事件分类核对，以上差异是证据边界。公共执行引擎的逐次时钟约束由 `test_sequenced_execution_backend.py` 校验。
