import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Changes,
  Constituents,
  IndexTheme,
  Latest,
  NavPoint,
  fetchThemeChanges,
  fetchThemeConstituents,
  fetchThemeHistory,
  fetchThemeLatest,
  fetchThemeMetadata,
  fetchDelistingAudit,
  DelistingAudit,
  Metadata,
} from "../api";
import ChangesList from "../components/ChangesList";
import NavCards from "../components/NavCards";
import TaxonomyDisclosure from "../components/TaxonomyDisclosure";
import DelistingAuditTable from "../components/DelistingAudit";
import { ZOO_UNPRICED_DELIST_CUTOFF, zooHistoryBeforeUnpricedDelist } from "../researchBoundary";
import { useLocale } from "../i18n";

const ZooChart = lazy(() => import("../components/ZooChart"));

type ThemeData = { latest: Latest; history: NavPoint[]; changes: Changes; constituents: Constituents; metadata: Metadata; audit?: DelistingAudit };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; themes: Record<IndexTheme, ThemeData> };

const THEME_LABELS: Record<IndexTheme, string> = { animal: "动物园", plant: "植物园" };

async function fetchThemeData(theme: IndexTheme): Promise<ThemeData> {
  const [latest, history, changes, constituents, metadata, audit] = await Promise.all([
    fetchThemeLatest(theme), fetchThemeHistory(theme), fetchThemeChanges(theme), fetchThemeConstituents(theme), fetchThemeMetadata(theme), theme === "animal" ? fetchDelistingAudit() : Promise.resolve(undefined),
  ]);
  return { latest, history, changes, constituents, metadata, audit };
}

function ThemeDashboard({ theme, data }: { theme: IndexTheme; data: ThemeData }) {
  const { locale } = useLocale();
  const english = locale === "en-US";
  const themeLabel = english ? theme === "plant" ? "Garden" : "Zoo" : THEME_LABELS[theme];
  const isResearchProxy = theme === "animal" && data.metadata.evidence_tier === "research_proxy";
  const animalSnapshotBlocked = theme === "animal" && !isResearchProxy && data.latest.date > ZOO_UNPRICED_DELIST_CUTOFF;
  const displayHistory = theme === "animal" && !isResearchProxy ? zooHistoryBeforeUnpricedDelist(data.history) : data.history;
  return (
    <section className={`theme-dashboard theme-dashboard-${theme}`} id={`${theme}-panel`} aria-labelledby={`${theme}-dashboard-heading`}>
      <div className="theme-dashboard-heading">
        <div>
          <div className="section-kicker">{themeLabel}</div>
          <h2 id={`${theme}-dashboard-heading`}>{english ? `${themeLabel} names as an investment experiment` : theme === "plant" ? "植物名称里的投资实验" : "动物名称里的投资实验"}</h2>
          <p>{english ? `Select constituents by historical stock name, build an equal-weighted index, and compare its history with ${data.latest.benchmark_label}.` : `只按股票简称筛选成分，以等权方式构建指数，观察它相对 ${data.latest.benchmark_label} 的历史表现。`}</p>
        </div>
        <span className="section-asof">{english ? "As of " : "截至 "}{data.latest.date}</span>
      </div>

      {theme === "animal" && (
        <p className="research-alert" role="status">
          {isResearchProxy ? (english ? "Research proxy: delisted constituents use the last valid adjusted price as proxy settlement and are removed on the delisting date. It is not verifiable cash settlement or formal tradable performance." : "当前曲线为研究代理版：退市成分使用退市前最后有效复权价格作为代理结算，并在退市日移除。它不代表可核实的现金结算或正式可交易业绩。") : (english ? "Settlement data for delisted constituents is incomplete from 2026-06-26. The chart shows earlier history only and current NAV is withheld." : "退市成分缺价后，动物园净值自 2026-06-26 起待结算数据重建。下方曲线只展示此前的历史，当前净值暂不展示。")}
        </p>
      )}

      <section className="index-snapshot" aria-labelledby={`${theme}-snapshot-heading`}>
        <div className="section-heading compact-heading"><div><div className="section-kicker">{english ? "Index snapshot" : "指数快照"}</div><h3 id={`${theme}-snapshot-heading`}>{animalSnapshotBlocked ? english ? "Current NAV under review" : "当前净值待核实" : english ? "Today's data" : "今日数据"}</h3></div></div>
        {animalSnapshotBlocked ? <p className="muted">{english ? `Source data ends on ${data.latest.date}; missing delisting settlement keeps current NAV and excess return hidden. Constituents remain available on the constituents page.` : `源数据截至 ${data.latest.date}，退市结算缺失，当前净值和超额收益暂不展示。成分仍可在成分页查看。`}</p> : <NavCards latest={data.latest} strictCount={data.constituents.strict.length} extendedCount={data.constituents.extended.length} themeLabel={themeLabel} />}
      </section>

      <section className="research-section" aria-labelledby={`${theme}-performance-heading`}>
        <div className="section-heading"><div><div className="section-kicker">{english ? "Performance / normalized NAV" : "表现 / 标准化净值"}</div><h3 id={`${theme}-performance-heading`}>{english ? "NAV and benchmark" : "净值与基准"}</h3><p className="section-deck">{english ? `Compare strict ${themeLabel}, extended ${themeLabel}, and the benchmark. Zoom changes the view, not the index definition.` : `比较严格${themeLabel}、扩展${themeLabel}和基准。缩放区间只改变视图，不改变指数口径。`}</p></div></div>
        <TaxonomyDisclosure theme={theme} />
        <Suspense fallback={<div className="zoo-chart zoo-chart-loading" role="status">{english ? "Loading chart…" : "加载图表…"}</div>}>
          <ZooChart history={displayHistory} benchmarkLabel={data.latest.benchmark_label} themeLabel={themeLabel} />
        </Suspense>
      </section>

      {theme === "animal" && isResearchProxy && data.audit ? <DelistingAuditTable audit={data.audit} /> : null}

      <div className="home-research-grid">
        <section className="research-section zoo-today" aria-labelledby={`${theme}-changes-heading`}>
          <div className="section-heading compact-heading"><div><div className="section-kicker">{english ? "Recent rebalance" : "最近调仓"}</div><h3 id={`${theme}-changes-heading`}>{english ? "Constituent changes" : "成分变化"}</h3></div><Link className="text-link" to="/changes">{english ? "View full history" : "查看完整记录"}</Link></div>
          <ChangesList changes={data.changes} themeLabel={themeLabel} />
        </section>
        <aside className="research-note" aria-labelledby={`${theme}-note-heading`}>
          <div className="section-kicker">{english ? "Reading note" : "阅读提示"}</div><h3 id={`${theme}-note-heading`}>{english ? "Check the evidence before the story" : "先看现象，再查口径"}</h3>
          <p>{english ? "Name-based classifications have no clear economic mechanism. After seeing a striking curve, check data mining, selection bias, and backtest overfitting before discussing explanations." : "这类名称分类缺少明确的经济机制。看到漂亮曲线后，应优先检查数据挖掘、选择偏差和回测过拟合，再讨论背后的解释。"}</p>
          <div className="research-note-links"><Link to="/methodology">{english ? "Read methodology" : "阅读构建方法"}</Link><Link to="/constituents">{english ? "View constituents" : "查看当前成分"}</Link><Link to="/history">{english ? "Check history" : "检查历史数据"}</Link></div>
        </aside>
      </div>
    </section>
  );
}

