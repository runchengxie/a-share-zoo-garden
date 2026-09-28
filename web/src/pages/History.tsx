import { lazy, Suspense, useEffect, useState } from "react";
import { fetchHistory, fetchLatest, NavPoint, Latest } from "../api";
import TaxonomyDisclosure from "../components/TaxonomyDisclosure";
import { zooHistoryBeforeUnpricedDelist } from "../researchBoundary";

const ZooChart = lazy(() => import("../components/ZooChart"));

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; history: NavPoint[]; latest: Latest };

export default function History() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    Promise.all([fetchHistory(), fetchLatest()])
      .then(([history, latest]) => setState({ status: "ok", history, latest }))
      .catch((err) => setState({ status: "error", message: String(err) }));
  }, []);

  if (state.status === "loading") return <p>数据加载中…</p>;
  if (state.status === "error") return <p className="muted">数据加载失败：{state.message}</p>;
  const displayHistory = zooHistoryBeforeUnpricedDelist(state.history);

  return (
    <div className="page-history">
      <h2>历史净值</h2>
      <p className="research-alert" role="status">动物园历史净值自 2026-06-26 起有退市成分缺价，待结算数据重建。图表和表格只显示此前日期。</p>
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
        <p className="muted">表格仅展示截止日期前最近 200 个交易日。原始 history.json 仍包含待核实日期，不能直接用于业绩比较。</p>
      </section>
    </div>
  );
}
