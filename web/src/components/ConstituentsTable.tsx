import { Constituent } from "../api";
import { formatCopy, useLocale } from "../i18n";

interface Props {
  variant: "strict" | "extended";
  items: Constituent[];
  themeLabel: string;
}

export default function ConstituentsTable({ variant, items, themeLabel }: Props) {
  const { copy } = useLocale();
  const text = copy.constituentsTable;
  const title = formatCopy(variant === "strict" ? text.strictTitle : text.extendedTitle, { theme: themeLabel });
  return (
    <details className="constituents-table" open={variant === "strict"}>
      <summary>{title}（{items.length}）</summary>
      {items.length === 0 ? (
        <p className="muted">{text.none}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{text.code}</th>
              <th>{text.name}</th>
              <th>{text.keyword}</th>
              <th>{text.type}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.ts_code}>
                <td>{c.ts_code}</td>
                <td>{c.name}</td>
                <td>{c.keyword || text.noKeyword}</td>
                <td>{c.forced ? text.forced : text.matched}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
