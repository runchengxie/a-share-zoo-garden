import { Constituent } from "../api";
import { useLocale } from "../i18n";

interface Props {
  variant: "strict" | "extended";
  items: Constituent[];
  themeLabel?: string;
}

export default function ConstituentsTable({ variant, items, themeLabel = "动物园" }: Props) {
  const { locale } = useLocale();
  const english = locale === "en-US";
  const title = english ? `${variant === "strict" ? "Strict" : "Extended"} ${themeLabel} constituents` : variant === "strict" ? `严格${themeLabel}成分` : `扩展${themeLabel}成分`;
  return (
    <details className="constituents-table" open={variant === "strict"}>
      <summary>{title}（{items.length}）</summary>
      {items.length === 0 ? (
        <p className="muted">{english ? "No constituents." : "暂无成分。"}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{english ? "Code" : "代码"}</th>
              <th>{english ? "Name" : "名称"}</th>
              <th>{english ? "Keyword" : "匹配词"}</th>
              <th>{english ? "Type" : "类型"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.ts_code}>
                <td>{c.ts_code}</td>
                <td>{c.name}</td>
                <td>{c.keyword || (english ? "None" : "无")}</td>
                <td>{c.forced ? english ? "Forced" : "强制" : english ? "Matched" : "匹配"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
