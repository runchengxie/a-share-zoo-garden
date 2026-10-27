import { formatDisplayDate } from "../chartDates";
import type { DelistingAudit } from "../api";
import { formatCopy, useLocale } from "../i18n";

export default function DelistingAuditTable({ audit }: { audit: DelistingAudit }) {
  const { copy, locale } = useLocale();
  const text = copy.delistingAudit;
  return (
    <section className="research-section delisting-audit" aria-labelledby="delisting-audit-heading">
      <div className="section-heading compact-heading">
        <div><div className="section-kicker">{text.heading}</div><h3 id="delisting-audit-heading">{text.subheading}</h3></div>
      </div>
      <p className="muted">{text.description}</p>
      <div className="table-scroll">
        <table className="history-table">
          <thead><tr><th>{text.code}</th><th>{text.delistingDate}</th><th>{text.lastObservableDate}</th><th>{text.proxySettlementDate}</th><th>{text.strictStatus}</th></tr></thead>
          <tbody>{audit.events.map((event) => <tr key={event.ts_code}><td>{formatCopy(text.codeValue, { code: event.ts_code, name: event.name })}</td><td>{formatDisplayDate(event.delist_date, locale)}</td><td>{formatDisplayDate(event.last_observable_date, locale)}</td><td>{formatDisplayDate(event.proxy_settlement_date, locale)}</td><td>{event.strict_status === "blocked" ? text.blocked : event.strict_status}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
