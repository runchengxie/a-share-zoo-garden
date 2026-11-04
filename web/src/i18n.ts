import { createContext, useContext } from "react";

export type Locale = "en-US" | "zh-CN";

const COPY = {
  "en-US": {
    associations: {
      preparation: "Next stage: fixed observation windows",
      preparationText: "The offline study tool uses 1, 5 and 20 trading-day windows from the first trading close after both sample and protocol publication. The benchmark is adjusted CSI 300 ETF (510300.SH). Missing prices remain unavailable; no trading costs or execution are modelled. Protocol registration and verified market inputs are still required.",
      publication: "First-sample publication", publicationProof: "Deployment evidence",
      nav: "Market associations", heading: "Market associations observation pool",
      intro: "How reporting and communities connect stock names to animals and plants. These records do not change the name-based indices.",
      boundary: "Forward observation has not started. No returns are shown. Publication and a tracking start must be recorded before any future performance series.",
      scope: "Initial sample: all same-day examples in the selected 3 November 2026 reporting, collected after the event. This is neither a market-wide list nor evidence that the narrative caused a price move.",
      confirmedMeaning: "Confirmed means a source explicitly makes the association. Community interpretations remain pending. Expired records are retained; review deadlines do not automatically prove a narrative has ended.",
      theme: "Theme", status: "Review status", all: "All", animal: "Animal", plant: "Plant",
      pending: "Pending verification", confirmed: "Source association confirmed", expired: "Expired",
      empty: "No records for these filters. Plant cases will be added when evidence is available.",
      homophone: "Homophone", character_split: "Character split", zodiac: "Zodiac", narrative: "Narrative association",
      media_explicit: "Explicit media classification", community_narrative: "Community interpretation reported by media",
      sourceTime: "Earliest checked source", recorded: "Project collection", reviewed: "Last review", due: "Review due", overdue: "Review overdue",
      evidence: "Evidence", sources: "Sources · original titles", history: "Review history", source_review: "Source reviewed",
      target: "Associated term", nameTerm: "Name term", catalyst: "2027 sheep-year expectation", noTracking: "Tracking not started",
    },
    brandKicker: "A-share zoo & garden · rule-based research",
    title: "A-share Zoo & Garden",
    documentTitle: "A-share Zoo & Garden · Rule-based research",
    deck: "Track stock-name index experiments with public rules and explicit research limits.",
    index: "Research index",
    waiting: "Waiting for data",
    nav: ["Home", "Methodology", "Constituents", "History", "Changes", "About"],
    footer: ["Updated after each daily close · rules public · research only", "Not investment advice"],
    switchTo: "中文",
    shell: { dataUpdate: "Data update", primaryNavigation: "Primary navigation", switchToLanguage: "Switch to {language}" },
    about: {
      heading: "About this project",
      intro: "The A-share Zoo and Garden indices are a research experiment that classifies Chinese stock names: A-shares whose names contain animal or plant terms are combined equal-weighted to study long-run performance relative to a broad-market benchmark.",
      calculation: "Index calculations run in Python and are published as public JSON. The frontend only presents the results; source credentials remain server-side.",
      disclaimerHeading: "Disclaimer",
      disclaimer: "This project is for research and methodology demonstration only. All indices and returns are historical backtest results and are not investment advice. Use at your own risk.",
    },
    changesPage: {
      loading: "Loading data…", loadFailed: "Data load failed: ", heading: "Rebalance history",
      intro: "The Zoo and Garden sections show their latest constituent changes and suspected false matches.",
      zoo: "Zoo", garden: "Garden",
    },
    constituentsPage: {
      loading: "Loading data…", loadFailed: "Data load failed: ", heading: "Current constituents",
      intro: "The Zoo and Garden sections show strict and extended results. Expand a group to inspect its constituents.",
      searchHint: "Search filters both themes", searchPlaceholder: "Filter name, code, or keyword", zoo: "Zoo", garden: "Garden",
    },
    historyPage: {
      loading: "Loading data…", loadFailed: "Data load failed: ", heading: "Historical NAV",
      researchProxy: "Research proxy: delisted constituents use the last valid adjusted price as proxy settlement and are removed on the delisting date. This is not verifiable cash settlement.",
      missingSettlement: "Zoo historical NAV has missing delisted-constituent settlement prices since 2026-06-26. The chart and table show only earlier dates.",
      loadingChart: "Loading chart…", dataDetail: "Data detail", date: "Date", strictNav: "Strict NAV", extendedNav: "Extended NAV",
      tableNote: "The table shows the latest 200 trading days only. Research-proxy data is not verifiable cash settlement or formal tradable performance.",
      benchmarkNav: "{benchmark} NAV",
    },
    methodology: {
      heading: "Index construction methodology",
      intro: "The Zoo and Garden indices select constituents from the A-share universe when their historical names contain the relevant theme terms, construct equal-weighted NAV series, and compare them with a configurable benchmark (CSI 300 ETF by default).",
      variants: "Two index variants", strict: "Strict: match explicit theme terms only, with fewer false positives.",
      extended: "Extended: add broader terms beyond the strict vocabulary for wider coverage and more noise.",
      vocabulary: "Vocabulary and exclusions",
      vocabularyText: "Matching uses names as known at each historical point. configs/rules.yml maintains strict keywords, extended keywords, and exclusions. Exclusions filter place names, brands, or industry terms that contain a theme term without matching the research concept. Force-include and force-exclude lists by ts_code provide manual corrections.",
      adjusted: "Adjusted prices and returns",
      adjustedText: "Daily returns use close and previous close prices adjusted by corporate-action factors so dividends and splits do not create artificial jumps. Constituents are equal-weighted each day.",
      benchmark: "Benchmark",
      benchmarkText: "The default benchmark is the CSI 300 ETF (510300.SH), and the runtime can use the CSI 300 index or another A-share. Benchmark NAV is adjusted under the same convention.",
      missingPrices: "Missing-price handling",
      missingPricesText: "When a confirmed suspension has no quote, the constituent weight is retained and valued at the last known price. Other missing prices do not redistribute weight to the remaining constituents. New strict-variant calculations stop when a delisted holding lacks both quotes and a verifiable settlement event.",
      proxySeries: "The continuous Zoo series on the home page uses a research proxy: when verifiable cash settlement is unavailable, it uses the last valid adjusted price before delisting, records zero return on the delisting date, and removes the constituent. This series is for research observation and does not represent formal tradable performance.",
      delistingAudit: "The home page delisting audit lists the last observable date, proxy settlement date, and strict status for each event.",
    },
    home: {
      themeAnimal: "Zoo", themePlant: "Garden",
      variantGuide: "Strict uses explicit animal or plant terms. Extended adds broader terms and may include more false matches.",
      navBase: "NAV starts at 1 on {date}. A value of 1.2 means a 20% cumulative change in this research series.",
      dashboardIntro: "Select constituents by historical stock name, build an equal-weighted index, and compare its history with {benchmark}.",
      asOf: "As of {date}", proxyAlert: "Research proxy: delisted constituents use the last valid adjusted price as proxy settlement and are removed on the delisting date. It is not verifiable cash settlement or formal tradable performance.",
      strictAlert: "Strict view stops at 2026-06-25 because delisting settlement is not verifiable. It is retained for comparison with the research proxy.",
      indexSnapshot: "Index snapshot", navUnderReview: "Current NAV under review", todayData: "Today's data",
      blockedSnapshot: "Source data ends on {date}; missing delisting settlement keeps current NAV and excess return hidden. Constituents remain available on the constituents page.",
      performance: "Performance / normalized NAV", navBenchmark: "NAV and benchmark", performanceNote: "Compare strict {theme}, extended {theme}, and the benchmark. Zoom changes the view, not the index definition.",
      settlementView: "Settlement view", researchProxy: "Research proxy", strictCutoff: "Strict cutoff", loadingChart: "Loading chart…",
      recentRebalance: "Recent rebalance", constituentChanges: "Constituent changes", viewFullHistory: "View full history",
      readingNote: "Reading note", checkEvidence: "Check the evidence before the story",
      caution: "Name-based classifications have no clear economic mechanism. After seeing a striking curve, check data mining, selection bias, and backtest overfitting before discussing explanations.",
      methodologyLink: "Read methodology", constituentsLink: "View constituents", historyLink: "Check history",
      loading: "Loading Zoo and Garden data…", loadFailed: "Data load failed: ", researchQuestion: "Research question",
      heroTitle: "Can animals and plants in stock names form meaningful indices?",
      heroText: "These two playful name classifications are compiled into A-share indices under fixed rules, with their performance relative to a benchmark tracked over time. The page shows both results for comparison of counts, NAV paths, and rebalances.",
      indexMetadata: "Index research metadata", closingData: "Closing data", ruleBuilt: "Rule-built", researchOnly: "Research only",
      themeHeading: "{theme} names as an investment experiment",
    },
    taxonomy: {
      animal: "Zoo vocabulary has a first verifiable effective date of {date}. Earlier NAV uses the later vocabulary replay and is a retrospective classification experiment, not an executable strategy history.",
      plant: "Garden vocabulary has a first verifiable effective date of {date}. Earlier NAV uses the later vocabulary replay and is a retrospective classification experiment, not an executable strategy history.",
    },
    constituentsTable: {
      strictTitle: "Strict {theme} constituents", extendedTitle: "Extended {theme} constituents", none: "No constituents.",
      code: "Code", name: "Name", keyword: "Keyword", type: "Type", noKeyword: "None", forced: "Forced", matched: "Matched",
    },
    changesList: {
      noChanges: "No changes.", added: "Added: {name} ({code})", removed: "Removed: {name} ({code})",
      noNoise: "No suspected false matches.", matchedKeyword: "{name} ({code}) matched keyword: {keyword}",
      latest: "Latest rebalance date: {date}", strict: "Strict {theme}", extended: "Extended {theme}",
      noiseStrict: "Suspected false matches (strict)", noiseExtended: "Suspected false matches (extended)",
    },
    delistingAudit: {
      heading: "Delisting event audit", subheading: "Proxy settlement record",
      description: "When verifiable cash settlement is unavailable, the research proxy uses the last valid adjusted price before delisting, records zero return on the delisting date, and removes the constituent.",
      code: "Code", delistingDate: "Delisting date", lastObservableDate: "Last observable date", proxySettlementDate: "Proxy settlement date", strictStatus: "Strict status", blocked: "Blocked", codeValue: "{code}",
    },
    navCards: {
      today: "Today {value}", strict: "Strict {theme}", extended: "Extended {theme}",
      strictDetail: "vs. benchmark {value}", extendedDetail: "vs. benchmark {value}",
      strictCount: "Strict {theme} constituents", extendedCount: "Extended {theme} constituents", currentStocks: "Current stocks",
    },
    themeToggle: { switchTo: "Switch to {theme} theme", dark: "Dark", light: "Light" },
    chart: { strict: "Strict {theme}", extended: "Extended {theme}", ariaLabel: "{theme} index NAV chart" },
  },
  "zh-CN": {
    associations: {
      preparation: "下一阶段：固定期限观察",
      preparationText: "离线工具按名单和协议均公开后的首个交易日收盘设基点，观察此后 1、5、20 个交易日，与复权沪深 300 ETF（510300.SH）比较。缺价保留为无法核实，不模拟交易费用或成交。正式跟踪仍需协议注册和真实行情核验。",
      publication: "首批名单公开时间", publicationProof: "部署凭证",
      nav: "市场联想", heading: "市场联想观察池",
      intro: "记录报道和社区如何把股票名称与动物、植物联系起来，独立于名称分类指数。",
      boundary: "前瞻跟踪尚未启动，暂不展示收益。后续须先记录公开发布时间和跟踪起点，再生成表现序列。",
      scope: "首批样本覆盖所选 2026 年 11 月 3 日报道当日行情段落提及的全部案例，属于事件发生后的收录。它不是全市场名单，也不证明联想造成股价变化。",
      confirmedMeaning: "已确认仅指来源明确建立联系。网友解释保留为待核实，失效记录继续保存。到期需复核不等于联想已消失。",
      theme: "主题", status: "审核状态", all: "全部", animal: "动物", plant: "植物",
      pending: "待核实", confirmed: "来源关联已确认", expired: "已失效",
      empty: "当前筛选下暂无记录。植物案例将在获得证据后收录。",
      homophone: "谐音", character_split: "拆字", zodiac: "生肖", narrative: "叙事联想",
      media_explicit: "媒体明确归类", community_narrative: "媒体转述网友联想",
      sourceTime: "已核查来源最早时间", recorded: "项目收录时间", reviewed: "最近审核", due: "复核期限", overdue: "已到复核期限",
      evidence: "证据", sources: "来源及原文标题", history: "审核记录", source_review: "来源核查",
      target: "关联词", nameTerm: "名称用字", catalyst: "2027 羊年预期", noTracking: "尚未启动跟踪",
    },

    brandKicker: "A 股动物园与植物园 · 规则化研究",
    title: "A 股动物园与植物园",
    documentTitle: "A 股动物园与植物园 · 规则化研究",
    deck: "按股票名称分类，公开记录指数表现与研究限制。",
    index: "研究指数",
    waiting: "等待数据",
    nav: ["首页", "方法", "成分", "历史", "调仓", "关于"],
    footer: ["数据每日收盘后更新 · 规则公开 · 仅供研究", "不构成投资建议"],
    switchTo: "English",
    shell: { dataUpdate: "数据更新时间", primaryNavigation: "主导航", switchToLanguage: "切换到{language}" },
    about: {
      heading: "关于本项目",
      intro: "A 股动物园和植物园指数是用于研究的中文股票名称分类实验：把名称里带有动物或植物相关字样的 A 股，按等权方式组合成指数，观察它们相对大盘基准的长期表现。",
      calculation: "指数计算在 Python 端完成，结果以公开 JSON 形式发布。前端只负责展示，数据源凭证只在服务端保存。",
      disclaimerHeading: "免责声明",
      disclaimer: "本项目仅用于研究与方法演示，所有指数与收益均为历史回测结果，不构成任何投资建议。据此操作风险自负。",
    },
    changesPage: {
      loading: "数据加载中…", loadFailed: "数据加载失败：", heading: "调仓记录",
      intro: "动物园与植物园分别展示最近一次成分变化及疑似误匹配。",
      zoo: "动物园", garden: "植物园",
    },
    constituentsPage: {
      loading: "数据加载中…", loadFailed: "数据加载失败：", heading: "当前成分",
      intro: "动物园和植物园分别展示严格、扩展两组结果。展开分组查看成分明细。",
      searchHint: "搜索会同时筛选两个主题", searchPlaceholder: "筛选名称、代码或匹配词", zoo: "动物园", garden: "植物园",
    },
    historyPage: {
      loading: "数据加载中…", loadFailed: "数据加载失败：", heading: "历史净值",
      researchProxy: "当前为研究代理版：退市成分使用退市前最后有效复权价格作为代理结算，并在退市日移除，不代表可核实现金结算。",
      missingSettlement: "动物园历史净值自 2026-06-26 起有退市成分缺价，待结算数据重建。图表和表格只显示此前日期。",
      loadingChart: "加载图表…", dataDetail: "数据明细", date: "日期", strictNav: "严格净值", extendedNav: "扩展净值",
      tableNote: "表格仅展示最近 200 个交易日。研究代理版数据不代表可核实的现金结算或正式可交易业绩。",
      benchmarkNav: "{benchmark}净值",
    },
    methodology: {
      heading: "指数构建方法",
      intro: "动物园和植物园指数从 A 股全市场里，按股票简称是否包含对应主题词，筛选出成分股，以等权方式构造净值序列，并与可配置基准（默认沪深 300 ETF）对比。",
      variants: "两种指数", strict: "严格版本：仅匹配明确的主题词，误匹配较少。",
      extended: "扩展版本：在严格词表之外加入更宽泛的主题词，覆盖更广，但噪声也更高。",
      vocabulary: "规则词表与排除项",
      vocabularyText: "匹配基于股票简称的历史时点名称。规则文件 configs/rules.yml 维护三类配置：严格关键词、扩展关键词、排除项。排除项用于过滤名称中包含主题词、但与主题无关的地名、品牌或行业词。另提供按 ts_code 的强制纳入与强制剔除名单，用于人工纠偏。",
      adjusted: "复权与收益",
      adjustedText: "每日收益以收盘价与前收价为基础，并按复权因子调整，处理分红送转带来的跳变，使净值连续可比。成分按等权计算，即每个成分每日权重相同。",
      benchmark: "基准",
      benchmarkText: "基准默认取沪深 300 ETF（510300.SH），也可在运行时改为沪深 300 指数或某只 A 股。基准净值同样经过复权处理，确保与主题指数口径一致。",
      missingPrices: "缺失行情处理",
      missingPricesText: "确认停牌但缺行情时，保留成分权重并以前一已知价格保持估值。其他缺价不会把权重重新分摊给剩余成分。严格版退市持仓缺少行情和可核实结算事件时，新计算会停止，相关日期后的收益不能视作已核实结果。",
      proxySeries: "首页当前展示的动物园连续曲线属于研究代理版：缺少可核实现金结算时，使用退市前最后有效复权价格，退市日计为零收益并移除成分。该序列用于观察研究，不代表正式可交易业绩。",
      delistingAudit: "每个退市事件的最后可观测日、代理结算日和严格版状态见首页的退市事件审计表。",
    },
    home: {
      themeAnimal: "动物园", themePlant: "植物园",
      variantGuide: "严格组只匹配明确的动物或植物词，扩展组加入更宽泛的词，也更容易误匹配。",
      navBase: "净值在 {date} 从 1 开始。1.2 表示这条研究序列从起点累计上涨了 20%。",
      dashboardIntro: "只按股票简称筛选成分，以等权方式构建指数，观察它相对 {benchmark} 的历史表现。",
      asOf: "截至 {date}", proxyAlert: "当前曲线为研究代理版：退市成分使用退市前最后有效复权价格作为代理结算，并在退市日移除。它不代表可核实的现金结算或正式可交易业绩。",
      strictAlert: "严格截止版停在 2026-06-25，因为退市结算不可核实，仅用于与研究代理版对照。",
      indexSnapshot: "指数快照", navUnderReview: "当前净值待核实", todayData: "今日数据",
      blockedSnapshot: "源数据截至 {date}，退市结算缺失，当前净值和超额收益暂不展示。成分仍可在成分页查看。",
      performance: "表现 / 标准化净值", navBenchmark: "净值与基准", performanceNote: "比较严格{theme}、扩展{theme}和基准。缩放区间只改变视图，不改变指数口径。",
      settlementView: "结算口径视图", researchProxy: "研究代理版", strictCutoff: "严格截止版", loadingChart: "加载图表…",
      recentRebalance: "最近调仓", constituentChanges: "成分变化", viewFullHistory: "查看完整记录",
      readingNote: "阅读提示", checkEvidence: "先看现象，再查口径",
      caution: "这类名称分类缺少明确的经济机制。看到显眼的曲线后，应先检查数据挖掘、选择偏差和回测过拟合，再讨论背后的解释。",
      methodologyLink: "阅读构建方法", constituentsLink: "查看当前成分", historyLink: "检查历史数据",
      loading: "正在读取动物园和植物园数据…", loadFailed: "数据加载失败：", researchQuestion: "研究问题",
      heroTitle: "名字里的动物和植物，能不能组成有意义的指数？",
      heroText: "这里把两种有趣的名称分类按固定规则编成 A 股指数，持续记录它们相对基准的表现。页面同时展示两套结果，方便比较成分数量、净值走势和调仓情况。",
      indexMetadata: "指数研究元数据", closingData: "收盘数据", ruleBuilt: "规则构建", researchOnly: "仅供研究",
      themeHeading: "{theme}名称里的投资实验",
    },
    taxonomy: {
      animal: "动物园词表最早可核实的生效日为 {date}。此前的净值使用后来确定的词表回放，属于事后分类实验，不能视为当时可执行的策略历史。",
      plant: "植物园词表最早可核实的生效日为 {date}。此前的净值使用后来确定的词表回放，属于事后分类实验，不能视为当时可执行的策略历史。",
    },
    constituentsTable: {
      strictTitle: "严格{theme}成分", extendedTitle: "扩展{theme}成分", none: "暂无成分。",
      code: "代码", name: "名称", keyword: "匹配词", type: "类型", noKeyword: "无", forced: "强制", matched: "匹配",
    },
    changesList: {
      noChanges: "无变动。", added: "纳入：{name}（{code}）", removed: "移除：{name}（{code}）",
      noNoise: "暂无疑似误匹配。", matchedKeyword: "{name}（{code}）匹配词：{keyword}",
      latest: "最近调仓日期：{date}", strict: "严格{theme}", extended: "扩展{theme}",
      noiseStrict: "疑似误匹配（严格）", noiseExtended: "疑似误匹配（扩展）",
    },
    delistingAudit: {
      heading: "退市事件审计", subheading: "代理结算记录",
      description: "缺少可核实现金结算时，研究代理版使用退市前最后有效复权价格，在退市日计为零收益并移除成分。",
      code: "代码", delistingDate: "退市日", lastObservableDate: "最后可观测日", proxySettlementDate: "代理结算日", strictStatus: "严格版", blocked: "无法核实", codeValue: "{code} {name}",
    },
    navCards: {
      today: "当日 {value}", strict: "严格{theme}", extended: "扩展{theme}",
      strictDetail: "相对基准 {value}", extendedDetail: "相对基准 {value}",
      strictCount: "严格{theme}成分", extendedCount: "扩展{theme}成分", currentStocks: "当前股票数",
    },
    themeToggle: { switchTo: "切换到{theme}主题", dark: "深色", light: "浅色" },
    chart: { strict: "严格{theme}", extended: "扩展{theme}", ariaLabel: "{theme}指数净值走势图" },
  },
} as const;

export const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: "en-US",
  setLocale: () => undefined,
});

export function useLocale() {
  const { locale, setLocale } = useContext(LocaleContext);
  return { locale, copy: COPY[locale], setLocale };
}

export function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function initialLocale(): Locale {
  try {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (requested === "en-US" || requested === "zh-CN") return requested;
    return window.localStorage.getItem("a-share-zoo-locale") === "zh-CN" ? "zh-CN" : "en-US";
  } catch {
    return "en-US";
  }
}
