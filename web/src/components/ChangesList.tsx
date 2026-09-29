import { Changes, ChangeSet, Constituent } from "../api";
import { useLocale } from "../i18n";

function ChangeSection({ title, set }: { title: string; set: ChangeSet }) {
  const { locale } = useLocale();
  return (
    <details className="change-section">
      <summary>{title}</summary>
      {set.new_in.length === 0 && set.removed.length === 0 ? (
        <p className="muted">{locale === "en-US" ? "No changes." : "无变动。"}</p>
      ) : (
        <ul>
          {set.new_in.map((e) => (
            <li key={`in-${e.ts_code}`} className="change-in">
              {locale === "en-US" ? "Added: " : "纳入："}{e.name}（{e.ts_code}）
            </li>
          ))}
          {set.removed.map((e) => (
            <li key={`out-${e.ts_code}`} className="change-out">
              {locale === "en-US" ? "Removed: " : "移除："}{e.name}（{e.ts_code}）
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function NoiseSection({ title, items }: { title: string; items: Constituent[] }) {
  const { locale } = useLocale();
  return (
    <details className="change-section">
      <summary>{title}</summary>
      {items.length === 0 ? (
        <p className="muted">{locale === "en-US" ? "No suspected false matches." : "暂无疑似误匹配。"}</p>
      ) : (
        <ul>
          {items.map((c) => (
            <li key={c.ts_code}>
              {c.name}（{c.ts_code}）{locale === "en-US" ? ` matched keyword: ${c.keyword}` : `匹配词：${c.keyword}`}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export default function ChangesList({ changes, themeLabel = "动物园" }: { changes: Changes; themeLabel?: string }) {
  const { locale } = useLocale();
  return (
    <div className="changes-list">
      <p className="muted">{locale === "en-US" ? `Latest rebalance date: ${changes.date}` : `最近调仓日期：${changes.date}`}</p>
      <ChangeSection title={locale === "en-US" ? `Strict ${themeLabel}` : `严格${themeLabel}`} set={changes.changes.strict} />
      <ChangeSection title={locale === "en-US" ? `Extended ${themeLabel}` : `扩展${themeLabel}`} set={changes.changes.extended} />
      <NoiseSection title={locale === "en-US" ? "Suspected false matches (strict)" : "疑似误匹配（严格）"} items={changes.suspected_noise.strict} />
      <NoiseSection title={locale === "en-US" ? "Suspected false matches (extended)" : "疑似误匹配（扩展）"} items={changes.suspected_noise.extended} />
    </div>
  );
}
