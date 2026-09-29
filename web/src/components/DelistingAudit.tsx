import type { DelistingAudit } from "../api";

export default function DelistingAuditTable({ audit }: { audit: DelistingAudit }) {
  return (
    <section className="research-section delisting-audit" aria-labelledby="delisting-audit-heading">
      <div className="section-heading compact-heading">
        <div><div className="section-kicker">退市事件审计</div><h3 id="delisting-audit-heading">代理结算记录</h3></div>
      </div>
      <p className="muted">{audit.description}</p>
      <div className="table-scroll">
        <table className="history-table">
          <thead><tr><th>代码</th><th>退市日</th><th>最后可观测日</th><th>代理结算日</th><th>严格版</th></tr></thead>
          <tbody>{audit.events.map((event) => <tr key={event.ts_code}><td>{event.ts_code} {event.name}</td><td>{event.delist_date}</td><td>{event.last_observable_date}</td><td>{event.proxy_settlement_date}</td><td>{event.strict_status}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
