import { lazy, Suspense, useEffect, useState } from "react";
import { fetchHistory, fetchLatest, fetchMetadata, NavPoint, Latest, Metadata } from "../api";
import TaxonomyDisclosure from "../components/TaxonomyDisclosure";
import { zooHistoryBeforeUnpricedDelist } from "../researchBoundary";
import { formatCopy, useLocale } from "../i18n";

const ZooChart = lazy(() => import("../components/ZooChart"));

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; history: NavPoint[]; latest: Latest; metadata: Metadata };

export default function History() {
  const { copy } = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    Promise.all([fetchHistory(), fetchLatest(), fetchMetadata()])
      .then(([history, latest, metadata]) => setState({ status: "ok", history, latest, metadata }))
      .catch((err) => setState({ status: "error", message: String(err) }));
  }, []);

  if (state.status === "loading") return <p>{copy.historyPage.loading}</p>;
  if (state.status === "error") return <p className="muted">{copy.historyPage.loadFailed}{state.message}</p>;
  const isResearchProxy = state.metadata.evidence_tier === "research_proxy";
  const displayHistory = isResearchProxy ? state.history : zooHistoryBeforeUnpricedDelist(state.history);

  return (
    <div className="page-history">
      <h2>{copy.historyPage.heading}</h2>
      <p className="research-alert" role="status">{isResearchProxy ? copy.historyPage.researchProxy : copy.historyPage.missingSettlement}</p>
      <TaxonomyDisclosure theme="animal" />
      <Suspense fallback={<div className="zoo-chart zoo-chart-loading" role="status">{copy.historyPage.loadingChart}</div>}>
        <ZooChart history={displayHistory} benchmarkLabel={state.latest.benchmark_label} />
      </Suspense>
      <section>
        <h3>{copy.historyPage.dataDetail}</h3>
        <table className="history-table">
          <thead>
            <tr>
              <th>{copy.historyPage.date}</th>
              <th>{copy.historyPage.strictNav}</th>
              <th>{copy.historyPage.extendedNav}</th>
              <th>{formatCopy(copy.historyPage.benchmarkNav, { benchmark: state.latest.benchmark_label })}</th>
            </tr>
          </thead>
          <tbody>
            {displayHistory
              .slice()
              .reverse()
              .slice(0, 200)
              .map((p) => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td>{p.zoo_strict_nav.toFixed(4)}</td>
                  <td>{p.zoo_extended_nav.toFixed(4)}</td>
                  <td>{p.benchmark_nav.toFixed(4)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="muted">{copy.historyPage.tableNote}</p>
      </section>
    </div>
  );
}
