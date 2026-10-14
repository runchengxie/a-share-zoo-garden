import { useEffect, useMemo, useState } from "react";
import { fetchThemeConstituents, type Constituents as ConstituentsData, type IndexTheme } from "../api";
import ConstituentsTable from "../components/ConstituentsTable";
import { useLocale } from "../i18n";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: Record<IndexTheme, ConstituentsData> };

export default function Constituents() {
  const { copy } = useLocale();
  const labels = { animal: copy.constituentsPage.zoo, plant: copy.constituentsPage.garden } as Record<IndexTheme, string>;
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([fetchThemeConstituents("animal"), fetchThemeConstituents("plant")])
      .then(([animal, plant]) => setState({ status: "ok", data: { animal, plant } }))
      .catch((err) => setState({ status: "error", message: String(err) }));
  }, []);

  const filtered = useMemo(() => {
    if (state.status !== "ok") return { animal: { strict: [], extended: [] }, plant: { strict: [], extended: [] } };
    const filterItems = (items: ConstituentsData["strict"]) => {
      if (!query.trim()) return items;
      const q = query.trim();
      return items.filter((c) => c.name.includes(q) || c.ts_code.includes(q) || c.keyword.includes(q));
    };
    return {
      animal: { strict: filterItems(state.data.animal.strict), extended: filterItems(state.data.animal.extended) },
      plant: { strict: filterItems(state.data.plant.strict), extended: filterItems(state.data.plant.extended) },
    };
  }, [state, query]);

  if (state.status === "loading") return <p>{copy.constituentsPage.loading}</p>;
  if (state.status === "error") return <p className="muted">{copy.constituentsPage.loadFailed}{state.message}</p>;

  return (
    <div className="page-constituents">
      <h2>{copy.constituentsPage.heading}</h2>
      <p className="muted">{copy.constituentsPage.intro}</p>
      <div className="toolbar">
        <span className="toolbar-hint">{copy.constituentsPage.searchHint}</span>
        <input type="text" placeholder={copy.constituentsPage.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {(["animal", "plant"] as IndexTheme[]).map((theme) => (
        <section className="theme-constituents" key={theme} aria-labelledby={`${theme}-constituents-heading`}>
          <h3 id={`${theme}-constituents-heading`}>{labels[theme]}</h3>
          <ConstituentsTable variant="strict" items={filtered[theme].strict} themeLabel={labels[theme]} />
          <ConstituentsTable variant="extended" items={filtered[theme].extended} themeLabel={labels[theme]} />
        </section>
      ))}
    </div>
  );
}
