import { formatDisplayDate } from "../chartDates";
import { Changes, ChangeSet, Constituent } from "../api";
import { formatCopy, useLocale } from "../i18n";

function ChangeSection({ title, set }: { title: string; set: ChangeSet }) {
  const { copy } = useLocale();
  return (
    <details className="change-section">
      <summary>{title}</summary>
      {set.new_in.length === 0 && set.removed.length === 0 ? (
        <p className="muted">{copy.changesList.noChanges}</p>
      ) : (
        <ul>
          {set.new_in.map((e) => (
            <li key={`in-${e.ts_code}`} className="change-in">
              {formatCopy(copy.changesList.added, { name: e.name, code: e.ts_code })}
            </li>
          ))}
          {set.removed.map((e) => (
            <li key={`out-${e.ts_code}`} className="change-out">
              {formatCopy(copy.changesList.removed, { name: e.name, code: e.ts_code })}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function NoiseSection({ title, items }: { title: string; items: Constituent[] }) {
  const { copy } = useLocale();
  return (
    <details className="change-section">
      <summary>{title}</summary>
      {items.length === 0 ? (
        <p className="muted">{copy.changesList.noNoise}</p>
      ) : (
        <ul>
          {items.map((c) => (
            <li key={c.ts_code}>
              {formatCopy(copy.changesList.matchedKeyword, { name: c.name, code: c.ts_code, keyword: c.keyword })}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export default function ChangesList({ changes, themeLabel }: { changes: Changes; themeLabel: string }) {
  const { copy, locale } = useLocale();
  const text = copy.changesList;
  return (
    <div className="changes-list">
      <p className="muted">{formatCopy(text.latest, { date: formatDisplayDate(changes.date, locale) })}</p>
      <ChangeSection title={formatCopy(text.strict, { theme: themeLabel })} set={changes.changes.strict} />
      <ChangeSection title={formatCopy(text.extended, { theme: themeLabel })} set={changes.changes.extended} />
      <NoiseSection title={text.noiseStrict} items={changes.suspected_noise.strict} />
      <NoiseSection title={text.noiseExtended} items={changes.suspected_noise.extended} />
    </div>
  );
}
