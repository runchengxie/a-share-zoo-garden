import snapshot from '../../../published/data/association_study.json';
import registration from '../../../published/data/association_registration.json';
import { useLocale } from '../i18n';
import { formatDisplayDate } from '../chartDates';
import { formatAssociationTime } from '../marketAssociations';

type WindowStatus = 'observed' | 'not_matured' | 'missing_prices';
interface ObservationWindow {
  horizon: number; end_date: string | null; status: WindowStatus;
  stock_return?: number; benchmark_return?: number; excess_return?: number;
}
interface Entry {
  id: string; status: 'awaiting_baseline' | 'evaluated' | 'not_confirmed_at_freeze';
  baseline_date?: string; windows: ObservationWindow[];
}
interface Study {
  status: 'registered_observation' | 'unavailable' | 'awaiting_provider_check';
  generated_at: string; as_of?: string; scheduled_baseline?: string;
  input_check?: { complete_stocks: number; expected_stocks: number; benchmark_complete: boolean };
  entries: Entry[];
}
const study = snapshot as Study;

export function AssociationStudySummary() {
  const { copy, locale } = useLocale();
  const text = copy.associationStudy;
  const old = Date.now() - Date.parse(study.generated_at) > 48 * 60 * 60 * 1000;
  return <section className="association-study-summary">
    <h3>{text.heading}</h3>
    <p>{text[study.status]}</p>
    <p>{text.protocolPublished}: {formatAssociationTime(registration.protocol_published_at, locale)} · <a href={registration.evidence_url} target="_blank" rel="noopener noreferrer">{text.proof}</a></p>
    <p>{text.updated}: {formatAssociationTime(study.generated_at, locale)}{old ? ` · ${text.stale}` : ''}</p>
    {study.as_of && <p>{text.asOf}: {formatDisplayDate(study.as_of, locale)} · {text.baseline}: {study.scheduled_baseline ? formatDisplayDate(study.scheduled_baseline, locale) : "—"}</p>}
    {study.input_check && <p>{text.inputCheck}: {study.input_check.complete_stocks}/{study.input_check.expected_stocks} · {text.benchmark}: {study.input_check.benchmark_complete ? text.available : text.missing_prices}</p>}
    <p>{text.limits}</p>
  </section>;
}

export function AssociationPerformance({ id }: { id: string }) {
  const { copy, locale } = useLocale();
  const text = copy.associationStudy;
  const entry = study.entries.find(item => item.id === id);
  if (!entry) return <p>{text[study.status === 'unavailable' ? 'unavailable' : 'awaiting_provider_check']}</p>;
  if (entry.status !== 'evaluated') return <p>{text[entry.status]}</p>;
  const percent = new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const points = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className="association-performance">
    <p>{text.baseline}: {entry.baseline_date ? formatDisplayDate(entry.baseline_date, locale) : "—"}</p>
    <table><caption>{text.windows}</caption><thead><tr>
      <th>{text.horizon}</th><th>{text.observationStatus}</th><th>{text.stock}</th><th>{text.benchmark}</th><th>{text.excess}</th>
    </tr></thead><tbody>{entry.windows.map(window => <tr key={window.horizon}>
      <td>{window.horizon}</td><td>{text[window.status]}</td>
      <td>{window.status === 'observed' && window.stock_return !== undefined ? percent.format(window.stock_return) : '—'}</td>
      <td>{window.status === 'observed' && window.benchmark_return !== undefined ? percent.format(window.benchmark_return) : '—'}</td>
      <td>{window.status === 'observed' && window.excess_return !== undefined ? points.format(window.excess_return * 100) : '—'}</td>
    </tr>)}</tbody></table>
  </div>;
}
