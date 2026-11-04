import { useState } from 'react';
import { useLocale } from '../i18n';
import { associations, associationSources, formatAssociationTime, type AssociationStatus, type AssociationTheme } from '../marketAssociations';

export default function Associations() {
  const { copy, locale } = useLocale();
  const text = copy.associations;
  const [theme, setTheme] = useState<AssociationTheme | 'all'>('all');
  const [status, setStatus] = useState<AssociationStatus | 'all'>('all');
  const visible = associations.filter(entry => (theme === 'all' || entry.theme === theme) && (status === 'all' || entry.status === status));
  const time = (value: string) => <time dateTime={value}>{formatAssociationTime(value, locale)}</time>;
  return (
    <section className="page-associations">
      <h2>{text.heading}</h2>
      <p>{text.intro}</p>
      <p className="association-boundary">{text.boundary}</p>
      <p>{text.scope}</p>
      <p>{text.confirmedMeaning}</p>
      <div className="association-filters">
        <label htmlFor="association-theme">{text.theme}
          <select id="association-theme" value={theme} onChange={event => setTheme(event.target.value as AssociationTheme | 'all')}>
            {(['all', 'animal', 'plant'] as const).map(value => <option key={value} value={value}>{text[value]}</option>)}
          </select>
        </label>
        <label htmlFor="association-status">{text.status}
          <select id="association-status" value={status} onChange={event => setStatus(event.target.value as AssociationStatus | 'all')}>
            {(['all', 'pending', 'confirmed', 'expired'] as const).map(value => <option key={value} value={value}>{text[value]}</option>)}
          </select>
        </label>
      </div>
      <p role="status">{visible.length ? visible.length : text.empty}</p>
      <div className="association-list">
        {visible.map(entry => <article className="association-card" key={entry.id}>
          <h3><span lang="zh-CN">{entry.name_at_source}</span> <small>{entry.ts_code}</small></h3>
          <p>{text[entry.status]} · {text[entry.relation]}{entry.catalyst === 'zodiac_2027' ? ` · ${text.catalyst}` : ''}</p>
          <p>{text.nameTerm}: <span lang="zh-CN">{entry.name_term}</span> → {text.target}: <span lang="zh-CN">{entry.target_term}</span></p>
          <p>{entry.summary[locale]}</p>
          <dl>
            <dt>{text.evidence}</dt><dd>{text[entry.evidence]}</dd>
            <dt>{text.sourceTime}</dt><dd>{time(entry.source_first_known_at)}</dd>
            <dt>{text.recorded}</dt><dd>{time(entry.recorded_at)}</dd>
            <dt>{text.reviewed}</dt><dd>{time(entry.reviewed_at)}</dd>
            <dt>{text.due}</dt><dd>{time(entry.review_due_at)}{entry.status !== 'expired' && Date.now() >= Date.parse(entry.review_due_at) ? ` · ${text.overdue}` : ''}</dd>
          </dl>
          <details className="association-source"><summary>{text.sources}</summary>
            <ul>{entry.source_ids.map(id => {
              const source = associationSources.get(id)!;
              return <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer" lang="zh-CN">{source.title}</a><p lang="zh-CN">{source.publisher}</p>{time(source.published_at)}</li>;
            })}</ul>
          </details>
          <details><summary>{text.history}</summary><ul>{entry.events.map((event, index) => <li key={index}>{time(event.at)} · {text[event.status]} · {text[event.reason]}</li>)}</ul></details>
        </article>)}
      </div>
    </section>
  );
}
