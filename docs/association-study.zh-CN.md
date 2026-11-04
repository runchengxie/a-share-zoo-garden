# 固定期限前瞻观察

[English](association-study.md) · [网站](https://runchengxie.github.io/a-share-zoo-garden/?lang=zh-CN#/associations)

固定期限协议已登记，实际公开时间为 2026-11-04 10:48:15（上海时间）。冻结名单、协议及哈希保存在 `published/association-study/cohort-20261104/` 和 `association_registration.json`。网页消费单独的观察报告，不改变动物园、植物园指数。真实数据核验状态以报告日期和覆盖情况为准，尚未到期不能生成收益。

## 口径

协议版本为 `association-study.v1`，机器参数保存在 `published/data/association_study_protocol.json`。此版本固定以下方法，修改任一方法必须升级协议版本并重新注册，不能重写旧 cohort。

名单审核、名单公开和协议公开三者均完成后，以其后首个交易日收盘为基点，观察下一交易日起 1、5、20 个交易日。交易日按完整交易所日历计算，包含节假日与休市标记，不通过工作日近似真实日历。

每股收益为末日复权价格除以基点复权价格减一，基准为同期 510300.SH 的复权 ETF 收益。超额为两者相减，以百分点展示。复权因子近似分红再投口径，不代表现金分红会计。仅做价格观察，不包含费用、滑点、成交约束或可执行收益。涨停可有观测价格，但不能因此认定能够买入。

仅使用冻结名单中已确认的条目，待核实和已失效条目保留并注明未参与。不得使用后来的确认或失效状态覆盖冻结样本，观察期内失效也不删除原观察行。后续重启须另建 cohort，本版拒绝使用公开之后才追加审核事件的名单。

基点和期间每个所需交易日必须同时具备股票、ETF 收盘价及复权因子。缺任一输入就保留该期限的缺数据状态，不移动基点，不用零收益或前值填补，也不从统计中删除失败案例。到期日超出 as-of 时显示未到期，即使文件内已有未来数据也不能使用。缺行情原因由后续数据审计区分停牌、退市和数据故障，本工具不猜测。

## 输入与运行

日历 CSV 必须有 `cal_date,is_open`，日期为 `YYYY-MM-DD`，每天一行，覆盖较晚公开时间所在日期至 as-of，休市日也必须存在。`is_open` 只接受 0 或 1。

价格 CSV 必须有 `trade_date,ts_code,close,adj_factor`，代码保留交易所后缀。股票和 ETF 共用相同列名，但 ETF 的 `adj_factor` 必须来自基金复权因子，不能默认为 1。相同证券日期不得重复。空白价格或因子保留为缺数据，已提供的数值必须为有限正数。源数据标识通过 `--input-source` 传入，输出仍标记为用户提供且未经独立核验，不能改称正式验证结果。

注册 JSON 必须包含 `sample_sha256`、`protocol_sha256`、`sample_published_at`、`protocol_published_at` 和 `evidence_url`。两项哈希针对原始文件字节，时间必须带时区，证据链接指向本项目成功的公开部署。离线工具检查结构和哈希，不联网验证部署真实性，操作人员须另行核对版本、实际完成时间和成功结论。使用这次协议实际公开后的部署时间，不能把首批名单的较早发布复用于协议。

```bash
python -m zoo_index.association_study \
  --sample published/data/market_associations.json \
  --protocol published/data/association_study_protocol.json \
  --registration "$STUDY_DATA/registration.json" \
  --calendar "$STUDY_DATA/calendar.csv" \
  --prices "$STUDY_DATA/prices.csv" \
  --as-of YYYY-MM-DD \
  --input-source reviewed-provider-export \
  --output-dir "$STUDY_DATA/results/run-id"
```

`STUDY_DATA` 应解析为拥有者项目数据目录中的独立子目录，不能使用任务工作区作为永久数据路径。输出目录必须为仓库外的绝对路径。CLI 不接受未来日期，当日须在上海时间 16:30 后使用，减少收盘数据未完整时误计。省略 `--registration` 可检查等待注册状态，但不会生成任何收益。

输出 `association_study.json` 保存输入文件和计算代码的 SHA-256、as-of、全部案例及各期限状态。原始输入、运行结果和诊断日志在仓库外保留，只有经过审查的公开摘要才可进入 `published/`。

## 本次证据与下一步

第一阶段名单已于 2026-11-04 10:18:40 公开。此次协议在合并和部署前尚不可公开引用为已注册方案，不能提前宣称具体起点。即使协议同日在收盘前公开，11 月 4 日也不能成为基点。实际首个交易日还须核验交易所日历。

本次只用合成样本检验工程行为，没有调用真实行情服务，也没有更改或迁移已有共享缓存。现有项目提供股票日线、股票复权、ETF 日线、ETF 复权和交易日历接口，具备后续接入条件。但接口存在不等于实际权限、完整数据和前瞻证据已经可用。

下一阶段按顺序执行：核对本协议成功部署并登记注册凭证，准备冻结 cohort 和完整日历，检查 11 个已确认案例及 ETF 的真实行情和复权数据，运行离线报告并保留缺失诊断，经审查后发布摘要，最后把已验证流程接入每日任务。发现更多候选时独立保留待核实队列，不把今天才发现的案例加入过去 cohort。


## 注册与自动更新

协议凭证对应[成功部署运行](https://github.com/runchengxie/a-share-zoo-garden/actions/runs/41763006926)的 Deploy to GitHub Pages 步骤完成时间，版本为 `94e7d0bfba63eaffd9ff31c8abee21b68be5b203`。名单凭证对应更早的首批公开记录。冻结文件独立于后续维护的观察池，不得覆盖或借后续状态变化更改旧 cohort。

`association-study-check.yml` 是手动只读核验工作流，使用现有 Actions 的 Tushare 凭据。它读取真实交易日历、股票日线及复权、510300.SH 日线及基金复权，只上传不含凭据或原始行情的候选公开报告。核验失败时工作流失败，但仍保留明确不可用状态供检查。首次报告下载、审查后经数据 PR 发布。

既有 `daily.yml` 每个工作日上海时间 16:45 运行，移至完整日截止 16:30 之后。前瞻报告在原有公开数据提交步骤前更新，异常只写不含原始错误文本的不可用状态，不中断原有指数发布。`publish_only` 不触发行情请求。日期不可变的服务商响应使用独立 Actions cache，原始缓存不入库，也不打包进公开候选报告。缓存是可被清理的运行加速层，输入哈希不等于原始数据永久保存或独立对账。

收集范围限制为本 cohort 的基点及后续 20 个交易日，另外检查最近完整交易日的接口覆盖。已确认的 11 个股票参与观察，2 个未确认案例仍展示但不计收益。报告附单一服务商证据等级、原始输入的内容哈希、计算和收集代码哈希。前端显示完整交易日、基点日、覆盖数、各期限状态和超过 48 小时未更新提示。缺价不重设基点，不补零。

本机无 Token 时不搜索其他凭据。Actions 原始临时文件位于 runner 外部临时目录，公开摘要经审查后进入 `published/data/association_study.json`。本地运行须显式提供仓库外运行目录，并通过环境变量传递既有授权凭据：

```bash
python -m zoo_index.association_live \
  --runtime-dir "$STUDY_DATA/runtime/run-id" \
  --public-output "$STUDY_DATA/candidates/association_study.json"
```

较早的离线探索记录保留了当时未注册、未接数据的限制，不能将其理解为本阶段已完成的真实数据核验。最新状态始终以公开报告为准。
