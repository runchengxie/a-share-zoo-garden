import { useEffect, useState } from "react";
import { fetchThemeChanges, type Changes as ChangesData, type IndexTheme } from "../api";
import ChangesList from "../components/ChangesList";
import { useLocale } from "../i18n";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; changes: Record<IndexTheme, ChangesData> };

export default function Changes() {
  const { copy } = useLocale();
  const labels = { animal: copy.changesPage.zoo, plant: copy.changesPage.garden } as Record<IndexTheme, string>;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    Promise.all([fetchThemeChanges("animal"), fetchThemeChanges("plant")])
      .then(([animal, plant]) => setState({ status: "ok", changes: { animal, plant } }))
      .catch((err) => setState({ status: "error", message: String(err) }));
  }, []);

  if (state.status === "loading") return <p>{copy.changesPage.loading}</p>;
  if (state.status === "error") return <p className="muted">{copy.changesPage.loadFailed}{state.message}</p>;

  return (
    <div className="page-changes">
      <h2>{copy.changesPage.heading}</h2>
      <p className="muted">{copy.changesPage.intro}</p>
      {(["animal", "plant"] as IndexTheme[]).map((theme) => (
        <section className="theme-record" key={theme}>
          <h3>{labels[theme]}</h3>
          <ChangesList changes={state.changes[theme]} themeLabel={labels[theme]} />
        </section>
      ))}
    </div>
  );
}
