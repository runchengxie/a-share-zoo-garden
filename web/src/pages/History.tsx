import { lazy, Suspense, useEffect, useState } from "react";
import { fetchHistory, fetchLatest, fetchMetadata, NavPoint, Latest, Metadata } from "../api";
import TaxonomyDisclosure from "../components/TaxonomyDisclosure";
import { zooHistoryBeforeUnpricedDelist } from "../researchBoundary";

const ZooChart = lazy(() => import("../components/ZooChart"));

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; history: NavPoint[]; latest: Latest; metadata: Metadata };

export default function History() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    Promise.all([fetchHistory(), fetchLatest(), fetchMetadata()])
      .then(([history, latest, metadata]) => setState({ status: "ok", history, latest, metadata }))
      .catch((err) => setState({ status: "error", message: String(err) }));
  }, []);

  if (state.status === "loading") return <p>数据加载中…</p>;
  if (state.status === "error") return <p className="muted">数据加载失败：{state.message}</p>;
  const isResearchProxy = state.metadata.evidence_tier === "research_proxy";
  const displayHistory = isResearchProxy ? state.history : zooHistoryBeforeUnpricedDelist(state.history);

  return (
    <div className="page-history">
      <h2>历史净值</h2>
      <p className="research-alert" role="status">{isResearchProxy ? "当前为研究代理版：退市成分使用退市前最后有效复权价格作为代理结算，并在退市日移除，不代表可核实现金结算。" : "动物园历史净值自 2026-06-26 起有退市成分缺价，待结算数据重建。图表和表格只显示此前日期。"}</p>
      <TaxonomyDisclosure theme="animal" />
      <Suspense fallback={<div className="zoo-chart zoo-chart-loading" role="status">加载图表…</div>}>
        <ZooChart history={displayHistory} benchmarkLabel={state.latest.benchmark_label} />
      </Suspense>
      <section>
        <h3>数据明细</h3>
        <table className="history-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>严格净值</th>
              <th>扩展净值</th>
              <th>{state.latest.benchmark_label}净值</th>
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
        <p className="muted">表格仅展示最近 200 个交易日。研究代理版数据不代表可核实的现金结算或正式可交易业绩。</p>
      </section>
    </div>
  );
}
