import { lazy, Suspense, useEffect, useState } from "react";
import { fetchHistory, fetchLatest, fetchMetadata, NavPoint, Latest, Metadata } from "../api";
import TaxonomyDisclosure from "../components/TaxonomyDisclosure";
import { zooHistoryBeforeUnpricedDelist } from "../researchBoundary";
import { useLocale } from "../i18n";

const ZooChart = lazy(() => import("../components/ZooChart"));

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; history: NavPoint[]; latest: Latest; metadata: Metadata };

export default function History() {
  const { locale } = useLocale();
  const english = locale === "en-US";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    Promise.all([fetchHistory(), fetchLatest(), fetchMetadata()])
      .then(([history, latest, metadata]) => setState({ status: "ok", history, latest, metadata }))
      .catch((err) => setState({ status: "error", message: String(err) }));
  }, []);

  if (state.status === "loading") return <p>{english ? "Loading data…" : "数据加载中…"}</p>;
  if (state.status === "error") return <p className="muted">{english ? "Data load failed: " : "数据加载失败："}{state.message}</p>;
  const isResearchProxy = state.metadata.evidence_tier === "research_proxy";
  const displayHistory = isResearchProxy ? state.history : zooHistoryBeforeUnpricedDelist(state.history);

  return (
    <div className="page-history">
      <h2>{english ? "Historical NAV" : "历史净值"}</h2>
      <p className="research-alert" role="status">{isResearchProxy ? (english ? "Research proxy: delisted constituents use the last valid adjusted price as proxy settlement and are removed on the delisting date. This is not verifiable cash settlement." : "当前为研究代理版：退市成分使用退市前最后有效复权价格作为代理结算，并在退市日移除，不代表可核实现金结算。") : (english ? "Zoo historical NAV has missing delisted-constituent settlement prices since 2026-06-26. The chart and table show only earlier dates." : "动物园历史净值自 2026-06-26 起有退市成分缺价，待结算数据重建。图表和表格只显示此前日期。")}</p>
      <TaxonomyDisclosure theme="animal" />
      <Suspense fallback={<div className="zoo-chart zoo-chart-loading" role="status">{english ? "Loading chart…" : "加载图表…"}</div>}>
        <ZooChart history={displayHistory} benchmarkLabel={state.latest.benchmark_label} />
      </Suspense>
      <section>
        <h3>{english ? "Data detail" : "数据明细"}</h3>
        <table className="history-table">
          <thead>
            <tr>
              <th>{english ? "Date" : "日期"}</th>
              <th>{english ? "Strict NAV" : "严格净值"}</th>
              <th>{english ? "Extended NAV" : "扩展净值"}</th>
              <th>{english ? `${state.latest.benchmark_label} NAV` : `${state.latest.benchmark_label}净值`}</th>
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
        <p className="muted">{english ? "The table shows the latest 200 trading days only. Research-proxy data is not verifiable cash settlement or formal tradable performance." : "表格仅展示最近 200 个交易日。研究代理版数据不代表可核实的现金结算或正式可交易业绩。"}</p>
      </section>
    </div>
  );
}