export default function Home() {
  const { locale } = useLocale();
  const english = locale === "en-US";
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    Promise.all([fetchThemeData("animal"), fetchThemeData("plant")])
      .then(([animal, plant]) => setState({ status: "ok", themes: { animal, plant } }))
      .catch((error) => setState({ status: "error", message: String(error) }));
  }, []);

  if (state.status === "loading") return <p className="page-status">{english ? "Loading Zoo and Garden data…" : "正在读取动物园和植物园数据…"}</p>;
  if (state.status === "error") return <p className="page-status muted">{english ? "Data load failed: " : "数据加载失败："}{state.message}</p>;
  return (
    <div className="page-home">
      <section className="home-hero">
        <div className="section-kicker">{english ? "Research question" : "研究问题"}</div><h2>{english ? "Can animals and plants in stock names form meaningful indices?" : "名字里的动物和植物，能不能组成有意义的指数？"}</h2>
        <p>{english ? "These two playful name classifications are compiled into A-share indices under fixed rules, with their performance relative to a benchmark tracked over time. The page shows both results for comparison of counts, NAV paths, and rebalances." : "这里把两种有趣的名称分类按固定规则编成 A 股指数，持续记录它们相对基准的表现。页面同时展示两套结果，方便比较成分数量、净值走势和调仓情况。"}</p>
        <div className="hero-meta" aria-label={english ? "Index research metadata" : "指数研究元数据"}><span>{english ? "As of " : "截至 "}{state.themes.animal.latest.date}</span><span>{english ? "Closing data" : "收盘数据"}</span><span>{english ? "Rule-built" : "规则构建"}</span><span>{english ? "Research only" : "仅供研究"}</span></div>
      </section>
      <div className="theme-dashboards"><ThemeDashboard theme="animal" data={state.themes.animal} /><ThemeDashboard theme="plant" data={state.themes.plant} /></div>
    </div>
  );
}
