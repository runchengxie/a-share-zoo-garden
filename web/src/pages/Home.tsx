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
import { formatCopy, useLocale } from "../i18n";

const ZooChart = lazy(() => import("../components/ZooChart"));

type ThemeData = { latest: Latest; history: NavPoint[]; changes: Changes; constituents: Constituents; metadata: Metadata; audit?: DelistingAudit };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; themes: Record<IndexTheme, ThemeData> };

async function fetchThemeData(theme: IndexTheme): Promise<ThemeData> {
  const [latest, history, changes, constituents, metadata, audit] = await Promise.all([
    fetchThemeLatest(theme), fetchThemeHistory(theme), fetchThemeChanges(theme), fetchThemeConstituents(theme), fetchThemeMetadata(theme), theme === "animal" ? fetchDelistingAudit() : Promise.resolve(undefined),
  ]);
  return { latest, history, changes, constituents, metadata, audit };
}

function ThemeDashboard({ theme, data }: { theme: IndexTheme; data: ThemeData }) {
  const [settlementView, setSettlementView] = useState<"proxy" | "strict">("proxy");
  const { copy } = useLocale();
  const text = copy.home;
  const themeLabel = theme === "plant" ? copy.home.themePlant : copy.home.themeAnimal;
  const isResearchProxy = theme === "animal" && data.metadata.evidence_tier === "research_proxy";
  const animalSnapshotBlocked = theme === "animal" && (settlementView === "strict" || !isResearchProxy) && data.latest.date > ZOO_UNPRICED_DELIST_CUTOFF;
  const displayHistory = theme === "animal" && (!isResearchProxy || settlementView === "strict") ? zooHistoryBeforeUnpricedDelist(data.history) : data.history;
  return (
    <section className={`theme-dashboard theme-dashboard-${theme}`} id={`${theme}-panel`} aria-labelledby={`${theme}-dashboard-heading`}>
      <div className="theme-dashboard-heading">
        <div>
          <div className="section-kicker">{themeLabel}</div>
          <h2 id={`${theme}-dashboard-heading`}>{formatCopy(text.themeHeading, { theme: themeLabel })}</h2>
          <p>{formatCopy(text.dashboardIntro, { benchmark: data.latest.benchmark_label })}</p>
        </div>
        <span className="section-asof">{formatCopy(text.asOf, { date: data.latest.date })}</span>
      </div>

      {theme === "animal" && (
        <p className="research-alert" role="status">
          {isResearchProxy && settlementView === "proxy" ? text.proxyAlert : text.strictAlert}
        </p>
      )}

      <section className="index-snapshot" aria-labelledby={`${theme}-snapshot-heading`}>
        <div className="section-heading compact-heading"><div><div className="section-kicker">{text.indexSnapshot}</div><h3 id={`${theme}-snapshot-heading`}>{animalSnapshotBlocked ? text.navUnderReview : text.todayData}</h3></div></div>
        {animalSnapshotBlocked ? <p className="muted">{formatCopy(text.blockedSnapshot, { date: data.latest.date })}</p> : <NavCards latest={data.latest} strictCount={data.constituents.strict.length} extendedCount={data.constituents.extended.length} themeLabel={themeLabel} />}
      </section>

      <section className="research-section" aria-labelledby={`${theme}-performance-heading`}>
        <div className="section-heading"><div><div className="section-kicker">{text.performance}</div><h3 id={`${theme}-performance-heading`}>{text.navBenchmark}</h3><p className="section-deck">{formatCopy(text.performanceNote, { theme: themeLabel })}</p></div></div>
        {theme === "animal" && isResearchProxy ? <div className="view-toggle" role="group" aria-label={text.settlementView}><button type="button" className="text-link" aria-pressed={settlementView === "proxy"} onClick={() => setSettlementView("proxy")}>{text.researchProxy}</button><button type="button" className="text-link" aria-pressed={settlementView === "strict"} onClick={() => setSettlementView("strict")}>{text.strictCutoff}</button></div> : null}
        <TaxonomyDisclosure theme={theme} />
        <Suspense fallback={<div className="zoo-chart zoo-chart-loading" role="status">{text.loadingChart}</div>}>
          <ZooChart history={displayHistory} benchmarkLabel={data.latest.benchmark_label} themeLabel={themeLabel} />
        </Suspense>
      </section>

      {theme === "animal" && isResearchProxy && data.audit ? <DelistingAuditTable audit={data.audit} /> : null}

      <div className="home-research-grid">
        <section className="research-section zoo-today" aria-labelledby={`${theme}-changes-heading`}>
          <div className="section-heading compact-heading"><div><div className="section-kicker">{text.recentRebalance}</div><h3 id={`${theme}-changes-heading`}>{text.constituentChanges}</h3></div><Link className="text-link" to="/changes">{text.viewFullHistory}</Link></div>
          <ChangesList changes={data.changes} themeLabel={themeLabel} />
        </section>
        <aside className="research-note" aria-labelledby={`${theme}-note-heading`}>
          <div className="section-kicker">{text.readingNote}</div><h3 id={`${theme}-note-heading`}>{text.checkEvidence}</h3>
          <p>{text.caution}</p>
          <div className="research-note-links"><Link to="/methodology">{text.methodologyLink}</Link><Link to="/constituents">{text.constituentsLink}</Link><Link to="/history">{text.historyLink}</Link></div>
        </aside>
      </div>
    </section>
  );
}

export default function Home() {
  const { copy } = useLocale();
  const text = copy.home;
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    Promise.all([fetchThemeData("animal"), fetchThemeData("plant")])
      .then(([animal, plant]) => setState({ status: "ok", themes: { animal, plant } }))
      .catch((error) => setState({ status: "error", message: String(error) }));
  }, []);

  if (state.status === "loading") return <p className="page-status">{text.loading}</p>;
  if (state.status === "error") return <p className="page-status muted">{text.loadFailed}{state.message}</p>;
  return (
    <div className="page-home">
      <section className="home-hero">
        <div className="section-kicker">{text.researchQuestion}</div><h2>{text.heroTitle}</h2>
        <p>{text.heroText}</p>
        <div className="hero-meta" aria-label={text.indexMetadata}><span>{formatCopy(text.asOf, { date: state.themes.animal.latest.date })}</span><span>{text.closingData}</span><span>{text.ruleBuilt}</span><span>{text.researchOnly}</span></div>
      </section>
      <div className="theme-dashboards"><ThemeDashboard theme="animal" data={state.themes.animal} /><ThemeDashboard theme="plant" data={state.themes.plant} /></div>
    </div>
  );
}
