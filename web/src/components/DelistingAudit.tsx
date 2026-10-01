import type { DelistingAudit } from "../api";
import { useLocale } from "../i18n";

export default function DelistingAuditTable({ audit }: { audit: DelistingAudit }) {
  const { locale } = useLocale();
  const english = locale === "en-US";
  return (
    <section className="research-section delisting-audit" aria-labelledby="delisting-audit-heading">
      <div className="section-heading compact-heading">
        <div><div className="section-kicker">{english ? "Delisting event audit" : "退市事件审计"}</div><h3 id="delisting-audit-heading">{english ? "Proxy settlement record" : "代理结算记录"}</h3></div>
      </div>
      <p className="muted">{english ? "When verifiable cash settlement is unavailable, the research proxy uses the last valid adjusted price before delisting, records zero return on the delisting date, and removes the constituent." : audit.description}</p>
      <div className="table-scroll">
        <table className="history-table">
          <thead><tr><th>{english ? "Code" : "代码"}</th><th>{english ? "Delisting date" : "退市日"}</th><th>{english ? "Last observable date" : "最后可观测日"}</th><th>{english ? "Proxy settlement date" : "代理结算日"}</th><th>{english ? "Strict status" : "严格版"}</th></tr></thead>
          <tbody>{audit.events.map((event) => <tr key={event.ts_code}><td>{english ? event.ts_code : `${event.ts_code} ${event.name}`}</td><td>{event.delist_date}</td><td>{event.last_observable_date}</td><td>{event.proxy_settlement_date}</td><td>{english ? (event.strict_status === "blocked" ? "Blocked" : event.strict_status) : event.strict_status}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
